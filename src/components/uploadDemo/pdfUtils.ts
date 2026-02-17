import { getPdfWorkerSrc } from "@/lib/pdfWorker";

type PdfDocument = {
  numPages: number;
  getPage: (pageNum: number) => Promise<{
    getViewport: (params: { scale: number }) => { width: number; height: number };
    getTextContent?: () => Promise<{ items?: Array<Record<string, unknown>> }>;
    render: (params: {
      canvasContext: CanvasRenderingContext2D;
      viewport: { width: number; height: number };
    }) => { promise: Promise<void> };
  }>;
  destroy?: () => Promise<void> | void;
  getMetadata?: () => Promise<{ info?: Record<string, unknown> }>;
};

type PdfJsModule = {
  getDocument: (src: unknown) => { promise: Promise<PdfDocument> };
  GlobalWorkerOptions: { workerSrc: string };
};

type PdfError = { name?: string; message?: string };
type DetectorTier = "basic" | "advanced";
type DetectorFlag = {
  code: string;
  label: string;
  score: number;
  severity: "low" | "medium" | "high";
};

const SUSPICIOUS_PRODUCER_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /smallpdf|ilovepdf|sejda|canva/i, label: "Consumer PDF editor detected" },
  { pattern: /microsoft\s+word|photoshop|foxit|nitro|pdfescape|pdf24/i, label: "Office/design editor detected" },
  { pattern: /adobe\s+acrobat(?!\s+distiller)/i, label: "Acrobat save/edit signature detected" },
];

const KNOWN_BANK_STACK_HINTS = [/finacle/i, /oracle/i, /itext/i, /core banking/i, /jasper/i];

const parsePdfDate = (value?: string): Date | null => {
  if (!value) return null;
  const clean = value.trim();
  const pdfMatch = clean.match(/^D:(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?/);
  if (pdfMatch) {
    const [, y, m, d, hh = "00", mm = "00", ss = "00"] = pdfMatch;
    const dt = new Date(`${y}-${m}-${d}T${hh}:${mm}:${ss}Z`);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  const iso = new Date(clean);
  return Number.isNaN(iso.getTime()) ? null : iso;
};

const pushFlag = (
  flags: DetectorFlag[],
  code: string,
  label: string,
  score: number,
  severity: "low" | "medium" | "high",
) => {
  flags.push({ code, label, score, severity });
};

const summarizeFlags = (flags: DetectorFlag[]) => {
  if (flags.length === 0) return "No suspicious forensic markers detected.";
  return [...flags]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((f) => f.label)
    .join(" | ");
};

export const getPdfPageCount = async (file: File, password?: string): Promise<number | null> => {
  const pdfjsLib = (await import("pdfjs-dist")) as PdfJsModule;
  pdfjsLib.GlobalWorkerOptions.workerSrc = await getPdfWorkerSrc();

  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      password: password || undefined,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    });
    const pdf = await loadingTask.promise;
    const count = pdf.numPages;
    await pdf.destroy?.();
    return count;
  } catch (err: unknown) {
    const error = err as PdfError;
    if (
      error?.name === "PasswordException" ||
      String(error?.message || "").toLowerCase().includes("password")
    ) {
      return null;
    }
    return null;
  }
};

export const getTotalPages = async (
  files: File[],
  password: string | undefined,
  maxPdfRenderPages: number,
): Promise<{ total: number; unknown: boolean; overCap: boolean; maxSingle: number }> => {
  let total = 0;
  let unknown = false;
  let overCap = false;
  let maxSingle = 0;

  for (const file of files) {
    const isPdf = file.name.toLowerCase().endsWith(".pdf");
    const pages = isPdf ? await getPdfPageCount(file, password) : 1;
    if (pages === null) {
      unknown = true;
      continue;
    }
    total += pages;
    if (pages > maxPdfRenderPages) {
      overCap = true;
      maxSingle = Math.max(maxSingle, pages);
    }
  }

  return { total, unknown, overCap, maxSingle };
};

