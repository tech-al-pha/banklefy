// ============= OCR ROUTING + PER-PAGE CLASSIFIER =============
// Strict rule:
//   - text-bearing pages   -> deterministic pdfjs/code path (NO LLM, NO OCR)
//   - scanned/image pages  -> vision OCR fallback ONLY for those pages
// Tesseract is prohibited everywhere.

export const FULL_PAGE_OCR_COVERAGE_THRESHOLD = 10;

export const shouldUseFullPageOcrCoverage = (
  pageCount: number,
): boolean => {
  const normalizedPageCount = Number.isFinite(pageCount) ? Math.max(0, Math.floor(pageCount)) : 0;
  return normalizedPageCount >= FULL_PAGE_OCR_COVERAGE_THRESHOLD;
};

// ---- Per-page classifier ----------------------------------------------------

export type PageMode = 'text' | 'scanned' | 'mixed';

export type PageTextSignal = {
  pageNumber: number;
  charCount: number;
  tokenCount: number;
  digitClusterCount: number; // groups of >=3 consecutive digits (proxy for amounts/dates)
  uniqueXBuckets: number;    // x-coordinate spread (proxy for column structure)
};

export type PageClassification = {
  pageNumber: number;
  mode: PageMode;
  reason: string;
  signal: PageTextSignal;
};

// Empirically chosen thresholds. Conservative — when in doubt, mark `text`
// so we run the deterministic path first and only fall back to vision if the
// downstream extractor returns nothing.
const MIN_CHARS_FOR_TEXT = 120;
const MIN_TOKENS_FOR_TEXT = 25;
const MIN_DIGIT_CLUSTERS_FOR_TEXT = 4;
const MIN_X_BUCKETS_FOR_TABLE = 3;

/**
 * Classify a single page based on extracted text-layer signals.
 * The caller (convert-statements-batch) is responsible for collecting
 * signals via pdfjs `getTextContent()` per page.
 */
export function classifyPage(signal: PageTextSignal): PageClassification {
  const {
    charCount,
    tokenCount,
    digitClusterCount,
    uniqueXBuckets,
    pageNumber,
  } = signal;

  // No usable text layer at all -> almost certainly a scanned image page.
  if (charCount < 20 || tokenCount < 5) {
    return {
      pageNumber,
      mode: 'scanned',
      reason: 'No usable text layer (likely scanned image)',
      signal,
    };
  }

  // Strong text + columnar structure + amount-like digits -> pure text page.
  if (
    charCount >= MIN_CHARS_FOR_TEXT &&
    tokenCount >= MIN_TOKENS_FOR_TEXT &&
    digitClusterCount >= MIN_DIGIT_CLUSTERS_FOR_TEXT &&
    uniqueXBuckets >= MIN_X_BUCKETS_FOR_TABLE
  ) {
    return {
      pageNumber,
      mode: 'text',
      reason: 'Sufficient text + columnar layout',
      signal,
    };
  }

  // Some text but weak signals (sparse OCR layer / partly scanned).
  return {
    pageNumber,
    mode: 'mixed',
    reason: 'Weak text layer; deterministic pass first then vision fallback if empty',
    signal,
  };
}

/**
 * Aggregate per-page classifications into a document-level routing decision.
 */
export type DocumentRouting = {
  totalPages: number;
  textPages: number[];
  scannedPages: number[];
  mixedPages: number[];
  visionRequiredPages: number[]; // scanned + mixed (mixed are sent to vision only as fallback)
  preferDeterministic: boolean;  // if true, run code path on full doc first
};

export function buildDocumentRouting(
  classifications: ReadonlyArray<PageClassification>,
): DocumentRouting {
  const textPages: number[] = [];
  const scannedPages: number[] = [];
  const mixedPages: number[] = [];

  for (const c of classifications) {
    if (c.mode === 'text') textPages.push(c.pageNumber);
    else if (c.mode === 'scanned') scannedPages.push(c.pageNumber);
    else mixedPages.push(c.pageNumber);
  }

  const total = classifications.length;
  // If majority of pages have a usable text layer, ALWAYS try deterministic
  // extraction first across the whole document. Only the truly scanned pages
  // get sent to vision.
  const preferDeterministic = total === 0
    ? false
    : (textPages.length + mixedPages.length) / total >= 0.5;

  return {
    totalPages: total,
    textPages,
    scannedPages,
    mixedPages,
    visionRequiredPages: [...scannedPages, ...mixedPages].sort((a, b) => a - b),
    preferDeterministic,
  };
}

/**
 * Helper to derive a PageTextSignal from a pdfjs `getTextContent()` result.
 * Caller passes the items array; we compute the cheap signals.
 */
export function buildPageSignal(
  pageNumber: number,
  items: ReadonlyArray<{ str?: string; transform?: number[] }> | undefined,
): PageTextSignal {
  if (!items || items.length === 0) {
    return {
      pageNumber,
      charCount: 0,
      tokenCount: 0,
      digitClusterCount: 0,
      uniqueXBuckets: 0,
    };
  }

  let charCount = 0;
  let tokenCount = 0;
  let digitClusters = 0;
  const xBuckets = new Set<number>();
  // Bucket x-coordinates into 20pt bins to approximate column count.
  const BIN = 20;

  for (const item of items) {
    const text = String(item.str ?? '').trim();
    if (!text) continue;
    charCount += text.length;
    tokenCount += text.split(/\s+/).filter(Boolean).length;
    const digitGroups = text.match(/\d{3,}/g);
    if (digitGroups) digitClusters += digitGroups.length;
    const x = Array.isArray(item.transform) ? Number(item.transform[4]) : NaN;
    if (Number.isFinite(x)) xBuckets.add(Math.floor(x / BIN));
  }

  return {
    pageNumber,
    charCount,
    tokenCount,
    digitClusterCount: digitClusters,
    uniqueXBuckets: xBuckets.size,
  };
}
