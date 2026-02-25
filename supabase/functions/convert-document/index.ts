// ============= BANKLEFY MULTI-LAYERED INTELLIGENCE ENGINE =============
// Main orchestrator that routes to specialized AI modules
// STRICT USAGE CONTROL: IP-based limits, page limits, admin whitelist

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// Import modular processors
import {
  assessClientPdfParsedTransactions,
  classifyDocument,
  callGroqVisionOCR,
  callMistralVisionOCR,
  callTesseractOcrWorker,
  correctMinorBalanceDrift,
  extractBankMetadataFromOcrText,
  mergeOcrTransactionsDeterministic,
  normalizeRawTransactions,
  recoverAdcbTransactionsFromOcrText,
  scoreRunningBalanceFlow,
  type ClientPdfParseAssessment,
  type OCRResult,
  type RawTransaction,
  type BankMetadata,
} from '../_shared/ocr-processor.ts';
import {
  CATEGORY_LIST,
  type ProcessedTransaction,
} from '../_shared/categorizer.ts';
import {
  performExtraction,
  performCategorization,
  generateStatusReport,
  type AIProcessingStatus,
} from '../_shared/ai-orchestrator.ts';
import {
  reconcileBalances,
  detectDuplicates,
  analyzeLiquidity,
  scoreTransactionConfidence,
  type FraudAlert,
  type RiskTransaction,
  type Transaction,
} from '../_shared/financial-engine.ts';
import {
  performUnderwritingAnalysis,
} from '../_shared/underwriting-engine.ts';
import {
  buildUnderwritingPayload,
  resolveUnderwritingTier,
} from '../_shared/foir-tier.ts';
import {
  detectHighRiskTransactions,
  detectCircularTrading,
  generateFraudAlerts,
  calculateIntegrityScore,
} from '../_shared/risk-alert-engine.ts';
import { generateProfessionalExcel } from '../_shared/excel-generator.ts';
import { buildJsonExport, buildMt940Export } from '../_shared/export-formatters.ts';
import { sanitizeTransactions } from '../_shared/transaction-sanitizer.ts';
import { fromMinorUnits, sumMinorUnits, toMinorUnits } from '../_shared/money.ts';
import { getTrackingKey } from '../_shared/client-id.ts';
import {
  detectBankTemplate,
  getHeaderAliasesForHint,
  getBankTemplateById,
  isComplexBankLayoutHint,
  isDenseTableBankHint,
  isDualPassBankHint,
} from '../_shared/bank-templates.ts';

type PdfJsModule = {
  getDocument: (options: Record<string, unknown>) => { promise: Promise<unknown> };
  GlobalWorkerOptions?: { workerSrc?: string };
};
type PdfPage = {
  getTextContent?: () => Promise<{ items?: Array<Record<string, unknown>> }>;
};
type PdfDocumentProxy = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
  destroy?: () => void;
};

const DATE_TOKEN = /\d{2}[/-]\d{2}[/-]\d{4}/;
const ROW_START_PATTERN = /^(\d{2}[/-]\d{2}[/-]\d{4})\s+(\d{2}[/-]\d{2}[/-]\d{4})\s+(.+)$/;
const AMOUNT_PATTERN = /-?\d{1,3}(?:,\d{3})*\.\d{2}|-?\d+\.\d{2}/g;
const AMOUNT_TOKEN_PATTERN = /-?\d{1,3}(?:,\d{3})*\.\d{2}|-?\d+\.\d{2}/;

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

type LineToken = { x: number; y: number; text: string };
type LineEntry = { text: string; tokens: LineToken[] };

const groupTokensIntoLines = (items: Array<Record<string, unknown>>): LineEntry[] => {
  const tokens = items
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

  const buckets: Array<{ y: number; tokens: Array<{ x: number; y: number; text: string }> }> = [];
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
    .map((bucket) => {
      const ordered = bucket.tokens.sort((a, b) => a.x - b.x);
      const text = ordered
        .map((token) => token.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      return { text, tokens: ordered };
    })
    .filter((entry) => entry.text.length > 0);
};

const linesFromTextItems = (items: Array<Record<string, unknown>>): string[] =>
  groupTokensIntoLines(items).map((entry) => entry.text);

const detectAmountColumns = (lineEntries: LineEntry[]): number[] => {
  const numericXs: number[] = [];
  for (const entry of lineEntries) {
    for (const token of entry.tokens) {
      if (AMOUNT_TOKEN_PATTERN.test(token.text)) {
        numericXs.push(token.x);
      }
    }
  }
  if (numericXs.length < 3) return [];
  numericXs.sort((a, b) => a - b);

  const clusters: Array<{ center: number; count: number }> = [];
  const threshold = 24;
  for (const x of numericXs) {
    const last = clusters[clusters.length - 1];
    if (!last || Math.abs(x - last.center) > threshold) {
      clusters.push({ center: x, count: 1 });
    } else {
      last.center = (last.center * last.count + x) / (last.count + 1);
      last.count += 1;
    }
  }

  if (clusters.length < 3) return [];
  const sortedCenters = clusters.map((c) => c.center).sort((a, b) => a - b);
  return sortedCenters.slice(-3);
};

const extractAnchoredAmounts = (
  entry: LineEntry,
  centers: number[],
): { debit: number; credit: number; balance: number } | null => {
  if (centers.length < 3) return null;
  const numericTokens = entry.tokens.filter((token) => AMOUNT_TOKEN_PATTERN.test(token.text));
  if (numericTokens.length === 0) return null;

  const nearest = centers.map((center) => {
    let best: LineToken | null = null;
    let bestDist = Infinity;
    for (const token of numericTokens) {
      const dist = Math.abs(token.x - center);
      if (dist < bestDist) {
        best = token;
        bestDist = dist;
      }
    }
    return bestDist <= 50 ? best : null;
  });

  const [debitToken, creditToken, balanceToken] = nearest;
  if (!balanceToken) return null;
  return {
    debit: debitToken ? parseAmount(debitToken.text) : 0,
    credit: creditToken ? parseAmount(creditToken.text) : 0,
    balance: parseAmount(balanceToken.text),
  };
};

const extractAmounts = (text: string): { textWithoutAmounts: string; debit: number; credit: number; balance: number } | null => {
  const matches = text.match(AMOUNT_PATTERN) || [];
  if (matches.length < 3) return null;

  const [debitToken, creditToken, balanceToken] = matches.slice(-3);
  const trailingPattern = new RegExp(
    `${debitToken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+${creditToken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+${balanceToken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`,
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
    /^(.*?)(?:\s|^)[-â€“â€”]\s+(-?\d{1,3}(?:,\d{3})*\.\d{2}|-?\d+\.\d{2})\s+(-?\d{1,3}(?:,\d{3})*\.\d{2}|-?\d+\.\d{2})\s*$/;
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
    /^(.*?)(-?\d{1,3}(?:,\d{3})*\.\d{2}|-?\d+\.\d{2})\s+[-â€“â€”]\s+(-?\d{1,3}(?:,\d{3})*\.\d{2}|-?\d+\.\d{2})\s*$/;
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

const ROW_START_PATTERN_SINGLE = /^(\d{2}[/-]\d{2}[/-]\d{4})\s+(.+)$/;
const extractPdfTextTransactionsFromBytes = async (
  bytes: Uint8Array,
  password?: string,
  options?: { allowSingleDate?: boolean },
): Promise<{ transactions: RawTransaction[]; text: string }> => {
  if (!bytes || bytes.length === 0) return { transactions: [], text: '' };
  const pdfjsLib = (await import('https://esm.sh/pdfjs-dist@4.0.379/legacy/build/pdf.mjs')) as PdfJsModule;
  const loadingTask = pdfjsLib.getDocument({
    data: bytes,
    password: password || undefined,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  });
  const pdf = (await loadingTask.promise) as PdfDocumentProxy;

  const rows: Array<RawTransaction & { _descriptionParts: string[] }> = [];
  let current: (RawTransaction & { _descriptionParts: string[] }) | null = null;
  const allLines: string[] = [];
  const allLineEntries: LineEntry[] = [];

  const flushCurrent = () => {
    if (!current) return;
    if (!current.date || (!current.debit && !current.credit && !current.balance)) {
      current = null;
      return;
    }
    current.description = current._descriptionParts.join(' ').replace(/\s+/g, ' ').trim();
    rows.push(current);
    current = null;
  };

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent?.();
    const lineEntries = groupTokensIntoLines((textContent?.items || []) as Array<Record<string, unknown>>);
    allLineEntries.push(...lineEntries);
    allLines.push(...lineEntries.map((entry) => entry.text));
  }

  const amountCenters = detectAmountColumns(allLineEntries);

  for (const entry of allLineEntries) {
    const line = entry.text;
      if (isNoiseLine(line)) continue;

      let rowStart = line.match(ROW_START_PATTERN);
      let singleDateMatch = null;
      if (!rowStart && options?.allowSingleDate) {
        singleDateMatch = line.match(ROW_START_PATTERN_SINGLE);
      }
      if (rowStart || singleDateMatch) {
        flushCurrent();
        const transactionDateToken = rowStart ? rowStart[1] : singleDateMatch?.[1] ?? '';
        const trailing = rowStart ? rowStart[3] : singleDateMatch?.[2] ?? '';
        const amounts = extractAmounts(trailing) || extractAmountsWithDashPlaceholders(trailing);
        const anchored = extractAnchoredAmounts(entry, amountCenters);
        const debit = anchored ? anchored.debit : (amounts?.debit ?? 0);
        const credit = anchored ? anchored.credit : (amounts?.credit ?? 0);
        const balance = anchored ? anchored.balance : (amounts?.balance ?? 0);
        const descriptionText = (amounts?.textWithoutAmounts || trailing).trim();
        current = {
          date: normalizeDate(transactionDateToken),
          description: descriptionText,
          debit,
          credit,
          balance,
          refNumber: '',
          _descriptionParts: descriptionText ? [descriptionText] : [],
        };
        continue;
      }

      if (!current) continue;
      const maybeAmounts = extractAmounts(line) || extractAmountsWithDashPlaceholders(line);
      const anchored = extractAnchoredAmounts(entry, amountCenters);
      if ((maybeAmounts || anchored) && current.balance === 0 && current.debit === 0 && current.credit === 0) {
        current.debit = anchored ? anchored.debit : (maybeAmounts?.debit ?? 0);
        current.credit = anchored ? anchored.credit : (maybeAmounts?.credit ?? 0);
        current.balance = anchored ? anchored.balance : (maybeAmounts?.balance ?? 0);
        if (maybeAmounts?.textWithoutAmounts) {
          current._descriptionParts.push(maybeAmounts.textWithoutAmounts);
        }
        continue;
      }

      if (DATE_TOKEN.test(line) && line.includes(':')) {
        current._descriptionParts.push(line);
        continue;
      }

      current._descriptionParts.push(line);
  }

  flushCurrent();
  await pdf.destroy?.();

  const transactions = rows
    .filter((row) => row.date && row.description && Number.isFinite(row.balance as number))
    .map(({ _descriptionParts, ...rest }) => rest);

  return { transactions, text: allLines.join('\n') };
};

const extractHeaderHints = (text: string): string => {
  if (!text) return '';
  const headerKeywords = /(transaction date|value date|posting date|narration|description|details|reference|ref no|debit|credit|balance|running balance)/i;
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => headerKeywords.test(line));
  return lines.slice(0, 8).join(' | ');
};

const toHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const buildTemplateFingerprint = async (text: string): Promise<{ fingerprint: string; headerHint: string }> => {
  const compact = text.replace(/\s+/g, ' ').trim();
  const headerHint = extractHeaderHints(text);
  const seed = `${compact.slice(0, 2000)}|${headerHint}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(seed));
  return { fingerprint: toHex(digest), headerHint };
};

const fetchTemplateFingerprint = async (
  supabaseAdmin: any,
  fingerprint: string,
): Promise<{ template_id?: string; allow_single_date?: boolean } | null> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('bank_template_fingerprints')
      .select('template_id, allow_single_date')
      .eq('fingerprint', fingerprint)
      .maybeSingle();
    if (error) return null;
    return data ?? null;
  } catch {
    return null;
  }
};

const storeTemplateFingerprint = async (
  supabaseAdmin: any,
  payload: { fingerprint: string; templateId?: string | null; headerHint?: string; allowSingleDate?: boolean },
): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('bank_template_fingerprints')
      .select('id, match_count')
      .eq('fingerprint', payload.fingerprint)
      .maybeSingle();
    if (error && !/bank_template_fingerprints/i.test(error.message || '')) return;

    if (!data) {
      await supabaseAdmin
        .from('bank_template_fingerprints')
        .insert({
          fingerprint: payload.fingerprint,
          template_id: payload.templateId ?? null,
          header_hint: payload.headerHint ?? null,
          allow_single_date: payload.allowSingleDate ?? false,
          match_count: 1,
          last_seen_at: new Date().toISOString(),
        });
      return;
    }

    const nextCount = Number(data.match_count ?? 1) + 1;
    await supabaseAdmin
      .from('bank_template_fingerprints')
      .update({
        template_id: payload.templateId ?? null,
        header_hint: payload.headerHint ?? null,
        allow_single_date: payload.allowSingleDate ?? false,
        match_count: nextCount,
        last_seen_at: new Date().toISOString(),
      })
      .eq('id', data.id);
  } catch {
    // Best-effort only
  }
};

const attemptGroqTextRescue = async (
  rawText: string,
): Promise<{ rows: RawTransaction[] | null; tokenUsage: number; rescueConfidence: number }> => {
  const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
  if (!GROQ_API_KEY) return { rows: null, tokenUsage: 0, rescueConfidence: 0 };
  if (!rawText || rawText.trim().length < AI_RESCUE_MIN_TEXT_CHARS) {
    return { rows: null, tokenUsage: 0, rescueConfidence: 0 };
  }
  try {
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content:
              `Extract ALL transactions from this bank statement text.\n\n` +
              `Return JSON array with: date (YYYY-MM-DD), refNumber (as shown in the document), description, debit (number), credit (number), balance (number).\n` +
              `If both Transaction Date and Value Date/Posting Date exist, use Transaction Date as date.\n` +
              `If refNumber is not present for a row, return an empty string.\n` +
              `Populate refNumber only when a dedicated reference column exists. If ID appears only inside description text, keep it in description and set refNumber to \"\".\n` +
              `Ignore headers, footers, summaries, opening/closing balance lines, and page-break artifacts.\n` +
              `Map debit/credit strictly by their table columns. If a column has \"-\" or blank, set that side to 0.\n` +
              `Use running balance progression to resolve ambiguous debit vs credit rows.\n` +
              `Never output negative debit or credit.\n` +
              `Return ONLY the JSON array, no markdown.`,
          },
          { role: 'user', content: rawText.substring(0, 30000) },
        ],
        temperature: 0.1,
        max_tokens: 8000,
      }),
    });

    if (!groqResponse.ok) return { rows: null, tokenUsage: 0, rescueConfidence: 0 };
    const groqData = await groqResponse.json();
    const responseText = groqData.choices?.[0]?.message?.content || '';
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return { rows: null, tokenUsage: Number(groqData?.usage?.total_tokens || 0), rescueConfidence: 0 };
    const parsed = JSON.parse(jsonMatch[0]) as RawTransaction[];
    const normalized = normalizeRawTransactions(parsed);
    const flow = scoreRunningBalanceFlow(normalized);
    const mismatch = flow.total > 0 ? flow.mismatchRatio : 1;
    const rescueConfidence = clamp01(1 - mismatch);
    return {
      rows: normalized.length > 0 ? normalized : null,
      tokenUsage: Number(groqData?.usage?.total_tokens || 0),
      rescueConfidence,
    };
  } catch {
    return { rows: null, tokenUsage: 0, rescueConfidence: 0 };
  }
};

const countDebitCreditMismatches = (rows: RawTransaction[], reverseOrder: boolean): number => {
  let mismatches = 0;
  const startIndex = reverseOrder ? 0 : 1;
  const endIndex = reverseOrder ? rows.length - 1 : rows.length;
  for (let i = startIndex; i < endIndex; i += 1) {
    const current = rows[i];
    const prev = reverseOrder ? rows[i + 1] : rows[i - 1];
    if (!prev) continue;
    const currentBalance = Number(current.balance);
    const prevBalance = Number(prev.balance);
    if (!Number.isFinite(currentBalance) || !Number.isFinite(prevBalance)) continue;
    const delta = currentBalance - prevBalance;
    if (Math.abs(delta) < 0.005) continue;
    const credit = Number(current.credit ?? 0);
    const debit = Number(current.debit ?? 0);
    if (delta > 0 && credit <= 0 && debit > 0) mismatches += 1;
    if (delta < 0 && debit <= 0 && credit > 0) mismatches += 1;
  }
  return mismatches;
};

