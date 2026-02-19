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

type PdfTextItem = {
  str?: string;
  transform?: number[];
};

type PdfError = { name?: string; message?: string };
type DetectorTier = "basic" | "advanced";
type DetectorFlag = {
  code: string;
  label: string;
  score: number;
  severity: "low" | "medium" | "high";
};

export interface ParsedPdfTransaction {
  date: string;
  valueDate?: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  refNumber?: string;
}

export interface ParsedPdfBankMetadata {
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  currency?: string;
  iban?: string;
  ifsc?: string;
  swift?: string;
  routingNumber?: string;
  sortCode?: string;
  bsb?: string;
  micr?: string;
  statementPeriod?: string;
}

export interface ParsedPdfData {
  transactions: ParsedPdfTransaction[];
  bankMetadata?: ParsedPdfBankMetadata;
}

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

const DATE_TOKEN = /\d{2}[/-]\d{2}[/-]\d{4}/;
const ROW_START_PATTERN = /^(\d{2}[/-]\d{2}[/-]\d{4})\s+(\d{2}[/-]\d{2}[/-]\d{4})\s+(.+)$/;
const AMOUNT_PATTERN = /-?\d{1,3}(?:,\d{3})*\.\d{2}|-?\d+\.\d{2}/g;
const PERIOD_FROM_TO_PATTERN =
  /\bfrom\b\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s*(?:to|-)\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i;
