import { getPdfWorkerSrc } from "@/lib/pdfWorker";

type PdfJsModule = {
  getDocument: (src: unknown) => { promise: Promise<{ numPages: number; getPage: (pageNum: number) => Promise<{ getViewport: (params: { scale: number }) => { width: number; height: number }; render: (params: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => { promise: Promise<void> } }> ; destroy?: () => Promise<void> | void }> };
  GlobalWorkerOptions: { workerSrc: string };
};

type PdfError = { name?: string; message?: string };

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
  maxPdfRenderPages: number
): Promise<{ total: number; unknown: boolean; overCap: boolean; maxSingle: number }> => {
  let total = 0;
  let unknown = false;
  let overCap = false;
  let maxSingle = 0;

  for (const file of files) {
    const isPdf = file.name.toLowerCase().endsWith('.pdf');
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

export const detectEditedPdf = async (file: File): Promise<{ suspected: boolean; reason: string }> => {
  const buffer = await file.arrayBuffer();
  const text = new TextDecoder('latin1').decode(new Uint8Array(buffer));
  const eofMatches = text.match(/%%EOF/g) || [];
  const hasPrev = /\/Prev\s+\d+/i.test(text);
  const hasIncremental = eofMatches.length > 1 || hasPrev;

  const reasons: string[] = [];
  if (eofMatches.length > 1) reasons.push('Multiple EOF markers (incremental updates)');
  if (hasPrev) reasons.push('Incremental update reference found');

  return {
    suspected: hasIncremental,
    reason: reasons.join(', ') || 'Heuristic indicator found',
  };
};

export const detectPasswordProtectedPdf = async (file: File): Promise<boolean> => {
  const pdfjsLib = (await import('pdfjs-dist')) as PdfJsModule;
  pdfjsLib.GlobalWorkerOptions.workerSrc = await getPdfWorkerSrc();

  const arrayBuffer = await file.arrayBuffer();
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      password: '',
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
      error?.name === 'PasswordException' ||
      String(error?.message || '').toLowerCase().includes('password')
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
  }
): Promise<string[]> => {
  const { password, maxPdfRenderPages, isFreeUsageMode, freeMaxPdfPagesPerFile } = options;
  const pdfjsLib = (await import('pdfjs-dist')) as PdfJsModule;
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
    throw new Error(`This PDF has ${pdf.numPages} pages. The current maximum supported per file is ${maxPdfRenderPages} pages.`);
  }

  const images: string[] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.6 });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    await page.render({ canvasContext: ctx, viewport }).promise;
    images.push(canvas.toDataURL('image/jpeg', 0.82));
  }

  await pdf.destroy?.();
  return images;
};