const applyDebitCreditHardRule = (rows: RawTransaction[]): { rows: RawTransaction[]; order: 'chron' | 'reverse' } => {
  if (rows.length < 2) return { rows, order: 'chron' };
  const mismatchesChron = countDebitCreditMismatches(rows, false);
  const mismatchesReverse = countDebitCreditMismatches(rows, true);
  const order: 'chron' | 'reverse' = mismatchesReverse + 1 < mismatchesChron ? 'reverse' : 'chron';
  const updated = rows.map((row) => ({ ...row }));

  for (let i = 0; i < updated.length; i += 1) {
    const current = updated[i];
    const prev = order === 'reverse' ? updated[i + 1] : updated[i - 1];
    if (!prev) continue;
    const currentBalance = Number(current.balance);
    const prevBalance = Number(prev.balance);
    if (!Number.isFinite(currentBalance) || !Number.isFinite(prevBalance)) continue;
    const delta = currentBalance - prevBalance;
    if (Math.abs(delta) < 0.005) continue;
    const debit = Number(current.debit ?? 0);
    const credit = Number(current.credit ?? 0);
    const amount = credit > 0 ? credit : debit > 0 ? debit : 0;
    if (amount === 0) continue;
    if (delta > 0 && credit === 0 && debit > 0) {
      current.credit = amount;
      current.debit = 0;
    } else if (delta < 0 && debit === 0 && credit > 0) {
      current.debit = amount;
      current.credit = 0;
    }
  }

  return { rows: updated, order };
};

const applyOcrPostParseAdjustments = (rows: RawTransaction[]): { rows: RawTransaction[]; order: 'chron' | 'reverse' } => {
  const { rows: anchored, order } = applyDebitCreditHardRule(rows);
  const updated = anchored.map((row) => ({ ...row }));
  const startIndex = order === 'reverse' ? 0 : 1;
  const endIndex = order === 'reverse' ? updated.length - 1 : updated.length;

  for (let i = startIndex; i < endIndex; i += 1) {
    const current = updated[i];
    const prev = order === 'reverse' ? updated[i + 1] : updated[i - 1];
    if (!prev) continue;
    const currentBalance = Number(current.balance);
    const prevBalance = Number(prev.balance);
    if (!Number.isFinite(currentBalance) || !Number.isFinite(prevBalance)) continue;
    const delta = currentBalance - prevBalance;
    if (Math.abs(delta) < 0.005) continue;

    const debit = Number(current.debit ?? 0);
    const credit = Number(current.credit ?? 0);

    if (debit === 0 && credit === 0) {
      if (delta > 0) {
        current.credit = Math.abs(delta);
      } else {
        current.debit = Math.abs(delta);
      }
      continue;
    }

    if (debit > 0 && credit > 0) {
      if (delta > 0) {
        current.credit = Math.max(debit, credit);
        current.debit = 0;
      } else {
        current.debit = Math.max(debit, credit);
        current.credit = 0;
      }
    }
  }

  return { rows: updated, order };
};

const FREE_MAX_PDF_PAGES_PER_FILE = 15; // Free-tier per-file PDF cap
const MAX_PDF_PAGE_IMAGES = Number(Deno.env.get('MAX_PDF_PAGE_IMAGES') ?? '120');
const MAX_PDF_PAGE_IMAGE_BYTES = Number(Deno.env.get('MAX_PDF_PAGE_IMAGE_BYTES') ?? `${3 * 1024 * 1024}`); // 3MB
const MAX_PDF_PAGE_IMAGES_TOTAL_BYTES = Number(Deno.env.get('MAX_PDF_PAGE_IMAGES_TOTAL_BYTES') ?? `${30 * 1024 * 1024}`); // 30MB
type OcrWorkerMode = 'off' | 'primary';
const OCR_WORKER_MODE: OcrWorkerMode =
  (Deno.env.get('OCR_WORKER_MODE') || '').trim().toLowerCase() === 'primary' ? 'primary' : 'off';
type DualOcrMode = 'off' | 'smart' | 'always';
const normalizeDualOcrMode = (value: string | undefined): DualOcrMode => {
  const mode = (value || '').trim().toLowerCase();
  if (mode === 'off' || mode === 'always' || mode === 'smart') return mode;
  return 'smart';
};
const OCR_DUAL_PROVIDER_MODE = normalizeDualOcrMode(Deno.env.get('OCR_DUAL_PROVIDER_MODE'));
const OCR_SINGLE_PASS_ONLY = (Deno.env.get('OCR_SINGLE_PASS_ONLY') ?? 'true')
  .trim()
  .toLowerCase() !== 'false';
const AUTO_REPROCESS_MAX_PAGES = Number(Deno.env.get('AUTO_REPROCESS_MAX_PAGES') ?? '8');
const AUTO_REPROCESS_MIN_LOW_RATIO = Number(Deno.env.get('AUTO_REPROCESS_MIN_LOW_RATIO') ?? '0.2');
const AUTO_REPROCESS_MIN_AVG_SCORE = Number(Deno.env.get('AUTO_REPROCESS_MIN_AVG_SCORE') ?? '75');
const OCR_DUAL_PROVIDER_MAX_PAGES = Math.max(
  0,
  Number(Deno.env.get('OCR_DUAL_PROVIDER_MAX_PAGES') ?? (OCR_DUAL_PROVIDER_MODE === 'always' ? '120' : '8')),
);
type StrictOcrRetryMode = 'off' | 'smart' | 'always';
const normalizeStrictOcrRetryMode = (value: string | undefined): StrictOcrRetryMode => {
  const mode = (value || '').trim().toLowerCase();
  if (mode === 'off' || mode === 'always' || mode === 'smart') return mode;
  return 'smart';
};
const STRICT_OCR_RETRY_MODE = normalizeStrictOcrRetryMode(Deno.env.get('OCR_STRICT_RETRY_MODE'));
const STRICT_OCR_RETRY_MAX_PAGES = Math.max(
  0,
  Number(Deno.env.get('OCR_STRICT_RETRY_MAX_PAGES') ?? (STRICT_OCR_RETRY_MODE === 'always' ? '120' : '4')),
);
const PDF_DETERMINISTIC_FAST_PATH_ENABLED =
  (Deno.env.get('PDF_DETERMINISTIC_FAST_PATH_ENABLED') ?? 'true').trim().toLowerCase() !== 'false';
const PDF_DETERMINISTIC_FAST_PATH_MIN_ROWS = Math.max(
  1,
  Number(Deno.env.get('PDF_DETERMINISTIC_FAST_PATH_MIN_ROWS') ?? '10'),
);
const PDF_DETERMINISTIC_FAST_PATH_MAX_MISMATCH = Math.max(
  0,
  Number(Deno.env.get('PDF_DETERMINISTIC_FAST_PATH_MAX_MISMATCH') ?? '0.28'),
);
const DETERMINISTIC_CONFIDENCE_THRESHOLD = Math.max(
  0,
  Math.min(1, Number(Deno.env.get('DETERMINISTIC_CONFIDENCE_THRESHOLD') ?? '0.9')),
);
const OCR_ACCEPTABLE_CONFIDENCE_THRESHOLD = Math.max(
  0,
  Math.min(1, Number(Deno.env.get('OCR_ACCEPTABLE_CONFIDENCE_THRESHOLD') ?? '0.75')),
);
const AI_RESCUE_ENABLED = (Deno.env.get('AI_RESCUE_ENABLED') ?? 'true').trim().toLowerCase() !== 'false';
const AI_RESCUE_MIN_ROWS = Math.max(3, Number(Deno.env.get('AI_RESCUE_MIN_ROWS') ?? '6'));
const AI_RESCUE_MIN_MISMATCH = Math.max(0, Math.min(1, Number(Deno.env.get('AI_RESCUE_MIN_MISMATCH') ?? '0.18')));
const AI_RESCUE_MIN_TEXT_CHARS = Math.max(200, Number(Deno.env.get('AI_RESCUE_MIN_TEXT_CHARS') ?? '1200'));
const EXPECTED_TEXT_TOTAL_MS = Math.max(500, Number(Deno.env.get('EXPECTED_TEXT_TOTAL_MS') ?? '3500'));
const EXPECTED_OCR_TOTAL_MS = Math.max(1500, Number(Deno.env.get('EXPECTED_OCR_TOTAL_MS') ?? '14000'));
const EXPECTED_AI_TOTAL_MS = Math.max(2500, Number(Deno.env.get('EXPECTED_AI_TOTAL_MS') ?? '18000'));

type ParseMode = 'deterministic' | 'ocr' | 'ai_rescue';

type StructuralScanResult = {
  pdfType: 'TEXT' | 'IMAGE' | 'HYBRID' | 'UNKNOWN';
  hasSelectableText: boolean;
  isDigitallyGenerated: boolean;
  pageCount: number;
  rawMetadata: {
    producer: string | null;
    creator: string | null;
    modifiedDate: string | null;
    creationDate: string | null;
  };
  fraudFlags: string[];
};

type BankDetectionLayerResult = {
  bankId: string;
  detectionConfidence: number;
  signals: string[];
};

type TemplateMappingLayerResult = {
  templateId: string;
  templateFound: boolean;
  templateSource: 'fingerprint' | 'bank_detection' | 'generic';
  allowSingleDate: boolean;
};

type ConfidenceBreakdown = {
  score: number;
  parseSuccessRatio: number;
  dateContinuityScore: number;
  balanceValidationScore: number;
  headerMatchScore: number;
  columnAlignmentScore: number;
  errorFlags: string[];
};

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const decodePdfSegment = (bytes: Uint8Array, maxBytes = 300_000): string => {
  if (!bytes || bytes.length === 0) return '';
  const segment = bytes.subarray(0, Math.min(bytes.length, maxBytes));
  return new TextDecoder('latin1', { fatal: false }).decode(segment);
};

const extractPdfInfoString = (payload: string, key: string): string | null => {
  const regex = new RegExp(`/${key}\\s*\\(([^)]{1,180})\\)`, 'i');
  const match = payload.match(regex);
  if (!match) return null;
  const value = match[1].replace(/\\[nrt]/g, ' ').replace(/\s+/g, ' ').trim();
  return value || null;
};

const runStructuralScan = ({
  isPdf,
  fileName,
  bytes,
  pageCount,
  extractedText,
}: {
  isPdf: boolean;
  fileName: string;
  bytes: Uint8Array;
  pageCount: number;
  extractedText: string;
}): StructuralScanResult => {
  const payload = isPdf ? decodePdfSegment(bytes) : '';
  const producer = isPdf ? extractPdfInfoString(payload, 'Producer') : null;
  const creator = isPdf ? extractPdfInfoString(payload, 'Creator') : null;
  const modifiedDate = isPdf ? extractPdfInfoString(payload, 'ModDate') : null;
  const creationDate = isPdf ? extractPdfInfoString(payload, 'CreationDate') : null;
  const selectableTextChars = (extractedText || '').replace(/\s+/g, '').length;
  const hasSelectableText = selectableTextChars >= 80;
  const isDigitallyGenerated = isPdf && hasSelectableText;

  let pdfType: StructuralScanResult['pdfType'] = 'UNKNOWN';
  if (!isPdf) {
    pdfType = 'IMAGE';
  } else if (hasSelectableText && pageCount <= 1) {
    pdfType = 'TEXT';
  } else if (hasSelectableText) {
    pdfType = 'HYBRID';
  } else {
    pdfType = 'IMAGE';
  }

  const fraudFlags: string[] = [];
  const suspiciousProducerPattern =
    /(photoshop|canva|ms word|word|excel|libreoffice|ilovepdf|smallpdf|pdfelement|nitro|foxit editor)/i;
  const producerBlob = `${producer || ''} ${creator || ''}`.trim();
  if (producerBlob && suspiciousProducerPattern.test(producerBlob)) {
    fraudFlags.push('abnormal_producer_string');
  }
  if (creationDate && modifiedDate && modifiedDate < creationDate) {
    fraudFlags.push('edited_timestamp_mismatch');
  }
  if (fileName.toLowerCase().includes('edited')) {
    fraudFlags.push('filename_edit_hint');
  }

  return {
    pdfType,
    hasSelectableText,
    isDigitallyGenerated,
    pageCount,
    rawMetadata: {
      producer,
      creator,
      modifiedDate,
      creationDate,
    },
    fraudFlags,
  };
};

const countDateLikeRows = (text: string): number => {
  if (!text) return 0;
  const matches = text.match(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g);
  return matches ? matches.length : 0;
};

const computeDateContinuityScore = (rows: RawTransaction[]): number => {
  if (!rows.length) return 0;
  const parsed = rows
    .map((row) => new Date(String(row.date || '').trim()))
    .filter((d) => !Number.isNaN(d.getTime()));
  if (!parsed.length) return 0;
  if (parsed.length === 1) return 1;

  let plausibleForward = 0;
  let plausibleReverse = 0;
  for (let i = 1; i < parsed.length; i += 1) {
    const forwardDelta = (parsed[i].getTime() - parsed[i - 1].getTime()) / (1000 * 60 * 60 * 24);
    const reverseDelta = (parsed[i - 1].getTime() - parsed[i].getTime()) / (1000 * 60 * 60 * 24);
    if (forwardDelta >= -2 && forwardDelta <= 45) plausibleForward += 1;
    if (reverseDelta >= -2 && reverseDelta <= 45) plausibleReverse += 1;
  }
  const best = Math.max(plausibleForward, plausibleReverse);
  return clamp01(best / Math.max(1, parsed.length - 1));
};

const computeHeaderMatchScore = (text: string, bankId: string): number => {
  if (!text) return 0;
  const aliases = getHeaderAliasesForHint(bankId);
  const headerBlob = text.slice(0, 5000).toLowerCase();
  const expectedGroups = [aliases.date, aliases.description, aliases.debit, aliases.credit, aliases.balance];
  const matchedGroups = expectedGroups.filter((group) =>
    group.some((alias) => headerBlob.includes(alias.toLowerCase())),
  ).length;
  return clamp01(matchedGroups / expectedGroups.length);
};

const computeColumnAlignmentScore = (rows: RawTransaction[], text: string): number => {
  if (!rows.length) return 0;
  const sideIntegrity = rows.filter((row) => {
    const debit = Math.abs(Number(row.debit || 0));
    const credit = Math.abs(Number(row.credit || 0));
    return (debit > 0 && credit === 0) || (credit > 0 && debit === 0) || (debit === 0 && credit === 0);
  }).length / rows.length;

  const amountTriples = (text.match(/(-?\d{1,3}(?:,\d{3})*\.\d{2}|-?\d+\.\d{2})\s+(-?\d{1,3}(?:,\d{3})*\.\d{2}|-?\d+\.\d{2})\s+(-?\d{1,3}(?:,\d{3})*\.\d{2}|-?\d+\.\d{2})/g) || []).length;
  const layoutSignal = clamp01(amountTriples / Math.max(1, rows.length));

  return clamp01((sideIntegrity * 0.7) + (layoutSignal * 0.3));
};

const computeConfidenceBreakdown = ({
  rows,
  sourceText,
  bankId,
  headerConfidenceHint,
}: {
  rows: RawTransaction[];
  sourceText: string;
  bankId: string;
  headerConfidenceHint: number;
}): ConfidenceBreakdown => {
  const estimatedRows = Math.max(rows.length, countDateLikeRows(sourceText));
  const parseSuccessRatio = clamp01(rows.length / Math.max(1, estimatedRows));
  const dateContinuityScore = computeDateContinuityScore(rows);
  const flow = scoreRunningBalanceFlow(rows);
  const mismatchRatio = flow.total > 0 ? flow.mismatchRatio : 1;
  const balanceValidationScore = clamp01(1 - mismatchRatio);
  const headerMatchScore = clamp01((computeHeaderMatchScore(sourceText, bankId) * 0.7) + (headerConfidenceHint * 0.3));
  const columnAlignmentScore = computeColumnAlignmentScore(rows, sourceText);
  const score = clamp01(
    (parseSuccessRatio * 0.3) +
      (dateContinuityScore * 0.15) +
      (balanceValidationScore * 0.3) +
      (headerMatchScore * 0.15) +
      (columnAlignmentScore * 0.1),
  );

  const errorFlags: string[] = [];
  if (parseSuccessRatio < 0.7) errorFlags.push('low_row_parse_rate');
  if (dateContinuityScore < 0.6) errorFlags.push('date_continuity_issue');
  if (balanceValidationScore < 0.75) errorFlags.push('balance_arithmetic_issue');
  if (headerMatchScore < 0.5) errorFlags.push('header_match_low');
  if (columnAlignmentScore < 0.6) errorFlags.push('column_alignment_low');
  if (rows.length === 0) errorFlags.push('no_rows');

  return {
    score,
    parseSuccessRatio,
    dateContinuityScore,
    balanceValidationScore,
    headerMatchScore,
    columnAlignmentScore,
    errorFlags,
  };
};