export const detectEditedPdf = async (
  file: File,
  options?: { tier?: DetectorTier; password?: string },
): Promise<{ suspected: boolean; reason: string; score: number; riskLevel: "low" | "medium" | "high"; flags: string[] }> => {
  const tier: DetectorTier = options?.tier ?? "basic";
  const scoreFactor = tier === "advanced" ? 1.25 : 1;
  const buffer = await file.arrayBuffer();
  const rawText = new TextDecoder("latin1").decode(new Uint8Array(buffer));
  const flags: DetectorFlag[] = [];

  const eofMatches = rawText.match(/%%EOF/g) || [];
  const hasPrev = /\/Prev\s+\d+/i.test(rawText);
  const hasAcroForm = /\/AcroForm\b/i.test(rawText);
  const hasAnnots = /\/Annots\b/i.test(rawText);
  const hasLayers = /\/OCProperties\b/i.test(rawText);
  const hasOpenAction = /\/OpenAction\b/i.test(rawText);
  const hasJavaScript = /\/JavaScript\b|\/JS\b/i.test(rawText);
  const hasLaunchAction = /\/Launch\b/i.test(rawText);
  const imageObjectCount = (rawText.match(/\/Subtype\s*\/Image\b/g) || []).length;

  if (eofMatches.length > 1) {
    pushFlag(flags, "MULTI_EOF", "Multiple EOF markers (incremental updates)", Math.round(18 * scoreFactor), "medium");
  }
  if (hasPrev) {
    pushFlag(flags, "HAS_PREV", "Incremental update pointer (/Prev) found", Math.round(14 * scoreFactor), "medium");
  }
  if (hasAcroForm) {
    pushFlag(flags, "HAS_FORM", "Form fields detected (/AcroForm)", Math.round(16 * scoreFactor), "medium");
  }
  if (hasAnnots) {
    pushFlag(flags, "HAS_ANNOTS", "Annotations detected (/Annots)", Math.round(18 * scoreFactor), "high");
  }
  if (hasLayers) {
    pushFlag(flags, "HAS_LAYERS", "Layer objects detected (/OCProperties)", Math.round(14 * scoreFactor), "medium");
  }
  if (hasOpenAction || hasJavaScript || hasLaunchAction) {
    pushFlag(flags, "ACTIVE_CONTENT", "Active PDF actions/scripts detected", Math.round(26 * scoreFactor), "high");
  }

  const pdfjsLib = (await import("pdfjs-dist")) as PdfJsModule;
  pdfjsLib.GlobalWorkerOptions.workerSrc = await getPdfWorkerSrc();

  let totalTextChars = 0;
  const uniqueFonts = new Set<string>();
  const fontSizes: number[] = [];
  let pagesWithText = 0;
  let pages = 0;

  try {
    const loadingTask = pdfjsLib.getDocument({
      data: buffer,
      password: options?.password || undefined,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    });
    const pdf = await loadingTask.promise;
    pages = pdf.numPages;

    try {
      const metadataResult = await pdf.getMetadata?.();
      const info = metadataResult?.info ?? {};
      const producer = String(info.Producer || "");
      const creator = String(info.Creator || "");
      const fullProducer = `${producer} ${creator}`.trim();

      if (fullProducer) {
        const suspicious = SUSPICIOUS_PRODUCER_PATTERNS.find((entry) => entry.pattern.test(fullProducer));
        if (suspicious) {
          pushFlag(flags, "SUSPICIOUS_PRODUCER", suspicious.label, Math.round(28 * scoreFactor), "high");
        } else if (!KNOWN_BANK_STACK_HINTS.some((p) => p.test(fullProducer))) {
          pushFlag(flags, "UNKNOWN_PRODUCER", "Unknown/non-bank producer signature", Math.round(12 * scoreFactor), "medium");
        }
      }

      const creationDate = parsePdfDate(String(info.CreationDate || ""));
      const modDate = parsePdfDate(String(info.ModDate || ""));
      const now = Date.now();

      if (modDate && modDate.getTime() > now + 5 * 60 * 1000) {
        pushFlag(flags, "FUTURE_MOD", "Modification date appears in the future", Math.round(24 * scoreFactor), "high");
      }
      if (creationDate && modDate && modDate.getTime() + 60 * 1000 < creationDate.getTime()) {
        pushFlag(flags, "DATE_LOGIC", "Modification date is earlier than creation date", Math.round(22 * scoreFactor), "high");
      }
      if (creationDate && modDate) {
        const gapDays = (modDate.getTime() - creationDate.getTime()) / (1000 * 60 * 60 * 24);
        if (gapDays > 45) {
          pushFlag(flags, "LARGE_DATE_GAP", `Large create→modify gap (${Math.round(gapDays)} days)`, Math.round(10 * scoreFactor), "low");
        }
      }
    } catch {
      // Metadata extraction not mandatory.
    }

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent?.();
      const items = textContent?.items || [];
      let pageTextChars = 0;

      for (const item of items) {
        const strVal = String(item.str || "");
        pageTextChars += strVal.length;
        totalTextChars += strVal.length;

        const fontName = String(item.fontName || "");
        if (fontName) uniqueFonts.add(fontName);

        const transform = item.transform as number[] | undefined;
        if (Array.isArray(transform) && transform.length >= 4) {
          const approxSize = Math.max(Math.abs(transform[0]), Math.abs(transform[3]));
          if (Number.isFinite(approxSize) && approxSize > 0) {
            fontSizes.push(approxSize);
          }
        }
      }

      if (pageTextChars > 20) {
        pagesWithText += 1;
      }
    }

    await pdf.destroy?.();
  } catch {
    // Parsing failures should not block file conversion flow.
  }

  if (uniqueFonts.size > (tier === "advanced" ? 6 : 8)) {
    pushFlag(
      flags,
      "MANY_FONTS",
      `Too many unique fonts detected (${uniqueFonts.size})`,
      Math.round(12 * scoreFactor),
      "medium",
    );
  }

  if (fontSizes.length > 25) {
    const min = Math.min(...fontSizes);
    const max = Math.max(...fontSizes);
    const range = max - min;
    const varianceThreshold = tier === "advanced" ? 1.4 : 1.8;
    if (range > varianceThreshold) {
      pushFlag(
        flags,
        "FONT_RANGE",
        `Large font-size variance detected (${range.toFixed(2)}pt)`,
        Math.round(10 * scoreFactor),
        "medium",
      );
    }
  }

  if (imageObjectCount > 0 && totalTextChars > 0) {
    const textPerImage = totalTextChars / Math.max(1, imageObjectCount);
    if (textPerImage < 180 && pagesWithText >= 1) {
      pushFlag(
        flags,
        "IMAGE_TEXT_OVERLAY",
        "Image-heavy PDF with sparse selectable text (possible overlay edit)",
        Math.round(14 * scoreFactor),
        "high",
      );
    }
  }

  if (pages > 0 && pagesWithText > 0 && pagesWithText < pages) {
    pushFlag(
      flags,
      "MIXED_PAGE_TYPES",
      "Mixed scanned and digital page characteristics",
      Math.round(8 * scoreFactor),
      "low",
    );
  }

  const totalScore = flags.reduce((sum, f) => sum + f.score, 0);
  const highCount = flags.filter((f) => f.severity === "high").length;
  const mediumCount = flags.filter((f) => f.severity === "medium").length;
  const threshold = tier === "advanced" ? 28 : 38;
  const suspected = totalScore >= threshold || highCount >= (tier === "advanced" ? 1 : 2) || mediumCount >= 3;
  const riskLevel: "low" | "medium" | "high" = totalScore >= 55 || highCount >= 2 ? "high" : totalScore >= 28 ? "medium" : "low";

  return {
    suspected,
    score: totalScore,
    riskLevel,
    flags: flags.map((f) => `${f.code}: ${f.label}`),
    reason: `${summarizeFlags(flags)}${flags.length ? ` (score: ${totalScore})` : ""}`,
  };
};