const IBAN_PATTERN = /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/;
const SWIFT_PATTERN = /\b[A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?\b/;
const CURRENCY_CODES = new Set([
  "AED",
  "USD",
  "INR",
  "EUR",
  "GBP",
  "SAR",
  "QAR",
  "OMR",
  "KWD",
  "BHD",
  "JPY",
  "CNY",
  "SGD",
  "HKD",
  "AUD",
  "CAD",
  "CHF",
  "NZD",
]);

type PositionedToken = {
  x: number;
  y: number;
  text: string;
};

const normalizeDate = (value: string): string => {
  const match = value.trim().match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (!match) return value.trim();
  const [, dd, mm, yyyy] = match;
  return `${yyyy}-${mm}-${dd}`;
};

const parseAmount = (value: string): number => {
  const normalized = value.replace(/,/g, "").trim();
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
};

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const cleanMetadataValue = (value?: string): string => {
  if (!value) return "";
  return value.replace(/\s+/g, " ").replace(/^[\s:;-]+|[\s:;-]+$/g, "").trim();
};

const findLabeledValue = (lines: string[], labels: string[]): string | undefined => {
  for (const line of lines) {
    const normalized = line.replace(/\s+/g, " ").trim();
    if (!normalized) continue;

    for (const label of labels) {
      const pattern = new RegExp(
        `\\b${escapeRegExp(label).replace(/\s+/g, "\\s+")}\\b\\s*[:\\-]?\\s*(.+)$`,
        "i",
      );
      const match = normalized.match(pattern);
      if (!match) continue;
      const value = cleanMetadataValue(match[1]);
      if (value) return value;
    }
  }
  return undefined;
};

const toCurrencyCode = (value?: string): string | undefined => {
  if (!value) return undefined;
  const token = value.toUpperCase().match(/[A-Z]{3}/)?.[0];
  if (!token) return undefined;
  return CURRENCY_CODES.has(token) ? token : undefined;
};

const pickMostFrequentCurrency = (text: string): string | undefined => {
  const matches = text.toUpperCase().match(/\b[A-Z]{3}\b/g);
  if (!matches || matches.length === 0) return undefined;

  const freq = new Map<string, number>();
  for (const token of matches) {
    if (!CURRENCY_CODES.has(token)) continue;
    freq.set(token, (freq.get(token) || 0) + 1);
  }

  let selected: string | undefined;
  let count = 0;
  freq.forEach((value, key) => {
    if (value > count) {
      selected = key;
      count = value;
    }
  });
  return selected;
};

const extractBankMetadataFromLines = (sourceLines: string[]): ParsedPdfBankMetadata | undefined => {
  const lines = sourceLines.map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
  if (lines.length === 0) return undefined;

  const fullText = lines.join("\n");
  const metadata: ParsedPdfBankMetadata = {};

  const bankNameFromLabel = findLabeledValue(lines, ["Bank Name"]);
  if (bankNameFromLabel && !/account statement/i.test(bankNameFromLabel)) {
    metadata.bankName = bankNameFromLabel;
  }

  if (!metadata.bankName) {
    const likelyBankLine = lines.slice(0, 40).find((line) =>
      /(bank|emirates nbd|hsbc|hdfc|icici|axis|citi|citibank|barclays|standard chartered|chase)/i.test(line) &&
      !/(account statement|transaction|debit|credit|running balance|charges|total records|page \d+)/i.test(line)
    );
    if (likelyBankLine) {
      metadata.bankName = likelyBankLine;
    }
  }

  const accountNumber = findLabeledValue(lines, [
    "Account Number",
    "Account No",
    "A/C No",
    "Acct No",
  ]);
  if (accountNumber) metadata.accountNumber = accountNumber;

  const accountHolder = findLabeledValue(lines, [
    "Account Holder Name",
    "Account Holder",
    "Account Name",
    "Customer Name",
    "Name",
  ]);
  if (accountHolder && !/statement/i.test(accountHolder)) {
    metadata.accountHolder = accountHolder;
  }

  const currencyLabeled = toCurrencyCode(
    findLabeledValue(lines, ["Currency Type", "Currency", "Currency Code"]),
  );
  metadata.currency = currencyLabeled || pickMostFrequentCurrency(fullText);

  const periodLabeled = cleanMetadataValue(
    findLabeledValue(lines, ["Statement Period", "Period", "Date Range"]),
  );
  if (periodLabeled) {
    metadata.statementPeriod = periodLabeled;
  } else {
    const periodMatch = fullText.match(PERIOD_FROM_TO_PATTERN);
    if (periodMatch) {
      metadata.statementPeriod = `${periodMatch[1]} - ${periodMatch[2]}`;
    }
  }

  const ibanLabeled = cleanMetadataValue(findLabeledValue(lines, ["IBAN"]));
  const ibanMatch = fullText.toUpperCase().match(IBAN_PATTERN);
  metadata.iban = ibanLabeled || ibanMatch?.[0];

  const ifsc = cleanMetadataValue(findLabeledValue(lines, ["IFSC", "IFSC Code"]));
  if (ifsc) metadata.ifsc = ifsc;

  const swiftLabeled = cleanMetadataValue(findLabeledValue(lines, ["SWIFT", "BIC", "SWIFT Code"]));
  const swiftMatch = fullText.toUpperCase().match(SWIFT_PATTERN);
  metadata.swift = swiftLabeled || swiftMatch?.[0];

  const routingNumber = cleanMetadataValue(
    findLabeledValue(lines, ["Routing Number", "Routing No"]),
  );
  if (routingNumber) metadata.routingNumber = routingNumber;

  const sortCode = cleanMetadataValue(findLabeledValue(lines, ["Sort Code"]));
  if (sortCode) metadata.sortCode = sortCode;

  const bsb = cleanMetadataValue(findLabeledValue(lines, ["BSB"]));
  if (bsb) metadata.bsb = bsb;

  const micr = cleanMetadataValue(findLabeledValue(lines, ["MICR"]));
  if (micr) metadata.micr = micr;

  const hasMetadata = Object.values(metadata).some(
    (value) => typeof value === "string" && value.trim().length > 0,
  );

  return hasMetadata ? metadata : undefined;
};

const isNoiseLine = (line: string): boolean => {
  const lower = line.toLowerCase();
  if (!lower) return true;
  if (lower.includes("account statement")) return true;
  if (lower.includes("total records")) return true;
  if (lower.includes("transaction date") && lower.includes("value date")) return true;
  if (lower.includes("running balance")) return true;
  if (/^page\s*\d+(\s*of\s*\d+)?$/i.test(line)) return true;
  return false;
};

const linesFromTextItems = (items: PdfTextItem[]): string[] => {
  const tokens: PositionedToken[] = items
    .map((item) => {
      const text = String(item?.str ?? "").replace(/\s+/g, " ").trim();
      const transform = Array.isArray(item?.transform) ? item.transform : [];
      const x = Number(transform[4] ?? 0);
      const y = Number(transform[5] ?? 0);
      return { x, y, text };
    })
    .filter((token) => token.text.length > 0);

  if (tokens.length === 0) return [];

  tokens.sort((a, b) => {
    const yDiff = Math.abs(a.y - b.y);
    if (yDiff <= 1.5) return a.x - b.x;
    return b.y - a.y;
  });

  const buckets: Array<{ y: number; tokens: PositionedToken[] }> = [];
  for (const token of tokens) {
    const bucket = buckets.find((entry) => Math.abs(entry.y - token.y) <= 1.5);
    if (bucket) {
      bucket.tokens.push(token);
      continue;
    }
    buckets.push({ y: token.y, tokens: [token] });
  }

  buckets.sort((a, b) => b.y - a.y);

  return buckets
    .map((bucket) =>
      bucket.tokens
        .sort((a, b) => a.x - b.x)
        .map((token) => token.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter((line) => line.length > 0);
};

const extractAmounts = (text: string): { textWithoutAmounts: string; debit: number; credit: number; balance: number } | null => {
  const matches = text.match(AMOUNT_PATTERN) || [];
  if (matches.length < 3) return null;

  const [debitToken, creditToken, balanceToken] = matches.slice(-3);
  const trailingPattern = new RegExp(
    `${escapeRegExp(debitToken)}\\s+${escapeRegExp(creditToken)}\\s+${escapeRegExp(balanceToken)}\\s*$`,
  );
  const cleaned = text.replace(trailingPattern, "").trim();

  return {
    textWithoutAmounts: cleaned,
    debit: parseAmount(debitToken),
    credit: parseAmount(creditToken),
    balance: parseAmount(balanceToken),
  };
};

const extractAmountsWithDashPlaceholders = (
  text: string,
): { textWithoutAmounts: string; debit: number; credit: number; balance: number } | null => {
  const cleaned = text.trim();
  if (!cleaned) return null;

  const debitBlankPattern =
    /^(.*?)(?:\s|^)[-–—]\s+(-?\d{1,3}(?:,\d{3})*\.\d{2}|-?\d+\.\d{2})\s+(-?\d{1,3}(?:,\d{3})*\.\d{2}|-?\d+\.\d{2})\s*$/;
  const debitBlankMatch = cleaned.match(debitBlankPattern);
  if (debitBlankMatch) {
    const [, prefix, creditToken, balanceToken] = debitBlankMatch;
    return {
      textWithoutAmounts: prefix.trim(),
      debit: 0,
      credit: parseAmount(creditToken),
      balance: parseAmount(balanceToken),
    };
  }

  const creditBlankPattern =
    /^(.*?)(-?\d{1,3}(?:,\d{3})*\.\d{2}|-?\d+\.\d{2})\s+[-–—]\s+(-?\d{1,3}(?:,\d{3})*\.\d{2}|-?\d+\.\d{2})\s*$/;
  const creditBlankMatch = cleaned.match(creditBlankPattern);
  if (creditBlankMatch) {
    const [, prefix, debitToken, balanceToken] = creditBlankMatch;
    return {
      textWithoutAmounts: prefix.trim(),
      debit: parseAmount(debitToken),
      credit: 0,
      balance: parseAmount(balanceToken),
    };
  }

  return null;
};

export const extractPdfDataFromText = async (
  file: File,
  options?: { password?: string; maxPdfRenderPages?: number },
): Promise<ParsedPdfData> => {
  const pdfjsLib = (await import("pdfjs-dist")) as PdfJsModule;
  pdfjsLib.GlobalWorkerOptions.workerSrc = await getPdfWorkerSrc();

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    password: options?.password || undefined,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;
  const maxPages = options?.maxPdfRenderPages ?? 120;
  if (pdf.numPages > maxPages) {
    await pdf.destroy?.();
    return { transactions: [] };
  }

  const rows: ParsedPdfTransaction[] = [];
  const metadataLines: string[] = [];
  let current: (ParsedPdfTransaction & { _descriptionParts: string[] }) | null = null;

  const flushCurrent = () => {
    if (!current) return;
    if (!current.date || (!current.debit && !current.credit && !current.balance)) {
      current = null;
      return;
    }
    current.description = current._descriptionParts.join(" ").replace(/\s+/g, " ").trim();
    delete (current as ParsedPdfTransaction & { _descriptionParts?: string[] })._descriptionParts;
    rows.push(current as ParsedPdfTransaction);
    current = null;
  };

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent?.();
    const lines = linesFromTextItems((textContent?.items || []) as PdfTextItem[]);
    if (pageNum <= 2) {
      metadataLines.push(...lines);
    }

    for (const line of lines) {
      if (isNoiseLine(line)) continue;

      const rowStart = line.match(ROW_START_PATTERN);
      if (rowStart) {
        flushCurrent();

        const [, transactionDateToken, valueDateToken, trailing] = rowStart;
        const amounts = extractAmounts(trailing) || extractAmountsWithDashPlaceholders(trailing);
        const descriptionText = (amounts?.textWithoutAmounts || trailing).trim();

        current = {
          date: normalizeDate(transactionDateToken),
          valueDate: normalizeDate(valueDateToken),
          description: descriptionText,
          debit: amounts?.debit ?? 0,
          credit: amounts?.credit ?? 0,
          balance: amounts?.balance ?? 0,
          refNumber: "",
          _descriptionParts: descriptionText ? [descriptionText] : [],
        };
        continue;
      }

      if (!current) continue;

      const maybeAmounts = extractAmounts(line) || extractAmountsWithDashPlaceholders(line);
      if (maybeAmounts && current.balance === 0 && current.debit === 0 && current.credit === 0) {
        current.debit = maybeAmounts.debit;
        current.credit = maybeAmounts.credit;
        current.balance = maybeAmounts.balance;
        if (maybeAmounts.textWithoutAmounts) {
          current._descriptionParts.push(maybeAmounts.textWithoutAmounts);
        }
        continue;
      }

      if (DATE_TOKEN.test(line) && line.includes(":")) {
        // Keep transaction timestamps inside narration.
        current._descriptionParts.push(line);
        continue;
      }

      current._descriptionParts.push(line);
    }
  }

  flushCurrent();
  await pdf.destroy?.();

  const transactions = rows.filter((row) => row.date && row.description && Number.isFinite(row.balance));
  const bankMetadata = extractBankMetadataFromLines(metadataLines);

  // Return only meaningful rows and keep original debit/credit/balance values.
  return { transactions, bankMetadata };
};

export const extractPdfTransactionsFromText = async (
  file: File,
  options?: { password?: string; maxPdfRenderPages?: number },
): Promise<ParsedPdfTransaction[]> => {
  const result = await extractPdfDataFromText(file, options);
  return result.transactions;
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
  const estimateDataUrlBytes = (dataUrl: string): number => {
    const commaIndex = dataUrl.indexOf(",");
    if (commaIndex < 0) return 0;
    const base64 = dataUrl.slice(commaIndex + 1);
    return Math.floor((base64.length * 3) / 4);
  };

  const toOcrFriendlyDataUrl = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): string => {
    // OCR-friendly preprocessing: grayscale + global thresholding keeps table digits crisp.
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { data } = imageData;
    const histogram = new Uint32Array(256);

    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round((data[i] * 0.299) + (data[i + 1] * 0.587) + (data[i + 2] * 0.114));
      histogram[gray] += 1;
    }

    const totalPixels = canvas.width * canvas.height;
    let sum = 0;
    for (let i = 0; i < 256; i += 1) sum += i * histogram[i];

    let sumB = 0;
    let wB = 0;
    let maxVariance = 0;
    let otsuThreshold = 165;
    for (let i = 0; i < 256; i += 1) {
      wB += histogram[i];
      if (wB === 0) continue;
      const wF = totalPixels - wB;
      if (wF === 0) break;
      sumB += i * histogram[i];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;
      const variance = wB * wF * (mB - mF) * (mB - mF);
      if (variance > maxVariance) {
        maxVariance = variance;
        otsuThreshold = i;
      }
    }

    const threshold = Math.max(125, Math.min(200, otsuThreshold - 10));
    for (let i = 0; i < data.length; i += 4) {
      const gray = (data[i] * 0.299) + (data[i + 1] * 0.587) + (data[i + 2] * 0.114);
      const bw = gray > threshold ? 255 : 0;
      data[i] = bw;
      data[i + 1] = bw;
      data[i + 2] = bw;
      data[i + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);

    // PNG keeps OCR edges sharp; fallback to JPEG if approaching per-image upload limits.
    const png = canvas.toDataURL("image/png");
    if (estimateDataUrlBytes(png) <= 2_850_000) return png;

    const jpegQualities = [0.95, 0.9, 0.86, 0.82];
    for (const quality of jpegQualities) {
      const jpeg = canvas.toDataURL("image/jpeg", quality);
      if (estimateDataUrlBytes(jpeg) <= 2_850_000) return jpeg;
    }
    return canvas.toDataURL("image/jpeg", 0.8);
  };

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    // Higher render scale materially improves OCR on dense bank statement tables.
    const viewport = page.getViewport({ scale: 2.7 });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    await page.render({ canvasContext: ctx, viewport }).promise;
    images.push(toOcrFriendlyDataUrl(canvas, ctx));
  }

  await pdf.destroy?.();
  return images;
};