const pickBankBySignals = ({
  fileName,
  extractedText,
  cachedTemplateId,
}: {
  fileName: string;
  extractedText: string;
  cachedTemplateId: string | null;
}): BankDetectionLayerResult => {
  const signals: string[] = [];
  if (cachedTemplateId) {
    return {
      bankId: cachedTemplateId,
      detectionConfidence: 0.98,
      signals: ['fingerprint_template_match'],
    };
  }

  const signalText = `${fileName}\n${extractedText}`;
  const template = detectBankTemplate(signalText);
  if (template) {
    signals.push('header_keyword_match');
  }
  if (/\b[A-Z]{4}0[A-Z0-9]{6}\b/.test(signalText)) {
    signals.push('ifsc_pattern');
  }
  if (/statement of account|account statement|bank statement/i.test(signalText)) {
    signals.push('statement_title_pattern');
  }

  if (template) {
    return {
      bankId: template.id,
      detectionConfidence: clamp01(0.65 + (signals.length * 0.1)),
      signals,
    };
  }

  return {
    bankId: 'generic',
    detectionConfidence: 0.25,
    signals: signals.length > 0 ? signals : ['generic_fallback'],
  };
};

const mapTemplateForBank = ({
  bankId,
  extractedText,
  cachedAllowSingleDate,
}: {
  bankId: string;
  extractedText: string;
  cachedAllowSingleDate: boolean;
}): TemplateMappingLayerResult => {
  const template = getBankTemplateById(bankId) ?? detectBankTemplate(extractedText);
  if (template) {
    return {
      templateId: template.id,
      templateFound: true,
      templateSource: template.id === bankId ? 'fingerprint' : 'bank_detection',
      allowSingleDate: cachedAllowSingleDate,
    };
  }
  return {
    templateId: 'generic',
    templateFound: false,
    templateSource: 'generic',
    allowSingleDate: cachedAllowSingleDate,
  };
};

const buildMinimalStructuredLines = (rawText: string): string => {
  const lines = rawText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => /\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|-?\d{1,3}(?:,\d{3})*\.\d{2}|-?\d+\.\d{2}/.test(line))
    .slice(0, 220);
  return lines.join('\n');
};

// ============= DEPLOYMENT-AGNOSTIC CORS =============
// Allows requests from any origin. The edge function runs on Supabase infrastructure
// and the frontend can be hosted anywhere (Vercel, Netlify, Cloudflare, etc.)
const getAllowedOrigin = (requestOrigin: string | null): string => {
  const envOrigin = Deno.env.get('ALLOWED_ORIGIN');

  const allowedOrigins = [
    envOrigin,
    'https://banklefy.lovable.app',
    'https://banklefy.vercel.app',
    'http://localhost:8080',
    'http://localhost:5173',
    'http://localhost:3000',
  ].filter(Boolean) as string[];

  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }

  // Allow *.lovable.app and *.lovableproject.com
  const lovableAppPattern = /^https:\/\/[a-z0-9-]+\.lovable\.app$/;
  const lovableProjectPattern = /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/;
  if (requestOrigin && (lovableAppPattern.test(requestOrigin) || lovableProjectPattern.test(requestOrigin))) {
    return requestOrigin;
  }

  // Allow *.vercel.app (Vercel previews)
  const vercelPattern = /^https:\/\/[a-z0-9-]+\.vercel\.app$/;
  if (requestOrigin && vercelPattern.test(requestOrigin)) {
    return requestOrigin;
  }

  // Allow any origin if ALLOWED_ORIGIN is set to '*'
  if (envOrigin === '*' && requestOrigin) {
    return requestOrigin;
  }

  return allowedOrigins[0] || 'https://banklefy.vercel.app';
};

const getCorsHeaders = (req: Request) => ({
  'Access-Control-Allow-Origin': getAllowedOrigin(req.headers.get('origin')),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
});

const sanitizeError = (error: unknown): string => {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();

    // During debugging we WANT to surface which provider failed.
    // These messages are already sanitized by us (no secrets) and help avoid wasting credits.
    const debugPassThrough = [
      'ai status:',
      'groq vision:',
      'groq text:',
      'gemini:',
      'mistral:',
      'lovable ai:',
      'credits exhausted',
      'requires page images',
      'pdf requires page images',
    ];
    if (debugPassThrough.some((s) => msg.includes(s))) {
      return error.message;
    }

    if (msg.includes('relation') || msg.includes('table') || msg.includes('column')) {
      return 'Database configuration error';
    }
    if (msg.includes('auth') || msg.includes('jwt') || msg.includes('token')) {
      return 'Authentication failed';
    }
    if (msg.includes('storage') || msg.includes('bucket')) {
      return 'File storage error';
    }
    const safeMessages = [
      'no transactions found in the document',
      'failed to extract transaction data from document',
      'the document has no pages',
      'document appears to be empty or corrupted',
      'unable to read document content',
      'invalid or unsupported document format',
      'password',
      'encrypted',
      'protected',
    ];
    if (safeMessages.some(safe => msg.includes(safe))) {
      return error.message;
    }
    if (msg.includes('ai') || msg.includes('gateway') || msg.includes('lovable')) {
      return 'Processing service unavailable';
    }
    if (msg.includes('api') || msg.includes('fetch')) {
      return 'External service error';
    }
  }
  return 'An unexpected error occurred. Please try again later.';
};