export const detectPasswordProtectedPdf = async (file: File): Promise<boolean> => {
  const pdfjsLib = (await import("pdfjs-dist")) as PdfJsModule;
  pdfjsLib.GlobalWorkerOptions.workerSrc = await getPdfWorkerSrc();

  const arrayBuffer = await file.arrayBuffer();
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      password: "",
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    });
    const pdf = await loadingTask.promise;
    await pdf.destroy?.();
    return false;
  } catch (err: unknown) {
    const error = err as PdfError;
    return (
      error?.name === "PasswordException" ||
      String(error?.message || "").toLowerCase().includes("password")
    );
  }
};

export const pdfToPageImages = async (
  file: File,
  options: {
    password?: string;
    maxPdfRenderPages: number;
    isFreeUsageMode: boolean;
    freeMaxPdfPagesPerFile: number;
  },
): Promise<string[]> => {
  const { password, maxPdfRenderPages, isFreeUsageMode, freeMaxPdfPagesPerFile } = options;
  const pdfjsLib = (await import("pdfjs-dist")) as PdfJsModule;
  pdfjsLib.GlobalWorkerOptions.workerSrc = await getPdfWorkerSrc();

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    password: password || undefined,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;
  if (pdf.numPages > maxPdfRenderPages) {
    await pdf.destroy?.();
    if (isFreeUsageMode) {
      throw new Error(`Free tier supports PDFs up to ${freeMaxPdfPagesPerFile} pages per file.`);
    }
    throw new Error(
      `This PDF has ${pdf.numPages} pages. The current maximum supported per file is ${maxPdfRenderPages} pages.`,
    );
  }

  const images: string[] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.6 });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    await page.render({ canvasContext: ctx, viewport }).promise;
    images.push(canvas.toDataURL("image/jpeg", 0.82));
  }

  await pdf.destroy?.();
  return images;
};