async function verifyRecaptcha(token: string): Promise<boolean> {
  const secretKey = Deno.env.get('RECAPTCHA_SECRET_KEY');
  if (!secretKey) {
    console.error('RECAPTCHA_SECRET_KEY not configured');
    return false;
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${secretKey}&response=${token}`,
    });
    const data = await response.json();
    console.log('reCAPTCHA verification result:', { success: data.success });
    return data.success === true;
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return false;
  }
}

const isValidTimezone = (tz: string): boolean => {
  if (!tz || typeof tz !== 'string' || tz.length > 50) return false;
  const validPattern = /^[A-Za-z0-9_/+-]+$/;
  return validPattern.test(tz);
};

const estimateBase64Bytes = (base64: string): number => {
  const cleaned = base64.trim();
  const padding = cleaned.endsWith('==') ? 2 : cleaned.endsWith('=') ? 1 : 0;
  return Math.floor((cleaned.length * 3) / 4) - padding;
};

const isMissingColumnError = (error: unknown, column: string): boolean => {
  if (!error || typeof error !== 'object') return false;
  const message = String((error as { message?: unknown }).message ?? '').toLowerCase();
  return message.includes('column') && message.includes(column.toLowerCase()) && message.includes('does not exist');
};

const toNumber = (value: unknown, fallback: number): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const toDateString = (value: unknown): string | null => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
};

const pickString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const pickNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[,\s]/g, '').trim();
    if (!cleaned) return undefined;
    const numeric = Number(cleaned);
    return Number.isFinite(numeric) ? numeric : undefined;
  }
  return undefined;
};

const normalizeClientBankMetadata = (value: unknown): BankMetadata | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;

  const metadata: BankMetadata = {
    bankName: pickString(raw.bankName) || '',
    accountNumber: pickString(raw.accountNumber) || '',
    accountHolder: pickString(raw.accountHolder) || '',
    currency: pickString(raw.currency) || '',
    iban: pickString(raw.iban),
    ifsc: pickString(raw.ifsc),
    swift: pickString(raw.swift),
    routingNumber: pickString(raw.routingNumber),
    sortCode: pickString(raw.sortCode),
    bsb: pickString(raw.bsb),
    micr: pickString(raw.micr),
    statementPeriod: pickString(raw.statementPeriod),
    openingBalance: pickNumber(raw.openingBalance),
    closingBalance: pickNumber(raw.closingBalance),
  };

  const hasValue = Object.values(metadata).some((field) =>
    (typeof field === 'string' && field.trim().length > 0) ||
    (typeof field === 'number' && Number.isFinite(field))
  );

  return hasValue ? metadata : undefined;
};

const mergeBankMetadata = (...candidates: Array<BankMetadata | undefined>): BankMetadata | undefined => {
  const merged: BankMetadata = {
    bankName: '',
    accountNumber: '',
    accountHolder: '',
    currency: '',
  };
  let hasValue = false;
  const writable = merged as unknown as Record<string, unknown>;

  const assignString = (key: keyof BankMetadata, value: unknown) => {
    if (typeof value !== 'string') return;
    const trimmed = value.trim();
    if (!trimmed) return;
    const current = merged[key];
    if (typeof current === 'string' && current.trim()) return;
    writable[key] = trimmed;
    hasValue = true;
  };

  const assignNumber = (key: keyof BankMetadata, value: unknown) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return;
    const current = merged[key];
    if (typeof current === 'number' && Number.isFinite(current)) return;
    writable[key] = value;
    hasValue = true;
  };

  for (const candidate of candidates) {
    if (!candidate) continue;
    assignString('bankName', candidate.bankName);
    assignString('accountNumber', candidate.accountNumber);
    assignString('accountHolder', candidate.accountHolder);
    assignString('currency', candidate.currency);
    assignString('iban', candidate.iban);
    assignString('ifsc', candidate.ifsc);
    assignString('swift', candidate.swift);
    assignString('routingNumber', candidate.routingNumber);
    assignString('sortCode', candidate.sortCode);
    assignString('bsb', candidate.bsb);
    assignString('micr', candidate.micr);
    assignString('statementPeriod', candidate.statementPeriod);
    assignNumber('openingBalance', candidate.openingBalance);
    assignNumber('closingBalance', candidate.closingBalance);
  }

  return hasValue ? merged : undefined;
};

const normalizeCurrencyCode = (value: string | undefined): string => {
  if (!value) return '';
  const cleaned = value.replace(/[^A-Za-z]/g, '').toUpperCase();
  if (cleaned.length === 3) return cleaned;
  if (cleaned.startsWith('RS') || cleaned.includes('INR')) return 'INR';
  if (cleaned.includes('AED')) return 'AED';
  if (cleaned.includes('USD')) return 'USD';
  if (cleaned.includes('EUR')) return 'EUR';
  if (cleaned.includes('GBP')) return 'GBP';
  return cleaned.slice(0, 3);
};

const dedupeAndSortTransactions = (rows: Transaction[]): Transaction[] => {
  const seen = new Set<string>();
  const deduped: Transaction[] = [];
  for (const row of rows) {
    const key = [
      String(row.date || '').trim(),
      String(row.description || '').trim().toLowerCase(),
      Number(row.debit || 0).toFixed(2),
      Number(row.credit || 0).toFixed(2),
      Number(row.balance || 0).toFixed(2),
    ].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(row);
  }
  deduped.sort((a, b) => {
    const aTime = new Date(a.date || '').getTime();
    const bTime = new Date(b.date || '').getTime();
    if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
    if (Number.isNaN(aTime)) return 1;
    if (Number.isNaN(bTime)) return -1;
    return aTime - bTime;
  });
  return deduped;
};

const balanceMismatchRatio = (transactions: RawTransaction[] | undefined): number => {
  if (!transactions || transactions.length === 0) return 1;
  const flow = scoreRunningBalanceFlow(transactions);
  return flow.total > 0 ? flow.mismatchRatio : 1;
};

const shouldForceOcrForDenseStatement = (
  fileNameLower: string,
  bankMetadata: BankMetadata | undefined,
  transactions: RawTransaction[],
): boolean => {
  const bankHint = `${fileNameLower} ${String(bankMetadata?.bankName || '')}`.toLowerCase();
  if (isDenseTableBankHint(bankHint)) return true;
  if (transactions.length < 8) return false;

  let codeHits = 0;
  for (const transaction of transactions.slice(0, 200)) {
    const blob = `${String(transaction.refNumber || '')} ${String(transaction.description || '')}`.toLowerCase();
    if (/\bphub|mob|trf\b/.test(blob)) codeHits += 1;
  }
  return codeHits >= 4;
};

type OcrHardnessLevel = 'easy' | 'normal' | 'hard' | 'extreme';

type AdaptiveOcrStrategy = {
  level: OcrHardnessLevel;
  strictMode: StrictOcrRetryMode;
  strictMaxPages: number;
  dualMode: DualOcrMode;
  dualMaxPages: number;
  strictFirstPass: boolean;
  hardForFreeTier: boolean;
  reasons: string[];
};

const clampAdaptivePageLimit = (requested: number, pageCount: number, globalLimit: number): number => {
  const safeRequested = Number.isFinite(requested) ? Math.max(0, Math.floor(requested)) : 0;
  const safePages = Number.isFinite(pageCount) ? Math.max(1, Math.floor(pageCount)) : 1;
  const safeGlobal = Number.isFinite(globalLimit) ? Math.max(0, Math.floor(globalLimit)) : 0;
  return Math.min(safeRequested, safePages, safeGlobal);
};

const deriveAdaptiveOcrStrategy = (
  fileNameLower: string,
  pageCount: number,
  clientPdfParseAssessment: ClientPdfParseAssessment,
  forceOcrForDenseStatement: boolean,
): AdaptiveOcrStrategy => {
  const normalizedPageCount = Number.isFinite(pageCount) ? Math.max(1, Math.floor(pageCount)) : 1;
  let hardnessScore = 0;
  const reasons: string[] = [];

  if (forceOcrForDenseStatement) {
    hardnessScore += 4;
    reasons.push('dense_statement_pattern');
  }
  if (normalizedPageCount >= 3) {
    hardnessScore += 1;
    reasons.push('multi_page_pdf');
  }
  if (normalizedPageCount >= 7) {
    hardnessScore += 1;
    reasons.push('high_page_count');
  }
  if (clientPdfParseAssessment.requiresHeavyOcr) {
    hardnessScore += 3;
    reasons.push('heavy_ocr_required');
  }
  if (clientPdfParseAssessment.mismatchRatio >= 0.35) {
    hardnessScore += 3;
    reasons.push('severe_balance_mismatch');
  } else if (clientPdfParseAssessment.mismatchRatio >= 0.18) {
    hardnessScore += 1;
    reasons.push('moderate_balance_mismatch');
  }
  if (clientPdfParseAssessment.anomalyRate >= 0.4) {
    hardnessScore += 2;
    reasons.push('high_amount_anomaly_rate');
  } else if (clientPdfParseAssessment.anomalyRate >= 0.2) {
    hardnessScore += 1;
    reasons.push('moderate_amount_anomaly_rate');
  }
  if (isComplexBankLayoutHint(fileNameLower)) {
    hardnessScore += 2;
    reasons.push('complex_table_layout_hint');
  }

  let level: OcrHardnessLevel = 'easy';
  if (hardnessScore >= 8) level = 'extreme';
  else if (hardnessScore >= 5) level = 'hard';
  else if (hardnessScore >= 2) level = 'normal';

  const strictMode: StrictOcrRetryMode = (() => {
    if (STRICT_OCR_RETRY_MODE === 'off') return 'off';
    if (STRICT_OCR_RETRY_MODE === 'always') return 'always';
    if (level === 'easy') return 'off';
    if (level === 'normal') return 'smart';
    return 'always';
  })();
  const strictRequestedPages =
    level === 'easy' ? 0 :
    level === 'normal' ? Math.max(1, Math.ceil(normalizedPageCount * 0.4)) :
    level === 'hard' ? Math.max(2, Math.ceil(normalizedPageCount * 0.8)) :
    normalizedPageCount;
  const strictMaxPages = strictMode === 'off'
    ? 0
    : clampAdaptivePageLimit(strictRequestedPages, normalizedPageCount, STRICT_OCR_RETRY_MAX_PAGES);

  const dualMode: DualOcrMode = (() => {
    if (OCR_DUAL_PROVIDER_MODE === 'off') return 'off';
    if (OCR_DUAL_PROVIDER_MODE === 'always') return 'always';
    if (level === 'easy') return 'off';
    if (level === 'normal') return 'smart';
    return 'always';
  })();
  const dualRequestedPages =
    level === 'easy' ? 0 :
    level === 'normal' ? Math.max(1, Math.ceil(normalizedPageCount * 0.35)) :
    level === 'hard' ? Math.max(2, Math.ceil(normalizedPageCount * 0.75)) :
    normalizedPageCount;
  const dualMaxPages = dualMode === 'off'
    ? 0
    : clampAdaptivePageLimit(dualRequestedPages, normalizedPageCount, OCR_DUAL_PROVIDER_MAX_PAGES);

  return {
    level,
    strictMode,
    strictMaxPages,
    dualMode,
    dualMaxPages,
    strictFirstPass: level === 'hard' || level === 'extreme',
    hardForFreeTier: level === 'hard' || level === 'extreme',
    reasons,
  };
};

const shouldRetryStrictVisionPass = (
  fileNameLower: string,
  primaryResult: OCRResult,
  mode: StrictOcrRetryMode,
): boolean => {
  if (mode === 'off') return false;
  if (mode === 'always') return true;

  const tx = primaryResult.transactions || [];
  const likelyDenseTableBank = isDenseTableBankHint(fileNameLower);
  if (likelyDenseTableBank && tx.length <= 40) return true;
  if (!primaryResult.success || tx.length === 0) return true;

  const mismatchRatio = balanceMismatchRatio(tx);
  if (tx.length >= 8 && mismatchRatio > 0.1) return true;
  if (tx.length >= 4 && mismatchRatio > 0.2) return true;
  return false;
};

const chooseBetterVisionResult = (primaryResult: OCRResult, strictResult: OCRResult): OCRResult => {
  const primaryTx = primaryResult.transactions || [];
  const strictTx = strictResult.transactions || [];
  if (!strictResult.success || strictTx.length === 0) {
    return primaryResult;
  }
  if (!primaryResult.success || primaryTx.length === 0) {
    return strictResult;
  }

  const primaryMismatch = balanceMismatchRatio(primaryTx);
  const strictMismatch = balanceMismatchRatio(strictTx);
  const strictHasEnoughRows = strictTx.length >= Math.max(3, primaryTx.length - 2);
  const strictHasMoreRows = strictTx.length >= primaryTx.length + 2;

  if (strictHasEnoughRows && strictMismatch + 0.08 < primaryMismatch) {
    return strictResult;
  }
  if (strictHasMoreRows && strictMismatch <= primaryMismatch + 0.05) {
    return strictResult;
  }
  return primaryResult;
};

const shouldRunMistralDualPass = (
  fileNameLower: string,
  groqResult: OCRResult,
  mode: DualOcrMode,
): boolean => {
  if (mode === 'off') return false;
  if (mode === 'always') return true;

  const tx = groqResult.transactions || [];
  const bankHints = [
    fileNameLower,
    String(groqResult.bankMetadata?.bankName || ''),
    String(groqResult.text || ''),
  ].join(' ');
  const likelyDenseTableBank = isDualPassBankHint(bankHints);
  if (!groqResult.success || tx.length === 0) return true;
  if (likelyDenseTableBank && tx.length <= 60) return true;

  const mismatchRatio = balanceMismatchRatio(tx);
  if (tx.length >= 8 && mismatchRatio > 0.08) return true;
  if (tx.length >= 4 && mismatchRatio > 0.18) return true;
  return false;
};

const mergeProviderResults = (primary: OCRResult, secondary: OCRResult): OCRResult => {
  if (!secondary.success || !secondary.transactions || secondary.transactions.length === 0) {
    return primary;
  }
  if (!primary.success || !primary.transactions || primary.transactions.length === 0) {
    return secondary;
  }

  const mergedTransactions = mergeOcrTransactionsDeterministic(primary.transactions, secondary.transactions);
  const primaryMismatch = balanceMismatchRatio(primary.transactions);
  const secondaryMismatch = balanceMismatchRatio(secondary.transactions);
  const mergedMismatch = balanceMismatchRatio(mergedTransactions);

  // Keep deterministic winner by balance consistency + row coverage.
  let chosenTransactions = primary.transactions;
  let chosenMismatch = primaryMismatch;
  if (
    mergedTransactions.length >= Math.max(primary.transactions.length, secondary.transactions.length) - 1 &&
    mergedMismatch <= Math.min(primaryMismatch, secondaryMismatch) + 0.02
  ) {
    chosenTransactions = mergedTransactions;
    chosenMismatch = mergedMismatch;
  } else if (
    secondary.transactions.length >= Math.max(4, primary.transactions.length - 2) &&
    secondaryMismatch + 0.05 < primaryMismatch
  ) {
    chosenTransactions = secondary.transactions;
    chosenMismatch = secondaryMismatch;
  }

  if (chosenTransactions === primary.transactions) return primary;

  console.log(
    `Dual OCR merge selected non-primary result (primary mismatch ${primaryMismatch.toFixed(3)}, secondary ${secondaryMismatch.toFixed(3)}, merged ${mergedMismatch.toFixed(3)}, chosen ${chosenMismatch.toFixed(3)})`,
  );

  return {
    success: true,
    transactions: chosenTransactions,
    text: [primary.text, secondary.text].filter(Boolean).join('\n').trim(),
    bankMetadata: mergeBankMetadata(primary.bankMetadata, secondary.bankMetadata),
  };
};

const normalizePlan = (value: unknown): string =>
  typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : 'free';

const normalizeLegacyPlanType = (planType: string, conversionsLimit: number): string => {
  if (
    planType === 'free' ||
    planType === 'unlimited' ||
    planType.startsWith('monthly') ||
    planType.startsWith('yearly') ||
    planType.startsWith('per_page')
  ) {
    return planType;
  }

  if (planType === 'daily') {
    if (conversionsLimit >= 4500) return 'monthly_enterprise';
    if (conversionsLimit >= 1000) return 'monthly_pro';
    if (conversionsLimit >= 300) return 'monthly_basic';
    return 'daily';
  }

  if (planType === 'business') {
    if (conversionsLimit >= 65000) return 'yearly_pro';
    if (conversionsLimit >= 15000) return 'yearly_full';
    if (conversionsLimit >= 5000) return 'yearly_lite';
    if (conversionsLimit === 50) return 'per_page_power';
    if (conversionsLimit === 25) return 'per_page_standard';
    if (conversionsLimit === 10) return 'per_page_lite';
    return 'business';
  }

  return planType;
};

const resolvePlanType = (row: Record<string, unknown> | null): string => {
  if (!row) return 'free';
  const conversionsLimit = toNumber(row.conversions_limit, 0);
  const planType = normalizePlan(row.plan_type);
  if (planType !== 'free') return normalizeLegacyPlanType(planType, conversionsLimit);
  return normalizeLegacyPlanType(normalizePlan(row.tier), conversionsLimit);
};

const isKnownPaidPlan = (normalizedPlan: string): boolean =>
  normalizedPlan === 'unlimited' ||
  normalizedPlan.startsWith('per_page') ||
  normalizedPlan.startsWith('monthly') ||
  normalizedPlan.startsWith('yearly') ||
  normalizedPlan === 'daily' ||
  normalizedPlan === 'business';

const getDatePartsInTimezone = (timezone: string) => {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());

    const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
    const month = parts.find((part) => part.type === 'month')?.value ?? '01';
    const day = parts.find((part) => part.type === 'day')?.value ?? '01';

    return {
      year,
      month,
      day,
      isoDate: `${year}-${month}-${day}`,
    };
  } catch {
    const now = new Date();
    const year = String(now.getUTCFullYear());
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    return {
      year,
      month,
      day,
      isoDate: `${year}-${month}-${day}`,
    };
  }
};

const getResetBoundary = (planType: string, dateParts: { year: string; month: string; isoDate: string }): string | null => {
  const normalizedPlan = normalizePlan(planType);
  const isMonthly = normalizedPlan.startsWith('monthly') || normalizedPlan === 'daily';
  const isYearly = normalizedPlan.startsWith('yearly') || normalizedPlan === 'business';
  if (isMonthly) return `${dateParts.year}-${dateParts.month}-01`;
  if (isYearly) return `${dateParts.year}-01-01`;
  if (!isKnownPaidPlan(normalizedPlan)) return dateParts.isoDate;
  return null;
};

const updateAnonymousUsage = async (
  supabaseAdmin: any,
  keyColumn: 'ip_address' | 'tracking_key',
  trackingKey: string,
  payload: Record<string, unknown>,
) => {
  const { error } = await supabaseAdmin
    .from('anonymous_usage')
    .update(payload as any)
    .eq(keyColumn, trackingKey);

  return { error };
};

const readAnonymousUsage = async (
  supabaseAdmin: any,
  trackingKey: string,
) => {
  const firstTry = await supabaseAdmin
    .from('anonymous_usage')
    .select('*')
    .eq('ip_address', trackingKey)
    .maybeSingle();

  if (!firstTry.error || !isMissingColumnError(firstTry.error, 'ip_address')) {
    return { keyColumn: 'ip_address' as const, ...firstTry };
  }

  const secondTry = await supabaseAdmin
    .from('anonymous_usage')
    .select('*')
    .eq('tracking_key', trackingKey)
    .maybeSingle();

  return { keyColumn: 'tracking_key' as const, ...secondTry };
};

const checkLimitFallback = async ({
  supabaseAdmin,
  userId,
  trackingKey,
  timezone,
}: {
  supabaseAdmin: any;
  userId: string | null;
  trackingKey: string;
  timezone: string;
}) => {
  try {
    const dateParts = getDatePartsInTimezone(timezone);
    const today = dateParts.isoDate;

    if (userId) {
      const subscriptionResponse = await supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      let row = (subscriptionResponse.data as Record<string, unknown> | null) ?? null;

      if (subscriptionResponse.error) {
        console.error('Fallback subscription read failed:', subscriptionResponse.error);
        return {
          conversionsUsed: 0,
          conversionsLimit: 5,
          planType: 'free',
        };
      }

      if (!row) {
        const created = await supabaseAdmin
          .from('subscriptions')
          .insert({
            user_id: userId,
            conversions_used: 0,
            conversions_limit: 5,
            last_reset_date: today,
            timezone,
            plan_type: 'free',
          } as any)
          .select('*')
          .maybeSingle();

        if (created.error) {
          console.error('Fallback subscription create failed:', created.error);
          return {
            conversionsUsed: 0,
            conversionsLimit: 5,
            planType: 'free',
          };
        }

        row = (created.data as Record<string, unknown> | null) ?? {
          conversions_used: 0,
          conversions_limit: 5,
          last_reset_date: today,
          plan_type: 'free',
        };
      }

      const planType = resolvePlanType(row);
      const rowData = row as Record<string, unknown>;
      const hasBuckets = Object.prototype.hasOwnProperty.call(rowData, 'free_daily_limit');
      const lastResetDate = toDateString(rowData.last_reset_date);
      const resetBoundary = getResetBoundary(planType, dateParts);

      if (hasBuckets) {
        const freeLimit = toNumber(rowData.free_daily_limit, 5);
        let freeUsed = toNumber(rowData.free_daily_used, 0);
        const monthlyLimit = toNumber(rowData.monthly_limit, 0);
        let monthlyUsed = toNumber(rowData.monthly_used, 0);
        const yearlyLimit = toNumber(rowData.yearly_limit, 0);
        let yearlyUsed = toNumber(rowData.yearly_used, 0);
        const packLimit = toNumber(rowData.pack_limit, 0);
        const packUsed = toNumber(rowData.pack_used, 0);

        const monthBoundary = `${dateParts.year}-${dateParts.month}-01`;
        const yearBoundary = `${dateParts.year}-01-01`;
        const monthReset = toDateString(rowData.monthly_reset_date);
        const yearReset = toDateString(rowData.yearly_reset_date);

        if (!lastResetDate || lastResetDate < dateParts.isoDate) {
          freeUsed = 0;
        }
        if (!monthReset || monthReset < monthBoundary) {
          monthlyUsed = 0;
        }
        if (!yearReset || yearReset < yearBoundary) {
          yearlyUsed = 0;
        }

        const conversionsLimit = freeLimit + monthlyLimit + yearlyLimit + packLimit;
        const conversionsUsed = freeUsed + monthlyUsed + yearlyUsed + packUsed;

        return {
          conversionsUsed,
          conversionsLimit,
          planType,
        };
      }

      const conversionsLimit = toNumber(rowData.conversions_limit, 5);
      let conversionsUsed = toNumber(rowData.conversions_used, 0);

      if (resetBoundary && (!lastResetDate || lastResetDate < resetBoundary)) {
        const { error: resetError } = await supabaseAdmin
          .from('subscriptions')
          .update({
            conversions_used: 0,
            last_reset_date: resetBoundary,
            timezone,
          } as any)
          .eq('user_id', userId);

        if (resetError) {
          console.error('Fallback subscription reset failed:', resetError);
        } else {
          conversionsUsed = 0;
        }
      }

      return {
        conversionsUsed,
        conversionsLimit,
        planType,
      };
    }

    const anonRead = await readAnonymousUsage(supabaseAdmin, trackingKey);
    if (anonRead.error) {
      console.error('Fallback anonymous usage read failed:', anonRead.error);
      return {
        conversionsUsed: 0,
        conversionsLimit: 2,
        planType: 'free',
      };
    }

    let row = (anonRead.data as Record<string, unknown> | null) ?? null;
    const keyColumn = anonRead.keyColumn;

    if (!row) {
      const insertPayload: Record<string, unknown> = {
        conversions_count: 0,
        last_reset_date: today,
        timezone,
      };
      insertPayload[keyColumn] = trackingKey;

      const created = await supabaseAdmin
        .from('anonymous_usage')
        .insert(insertPayload as any)
        .select('*')
        .maybeSingle();

      if (created.error) {
        console.error('Fallback anonymous usage create failed:', created.error);
        return {
          conversionsUsed: 0,
          conversionsLimit: 2,
          planType: 'free',
        };
      }

      row = (created.data as Record<string, unknown> | null) ?? {
        conversions_count: 0,
        last_reset_date: today,
      };
    }

    let conversionsUsed = toNumber(row.conversions_count ?? row.conversions_used, 0);
    const lastResetDate = toDateString(row.last_reset_date);

    if (!lastResetDate || lastResetDate < today) {
      const { error: resetError } = await updateAnonymousUsage(supabaseAdmin, keyColumn, trackingKey, {
        conversions_count: 0,
        last_reset_date: today,
        timezone,
      });
      if (resetError) {
        console.error('Fallback anonymous reset failed:', resetError);
      } else {
        conversionsUsed = 0;
      }
    }

    return {
      conversionsUsed,
      conversionsLimit: 2,
      planType: 'free',
    };
  } catch (error) {
    console.error('Fallback limit check crashed:', error);
    return {
      conversionsUsed: 0,
      conversionsLimit: userId ? 5 : 2,
      planType: 'free',
    };
  }
};

const incrementUsageFallback = async ({
  supabaseAdmin,
  userId,
  trackingKey,
  incrementBy,
  timezone,
}: {
  supabaseAdmin: any;
  userId: string | null;
  trackingKey: string;
  incrementBy: number;
  timezone: string;
}) => {
  try {
    const dateParts = getDatePartsInTimezone(timezone);
    const today = dateParts.isoDate;

    if (userId) {
      const { data: row, error: readError } = await supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (readError) {
        return { ok: false, error: readError };
      }

      if (!row) {
        const { error: insertError } = await supabaseAdmin
          .from('subscriptions')
          .insert({
            user_id: userId,
            conversions_used: incrementBy,
            conversions_limit: 5,
            last_reset_date: today,
            timezone,
            plan_type: 'free',
          } as any);
        return { ok: !insertError, error: insertError };
      }

      const rowData = row as Record<string, unknown>;
      const hasBuckets = Object.prototype.hasOwnProperty.call(rowData, 'free_daily_limit');
      if (hasBuckets) {
        let remaining = incrementBy;
        const freeLimit = toNumber(rowData.free_daily_limit, 5);
        let freeUsed = toNumber(rowData.free_daily_used, 0);
        const packLimit = toNumber(rowData.pack_limit, 0);
        let packUsed = toNumber(rowData.pack_used, 0);
        const monthlyLimit = toNumber(rowData.monthly_limit, 0);
        let monthlyUsed = toNumber(rowData.monthly_used, 0);
        const yearlyLimit = toNumber(rowData.yearly_limit, 0);
        let yearlyUsed = toNumber(rowData.yearly_used, 0);

        const take = (limit: number, used: number) => {
          const avail = Math.max(0, limit - used);
          const consume = Math.min(avail, remaining);
          remaining -= consume;
          return used + consume;
        };

        freeUsed = take(freeLimit, freeUsed);
        packUsed = take(packLimit, packUsed);
        monthlyUsed = take(monthlyLimit, monthlyUsed);
        yearlyUsed = take(yearlyLimit, yearlyUsed);

        const conversionsUsed = freeUsed + packUsed + monthlyUsed + yearlyUsed;
        const conversionsLimit = freeLimit + packLimit + monthlyLimit + yearlyLimit;

        const { error: updateError } = await supabaseAdmin
          .from('subscriptions')
          .update({
            free_daily_used: freeUsed,
            pack_used: packUsed,
            monthly_used: monthlyUsed,
            yearly_used: yearlyUsed,
            pages_used_this_month: monthlyUsed,
            conversions_used: conversionsUsed,
            conversions_limit: conversionsLimit,
            timezone,
          } as any)
          .eq('user_id', userId);
        return { ok: !updateError, error: updateError };
      }

      const nextValue = toNumber(rowData.conversions_used, 0) + incrementBy;
      const { error: updateError } = await supabaseAdmin
        .from('subscriptions')
        .update({ conversions_used: nextValue, timezone } as any)
        .eq('user_id', userId);
      return { ok: !updateError, error: updateError };
    }

    const anonRead = await readAnonymousUsage(supabaseAdmin, trackingKey);
    if (anonRead.error) {
      return { ok: false, error: anonRead.error };
    }

    const keyColumn = anonRead.keyColumn;
    const row = (anonRead.data as Record<string, unknown> | null) ?? null;

    if (!row) {
      const payload: Record<string, unknown> = {
        conversions_count: incrementBy,
        last_reset_date: today,
        timezone,
      };
      payload[keyColumn] = trackingKey;
      const { error: insertError } = await supabaseAdmin
        .from('anonymous_usage')
        .insert(payload as any);
      return { ok: !insertError, error: insertError };
    }

    const nextValue = toNumber(row.conversions_count ?? row.conversions_used, 0) + incrementBy;
    const { error: updateError } = await updateAnonymousUsage(supabaseAdmin, keyColumn, trackingKey, {
      conversions_count: nextValue,
      timezone,
    });
    return { ok: !updateError, error: updateError };
  } catch (error) {
    return { ok: false, error };
  }
};

// ============= MAIN HANDLER =============
Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let supabaseAdmin: any = null;
  let shouldCleanupUploadedSource = false;
  let uploadedSourcePath: string | null = null;
  const totalStart = Date.now();
  const timing: Record<string, number> = {
    text_extract_ms: 0,
    deterministic_parse_ms: 0,
    template_recheck_ms: 0,
    ocr_ms: 0,
    ai_ms: 0,
    validation_ms: 0,
    output_ms: 0,
    total_ms: 0,
  };
  const pipelineDiagnostics: Record<string, Record<string, unknown>> = {};

  try {
    // Parse request
    const {
      fileId,
      fileName,
      fileData: base64FileData,
      timezone,
      recaptchaToken,
      outputMode,
      pdfPassword,
      pdfPageImages,
      pdfParsedTransactions,
      pdfParsedBankMetadata,
    } = await req.json();
    const requestedOutputMode = outputMode === 'tally_only' ? 'tally_only' : 'standard';
    const userTimezone = (timezone && isValidTimezone(timezone)) ? timezone : 'UTC';
    
    // Robust client tracking to prevent bypasses
    const trackingKey = await getTrackingKey(req);

    // Create Supabase admin client (service role for privileged operations)
    supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ============= AUTHENTICATION CHECK =============
    // Detect authenticated users via Authorization: Bearer <token> header
    // Use supabaseAdmin.auth.getUser(token) to validate the token server-side
    const authHeader = req.headers.get('Authorization');
    let user = null;
    let supabase = supabaseAdmin;

    if (authHeader && authHeader.startsWith('Bearer ') && authHeader !== 'Bearer null') {
      const token = authHeader.replace('Bearer ', '');

      // Validate token using admin client for secure server-side verification
      const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

      if (!authError && authUser) {
        user = authUser;
        console.log('Authenticated user detected');

        // Create user-scoped client for RLS-protected operations
        supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          { global: { headers: { Authorization: authHeader } } }
        );
      } else {
        console.log('Token validation failed:', authError?.message || 'Invalid token');
      }
    }

    // ============= reCAPTCHA ENFORCEMENT =============
    // RULE: reCAPTCHA is ONLY required for anonymous (unauthenticated) users
    // Authenticated users with valid tokens COMPLETELY SKIP reCAPTCHA
    if (!user) {
      console.log('Anonymous user detected - reCAPTCHA required');

      if (!recaptchaToken) {
        return new Response(
          JSON.stringify({ error: 'CAPTCHA verification required for anonymous users' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const isValidCaptcha = await verifyRecaptcha(recaptchaToken);
      if (!isValidCaptcha) {
        return new Response(
          JSON.stringify({ error: 'CAPTCHA verification failed. Please try again.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log('reCAPTCHA verified successfully for anonymous user');
    } else {
      console.log('Authenticated user - reCAPTCHA SKIPPED');
    }

    console.log('Processing conversion:', {
      isAuthenticated: !!user,
      client: user ? 'authenticated' : 'anonymous',
      timezone: userTimezone,
    });

    // Validate request
    if (!fileName) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: fileName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const hasPdfPageImages = Array.isArray(pdfPageImages) && pdfPageImages.length > 0;

    if (!user && !base64FileData && !hasPdfPageImages) {
      return new Response(
        JSON.stringify({ error: 'File data required for anonymous users' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (user && !fileId && !hasPdfPageImages) {
      return new Response(
        JSON.stringify({ error: 'File ID or PDF page images required for authenticated users' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const storageFilePath = user && typeof fileId === 'string' && fileId.length > 0
      ? (fileId.startsWith(`${user.id}/`) ? fileId : `${user.id}/${fileId}`)
      : null;
    if (storageFilePath) {
      uploadedSourcePath = storageFilePath;
      shouldCleanupUploadedSource = true;
    }

    if (typeof fileName !== 'string' || fileName.length > 255 || fileName.includes('..') || fileName.includes('/')) {
      return new Response(
        JSON.stringify({ error: 'Invalid file name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate PDF page images payload size to avoid memory/time blowups
    if (Array.isArray(pdfPageImages) && pdfPageImages.length > 0) {
      if (pdfPageImages.length > MAX_PDF_PAGE_IMAGES) {
        return new Response(
          JSON.stringify({ error: `Too many page images (max ${MAX_PDF_PAGE_IMAGES})` }),
          { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let totalBytes = 0;
      for (const img of pdfPageImages) {
        if (typeof img !== 'string') continue;
        const match = img.match(/^data:([^;]+);base64,(.+)$/);
        const base64Payload = match ? match[2] : img;
        const sizeBytes = estimateBase64Bytes(base64Payload);
        totalBytes += sizeBytes;
        if (sizeBytes > MAX_PDF_PAGE_IMAGE_BYTES) {
          return new Response(
            JSON.stringify({ error: `A page image exceeds ${Math.round(MAX_PDF_PAGE_IMAGE_BYTES / (1024 * 1024))}MB` }),
            { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (totalBytes > MAX_PDF_PAGE_IMAGES_TOTAL_BYTES) {
          return new Response(
            JSON.stringify({ error: `Total page images exceed ${Math.round(MAX_PDF_PAGE_IMAGES_TOTAL_BYTES / (1024 * 1024))}MB` }),
            { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Get file bytes
    let bytes: Uint8Array;

    if (user && storageFilePath && !hasPdfPageImages) {
      const { data: fileData, error: downloadError } = await supabaseAdmin.storage
        .from('bank-statements')
        .download(storageFilePath);

      if (downloadError || !fileData) {
        return new Response(
          JSON.stringify({ error: 'File not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const buffer = await fileData.arrayBuffer();
      bytes = new Uint8Array(buffer);
    } else {
      try {
        // If PDF pages are provided as images, we may not have a PDF base64.
        const base64Content = base64FileData?.split?.(',')?.[1] || base64FileData;
        if (!base64Content) {
          bytes = new Uint8Array();
        } else {
        const binaryString = atob(base64Content);
        bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        }
      } catch {
        return new Response(
          JSON.stringify({ error: 'Invalid file data' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Validate file size (10MB limit) when we actually have original bytes
    if (bytes.length > 0 && bytes.length > 10 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: 'File exceeds 10MB limit' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate magic bytes
    const lowerFileName = fileName.toLowerCase();
    const isPdf = lowerFileName.endsWith('.pdf');
    const pageCount = hasPdfPageImages ? (pdfPageImages as string[]).length : 1;
    if (isPdf) {
      // If client provided page images, we might not have original PDF bytes.
      if (bytes.length > 0 && (bytes[0] !== 0x25 || bytes[1] !== 0x50 || bytes[2] !== 0x44 || bytes[3] !== 0x46)) {
        return new Response(
          JSON.stringify({ error: 'Invalid PDF file format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (lowerFileName.endsWith('.png')) {
      if (bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4E || bytes[3] !== 0x47) {
        return new Response(
          JSON.stringify({ error: 'Invalid PNG file format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (lowerFileName.endsWith('.jpg') || lowerFileName.endsWith('.jpeg')) {
      if (bytes[0] !== 0xFF || bytes[1] !== 0xD8 || bytes[2] !== 0xFF) {
        return new Response(
          JSON.stringify({ error: 'Invalid JPEG file format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ error: 'Unsupported file type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    pipelineDiagnostics.uploadReceive = {
      ok: true,
      fileName,
      fileSizeBytes: bytes.length,
      pageCount,
      isPdf,
      hasPdfPageImages,
    };

    // ============= USAGE LIMITS ENFORCEMENT =============
    // Check usage limits - IP-based for anonymous, user-based for authenticated
    let conversionsUsed = 0;
    let conversionsLimit = user ? 5 : 2;
    let userPlanType = 'free';

    let limitResult: Array<{ conversions_used?: number; conversions_limit?: number }> | null = null;
    let limitError: unknown = null;
    try {
      const rpcResponse = await supabaseAdmin.rpc('check_and_reset_daily_limit', {
        p_ip_address: user ? null : trackingKey,
        p_user_id: user ? user.id : null,
        p_timezone: userTimezone,
      });
      limitResult = (rpcResponse.data as Array<{ conversions_used?: number; conversions_limit?: number }> | null) ?? null;
      limitError = rpcResponse.error;
    } catch (rpcThrownError) {
      limitError = rpcThrownError;
    }

    if (limitError) {
      console.error('Error checking limit via RPC, using fallback:', limitError);
      const fallback = await checkLimitFallback({
        supabaseAdmin,
        userId: user?.id ?? null,
        trackingKey,
        timezone: userTimezone,
      });
      conversionsUsed = fallback.conversionsUsed;
      conversionsLimit = fallback.conversionsLimit;
      userPlanType = fallback.planType;
    } else {
      const usageInfo = limitResult && limitResult.length > 0 ? limitResult[0] : null;
      conversionsUsed = toNumber(usageInfo?.conversions_used, 0);
      conversionsLimit = toNumber(usageInfo?.conversions_limit, user ? 5 : 2);
    }

    console.log('Usage info:', { conversionsUsed, conversionsLimit, user: !!user });

    // Check if admin (role-based)
    let isAdmin = false;
    if (user) {
      const { data: roleData, error: roleError } = await supabaseAdmin.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin',
      });
      if (roleError) {
        console.error('Admin role check failed:', roleError);
      }
      isAdmin = !!roleData;
    }
    console.log('Admin check:', { isAdmin });
    let pagesUsedThisMonth = 0;
    const userPlanLimit = conversionsLimit;

    if (user && !isAdmin) {
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('plan_type, tier, pages_used_this_month')
        .eq('user_id', user.id)
        .single();

      if (subError) {
        console.error('Failed to load subscription plan type:', subError);
      } else if (subData) {
        userPlanType = resolvePlanType((subData as Record<string, unknown> | null) ?? null) || userPlanType;
        pagesUsedThisMonth = subData.pages_used_this_month || 0;
      }
    }

    const normalizedPlanType = userPlanType.toLowerCase();
    const isMonthlyPlan = normalizedPlanType.startsWith('monthly') || normalizedPlanType === 'daily';
    const isYearlyPlan = normalizedPlanType.startsWith('yearly') || normalizedPlanType === 'business';
    const isPerPagePlan = normalizedPlanType.startsWith('per_page');
    const isPaidPlan = !!user && (isMonthlyPlan || isYearlyPlan || isPerPagePlan || conversionsLimit > 5);
    const isFreeMode = !isPaidPlan;
    const underwritingTier = resolveUnderwritingTier(userPlanType, isAdmin);
    const remainingQuota = Math.max(0, conversionsLimit - conversionsUsed);

    // Free mode: one file = one conversion, plus a 15-page per-file PDF cap.
    if (!isAdmin && isFreeMode && isPdf && pageCount > FREE_MAX_PDF_PAGES_PER_FILE) {
      return new Response(
        JSON.stringify({
          error: `Free tier allows up to ${FREE_MAX_PDF_PAGES_PER_FILE} PDF pages per file. This file has ${pageCount} pages.`,
          status: 'pdf_too_complex',
          pagesDetected: pageCount,
          maxPagesAllowed: FREE_MAX_PDF_PAGES_PER_FILE,
          limitReached: true,
          isAuthenticated: !!user,
          signupRequired: !user,
          planType: userPlanType,
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enforce quota before processing.
    if (!isAdmin) {
      if (isFreeMode && remainingQuota < 1) {
        const errorMessage = user
          ? `You have reached your daily limit of ${conversionsLimit} conversions.`
          : `You have reached your daily free limit of ${conversionsLimit} conversions. Please sign up or choose a plan.`;
        return new Response(
          JSON.stringify({
            error: errorMessage,
            status: 'anonymous_limit_reached',
            limitReached: true,
            isAuthenticated: !!user,
            signupRequired: !user,
            planType: userPlanType,
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!isFreeMode && remainingQuota < 1) {
        return new Response(
          JSON.stringify({
            error: `You have reached your usage limit of ${conversionsLimit} pages.`,
            status: 'page_limit_exceeded',
            limitReached: true,
            pagesUsed: conversionsUsed,
            planLimit: conversionsLimit,
            planType: userPlanType,
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create conversion record for authenticated users
    let conversion = null;
    if (user) {
      const insertPayload: Record<string, unknown> = {
        user_id: user.id,
        original_filename: fileName,
        file_path: fileId,
        status: 'processing',
      };
      insertPayload.pages_processed = pageCount;

      let { data: convData, error: convError } = await supabase
        .from('conversions')
        .insert(insertPayload)
        .select()
        .single();

      // Some deployed DBs do not have `pages_processed` column yet.
      // Retry without it so history records are still created.
      if (convError && /pages_processed/i.test(convError.message || '')) {
        delete insertPayload.pages_processed;
        ({ data: convData, error: convError } = await supabase
          .from('conversions')
          .insert(insertPayload)
          .select()
          .single());
      }

      if (convError) {
        console.error('Failed to create conversion record:', convError);
      } else {
        conversion = convData;
        shouldCleanupUploadedSource = false;
      }
    }

    // ============= LAYER 1: SMART DOCUMENT ROUTER =============
    console.log('Starting multi-layered AI conversion for:', fileName);

    let extractedText = '';
    let rawTransactions: RawTransaction[] = [];

    // ============= LAYER 2: INTELLIGENT PROCESSING ROUTER =============
    let serverParsedTransactions: RawTransaction[] = [];
    if (
      isPdf &&
      bytes.length > 0 &&
      (!Array.isArray(pdfParsedTransactions) || pdfParsedTransactions.length === 0)
    ) {
      try {
        const textStart = Date.now();
        const serverParsed = await extractPdfTextTransactionsFromBytes(bytes, pdfPassword);
        timing.text_extract_ms += Date.now() - textStart;
        if (serverParsed.text) extractedText = serverParsed.text;
        serverParsedTransactions = serverParsed.transactions;
        if (serverParsedTransactions.length > 0) {
          console.log(`Server text parse extracted ${serverParsedTransactions.length} transactions.`);
        }
      } catch (error) {
        console.error('Server text extraction failed:', error);
      }
    }

    const classification = classifyDocument(extractedText, bytes, fileName);
    const structuralScan = runStructuralScan({
      isPdf,
      fileName,
      bytes,
      pageCount,
      extractedText,
    });
    pipelineDiagnostics.structuralScan = {
      ok: true,
      classification,
      ...structuralScan,
    };
    console.log('Document classification:', classification);
    console.log('Structural scan:', structuralScan);

    // ============= SPECIALIZED AI EXTRACTION =============
    // NOTE: Groq Vision models do NOT accept PDFs directly.
    // For PDFs we require the client to send rendered page images (pdfPageImages) to avoid "invalid image data"
    // and to prevent wasting credits on doomed fallbacks.
    console.log('=== Starting Specialized AI Pipeline ===');

    let extractionResult: Awaited<ReturnType<typeof performExtraction>>;
    const parsedTransactionsInput = Array.isArray(pdfParsedTransactions) && pdfParsedTransactions.length > 0
      ? pdfParsedTransactions
      : serverParsedTransactions;
    const deterministicStart = Date.now();
    let clientParsedTransactions: RawTransaction[] = Array.isArray(parsedTransactionsInput)
      ? normalizeRawTransactions(parsedTransactionsInput).filter((transaction) => {
          const hasDate = typeof transaction.date === 'string' && transaction.date.trim() && transaction.date !== 'Unknown';
          const hasDescription = typeof transaction.description === 'string' && transaction.description.trim().length > 0;
          const hasAmount =
            Number.isFinite(Number(transaction.debit ?? NaN)) ||
            Number.isFinite(Number(transaction.credit ?? NaN)) ||
            Number.isFinite(Number(transaction.balance ?? NaN));
          return hasDate && hasDescription && hasAmount;
        })
      : [];
    const clientParsedBankMetadata = normalizeClientBankMetadata(pdfParsedBankMetadata);
    let clientPdfParseAssessment = assessClientPdfParsedTransactions(clientParsedTransactions, pageCount);
    timing.deterministic_parse_ms = Date.now() - deterministicStart;
    const mustUseDeterministicClientPdf =
      isPdf && !hasPdfPageImages && clientParsedTransactions.length > 0;
    const forceOcrForDenseStatement = shouldForceOcrForDenseStatement(
      lowerFileName,
      clientParsedBankMetadata,
      clientParsedTransactions,
    );
    const adaptiveOcrStrategy = deriveAdaptiveOcrStrategy(
      lowerFileName,
      pageCount,
      clientPdfParseAssessment,
      forceOcrForDenseStatement,
    );
    let fingerprintData: { fingerprint: string; headerHint: string } | null = null;
    let cachedTemplate: { template_id?: string; allow_single_date?: boolean } | null = null;
    let cachedTemplateId: string | null = null;
    let cachedAllowSingleDate = false;
    if (extractedText) {
      try {
        fingerprintData = await buildTemplateFingerprint(extractedText);
        cachedTemplate = await fetchTemplateFingerprint(supabaseAdmin, fingerprintData.fingerprint);
        cachedTemplateId = cachedTemplate?.template_id ?? null;
        cachedAllowSingleDate = cachedTemplate?.allow_single_date === true;
      } catch {
        fingerprintData = null;
        cachedTemplate = null;
        cachedTemplateId = null;
        cachedAllowSingleDate = false;
      }
    }
    const bankDetection = pickBankBySignals({
      fileName,
      extractedText,
      cachedTemplateId,
    });
    pipelineDiagnostics.bankDetection = {
      ok: true,
      bankId: bankDetection.bankId,
      detectionConfidence: bankDetection.detectionConfidence,
      signals: bankDetection.signals,
    };

    const templateMapping = mapTemplateForBank({
      bankId: bankDetection.bankId,
      extractedText,
      cachedAllowSingleDate,
    });
    pipelineDiagnostics.templateMapping = {
      ok: true,
      ...templateMapping,
    };

    let templateSelectedId: string | null = templateMapping.templateId === 'generic'
      ? null
      : templateMapping.templateId;
    let templateSingleDateUsed = false;
    if (clientParsedTransactions.length > 0 && extractedText) {
      const template = getBankTemplateById(templateSelectedId) ?? detectBankTemplate(extractedText);
      const needsTemplateRecheck = clientPdfParseAssessment.useDeterministic === false &&
        clientPdfParseAssessment.mismatchRatio < 0.9;
      const shouldRecheck = needsTemplateRecheck || templateMapping.allowSingleDate;
      if (template && shouldRecheck) {
        templateSelectedId = template.id;
        try {
          const templateStart = Date.now();
          const templateReparse = await extractPdfTextTransactionsFromBytes(bytes, pdfPassword, {
            allowSingleDate: true,
          });
          timing.template_recheck_ms += Date.now() - templateStart;
          if (templateReparse.transactions.length > 0) {
            const reparseAssessment = assessClientPdfParsedTransactions(templateReparse.transactions, pageCount);
            const originalMismatch = clientPdfParseAssessment.mismatchRatio;
            const reparseMismatch = reparseAssessment.mismatchRatio;
            const originalCount = clientParsedTransactions.length;
            const reparseCount = templateReparse.transactions.length;
            const preferReparse =
              reparseMismatch + 0.02 < originalMismatch ||
              reparseCount >= originalCount + 3;
            if (preferReparse) {
              console.log(
                `Template recheck selected (${template.id}) rows=${reparseCount}, mismatch=${reparseMismatch.toFixed(3)} vs original ${originalMismatch.toFixed(3)}`,
              );
              clientParsedTransactions = templateReparse.transactions;
              clientPdfParseAssessment = reparseAssessment;
              templateSingleDateUsed = true;
            }
          }
        } catch (error) {
          console.error('Template recheck failed:', error);
        }
      }
    }
    const deterministicConfidenceBreakdown = computeConfidenceBreakdown({
      rows: clientParsedTransactions,
      sourceText: extractedText,
      bankId: templateSelectedId ?? bankDetection.bankId,
      headerConfidenceHint: bankDetection.detectionConfidence,
    });
    const deterministicConfidence = deterministicConfidenceBreakdown.score;
    const deterministicConfidenceHigh = deterministicConfidence >= DETERMINISTIC_CONFIDENCE_THRESHOLD;
    const preferDeterministicFastPath =
      PDF_DETERMINISTIC_FAST_PATH_ENABLED &&
      isPdf &&
      clientParsedTransactions.length >= PDF_DETERMINISTIC_FAST_PATH_MIN_ROWS &&
      clientPdfParseAssessment.mismatchRatio <= PDF_DETERMINISTIC_FAST_PATH_MAX_MISMATCH;
    console.log(
      `Adaptive OCR strategy: level=${adaptiveOcrStrategy.level}, strict=${adaptiveOcrStrategy.strictMode}:${adaptiveOcrStrategy.strictMaxPages}, ` +
      `dual=${adaptiveOcrStrategy.dualMode}:${adaptiveOcrStrategy.dualMaxPages}, reasons=${adaptiveOcrStrategy.reasons.join('|') || 'none'}`,
    );
    if (clientParsedTransactions.length > 0) {
      console.log(
        `Deterministic confidence=${deterministicConfidence.toFixed(3)} (parse=${deterministicConfidenceBreakdown.parseSuccessRatio.toFixed(3)}, date=${deterministicConfidenceBreakdown.dateContinuityScore.toFixed(3)}, balance=${deterministicConfidenceBreakdown.balanceValidationScore.toFixed(3)}).`,
      );
    }
    pipelineDiagnostics.confidenceScoring = {
      ok: true,
      deterministic: deterministicConfidenceBreakdown,
      threshold: DETERMINISTIC_CONFIDENCE_THRESHOLD,
    };
    const canUseDeterministicClientPdf =
      isPdf &&
      clientParsedTransactions.length > 0 &&
      (
        deterministicConfidenceHigh ||
        (mustUseDeterministicClientPdf && !hasPdfPageImages) ||
        (preferDeterministicFastPath && deterministicConfidenceHigh)
      ) &&
      (!forceOcrForDenseStatement || deterministicConfidenceHigh || (mustUseDeterministicClientPdf && !hasPdfPageImages));
    let processedVia: 'deterministic' | 'ocr' | 'ai_rescue' = 'ocr';
    let finalConfidenceScore = deterministicConfidence;
    let finalErrorFlags = [...deterministicConfidenceBreakdown.errorFlags];
    let aiUsed = false;
    pipelineDiagnostics.decisionGate = {
      ok: true,
      confidenceScore: deterministicConfidence,
      threshold: DETERMINISTIC_CONFIDENCE_THRESHOLD,
      skipOcr: canUseDeterministicClientPdf,
    };

    if (preferDeterministicFastPath && !clientPdfParseAssessment.useDeterministic) {
      console.log(
        `Deterministic fast-path override enabled (${clientParsedTransactions.length} rows, mismatch=${clientPdfParseAssessment.mismatchRatio.toFixed(3)}).`,
      );
    }
    if (deterministicConfidenceHigh) {
      console.log(`Deterministic confidence >= ${DETERMINISTIC_CONFIDENCE_THRESHOLD}: forcing fast output path (no OCR).`);
    }

    if (mustUseDeterministicClientPdf && !clientPdfParseAssessment.useDeterministic) {
      console.log(
        `No PDF page images provided; forcing deterministic PDF rows (${clientParsedTransactions.length}) despite assessment: ${clientPdfParseAssessment.reason}`,
      );
    }

    if (isPdf && clientParsedTransactions.length > 0 && !canUseDeterministicClientPdf) {
      console.log(
        `Ignoring deterministic client PDF rows (${clientParsedTransactions.length}) and falling back to OCR: ${clientPdfParseAssessment.reason} ` +
          `(confidence=${deterministicConfidence.toFixed(3)}, mismatch=${clientPdfParseAssessment.mismatchRatio.toFixed(3)}, anomaly=${clientPdfParseAssessment.anomalyRate.toFixed(3)}, dense=${forceOcrForDenseStatement})`,
      );
    }

    if (
      isPdf &&
      hasPdfPageImages &&
      !canUseDeterministicClientPdf &&
      !isAdmin &&
      isFreeMode &&
      (clientPdfParseAssessment.requiresHeavyOcr || adaptiveOcrStrategy.hardForFreeTier)
    ) {
      return new Response(
        JSON.stringify({
          error: 'This PDF is hard to parse accurately and requires paid processing.',
          message: 'Hard PDF detected. Please upgrade to a paid plan for this file.',
          status: 'hard_pdf_requires_paid',
          limitReached: true,
          hardPdf: true,
          requiresPaidPlan: true,
          pagesDetected: pageCount,
          planType: userPlanType,
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // isPdf and hasPdfPageImages already defined above for page limit check
    // Track bank metadata across pages
    let collectedBankMetadata: BankMetadata | undefined = clientParsedBankMetadata;
    let pagesWithData = 1;
    const deterministicDataset = clientParsedTransactions.map((row) => ({ ...row }));
    let ocrDataset: RawTransaction[] = [];

    if (canUseDeterministicClientPdf) {
      console.log(`Using deterministic client PDF text extraction: ${clientParsedTransactions.length} transactions`);
      extractionResult = {
        transactions: clientParsedTransactions,
        status: {
          groqVision: { used: false, success: false },
          mistral: { used: false, success: false },
          groqText: { used: false, success: false },
          patternFallback: { used: false, success: false },
        },
        extractedText: '',
      };
      processedVia = 'deterministic';
      pagesWithData = Math.max(1, pageCount);
      pipelineDiagnostics.ocrStage = {
        ok: true,
        skipped: true,
        reason: 'deterministic_confidence_high',
      };
    } else if (isPdf && hasPdfPageImages) {
      // Build a minimal status object consistent with ai-orchestrator
      const status: AIProcessingStatus = {
        groqVision: { used: true, success: false },
        mistral: { used: false, success: false },
        groqText: { used: false, success: false },
        patternFallback: { used: false, success: false },
      };

      const errors: string[] = [];
      const start = Date.now();
      const collected: RawTransaction[] = [];
      pagesWithData = 0;
      let combinedText = '';
      let strictRetryCount = 0;
      let dualProviderCount = 0;
      const effectiveStrictMode = OCR_SINGLE_PASS_ONLY ? 'off' : adaptiveOcrStrategy.strictMode;
      const effectiveStrictMaxPages = OCR_SINGLE_PASS_ONLY ? 0 : adaptiveOcrStrategy.strictMaxPages;
      const effectiveDualMode = OCR_SINGLE_PASS_ONLY ? 'off' : adaptiveOcrStrategy.dualMode;
      const effectiveDualMaxPages = OCR_SINGLE_PASS_ONLY ? 0 : adaptiveOcrStrategy.dualMaxPages;
      const useStrictFirstPass = !OCR_SINGLE_PASS_ONLY &&
        OCR_WORKER_MODE !== 'primary' &&
        adaptiveOcrStrategy.strictFirstPass;

      for (const img of pdfPageImages as string[]) {
        if (typeof img !== 'string') continue;
        const match = img.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) continue;
        const pageMime = match[1];
        const pageBase64 = match[2];
        let pageResult: OCRResult | null = null;
        try {
          if (OCR_WORKER_MODE === 'primary') {
            const workerResult = await callTesseractOcrWorker(pageBase64, pageMime, fileName);
            if (workerResult.success && workerResult.transactions && workerResult.transactions.length > 0) {
              pageResult = workerResult;
              console.log('Using Tesseract OCR worker result for this page.');
            }
          }

          if (!pageResult) {
            pageResult = await callGroqVisionOCR(pageBase64, pageMime, { strictTableMode: useStrictFirstPass });
          }

          if (
            pageResult &&
            !useStrictFirstPass &&
            OCR_WORKER_MODE !== 'primary' &&
            strictRetryCount < effectiveStrictMaxPages &&
            shouldRetryStrictVisionPass(lowerFileName, pageResult, effectiveStrictMode)
          ) {
            const strictResult = await callGroqVisionOCR(pageBase64, pageMime, { strictTableMode: true });
            strictRetryCount += 1;
            const chosenResult = chooseBetterVisionResult(pageResult, strictResult);
            if (chosenResult !== pageResult) {
              console.log('Using strict-table OCR pass for a PDF page (better extraction quality).');
              pageResult = chosenResult;
            }
          }

          if (
            pageResult &&
            OCR_WORKER_MODE !== 'primary' &&
            dualProviderCount < effectiveDualMaxPages &&
            shouldRunMistralDualPass(lowerFileName, pageResult, effectiveDualMode)
          ) {
            const mistralResult = await callMistralVisionOCR(pageBase64, pageMime);
            dualProviderCount += 1;
            pageResult = mergeProviderResults(pageResult, mistralResult);
          }
        } catch (pageError) {
          errors.push(pageError instanceof Error ? pageError.message : 'OCR page processing failed');
          continue;
        }

        if (pageResult && pageResult.success && pageResult.transactions && pageResult.transactions.length > 0) {
          pagesWithData += 1;
          collected.push(...pageResult.transactions);
          if (pageResult.text) combinedText += (combinedText ? '\n' : '') + pageResult.text;
          if (pageResult.bankMetadata) {
            collectedBankMetadata = mergeBankMetadata(collectedBankMetadata, pageResult.bankMetadata);
            console.log('Bank metadata detected:', collectedBankMetadata);
          }
        } else {
          errors.push(pageResult.error || 'No data extracted');
        }
      }
      if (strictRetryCount > 0) {
        console.log(`Strict OCR retries used: ${strictRetryCount}/${effectiveStrictMaxPages} (mode=${effectiveStrictMode})`);
      }
      if (dualProviderCount > 0) {
        console.log(`Dual OCR pages used: ${dualProviderCount}/${effectiveDualMaxPages} (mode=${effectiveDualMode})`);
      }

      status.groqVision.time = Date.now() - start;
      timing.ocr_ms += Date.now() - start;
      status.groqVision.success = collected.length > 0;
      if (!status.groqVision.success) {
        status.groqVision.error = errors[0] || 'No data extracted from PDF page images';
      }

      extractionResult = {
        transactions: collected,
        status,
        extractedText: combinedText,
        bankMetadata: collectedBankMetadata,
      };
      ocrDataset = collected.map((row) => ({ ...row }));
      pipelineDiagnostics.ocrStage = {
        ok: true,
        skipped: false,
        pagesWithData,
        extractedRows: collected.length,
        strictRetryCount,
        dualProviderCount,
      };

      if (collected.length === 0 && clientParsedTransactions.length > 0) {
        console.log(
          `OCR unavailable/empty; falling back to deterministic parse (${clientParsedTransactions.length} rows).`,
        );
        extractionResult = {
          transactions: clientParsedTransactions,
          status,
          extractedText: extractedText || combinedText,
          bankMetadata: collectedBankMetadata,
        };
        processedVia = 'deterministic';
        pagesWithData = Math.max(1, pageCount);
      }
    } else {
      // Convert bytes to base64 for OCR
      const chunkSize = 8192;
      let base64Data = '';
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        base64Data += String.fromCharCode(...chunk);
      }
      base64Data = btoa(base64Data);

      const mimeType = isPdf ? 'application/pdf' :
        lowerFileName.endsWith('.png') ? 'image/png' : 'image/jpeg';

      if (isPdf) {
        pipelineDiagnostics.ocrStage = {
          ok: false,
          skipped: false,
          requiresPageImages: true,
        };
        return new Response(
          JSON.stringify({
            error: 'PDF requires page images for processing. Please retry (the app will render pages) or upload JPG/PNG.',
            message: 'PDF requires page images for processing. Please retry (the app will render pages) or upload JPG/PNG.',
            requiresPageImages: true,
            retryable: true,
            status: 'requires_page_images',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const ocrStart = Date.now();
      extractionResult = await performExtraction(base64Data, mimeType, extractedText);
      timing.ocr_ms += Date.now() - ocrStart;
      ocrDataset = (extractionResult.transactions || []).map((row) => ({ ...row }));
      pipelineDiagnostics.ocrStage = {
        ok: true,
        skipped: false,
        pagesWithData: ocrDataset.length > 0 ? 1 : 0,
        extractedRows: ocrDataset.length,
      };
    }

    // Stage 6b: auto reprocess low-confidence rows (strict OCR) only when needed.
    if (
      isPdf &&
      hasPdfPageImages &&
      !OCR_SINGLE_PASS_ONLY &&
      OCR_WORKER_MODE !== 'primary' &&
      extractionResult.transactions.length > 0
    ) {
      const prelim = scoreTransactionConfidence(extractionResult.transactions as unknown as Transaction[]);
      const lowRatio = prelim.total > 0 ? prelim.lowConfidenceCount / prelim.total : 0;
      const shouldReprocess =
        (lowRatio >= AUTO_REPROCESS_MIN_LOW_RATIO || prelim.averageScore < AUTO_REPROCESS_MIN_AVG_SCORE) &&
        pageCount <= AUTO_REPROCESS_MAX_PAGES;

      if (shouldReprocess) {
        console.log(
          `Auto reprocess triggered (avg=${prelim.averageScore}, low=${prelim.lowConfidenceCount}/${prelim.total}, pages=${pageCount}).`,
        );
        const status: AIProcessingStatus = {
          groqVision: { used: true, success: false },
          mistral: { used: false, success: false },
          groqText: { used: false, success: false },
          patternFallback: { used: false, success: false },
        };
        const start = Date.now();
        const reprocessCollected: RawTransaction[] = [];
        let combinedText = '';
        for (const img of pdfPageImages as string[]) {
          if (typeof img !== 'string') continue;
          const match = img.match(/^data:([^;]+);base64,(.+)$/);
          if (!match) continue;
          const pageMime = match[1];
          const pageBase64 = match[2];
          const pageResult = await callGroqVisionOCR(pageBase64, pageMime, { strictTableMode: true });
          if (pageResult?.transactions?.length) {
            reprocessCollected.push(...pageResult.transactions);
          }
          if (pageResult?.text) combinedText += (combinedText ? '\n' : '') + pageResult.text;
        }
        status.groqVision.time = Date.now() - start;
        status.groqVision.success = reprocessCollected.length > 0;

        if (reprocessCollected.length > 0) {
          const reprocessScore = scoreTransactionConfidence(reprocessCollected as unknown as Transaction[]);
          const better =
            reprocessScore.averageScore > prelim.averageScore + 3 ||
            reprocessScore.lowConfidenceCount < prelim.lowConfidenceCount;
          if (better) {
            console.log(
              `Auto reprocess accepted (avg=${reprocessScore.averageScore}, low=${reprocessScore.lowConfidenceCount}/${reprocessScore.total}).`,
            );
            extractionResult = {
              transactions: reprocessCollected,
              status,
              extractedText: combinedText,
              bankMetadata: extractionResult.bankMetadata,
            };
          } else {
            console.log('Auto reprocess rejected (no confidence improvement).');
          }
        } else {
          console.log('Auto reprocess returned no rows; keeping original extraction.');
        }
      }
    }

    if (processedVia !== 'deterministic' && extractionResult.transactions.length > 0) {
      ocrDataset = extractionResult.transactions.map((row) => ({ ...row }));
    }

    const deterministicReconcileConfidence = computeConfidenceBreakdown({
      rows: deterministicDataset,
      sourceText: extractedText,
      bankId: templateSelectedId ?? bankDetection.bankId,
      headerConfidenceHint: bankDetection.detectionConfidence,
    });
    const ocrReconcileConfidence = computeConfidenceBreakdown({
      rows: ocrDataset.length > 0 ? ocrDataset : extractionResult.transactions,
      sourceText: extractionResult.extractedText || extractedText,
      bankId: templateSelectedId ?? bankDetection.bankId,
      headerConfidenceHint: bankDetection.detectionConfidence,
    });

    rawTransactions = extractionResult.transactions;
    extractedText = extractionResult.extractedText || '';

    if (deterministicDataset.length > 0 && ocrDataset.length > 0) {
      const mergedDataset = mergeOcrTransactionsDeterministic(deterministicDataset, ocrDataset);
      const mergedConfidence = computeConfidenceBreakdown({
        rows: mergedDataset,
        sourceText: extractionResult.extractedText || extractedText,
        bankId: templateSelectedId ?? bankDetection.bankId,
        headerConfidenceHint: bankDetection.detectionConfidence,
      });

      const confidenceGap = Math.abs(deterministicReconcileConfidence.score - ocrReconcileConfidence.score);
      const safeMerge =
        mergedDataset.length >= Math.max(deterministicDataset.length, ocrDataset.length) - 1 &&
        mergedConfidence.score >= Math.max(deterministicReconcileConfidence.score, ocrReconcileConfidence.score) - 0.03;

      if (safeMerge) {
        rawTransactions = mergedDataset;
        finalConfidenceScore = mergedConfidence.score;
        processedVia = 'ocr';
      } else if (ocrReconcileConfidence.score >= deterministicReconcileConfidence.score + 0.03) {
        rawTransactions = ocrDataset;
        finalConfidenceScore = ocrReconcileConfidence.score;
        processedVia = 'ocr';
      } else {
        rawTransactions = deterministicDataset;
        finalConfidenceScore = deterministicReconcileConfidence.score;
        processedVia = 'deterministic';
      }

      if (confidenceGap >= 0.2 && !safeMerge) {
        finalErrorFlags.push('reconciliation_high_conflict');
      }
      pipelineDiagnostics.reconciliation = {
        ok: true,
        deterministicConfidence: deterministicReconcileConfidence.score,
        ocrConfidence: ocrReconcileConfidence.score,
        mergedConfidence: mergedConfidence.score,
        chosenMode: processedVia,
        lowConfidence: finalConfidenceScore < OCR_ACCEPTABLE_CONFIDENCE_THRESHOLD,
        confidenceGap,
      };
    } else if (processedVia === 'deterministic') {
      finalConfidenceScore = deterministicReconcileConfidence.score;
      pipelineDiagnostics.reconciliation = {
        ok: true,
        chosenMode: processedVia,
        deterministicConfidence: deterministicReconcileConfidence.score,
        ocrConfidence: 0,
      };
    } else {
      finalConfidenceScore = ocrReconcileConfidence.score;
      pipelineDiagnostics.reconciliation = {
        ok: true,
        chosenMode: processedVia,
        deterministicConfidence: deterministicReconcileConfidence.score,
        ocrConfidence: ocrReconcileConfidence.score,
      };
    }

    const recoveredAdcbTransactions = recoverAdcbTransactionsFromOcrText(extractedText);
    if (recoveredAdcbTransactions.length > 0) {
      const rawFlow = scoreRunningBalanceFlow(rawTransactions);
      const recoveredFlow = scoreRunningBalanceFlow(recoveredAdcbTransactions);
      const mergedAdcbTransactions = mergeOcrTransactionsDeterministic(rawTransactions, recoveredAdcbTransactions);
      const mergedFlow = scoreRunningBalanceFlow(mergedAdcbTransactions);

      const flowMismatch = (flow: { mismatchRatio: number; total: number }): number =>
        flow.total > 0 ? flow.mismatchRatio : 1;
      const rawMismatch = flowMismatch(rawFlow);
      const recoveredMismatch = flowMismatch(recoveredFlow);
      const mergedMismatch = flowMismatch(mergedFlow);

      const baseLength = Math.max(1, rawTransactions.length);
      const scoreCandidate = (length: number, mismatch: number): number => {
        const missingPenalty = Math.max(0, baseLength - length) / baseLength;
        const extraRowsBonus = length > baseLength ? -0.02 : 0;
        return mismatch + (missingPenalty * 0.35) + extraRowsBonus;
      };

      const rawScore = scoreCandidate(rawTransactions.length, rawMismatch);
      const recoveredScore = scoreCandidate(recoveredAdcbTransactions.length, recoveredMismatch);
      const mergedScore = scoreCandidate(mergedAdcbTransactions.length, mergedMismatch);

      let bestName: 'raw' | 'recovered' | 'merged' = 'raw';
      let bestRows = rawTransactions;
      let bestScore = rawScore;
      let bestMismatch = rawMismatch;

      if (recoveredScore < bestScore) {
        bestName = 'recovered';
        bestRows = recoveredAdcbTransactions;
        bestScore = recoveredScore;
        bestMismatch = recoveredMismatch;
      }
      if (mergedScore < bestScore) {
        bestName = 'merged';
        bestRows = mergedAdcbTransactions;
        bestScore = mergedScore;
        bestMismatch = mergedMismatch;
      }

      const meaningfulImprovement =
        bestName !== 'raw' &&
        (bestScore + 0.02 < rawScore || bestRows.length >= rawTransactions.length + 2);

      if (meaningfulImprovement) {
        console.log(
          `Using ADCB ${bestName} parser result (${bestRows.length} rows, mismatch ${bestMismatch.toFixed(3)} vs raw ${rawMismatch.toFixed(3)})`,
        );
        rawTransactions = bestRows;
      }
    }

    // Repair tiny OCR balance tail drift (e.g., 0.02/0.05) while preserving debit/credit.
    const balanceDriftCorrection = correctMinorBalanceDrift(rawTransactions, 0.1);
    if (balanceDriftCorrection.correctedCount > 0) {
      console.log(`Corrected minor OCR balance drift on ${balanceDriftCorrection.correctedCount} row(s)`);
      rawTransactions = balanceDriftCorrection.transactions;
    }

    const shouldAttemptAiRescue =
      AI_RESCUE_ENABLED &&
      extractedText &&
      rawTransactions.length >= AI_RESCUE_MIN_ROWS &&
      finalConfidenceScore < OCR_ACCEPTABLE_CONFIDENCE_THRESHOLD &&
      finalErrorFlags.some((flag) => [
        'low_row_parse_rate',
        'date_continuity_issue',
        'balance_arithmetic_issue',
        'column_alignment_low',
        'reconciliation_high_conflict',
      ].includes(flag));

    if (shouldAttemptAiRescue) {
      const flow = scoreRunningBalanceFlow(rawTransactions);
      const mismatch = flow.total > 0 ? flow.mismatchRatio : 1;
      if (mismatch >= AI_RESCUE_MIN_MISMATCH) {
        const rescueReason = `low_confidence_${finalConfidenceScore.toFixed(3)}_mismatch_${mismatch.toFixed(3)}`;
        const minimalStructuredLines = buildMinimalStructuredLines(extractedText);
        console.log(`AI rescue triggered (reason=${rescueReason}, rows=${rawTransactions.length}).`);
        const rescueStart = Date.now();
        extractionResult.status.groqText.used = true;
        const rescueResult = await attemptGroqTextRescue(minimalStructuredLines);
        const rescueRows = rescueResult.rows;
        const rescueDuration = Date.now() - rescueStart;
        extractionResult.status.groqText.time = rescueDuration;
        timing.ai_ms += rescueDuration;
        aiUsed = true;
        if (rescueRows && rescueRows.length > 0) {
          const rescueConfidence = computeConfidenceBreakdown({
            rows: rescueRows,
            sourceText: minimalStructuredLines,
            bankId: templateSelectedId ?? bankDetection.bankId,
            headerConfidenceHint: bankDetection.detectionConfidence,
          });
          const rescueMismatch = 1 - rescueConfidence.balanceValidationScore;
          const preferRescue =
            rescueConfidence.score >= finalConfidenceScore + 0.05 ||
            rescueRows.length >= rawTransactions.length + 3;
          if (preferRescue) {
            console.log(
              `AI rescue accepted (rows=${rescueRows.length}, mismatch=${rescueMismatch.toFixed(3)} vs ${mismatch.toFixed(3)}).`,
            );
            rawTransactions = rescueRows;
            processedVia = 'ai_rescue';
            finalConfidenceScore = rescueConfidence.score;
            extractionResult.status.groqText.success = true;
            pipelineDiagnostics.aiRescue = {
              ok: true,
              used: true,
              reason: rescueReason,
              tokenUsage: rescueResult.tokenUsage,
              rescueConfidence: rescueResult.rescueConfidence,
              finalConfidenceScore,
            };
          } else {
            console.log('AI rescue rejected (no quality improvement).');
            pipelineDiagnostics.aiRescue = {
              ok: true,
              used: true,
              reason: rescueReason,
              tokenUsage: rescueResult.tokenUsage,
              rescueConfidence: rescueResult.rescueConfidence,
              accepted: false,
            };
          }
        } else {
          extractionResult.status.groqText.success = false;
          extractionResult.status.groqText.error = 'AI rescue returned no rows';
          pipelineDiagnostics.aiRescue = {
            ok: false,
            used: true,
            reason: rescueReason,
            tokenUsage: rescueResult.tokenUsage,
            rescueConfidence: rescueResult.rescueConfidence,
            error: 'no_rows',
          };
        }
      }
    } else {
      pipelineDiagnostics.aiRescue = {
        ok: true,
        used: false,
        reason: 'confidence_or_flags_not_matching',
      };
    }

    const hardRuleResult = processedVia === 'deterministic'
      ? applyDebitCreditHardRule(rawTransactions)
      : applyOcrPostParseAdjustments(rawTransactions);
    rawTransactions = hardRuleResult.rows;
    if (rawTransactions.length > 1) {
      console.log(`Debit/Credit hard rule applied (order=${hardRuleResult.order}).`);
    }

    if (fingerprintData && rawTransactions.length > 0) {
      await storeTemplateFingerprint(supabaseAdmin, {
        fingerprint: fingerprintData.fingerprint,
        templateId: templateSelectedId,
        headerHint: fingerprintData.headerHint,
        allowSingleDate: templateSingleDateUsed || cachedAllowSingleDate,
      });
    }

    const ocrTextBankMetadata = extractBankMetadataFromOcrText(extractedText);

    // Log extraction status
    console.log(generateStatusReport(extractionResult.status));

    if (!rawTransactions || rawTransactions.length === 0) {
      // Generate error report for debugging
      const errorDetails = [];
      const status = extractionResult.status;

      if (status.groqVision.used && !status.groqVision.success) {
        errorDetails.push(`Groq Vision: ${status.groqVision.error}`);
      }
      if (status.groqText.used && !status.groqText.success) {
        errorDetails.push(`Groq Text: ${status.groqText.error}`);
      }

      console.error('All AI services failed:', errorDetails.join(' | '));
      throw new Error(`No transactions found. AI Status: ${errorDetails.join(' | ')}`);
    }

    // Paid mode is page-based and charges only pages that actually contain data.
    if (!isAdmin && isPaidPlan) {
      const pagesToCharge = Math.max(1, pagesWithData);
      if ((conversionsUsed + pagesToCharge) > conversionsLimit) {
        const remainingPages = Math.max(0, conversionsLimit - conversionsUsed);
        const periodLabel = isYearlyPlan ? 'year' : isMonthlyPlan ? 'month' : 'plan';
        const errorMessage = `This file has data on ${pagesToCharge} page${pagesToCharge === 1 ? '' : 's'}, but only ${remainingPages} page${remainingPages === 1 ? '' : 's'} remain in your ${periodLabel}.`;

        if (conversion) {
          await supabase
            .from('conversions')
            .update({
              status: 'failed',
              completed_at: new Date().toISOString(),
              error_message: errorMessage,
            })
            .eq('id', conversion.id);
        }

        return new Response(
          JSON.stringify({
            error: errorMessage,
            status: 'page_limit_exceeded',
            limitReached: true,
            pagesDetected: pagesToCharge,
            pagesUsed: conversionsUsed,
            planLimit: conversionsLimit,
            planType: userPlanType,
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ============= LAYER 3: SPECIALIZED CATEGORIZATION =============
    // Mistral is BEST for categorization, Groq as backup, Pattern as fallback
    console.log('=== Starting Specialized Categorization ===');

    const categorizationResult = await performCategorization(rawTransactions, extractionResult.status);
    const categorizedTransactions = categorizationResult.transactions;

    // Log final status
    console.log(generateStatusReport(categorizationResult.status));

    // Convert to Transaction type for financial engine
    const extractedTransactions: Transaction[] = categorizedTransactions.map(t => ({
      date: t.date,
      description: t.originalDescription || t.description,
      category: t.category,
      debit: t.debit,
      credit: t.credit,
      balance: t.balance,
      refNumber: t.refNumber,
      isDuplicate: t.isDuplicate,
      duplicateGroup: t.duplicateGroup,
      balanceMismatch: t.balanceMismatch,
      expectedBalance: t.expectedBalance,
      riskFlag: t.riskFlag,
    }));
    const provisionalBankInfo = mergeBankMetadata(
      clientParsedBankMetadata,
      ocrTextBankMetadata,
      collectedBankMetadata,
      extractionResult.bankMetadata,
    );
    let transactions = sanitizeTransactions(extractedTransactions, {
      openingBalance: provisionalBankInfo?.openingBalance,
      closingBalance: provisionalBankInfo?.closingBalance,
    });
    const preDedupCount = transactions.length;
    transactions = dedupeAndSortTransactions(transactions);
    const removedDuplicatesByValidation = Math.max(0, preDedupCount - transactions.length);
    pipelineDiagnostics.finalValidation = {
      ok: true,
      preDedupCount,
      postDedupCount: transactions.length,
      removedDuplicates: removedDuplicatesByValidation,
      sortedByDate: true,
    };

    // ============= LAYER 4: FINANCIAL ENGINE (Pure TypeScript) =============
    console.log('Starting financial analysis...');
    const validationStart = Date.now();

    // Balance Reconciliation
    const reconciliation = reconcileBalances(transactions);
    console.log(`Balance reconciliation: ${reconciliation.mismatches.length} mismatches, integrity: ${reconciliation.integrityScore}`);

    // Duplicate Detection
    const duplicateCount = detectDuplicates(transactions);
    console.log(`Duplicate detection: ${duplicateCount} duplicates found`);

    // High-Risk Transaction Detection
    const riskTransactions = detectHighRiskTransactions(transactions);
    console.log(`High-risk detection: ${riskTransactions.length} risk types found`);

    // Circular Trading Detection
    const circularResult = detectCircularTrading(transactions);
    if (circularResult) {
      riskTransactions.push(circularResult);
    }
    console.log(`Circular trading: ${circularResult ? circularResult.indices.length : 0} transactions flagged`);

    // Confidence Scoring (Stage 6)
    const confidenceSummary = scoreTransactionConfidence(transactions);
    console.log(`Confidence scoring: avg=${confidenceSummary.averageScore}, low=${confidenceSummary.lowConfidenceCount}/${confidenceSummary.total}`);
    finalConfidenceScore = clamp01(confidenceSummary.averageScore / 100);

    // Fetch user's category corrections for behavioral learning
    let categoryCorrections: Map<string, string> | undefined;
    if (user) {
      const { data: corrections } = await supabaseAdmin
        .from('category_corrections')
        .select('description_pattern, corrected_category, weight')
        .eq('user_id', user.id)
        .order('weight', { ascending: false });

      if (corrections && corrections.length > 0) {
        categoryCorrections = new Map();
        corrections.forEach((c: { description_pattern: string; corrected_category: string }) => {
          categoryCorrections!.set(c.description_pattern.toLowerCase(), c.corrected_category);
        });
        console.log(`Loaded ${corrections.length} category corrections for user`);
      }
    }

    // FOIR and Underwriting Analysis
    const underwritingResult = performUnderwritingAnalysis(transactions, categoryCorrections);
    console.log(`FOIR Analysis: score=${underwritingResult.foir.score}%, status=${underwritingResult.foir.status}`);

    // Liquidity Analysis
    const liquidityMetrics = analyzeLiquidity(transactions);

    // Generate Fraud Alerts
    const fraudAlerts = generateFraudAlerts(
      reconciliation,
      riskTransactions,
      liquidityMetrics,
      transactions.length
    );

    // Calculate Final Integrity Score
    const integrityScore = calculateIntegrityScore(reconciliation, riskTransactions, liquidityMetrics);
    console.log(`Analysis complete. Integrity score: ${integrityScore}, Fraud alerts: ${fraudAlerts.length}`);
    timing.validation_ms += Date.now() - validationStart;
    const fraudFlags = Array.from(
      new Set<string>([
        ...structuralScan.fraudFlags,
        ...fraudAlerts.map((alert) => String(alert.type || '')).filter(Boolean),
      ]),
    );

    // ============= LAYER 5: PROFESSIONAL EXCEL EXPORT =============
    console.log('Generating professional Excel export...');

    // Use minor-unit math for exact debit/credit totals (no float drift).
    const totalCreditsMinor = sumMinorUnits(transactions.map((t) => t.credit || 0));
    const totalDebitsMinor = sumMinorUnits(transactions.map((t) => t.debit || 0));
    const totalCredits = fromMinorUnits(totalCreditsMinor);
    const totalDebits = fromMinorUnits(totalDebitsMinor);
    const netFlow = fromMinorUnits(totalCreditsMinor - totalDebitsMinor);

    // Category breakdown
    const categoryBreakdownMinor: Record<string, { count: number; totalDebitMinor: number; totalCreditMinor: number }> = {};
    transactions.forEach((t) => {
      if (!categoryBreakdownMinor[t.category]) {
        categoryBreakdownMinor[t.category] = { count: 0, totalDebitMinor: 0, totalCreditMinor: 0 };
      }
      categoryBreakdownMinor[t.category].count++;
      categoryBreakdownMinor[t.category].totalDebitMinor += toMinorUnits(t.debit || 0);
      categoryBreakdownMinor[t.category].totalCreditMinor += toMinorUnits(t.credit || 0);
    });
    const categoryBreakdown: Record<string, { count: number; totalDebit: number; totalCredit: number }> = {};
    Object.entries(categoryBreakdownMinor).forEach(([category, data]) => {
      categoryBreakdown[category] = {
        count: data.count,
        totalDebit: fromMinorUnits(data.totalDebitMinor),
        totalCredit: fromMinorUnits(data.totalCreditMinor),
      };
    });

    // Build underwriting analysis for response
    const underwritingAnalysis = buildUnderwritingPayload(underwritingResult, underwritingTier);

    // Build risk analysis for response
    const riskAnalysis = {
      integrityScore,
      balanceMismatches: reconciliation.mismatches.length,
      averageDailyBalance: liquidityMetrics.avgBalance,
      maxDip: { amount: liquidityMetrics.minBalance, date: liquidityMetrics.maxDipDate },
      maxPeak: liquidityMetrics.maxBalance,
      riskFlags: riskTransactions.map(r => ({ type: r.type, count: r.indices.length })),
      fraudAlerts,
      foirScore: underwritingResult.foir.score,
      avgMonthlyIncome: underwritingResult.foir.avgMonthlyIncome,
      avgMonthlyEMI: underwritingResult.foir.avgMonthlyEMI,
    };

    const analytics = {
      totalTransactions: transactions.length,
      totalCredits,
      totalDebits,
      netFlow,
      duplicateCount,
      categoryBreakdown,
      confidenceSummary,
      riskAnalysis,
      ...(underwritingAnalysis ? { underwriting: underwritingAnalysis } : {}),
    };

    const outputTier = processedVia === 'deterministic' ? 'fast' : 'safe';
    if (conversion?.id) {
      try {
        const { error: updateError } = await supabase
          .from('conversions')
          .update({ processed_via: processedVia, output_tier: outputTier } as any)
          .eq('id', conversion.id);
        if (updateError && !/processed_via|output_tier/i.test(updateError.message || '')) {
          console.error('Failed to update conversion processed_via:', updateError);
        }
      } catch (updateError) {
        console.error('Conversion processed_via update crashed:', updateError);
      }
    }

    // Generate Excel (styled)
    const outputStart = Date.now();
    const bankInfo = mergeBankMetadata(
      clientParsedBankMetadata,
      ocrTextBankMetadata,
      collectedBankMetadata,
      extractionResult.bankMetadata,
    );
    if (bankInfo) {
      bankInfo.currency = normalizeCurrencyCode(bankInfo.currency);
    }
    const excelResult = generateProfessionalExcel({
      transactions,
      analytics: {
        totalCredits,
        totalDebits,
        netFlow,
        duplicateCount,
        categoryBreakdown,
      },
      underwriting: underwritingResult,
      fraudAlerts,
      liquidity: liquidityMetrics,
      reconciliation,
      bankInfo, // NEW: Pass bank metadata
    });
    const excelBuffer = excelResult.buffer;

    let resultPath = null;

    // Upload for authenticated users
    if (user && conversion) {
      resultPath = `${user.id}/results/${conversion.id}.xlsx`;
      // Use octet-stream to avoid storage MIME type restrictions
      const { error: uploadResultError } = await supabase.storage
        .from('bank-statements')
        .upload(resultPath, excelBuffer, {
          contentType: 'application/octet-stream',
          upsert: false,
        });

      if (uploadResultError) {
        console.error('Failed to upload result:', uploadResultError);
        resultPath = null;
      } else {
        console.log('Excel file uploaded successfully');

        // Update conversion status
        await supabase
          .from('conversions')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            result_path: resultPath,
          })
          .eq('id', conversion.id);

        // Store risk analysis
        await supabaseAdmin
          .from('risk_analysis')
          .upsert({
            user_id: user.id,
            conversion_id: conversion.id,
            integrity_score: integrityScore,
            balance_mismatches: reconciliation.mismatches.length,
            average_daily_balance: liquidityMetrics.avgBalance,
            max_dip_amount: liquidityMetrics.minBalance,
            max_dip_date: liquidityMetrics.maxDipDate,
            total_inflow: totalCredits,
            total_outflow: totalDebits,
            net_cashflow: netFlow,
            foir_score: underwritingResult.foir.score,
            salary_credits: underwritingResult.salaryCredits,
            emi_debits: underwritingResult.emiDebits,
            risk_flags: riskAnalysis.riskFlags,
          });

        // Store fraud alerts
        for (const alert of fraudAlerts) {
          await supabaseAdmin
            .from('fraud_alerts')
            .insert({
              user_id: user.id,
              conversion_id: conversion.id,
              alert_type: alert.type,
              severity: alert.severity,
              description: alert.description,
              affected_rows: alert.affectedRows,
              metadata: alert.metadata,
            });
        }
      }
    }

    // Convert Excel buffer to base64 only when needed (anonymous or upload failed)
    let excelBase64: string | null = null;
    if (!user || !resultPath) {
      const excelBytes = new Uint8Array(excelBuffer);
      let excelBinary = '';
      const excelChunkSize = 8192;
      for (let i = 0; i < excelBytes.length; i += excelChunkSize) {
        const chunk = excelBytes.subarray(i, i + excelChunkSize);
        excelBinary += String.fromCharCode(...chunk);
      }
      excelBase64 = btoa(excelBinary);
    }
    timing.output_ms += Date.now() - outputStart;

    console.log(`Conversion complete. ${transactions.length} transactions processed.`);
    console.log('=== Final AI Processing Report ===');
    console.log(generateStatusReport(categorizationResult.status));

    // Build AI status for debugging
    const aiStatus = {
      groqVision: categorizationResult.status.groqVision,
      groqText: categorizationResult.status.groqText,
      mistral: categorizationResult.status.mistral,
      patternFallback: categorizationResult.status.patternFallback,
    };

    // Increment usage count ONLY after successful conversion (prevents wasting credits/limit on failures)
    const incrementBy = isFreeMode ? 1 : Math.max(1, pagesWithData);
    let remaining = conversionsLimit - conversionsUsed;
    let incrementFailed = false;
    try {
      const { error: incrementError } = await supabaseAdmin.rpc('increment_usage_count', {
        p_ip_address: user ? null : trackingKey,
        p_user_id: user ? user.id : null,
        p_increment: incrementBy,
      });
      if (incrementError) {
        console.error('Error incrementing usage via RPC, trying fallback:', incrementError);
        incrementFailed = true;
      }
    } catch (incrementRpcError) {
      console.error('Usage increment RPC crashed, trying fallback:', incrementRpcError);
      incrementFailed = true;
    }

    if (incrementFailed) {
      const fallbackIncrement = await incrementUsageFallback({
        supabaseAdmin,
        userId: user?.id ?? null,
        trackingKey,
        incrementBy,
        timezone: userTimezone,
      });
      if (!fallbackIncrement.ok) {
        console.error('Fallback usage increment failed:', fallbackIncrement.error);
      } else {
        remaining = Math.max(0, conversionsLimit - conversionsUsed - incrementBy);
      }
    } else {
      remaining = Math.max(0, conversionsLimit - conversionsUsed - incrementBy);
    }

    const jsonData = buildJsonExport({
      transactions,
      bankMetadata: bankInfo,
      summary: {
        totalCredits,
        totalDebits,
        netFlow,
      },
    });
    const mt940Data = buildMt940Export({
      transactions,
      bankMetadata: bankInfo,
      statementReference: conversion?.id ?? undefined,
    });

    timing.total_ms = Date.now() - totalStart;
    console.log('Timing summary (ms):', timing);
    const expectedTotal =
      processedVia === 'deterministic'
        ? EXPECTED_TEXT_TOTAL_MS
        : processedVia === 'ai_rescue'
          ? EXPECTED_AI_TOTAL_MS
          : EXPECTED_OCR_TOTAL_MS;
    if (timing.total_ms > expectedTotal) {
      console.warn(
        `Timing exceeded expected target: ${timing.total_ms}ms (expected <= ${expectedTotal}ms, mode=${processedVia})`,
      );
    }
    if (conversion?.id) {
      try {
        const { error: timingError } = await supabase
          .from('conversions')
          .update({ processing_timings: timing, processing_total_ms: timing.total_ms } as any)
          .eq('id', conversion.id);
        if (timingError && !/processing_timings|processing_total_ms/i.test(timingError.message || '')) {
          console.error('Failed to update conversion timings:', timingError);
        }
      } catch (timingError) {
        console.error('Conversion timing update crashed:', timingError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        conversionId: conversion?.id || null,
        resultPath: resultPath,
        transactions: transactions,
        bankId: templateSelectedId ?? bankDetection.bankId,
        confidenceScore: finalConfidenceScore,
        fraudFlags,
        aiUsed: aiUsed || processedVia === 'ai_rescue',
        parseMode: processedVia as ParseMode,
        analytics: analytics,
        bankInfo,
        excelData: excelBase64 ?? undefined,
        jsonData,
        mt940Data,
        outputMode: requestedOutputMode,
        processedVia,
        outputTier,
        pipelineModel: 'Deterministic -> OCR fallback -> AI rescue (last step)',
        expectedTimings: {
          deterministic_ms: EXPECTED_TEXT_TOTAL_MS,
          ocr_ms: EXPECTED_OCR_TOTAL_MS,
          ai_ms: EXPECTED_AI_TOTAL_MS,
        },
        tallyEnabled: requestedOutputMode === 'tally_only',
        message: 'Conversion completed successfully',
        remaining,
        isAuthenticated: !!user,
        aiStatus, // For debugging - shows which AI did what
        timing,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Internal error:', error);
    const errorMessage = sanitizeError(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  } finally {
    if (shouldCleanupUploadedSource && uploadedSourcePath && supabaseAdmin) {
      try {
        const { error } = await supabaseAdmin.storage
          .from('bank-statements')
          .remove([uploadedSourcePath]);
        if (error) {
          console.error('Failed to cleanup orphan source upload:', uploadedSourcePath, error);
        } else {
          console.log('Cleaned orphan source upload:', uploadedSourcePath);
        }
      } catch (cleanupError) {
        console.error('Unexpected cleanup failure for source upload:', uploadedSourcePath, cleanupError);
      }
    }
  }
});
