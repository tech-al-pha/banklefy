// ============= MULTI-STATEMENT CONVERSION (BATCH) =============
// Processes multiple statements in one request and optionally returns a merged Excel.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

import {
  assessClientPdfParsedTransactions,
  callGroqVisionOCR,
  callMistralVisionOCR,
  correctMinorBalanceDrift,
  extractBankMetadataFromOcrText,
  mergeOcrTransactionsDeterministic,
  normalizeRawTransactions,
  recoverAdcbTransactionsFromOcrText,
  recoverEmiratesIslamicTransactionsFromOcrText,
  scoreRunningBalanceFlow,
  type ClientPdfParseAssessment,
  type OCRResult,
  type RawTransaction,
  type BankMetadata,
} from '../_shared/ocr-processor.ts';
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
  type ConfidenceSummary,
  type Transaction,
} from '../_shared/financial-engine.ts';
import {
  performUnderwritingAnalysis,
} from '../_shared/underwriting-engine.ts';
import {
  buildUnderwritingPayload,
  resolveUnderwritingTier,
  type UnderwritingPayload,
} from '../_shared/foir-tier.ts';
import {
  detectHighRiskTransactions,
  detectCircularTrading,
  generateFraudAlerts,
  calculateIntegrityScore,
} from '../_shared/risk-alert-engine.ts';
import { sanitizeTransactions } from '../_shared/transaction-sanitizer.ts';
import {
  generateProfessionalExcel,
  generateMergedStatementsExcel,
} from '../_shared/excel-generator.ts';
import { buildJsonExport, buildMt940Export } from '../_shared/export-formatters.ts';
import {
  buildMergedStatement,
  validateStatementsForMerge,
  type StatementData,
} from '../_shared/multi-statement.ts';
import { fromMinorUnits, sumMinorUnits, toMinorUnits } from '../_shared/money.ts';
import { getTrackingKey } from '../_shared/client-id.ts';
import { resolveEffectiveLimit, type LimitResolverDatabase, type SupabaseLike } from '../_shared/limit-resolver.ts';
import { FULL_PAGE_OCR_COVERAGE_THRESHOLD, shouldUseFullPageOcrCoverage } from '../_shared/ocr-routing.ts';
import {
  detectPdfAmountColumnLayout,
  extractAnchoredAmountsFromLayout,
  type PdfAmountColumnLayout,
} from '../_shared/pdf-column-layout.ts';
import type { Database as AppDatabase } from '../../../src/integrations/supabase/types.ts';

type LooseTable = {
  Row: Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: [];
};

type ConversionProcessingTimings = Record<string, unknown>;

type SubscriptionsTable = {
  Row: LimitResolverDatabase['public']['Tables']['subscriptions']['Row'] & {
    pages_used_this_month?: number | null;
  };
  Insert: LimitResolverDatabase['public']['Tables']['subscriptions']['Insert'] & {
    pages_used_this_month?: number | null;
  };
  Update: LimitResolverDatabase['public']['Tables']['subscriptions']['Update'] & {
    pages_used_this_month?: number | null;
  };
  Relationships: [];
};

type BatchDatabase = {
  public: Omit<AppDatabase['public'], 'Tables'> & {
    Tables: Omit<AppDatabase['public']['Tables'], 'conversions' | 'subscriptions'> & {
      category_corrections: LooseTable;
      conversions: AppDatabase['public']['Tables']['conversions'];
      subscriptions: SubscriptionsTable;
    };
  };
};

type BatchSupabaseClient = SupabaseClient<BatchDatabase>;

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

const CENTENNIAL_BONUS_USER_ID = '1f04b6ab-c06a-43a5-8090-fb3a1d704521';
const CENTENNIAL_BONUS_PLAN = 'bonus_free_basic';
const CENTENNIAL_BONUS_LIMIT = 50;

const BATCH_DATE_TOKEN_SOURCE =
  '(?:\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4}|\\d{1,2}[/-][A-Za-z]{3,9}(?:[/-]|\\s)+\\d{2,4}|\\d{1,2}\\s+[A-Za-z]{3,9}\\s+\\d{2,4}|[A-Za-z]{3,9}\\s+\\d{1,2},?\\s+\\d{2,4})';

const incrementCentennialBonusUsage = async ({
  supabaseAdmin,
  userId,
  timezone,
  incrementBy,
}: {
  supabaseAdmin: BatchSupabaseClient;
  userId: string;
  timezone: string;
  incrementBy: number;
}) => {
  const today = new Date().toISOString().slice(0, 10);
  const { data: existing, error: readError } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (readError) return { ok: false, error: readError, remaining: 0 };

  const currentUsed = Number(existing?.conversions_used ?? 0) || 0;
  const currentLimit = Number(existing?.conversions_limit ?? 0) || 0;
  const nextUsed = Math.min(CENTENNIAL_BONUS_LIMIT, currentUsed + incrementBy);

  if (!existing) {
    const { error: insertError } = await supabaseAdmin.from('subscriptions').insert({
      user_id: userId,
      conversions_used: nextUsed,
      conversions_limit: CENTENNIAL_BONUS_LIMIT,
      last_reset_date: today,
      timezone,
      tier: 'free',
      plan_type: CENTENNIAL_BONUS_PLAN,
    } as BatchDatabase['public']['Tables']['subscriptions']['Insert']);
    return { ok: !insertError, error: insertError, remaining: Math.max(0, CENTENNIAL_BONUS_LIMIT - nextUsed) };
  }

  const { error: updateError } = await supabaseAdmin
    .from('subscriptions')
    .update({
      conversions_used: nextUsed,
      conversions_limit: Math.max(CENTENNIAL_BONUS_LIMIT, currentLimit),
      timezone,
      tier: 'free',
      plan_type: CENTENNIAL_BONUS_PLAN,
    } as BatchDatabase['public']['Tables']['subscriptions']['Update'])
    .eq('user_id', userId);

  return { ok: !updateError, error: updateError, remaining: Math.max(0, CENTENNIAL_BONUS_LIMIT - nextUsed) };
};

const BATCH_ROW_START_PATTERN = new RegExp(
  `^(?:\\s*\\d+\\s+)?(?:[A-Za-z0-9._/-]*\\d[A-Za-z0-9._/-]*\\s+)?(${BATCH_DATE_TOKEN_SOURCE})\\s+(.+)$`,
  'i',
);
const BATCH_AMOUNT_NUMBER_SOURCE = '(?:\\d{1,3}(?:,\\d{2,3})+|\\d{1,7})(?:\\.\\d{1,4})?';
const BATCH_AMOUNT_PATTERN = new RegExp(`([+-]?\\(?${BATCH_AMOUNT_NUMBER_SOURCE}\\)?)(?:\\s*(CR|DR))?`, 'gi');
const BATCH_MONTH_INDEX: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5,
  jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

type BatchLineToken = { x: number; y: number; text: string };
type BatchLineEntry = { text: string; tokens: BatchLineToken[] };

const normalizeBatchDate = (value: string): string => {
  const raw = value.trim().replace(/\s+/g, ' ');
  const dmy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const yearRaw = Number(dmy[3]);
    const year = yearRaw < 100 ? (yearRaw < 50 ? 2000 + yearRaw : 1900 + yearRaw) : yearRaw;
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  const dayMonthYear = raw.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{2,4})$/);
  if (dayMonthYear) {
    const day = Number(dayMonthYear[1]);
    const month = BATCH_MONTH_INDEX[dayMonthYear[2].toLowerCase()];
    const yearRaw = Number(dayMonthYear[3]);
    const year = yearRaw < 100 ? (yearRaw < 50 ? 2000 + yearRaw : 1900 + yearRaw) : yearRaw;
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  const monthDayYear = raw.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{2,4})$/);
  if (monthDayYear) {
    const month = BATCH_MONTH_INDEX[monthDayYear[1].toLowerCase()];
    const day = Number(monthDayYear[2]);
    const yearRaw = Number(monthDayYear[3]);
    const year = yearRaw < 100 ? (yearRaw < 50 ? 2000 + yearRaw : 1900 + yearRaw) : yearRaw;
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  return raw;
};

const parseBatchAmount = (value: string): number => {
  const raw = String(value || '').trim();
  if (!raw) return 0;
  const dateClean = raw.replace(/\b(CR|DR)\b/gi, '').replace(/[()]/g, '').trim();
  if (DATE_LIKE_AMOUNT_PATTERN.test(dateClean)) return Number.NaN;
  const hasParens = raw.startsWith('(') && raw.endsWith(')');
  const marker = raw.match(/\b(CR|DR)\b/i)?.[1]?.toUpperCase();
  const cleaned = raw.replace(/\b(CR|DR)\b/gi, '').replace(/[(),]/g, '').trim();
  if (PACKED_DATE_TOKEN_PATTERN.test(cleaned) && isPackedDateNumber(cleaned)) return Number.NaN;
  const amount = Number(cleaned.replace(/,/g, ''));
  if (!Number.isFinite(amount)) return 0;
  if (hasParens || marker === 'DR') return -Math.abs(amount);
  if (marker === 'CR') return Math.abs(amount);
  return amount;
};

const inferBatchDebitCredit = (line: string, amount: number): { debit: number; credit: number } => {
  const lower = line.toLowerCase();
  const absAmount = Math.abs(amount);
  if (
    amount < 0 ||
    /\bdr\b|\bdebit\b|withdraw|purchase|payment|charge|charges|chgs|fee|atm|pos\b|sent\b|outward|transfer to/i.test(lower)
  ) {
    return { debit: absAmount, credit: 0 };
  }
  if (/\bcr\b|\bcredit\b|deposit|salary|refund|interest|received|inward|transfer from/i.test(lower)) {
    return { debit: 0, credit: absAmount };
  }
  return { debit: absAmount, credit: 0 };
};

const BATCH_AMOUNT_TOKEN_PATTERN = new RegExp(`^[+-]?(?:\\(?${BATCH_AMOUNT_NUMBER_SOURCE}\\)?)(?:\\s*(?:CR|DR))?$`, 'i');
const PACKED_DATE_TOKEN_PATTERN = /^\d{6,8}$/;
const DATE_LIKE_AMOUNT_PATTERN =
  /^(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}[/-][A-Za-z]{3,9}(?:[/-]|\s)+\d{2,4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{2,4})$/i;

const isPackedDateNumber = (value: string): boolean => {
  if (!PACKED_DATE_TOKEN_PATTERN.test(value)) return false;

  const tryYmd = (yyyy: number, mm: number, dd: number): boolean => {
    if (!Number.isFinite(yyyy) || !Number.isFinite(mm) || !Number.isFinite(dd)) return false;
    if (yyyy < 1990 || yyyy > 2099) return false;
    if (mm < 1 || mm > 12) return false;
    if (dd < 1 || dd > 31) return false;
    return true;
  };

  const normalizeTwoDigitYear = (yy: number): number => (yy < 50 ? 2000 + yy : 1900 + yy);

  if (value.length === 8) {
    const yyyyFirst = tryYmd(Number(value.slice(0, 4)), Number(value.slice(4, 6)), Number(value.slice(6, 8)));
    const ddFirst = tryYmd(Number(value.slice(4, 8)), Number(value.slice(2, 4)), Number(value.slice(0, 2)));
    return yyyyFirst || ddFirst;
  }

  if (value.length === 6) {
    const year = normalizeTwoDigitYear(Number(value.slice(4, 6)));
    return tryYmd(year, Number(value.slice(2, 4)), Number(value.slice(0, 2)));
  }

  return false;
};

const isBatchAmountToken = (value: string): boolean => {
  if (!BATCH_AMOUNT_TOKEN_PATTERN.test(value)) return false;
  const cleaned = String(value || '').replace(/\b(CR|DR)\b/gi, '').replace(/[(),]/g, '').trim();
  if (DATE_LIKE_AMOUNT_PATTERN.test(cleaned)) return false;
  if (PACKED_DATE_TOKEN_PATTERN.test(cleaned) && isPackedDateNumber(cleaned)) return false;
  return true;
};

const isBatchNonTransactionLine = (line: string): boolean => {
  const lower = line.toLowerCase();
  if (!lower) return true;
  return (
    /^page\s*\d+(?:\s*\/\s*\d+|\s+of\s+\d+)?$/i.test(line) ||
    lower.includes('statement of accounts') ||
    lower.includes('statement of account') ||
    lower.includes('account (s) summary') ||
    lower.includes('account details') ||
    lower.includes('account no. account type currency') ||
    lower.includes('date description debits credits balance') ||
    lower.includes('transaction date') ||
    lower.includes('value date') ||
    lower.includes('running balance') ||
    lower.includes('opening balance') ||
    lower.includes('closing balance') ||
    lower.includes('total debit') ||
    lower.includes('total credit') ||
    lower.includes('customer trn') ||
    lower.includes('po box') ||
    lower.includes('period ') ||
    lower.includes('this is a system generated') ||
    lower.includes('licensed by the central bank')
  );
};

const extractPdfPageLineEntries = async (pdf: PdfDocumentProxy, pageNumber: number): Promise<BatchLineEntry[]> => {
  const page = await pdf.getPage(pageNumber);
  const textContent = await page.getTextContent?.();
  const items = Array.isArray(textContent?.items) ? textContent.items : [];
  const tokens: BatchLineToken[] = items
    .map((item) => {
      const text = String(item?.str ?? '').replace(/\s+/g, ' ').trim();
      const transform = Array.isArray(item?.transform) ? item.transform : [];
      return {
        x: Number(transform[4] ?? 0),
        y: Number(transform[5] ?? 0),
        text,
      };
    })
    .filter((token) => token.text.length > 0);

  if (tokens.length === 0) return [];

  tokens.sort((a, b) => {
    const yDiff = Math.abs(a.y - b.y);
    if (yDiff <= 2.5) return a.x - b.x;
    return b.y - a.y;
  });

  const buckets: Array<{ y: number; tokens: BatchLineToken[] }> = [];
  for (const token of tokens) {
    const bucket = buckets.find((entry) => Math.abs(entry.y - token.y) <= 2.5);
    if (bucket) bucket.tokens.push(token);
    else buckets.push({ y: token.y, tokens: [token] });
  }

  return buckets
    .sort((a, b) => b.y - a.y)
    .map((bucket) => {
      const ordered = bucket.tokens.sort((left, right) => left.x - right.x);
      return {
        text: ordered.map((token) => token.text).join(' ').replace(/\s+/g, ' ').trim(),
        tokens: ordered,
      };
    })
    .filter((entry) => entry.text.length > 0);
};

const parseDeterministicRowsFromLineEntries = (lineEntries: BatchLineEntry[]): RawTransaction[] => {
  const specializedAdcbRows = recoverAdcbTransactionsFromOcrText(
    lineEntries.map((entry) => entry.text).join('\n'),
  );
  if (specializedAdcbRows.length > 0) {
    return specializedAdcbRows;
  }

  const specializedEmiratesRows = recoverEmiratesIslamicTransactionsFromOcrText(
    lineEntries.map((entry) => entry.text).join('\n'),
  );
  if (specializedEmiratesRows.length > 0) {
    return specializedEmiratesRows;
  }

  const rows: RawTransaction[] = [];
  const amountLayout: PdfAmountColumnLayout | null = detectPdfAmountColumnLayout(
    lineEntries,
    isBatchAmountToken,
  );

  for (const entry of lineEntries) {
    const line = entry.text.trim().replace(/\s+/g, ' ');
    if (!line) continue;
    if (isBatchNonTransactionLine(line)) continue;

    const rowMatch = line.match(BATCH_ROW_START_PATTERN);
    if (!rowMatch) continue;

    const dateToken = rowMatch[1];
    const remainder = rowMatch[2] || '';
    const anchored = extractAnchoredAmountsFromLayout(entry, amountLayout, {
      inferSide: inferBatchDebitCredit,
      isAmountToken: isBatchAmountToken,
      parseAmount: parseBatchAmount,
    });
    const matches: Array<{ raw: string; marker: string | null }> = [];
    let m: RegExpExecArray | null;
    while ((m = BATCH_AMOUNT_PATTERN.exec(remainder)) !== null) {
      matches.push({ raw: m[0], marker: m[2] ? m[2].toUpperCase() : null });
    }
    BATCH_AMOUNT_PATTERN.lastIndex = 0;
    if (!anchored && matches.length < 2) continue;

    const amountToken = matches.length >= 2 ? matches[matches.length - 2] : null;
    const balanceToken = matches.length >= 1 ? matches[matches.length - 1] : null;
    const amount = amountToken ? parseBatchAmount(amountToken.raw) : 0;
    const balance = anchored?.balance ?? (balanceToken ? Math.abs(parseBatchAmount(balanceToken.raw)) : 0);
    if (!Number.isFinite(balance) || balance <= 0) continue;

    const explicit = amountToken?.marker;
    const inferred = anchored ?? (
      explicit === 'CR'
        ? { debit: 0, credit: Math.abs(amount), balance }
        : explicit === 'DR'
          ? { debit: Math.abs(amount), credit: 0, balance }
          : { ...inferBatchDebitCredit(remainder, amount), balance }
    );
    if (inferred.debit <= 0 && inferred.credit <= 0) continue;

    const description = remainder
      .replace(BATCH_AMOUNT_PATTERN, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!description || description.length < 2) continue;

    rows.push({
      date: normalizeBatchDate(dateToken),
      description,
      debit: inferred.debit,
      credit: inferred.credit,
      balance,
      refNumber: '',
    });
  }
  return rows;
};

// ============= ADMIN ROLE (Server-Side Only) =============
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

// ============= DEPLOYMENT-AGNOSTIC CORS =============
const getAllowedOrigin = (requestOrigin: string | null): string => {
  const envOrigin = Deno.env.get('ALLOWED_ORIGIN');

  const allowedOrigins = [
    envOrigin,
    'https://www.banklefy.site',
    'https://banklefy.site',
    'https://banklefy.lovable.app',
    'https://www.banklefy.site',
    'https://banklefy.site',
    'http://localhost:8080',
    'http://localhost:5173',
    'http://localhost:3000',
  ].filter(Boolean) as string[];

  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }

  const lovableAppPattern = /^https:\/\/[a-z0-9-]+\.lovable\.app$/;
  const lovableProjectPattern = /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/;
  if (requestOrigin && (lovableAppPattern.test(requestOrigin) || lovableProjectPattern.test(requestOrigin))) {
    return requestOrigin;
  }

  const vercelPattern = /^https:\/\/[a-z0-9-]+\.vercel\.app$/;
  if (requestOrigin && vercelPattern.test(requestOrigin)) {
    return requestOrigin;
  }

  if (envOrigin === '*' && requestOrigin) {
    return requestOrigin;
  }

  return allowedOrigins[0] || 'https://www.banklefy.site';
};

const getCorsHeaders = (req: Request) => ({
  'Access-Control-Allow-Origin': getAllowedOrigin(req.headers.get('origin')),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
});

const sanitizeError = (error: unknown): string => {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    const debugPassThrough = [
      'ai status:',
      'groq vision:',
      'groq text:',
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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${secretKey}&response=${token}`,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));
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

const loadPdfDocumentFromBytes = async (
  bytes: Uint8Array,
  password?: string,
): Promise<PdfDocumentProxy> => {
  const fallbackModule = await import('https://esm.sh/pdfjs-serverless');
  const getDocument = (fallbackModule as { getDocument?: (options: Record<string, unknown>) => { promise: Promise<unknown> } }).getDocument;
  if (!getDocument) {
    throw new Error('pdfjs-serverless getDocument is unavailable');
  }
  const loadingTask = getDocument({
    data: bytes,
    password: password || undefined,
    useSystemFonts: true,
  });
  return (await loadingTask.promise) as PdfDocumentProxy;
};

const extractPdfPageText = async (
  pdf: PdfDocumentProxy,
  pageNumber: number,
): Promise<string> => {
  const page = await pdf.getPage(pageNumber);
  const textContent = await page.getTextContent?.();
  const items = Array.isArray(textContent?.items) ? textContent.items : [];
  return items
    .map((item) => String(item?.str ?? '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' ');
};

const extractPdfTextSummary = async (pdf: PdfDocumentProxy, pageCount: number): Promise<{
  hasSelectableText: boolean;
  charsPerPage: number;
}> => {
  const limitedPages = Math.max(1, Math.min(pageCount, pdf.numPages, 8));
  const sampleTexts = await Promise.all(
    Array.from({ length: limitedPages }, async (_, i) => extractPdfPageText(pdf, i + 1)),
  );
  const rawLength = sampleTexts.join('\n').replace(/\s+/g, '').length;
  return {
    hasSelectableText: rawLength > 0,
    charsPerPage: Math.floor(rawLength / Math.max(1, limitedPages)),
  };
};

type SelectiveOcrPlan = {
  selected: Array<{ pageNumber: number; imageDataUrl: string }>;
  reasons: string[];
};

const buildSelectiveOcrPagePlan = async (params: {
  pdfDocument: PdfDocumentProxy;
  totalPages: number;
  pageImages: string[];
}): Promise<SelectiveOcrPlan> => {
  const totalPages = Math.max(0, Math.min(params.totalPages, params.pageImages.length, params.pdfDocument.numPages));
  const fallbackAll = params.pageImages.map((imageDataUrl, index) => ({ pageNumber: index + 1, imageDataUrl }));
  if (shouldUseFullPageOcrCoverage(totalPages)) {
    return {
      selected: fallbackAll,
      reasons: ['large_document_full_coverage'],
    };
  }
  if (totalPages === 0) {
    return { selected: fallbackAll, reasons: ['no_pages'] };
  }

  const diagnostics = await Promise.all(
    Array.from({ length: totalPages }, async (_, idx) => {
      const pageNumber = idx + 1;
      const pageText = await extractPdfPageText(params.pdfDocument, pageNumber);
      const charCount = pageText.replace(/\s+/g, '').length;
      const dateMatches = (pageText.match(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g) || []).length;
      const amountMatches = (pageText.match(new RegExp(BATCH_AMOUNT_NUMBER_SOURCE, 'g')) || []).length;
      const needsOcr = charCount < 80 || amountMatches < 2 || dateMatches < 1;
      return { pageNumber, needsOcr };
    }),
  );

  const selected = diagnostics
    .filter((entry) => entry.needsOcr)
    .map((entry) => ({ pageNumber: entry.pageNumber, imageDataUrl: params.pageImages[entry.pageNumber - 1] }))
    .filter((entry) => typeof entry.imageDataUrl === 'string' && entry.imageDataUrl.length > 0);

  if (selected.length === 0) {
    return {
      selected: [{ pageNumber: 1, imageDataUrl: params.pageImages[0] }],
      reasons: ['all_pages_text_stable'],
    };
  }

  return {
    selected,
    reasons: [`selected_${selected.length}_of_${totalPages}`],
  };
};

const bufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
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
  if (transactions.length < 8) return false;

  let codeHits = 0;
  for (const transaction of transactions.slice(0, 200)) {
    const blob = `${String(transaction.refNumber || '')} ${String(transaction.description || '')}`.toLowerCase();
    if (/phub|mob|trf/i.test(blob)) codeHits += 1;
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
  if (!primaryResult.success || tx.length === 0) return true;

  const mismatchRatio = balanceMismatchRatio(tx);
  const avgConfidence = Number(primaryResult.metadata?.avg_confidence ?? 0.85);
  const lowConfidenceRows = tx.filter((row) =>
    String((row as RawTransaction).type || '').toLowerCase().includes('low_confidence'),
  ).length;
  const lowConfidenceRatio = tx.length > 0 ? lowConfidenceRows / tx.length : 1;

  if (avgConfidence < 0.75) return true;
  if (lowConfidenceRatio >= 0.18) return true;
  if (tx.length >= 8 && mismatchRatio > 0.08) return true;
  if (tx.length >= 4 && mismatchRatio > 0.16) return true;
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
  if (!groqResult.success || tx.length === 0) return true;

  const mismatchRatio = balanceMismatchRatio(tx);
  if (tx.length >= 8 && mismatchRatio > 0.08) return true;
  if (tx.length >= 4 && mismatchRatio > 0.18) return true;
  return false;
};

const shouldFallbackToMistralAfterGroq = (groqResult: OCRResult): boolean => {
  if (!groqResult.success) return true;
  const tx = groqResult.transactions || [];
  if (tx.length === 0) return true;

  const mismatchRatio = balanceMismatchRatio(tx);
  const avgConfidence = Number(groqResult.metadata?.avg_confidence ?? 0.85);
  const lowConfidenceRows = tx.filter((row) => {
    const rowConfidence = Number((row as RawTransaction).confidence ?? NaN);
    if (Number.isFinite(rowConfidence) && rowConfidence < 0.72) return true;
    return String((row as RawTransaction).type || '').toLowerCase().includes('low_confidence');
  }).length;
  const lowConfidenceRatio = tx.length > 0 ? lowConfidenceRows / tx.length : 1;

  return (
    avgConfidence < 0.72 ||
    mismatchRatio > 0.16 ||
    (tx.length >= 5 && lowConfidenceRatio >= 0.2)
  );
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

const sanitizeFileName = (fileName: string): string =>
  fileName.replace(/[\\/]/g, '').substring(0, 255);

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const getProcessingTimings = (value: unknown): Record<string, unknown> => {
  return isRecord(value) ? { ...value } : {};
};

const mergeProcessingTimings = (existing: unknown, patch: Record<string, unknown>): ConversionProcessingTimings => {
  return {
    ...getProcessingTimings(existing),
    ...patch,
  } as ConversionProcessingTimings;
};

const buildCategoryCorrections = async (supabaseAdmin: BatchSupabaseClient, userId?: string) => {
  if (!userId) return undefined;
  const { data: corrections } = await supabaseAdmin
    .from('category_corrections')
    .select('description_pattern, corrected_category, weight')
    .eq('user_id', userId)
    .order('weight', { ascending: false });

  if (!corrections || corrections.length === 0) return undefined;

  const map = new Map<string, string>();
  corrections.forEach((c: { description_pattern?: unknown; corrected_category?: unknown }) => {
    if (typeof c.description_pattern !== 'string' || typeof c.corrected_category !== 'string') {
      return;
    }
    map.set(c.description_pattern.toLowerCase(), c.corrected_category);
  });
  return map;
};

type StatementPayload = {
  fileName: string;
  fileData?: string;
  pdfPageImages?: string[];
  pdfParsedTransactions?: Array<{
    date?: string;
    valueDate?: string;
    description?: string;
    narration?: string;
    debit?: number | string;
    credit?: number | string;
    balance?: number | string;
    refNumber?: string;
  }>;
  pdfParsedBankMetadata?: {
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
    openingBalance?: number | string;
    closingBalance?: number | string;
  };
  pdfPassword?: string;
};

type ProcessedStatement = {
  fileName: string;
  transactions: Transaction[];
  bankMetadata?: BankMetadata;
  excelBase64?: string;
  resultPath?: string | null;
  pagesWithData: number;
  totals: {
    totalCredits: number;
    totalDebits: number;
  };
};

interface FraudAlert {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedRows: number[];
  metadata?: Record<string, unknown>;
}

// Aggregated analytics for batch mode
interface AggregatedAnalytics {
  totalTransactions: number;
  totalCredits: number;
  totalDebits: number;
  netFlow: number;
  duplicateCount: number;
  categoryBreakdown: Record<string, { count: number; totalDebit: number; totalCredit: number }>;
  confidenceSummary: ConfidenceSummary;
  riskAnalysis: {
    integrityScore: number;
    balanceMismatches: number;
    averageDailyBalance: number;
    maxDip: { amount: number; date: string | null };
    maxPeak: number;
    riskFlags: { type: string; count: number }[];
    fraudAlerts: FraudAlert[];
  };
  underwriting?: UnderwritingPayload;
}

// Function to aggregate analytics from multiple statements
function aggregateBatchAnalytics(
  statements: ProcessedStatement[],
  underwritingTier: Parameters<typeof buildUnderwritingPayload>[1],
): AggregatedAnalytics {
  // Combine all transactions from all statements
  const allTransactions: Transaction[] = [];
  statements.forEach(s => {
    allTransactions.push(...s.transactions);
  });

  // Sort by date
  allTransactions.sort((a, b) => a.date.localeCompare(b.date));

  // Run financial analysis on combined transactions
  const reconciliation = reconcileBalances(allTransactions);
  const duplicateCount = detectDuplicates(allTransactions);
  const riskTransactions = detectHighRiskTransactions(allTransactions);
  const circularResult = detectCircularTrading(allTransactions);
  if (circularResult) {
    riskTransactions.push(circularResult);
  }
  const confidenceSummary = scoreTransactionConfidence(allTransactions);

  const underwritingResult = performUnderwritingAnalysis(allTransactions);
  const underwritingPayload = buildUnderwritingPayload(underwritingResult, underwritingTier);
  const liquidityMetrics = analyzeLiquidity(allTransactions);
  const fraudAlerts = generateFraudAlerts(
    reconciliation,
    riskTransactions,
    liquidityMetrics,
    allTransactions.length,
  );
  const integrityScore = calculateIntegrityScore(reconciliation, riskTransactions, liquidityMetrics);

  // Calculate totals
  // Use minor-unit math for exact debit/credit totals (no float drift).
  const totalCreditsMinor = sumMinorUnits(allTransactions.map((t) => t.credit || 0));
  const totalDebitsMinor = sumMinorUnits(allTransactions.map((t) => t.debit || 0));
  const totalCredits = fromMinorUnits(totalCreditsMinor);
  const totalDebits = fromMinorUnits(totalDebitsMinor);
  const netFlow = fromMinorUnits(totalCreditsMinor - totalDebitsMinor);

  // Build category breakdown
  const categoryBreakdownMinor: Record<string, { count: number; totalDebitMinor: number; totalCreditMinor: number }> = {};
  allTransactions.forEach((t) => {
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

  // Build risk flags summary
  const riskFlagCounts: Record<string, number> = {};
  riskTransactions.forEach(rt => {
    riskFlagCounts[rt.type] = (riskFlagCounts[rt.type] || 0) + rt.indices.length;
  });
  const riskFlags = Object.entries(riskFlagCounts).map(([type, count]) => ({ type, count }));

  return {
    totalTransactions: allTransactions.length,
    totalCredits,
    totalDebits,
    netFlow,
    duplicateCount,
    categoryBreakdown,
    confidenceSummary,
    riskAnalysis: {
      integrityScore,
      balanceMismatches: reconciliation.totalMismatches,
      averageDailyBalance: liquidityMetrics.avgBalance,
      maxDip: { amount: liquidityMetrics.minBalance, date: liquidityMetrics.maxDipDate },
      maxPeak: liquidityMetrics.maxBalance,
      riskFlags,
      fraudAlerts,
    },
    ...(underwritingPayload ? { underwriting: underwritingPayload } : {}),
  };
}

const validatePdfPageImages = (images: string[], fileName: string): string | null => {
  if (images.length > MAX_PDF_PAGE_IMAGES) {
    return `Too many page images for ${fileName} (max ${MAX_PDF_PAGE_IMAGES})`;
  }

  let totalBytes = 0;
  for (const img of images) {
    if (typeof img !== 'string') continue;
    const match = img.match(/^data:([^;]+);base64,(.+)$/);
    const base64Payload = match ? match[2] : img;
    const sizeBytes = estimateBase64Bytes(base64Payload);
    totalBytes += sizeBytes;

    if (sizeBytes > MAX_PDF_PAGE_IMAGE_BYTES) {
      return `A page image in ${fileName} exceeds ${Math.round(MAX_PDF_PAGE_IMAGE_BYTES / (1024 * 1024))}MB`;
    }
  }

  if (totalBytes > MAX_PDF_PAGE_IMAGES_TOTAL_BYTES) {
    return `Total page images for ${fileName} exceed ${Math.round(MAX_PDF_PAGE_IMAGES_TOTAL_BYTES / (1024 * 1024))}MB`;
  }

  return null;
};

const bytesFromBase64 = (base64FileData?: string): Uint8Array => {
  if (!base64FileData) return new Uint8Array();
  const base64Content = base64FileData.split(',')?.[1] || base64FileData;
  if (!base64Content) return new Uint8Array();
  const binaryString = atob(base64Content);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const processStatement = async (params: {
  fileName: string;
  bytes: Uint8Array;
  pdfPageImages?: string[];
  pdfParsedTransactions?: StatementPayload['pdfParsedTransactions'];
  pdfParsedBankMetadata?: StatementPayload['pdfParsedBankMetadata'];
  pdfPassword?: string;
  categoryCorrections?: Map<string, string>;
  forceOcrForPdf?: boolean;
}): Promise<{ transactions: Transaction[]; bankMetadata?: BankMetadata; excelBuffer: ArrayBuffer; totals: { totalCredits: number; totalDebits: number }; pagesWithData: number }> => {
  const lowerFileName = params.fileName.toLowerCase();
  const isPdf = lowerFileName.endsWith('.pdf');
  const hasPdfPageImages = Array.isArray(params.pdfPageImages) && params.pdfPageImages.length > 0;
  const initialClientParsedTransactions: RawTransaction[] = Array.isArray(params.pdfParsedTransactions)
    ? normalizeRawTransactions(params.pdfParsedTransactions).filter((transaction) => {
        const hasDate = typeof transaction.date === 'string' && transaction.date.trim() && transaction.date !== 'Unknown';
        const hasDescription = typeof transaction.description === 'string' && transaction.description.trim().length > 0;
        const hasAmount =
          Number.isFinite(Number(transaction.debit ?? NaN)) ||
          Number.isFinite(Number(transaction.credit ?? NaN)) ||
          Number.isFinite(Number(transaction.balance ?? NaN));
        return hasDate && hasDescription && hasAmount;
      })
    : [];
  const clientParsedBankMetadata = normalizeClientBankMetadata(params.pdfParsedBankMetadata);
  const pageCount = hasPdfPageImages ? params.pdfPageImages!.length : 1;

  let sharedPdf: PdfDocumentProxy | null = null;
  let structuralScan = {
    hasSelectableText: false,
    charsPerPage: 0,
  };
  try {
    if (isPdf && params.bytes.length > 0) {
      try {
        sharedPdf = await loadPdfDocumentFromBytes(params.bytes.slice(), params.pdfPassword);
        structuralScan = await extractPdfTextSummary(sharedPdf, pageCount);
      } catch (pdfLoadError) {
        console.warn(`Batch PDF text summary unavailable for ${params.fileName}:`, pdfLoadError);
      }
    }

    let clientParsedTransactions = initialClientParsedTransactions;
    if (
      isPdf &&
      sharedPdf &&
      structuralScan.hasSelectableText &&
      clientParsedTransactions.length === 0
    ) {
      try {
        const lines = (
          await Promise.all(
            Array.from({ length: Math.max(1, Math.min(pageCount, sharedPdf.numPages)) }, async (_, idx) =>
              extractPdfPageLineEntries(sharedPdf as PdfDocumentProxy, idx + 1),
            ),
          )
        ).flat();
        const serverDeterministicRows = parseDeterministicRowsFromLineEntries(lines);
        if (serverDeterministicRows.length > 0) {
          clientParsedTransactions = serverDeterministicRows;
          console.log(
            `Batch server deterministic fallback extracted ${serverDeterministicRows.length} rows for ${params.fileName}`,
          );
        }
      } catch (serverDeterministicError) {
        console.warn(`Batch deterministic fallback failed for ${params.fileName}:`, serverDeterministicError);
      }
    }

    const clientPdfParseAssessment = assessClientPdfParsedTransactions(clientParsedTransactions, pageCount);
    const deterministicTextDocument = isPdf && clientParsedTransactions.length > 0;
    const selectableTextDocument =
      isPdf && (structuralScan.hasSelectableText === true || deterministicTextDocument);
    const mustUseDeterministicClientPdf =
      isPdf && !hasPdfPageImages && clientParsedTransactions.length > 0;
    const forceOcrForDenseStatement = selectableTextDocument
      ? false
      : shouldForceOcrForDenseStatement(
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
    console.log(
      `Adaptive OCR strategy (${params.fileName}): level=${adaptiveOcrStrategy.level}, strict=${adaptiveOcrStrategy.strictMode}:${adaptiveOcrStrategy.strictMaxPages}, ` +
      `dual=${adaptiveOcrStrategy.dualMode}:${adaptiveOcrStrategy.dualMaxPages}, reasons=${adaptiveOcrStrategy.reasons.join('|') || 'none'}`,
    );

    const canUseDeterministicClientPdf =
      !params.forceOcrForPdf &&
      !forceOcrForDenseStatement &&
      isPdf &&
      clientParsedTransactions.length > 0 &&
      (selectableTextDocument || clientPdfParseAssessment.useDeterministic || mustUseDeterministicClientPdf);

    if (mustUseDeterministicClientPdf && !clientPdfParseAssessment.useDeterministic) {
      console.log(
        `No PDF page images provided; forcing deterministic PDF rows (${clientParsedTransactions.length}) despite assessment: ${clientPdfParseAssessment.reason}`,
      );
    }

    if (isPdf && clientParsedTransactions.length > 0 && !canUseDeterministicClientPdf) {
      console.log(
        `Ignoring deterministic client PDF rows (${clientParsedTransactions.length}) and falling back to OCR: ${clientPdfParseAssessment.reason} ` +
          `(mismatch=${clientPdfParseAssessment.mismatchRatio.toFixed(3)}, anomaly=${clientPdfParseAssessment.anomalyRate.toFixed(3)}, dense=${forceOcrForDenseStatement})`,
      );
    }

    let extractionResult: Awaited<ReturnType<typeof performExtraction>>;
    let collectedBankMetadata: BankMetadata | undefined = clientParsedBankMetadata;
    let pagesWithData = 1;

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
    pagesWithData = Math.max(1, pageCount);
    } else if (isPdf && hasPdfPageImages) {
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
      const effectiveStrictMode = adaptiveOcrStrategy.strictMode;
      const effectiveStrictMaxPages = adaptiveOcrStrategy.strictMaxPages;
      const effectiveDualMode = adaptiveOcrStrategy.dualMode;
      const effectiveDualMaxPages = adaptiveOcrStrategy.dualMaxPages;
      const useStrictFirstPass = adaptiveOcrStrategy.strictFirstPass || !structuralScan.hasSelectableText;

      let selectedOcrPages: Array<{ pageNumber: number; imageDataUrl: string }> = (params.pdfPageImages as string[])
        .map((imageDataUrl, index) => ({ pageNumber: index + 1, imageDataUrl }));

      if (!structuralScan.hasSelectableText && hasPdfPageImages) {
        console.log(`Skipping selective OCR page plan for image-only batch file ${params.fileName}; using all pages.`);
      } else if (sharedPdf) {
        try {
          const plan = await buildSelectiveOcrPagePlan({
            pdfDocument: sharedPdf,
            totalPages: pageCount,
            pageImages: params.pdfPageImages as string[],
          });
          selectedOcrPages = plan.selected;
          console.log(`Selective OCR plan (${params.fileName}): ${plan.reasons.join(', ')}`);
        } catch (planError) {
          console.warn(`Selective OCR planning failed for ${params.fileName}; using all pages.`, planError);
        }
      }

      const ocrOutcomes = await Promise.all(
        selectedOcrPages.map(async (pageEntry, index) => {
          const img = pageEntry.imageDataUrl;
          if (typeof img !== 'string') {
            return { pageResult: null, strictUsed: false, dualUsed: false, error: 'Invalid OCR page payload' };
          }
          const match = img.match(/^data:([^;]+);base64,(.+)$/);
          if (!match) {
            return { pageResult: null, strictUsed: false, dualUsed: false, error: 'Invalid OCR page encoding' };
          }
          const pageMime = match[1];
          const pageBase64 = match[2];
          let pageResult: OCRResult | null = null;
          let strictUsed = false;
          let dualUsed = false;
          let groqResult: OCRResult | null = null;
          let groqFailureReason: string | null = null;
          try {
            groqResult = await callGroqVisionOCR(pageBase64, pageMime, { strictTableMode: useStrictFirstPass });
          } catch (groqError) {
            groqFailureReason = groqError instanceof Error ? groqError.message : 'Groq OCR failed';
          }

          const groqHasRows = !!(
            groqResult &&
            groqResult.success &&
            groqResult.transactions &&
            groqResult.transactions.length > 0
          );
          const groqNeedsMistralPass = !!(groqResult && groqHasRows && shouldFallbackToMistralAfterGroq(groqResult));

          if (groqHasRows && !groqNeedsMistralPass) {
            pageResult = groqResult;
          } else {
            let mistralResult: OCRResult | null = null;
            let mistralFailureReason: string | null = null;
            try {
              mistralResult = await callMistralVisionOCR(pageBase64, pageMime);
            } catch (mistralError) {
              mistralFailureReason = mistralError instanceof Error ? mistralError.message : 'Mistral OCR failed';
            }

            const mistralHasRows = !!(
              mistralResult &&
              mistralResult.success &&
              mistralResult.transactions &&
              mistralResult.transactions.length > 0
            );
            if (mistralHasRows) {
              pageResult = groqHasRows && groqResult
                ? mergeProviderResults(groqResult, mistralResult as OCRResult)
                : (mistralResult as OCRResult);
              dualUsed = true;
            } else {
              if (groqHasRows && groqResult) {
                pageResult = groqResult;
              } else {
                const failureParts = [
                  groqFailureReason || 'Groq returned empty OCR result',
                  mistralFailureReason || 'Mistral returned empty OCR result',
                ];
                return {
                  pageResult: null,
                  strictUsed,
                  dualUsed: true,
                  error: `OCR_PROVIDERS_FAILED: page ${pageEntry.pageNumber} (${failureParts.join(' | ')})`,
                };
              }
            }
          }

          if (
            pageResult &&
            !useStrictFirstPass &&
            index < effectiveStrictMaxPages &&
            shouldRetryStrictVisionPass(lowerFileName, pageResult, effectiveStrictMode)
          ) {
            const strictResult = await callGroqVisionOCR(pageBase64, pageMime, { strictTableMode: true });
            strictUsed = true;
            pageResult = chooseBetterVisionResult(pageResult, strictResult);
          }

          if (
            pageResult &&
            index < effectiveDualMaxPages &&
            shouldRunMistralDualPass(lowerFileName, pageResult, effectiveDualMode)
          ) {
            const mistralResult = await callMistralVisionOCR(pageBase64, pageMime);
            dualUsed = true;
            pageResult = mergeProviderResults(pageResult, mistralResult);
          }

          return { pageResult, strictUsed, dualUsed, error: pageResult?.error || null };
        }),
      );

      const strictRetryCount = ocrOutcomes.filter((entry) => entry.strictUsed).length;
      const dualProviderCount = ocrOutcomes.filter((entry) => entry.dualUsed).length;
      for (const outcome of ocrOutcomes) {
        const pageResult = outcome.pageResult;
        if (pageResult && pageResult.success && pageResult.transactions && pageResult.transactions.length > 0) {
          pagesWithData += 1;
          collected.push(...pageResult.transactions);
          if (pageResult.text) combinedText += (combinedText ? '\n' : '') + pageResult.text;
          if (pageResult.bankMetadata) {
            collectedBankMetadata = mergeBankMetadata(collectedBankMetadata, pageResult.bankMetadata);
            console.log('Bank metadata detected:', collectedBankMetadata);
          }
        } else {
          errors.push(outcome.error || 'No data extracted');
        }
      }

      if (strictRetryCount > 0) {
        console.log(`Strict OCR retries used: ${strictRetryCount}/${effectiveStrictMaxPages} (mode=${effectiveStrictMode})`);
      }
      if (dualProviderCount > 0) {
        console.log(`Dual OCR pages used: ${dualProviderCount}/${effectiveDualMaxPages} (mode=${effectiveDualMode})`);
      }

      status.groqVision.time = Date.now() - start;
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
    } else {
      if (isPdf) {
        throw new Error('PDF requires page images for processing.');
      }
      const chunkSize = 8192;
      let base64Data = '';
      for (let i = 0; i < params.bytes.length; i += chunkSize) {
        const chunk = params.bytes.subarray(i, i + chunkSize);
        base64Data += String.fromCharCode(...chunk);
      }
      base64Data = btoa(base64Data);
      const mimeType = lowerFileName.endsWith('.png') ? 'image/png' : 'image/jpeg';
      extractionResult = await performExtraction(base64Data, mimeType, '');
    }

  // Stage 6b: auto reprocess low-confidence rows (strict OCR) only when needed.
  if (
    isPdf &&
    hasPdfPageImages &&
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
        `Auto reprocess triggered (${params.fileName}) avg=${prelim.averageScore}, low=${prelim.lowConfidenceCount}/${prelim.total}, pages=${pageCount}.`,
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
      for (const img of params.pdfPageImages as string[]) {
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
            `Auto reprocess accepted (${params.fileName}) avg=${reprocessScore.averageScore}, low=${reprocessScore.lowConfidenceCount}/${reprocessScore.total}.`,
          );
          extractionResult = {
            transactions: reprocessCollected,
            status,
            extractedText: combinedText,
            bankMetadata: extractionResult.bankMetadata,
          };
        } else {
          console.log(`Auto reprocess rejected (${params.fileName}) no confidence improvement.`);
        }
      } else {
        console.log(`Auto reprocess returned no rows (${params.fileName}); keeping original extraction.`);
      }
    }
  }

  let rawTransactions = extractionResult.transactions;
  const extractedText = extractionResult.extractedText || '';
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

  const balanceDriftCorrection = correctMinorBalanceDrift(rawTransactions, 0.1);
  if (balanceDriftCorrection.correctedCount > 0) {
    console.log(`Corrected minor OCR balance drift on ${balanceDriftCorrection.correctedCount} row(s)`);
    rawTransactions = balanceDriftCorrection.transactions;
  }
  const ocrTextBankMetadata = extractBankMetadataFromOcrText(extractedText);
  console.log(generateStatusReport(extractionResult.status));

  if (!rawTransactions || rawTransactions.length === 0) {
    throw new Error('No transactions found in the document.');
  }

  const categorizationResult = await performCategorization(rawTransactions, extractionResult.status);
  console.log(generateStatusReport(categorizationResult.status));

  const extractedTransactions: Transaction[] = categorizationResult.transactions.map(t => ({
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
  const transactions = sanitizeTransactions(extractedTransactions, {
    openingBalance: provisionalBankInfo?.openingBalance,
    closingBalance: provisionalBankInfo?.closingBalance,
    preserveAmounts: selectableTextDocument || canUseDeterministicClientPdf,
  });

  const reconciliation = reconcileBalances(transactions);
  const duplicateCount = detectDuplicates(transactions);
  const riskTransactions = detectHighRiskTransactions(transactions);
  const circularResult = detectCircularTrading(transactions);
  if (circularResult) {
    riskTransactions.push(circularResult);
  }
  const confidenceSummary = scoreTransactionConfidence(transactions);

  const underwritingResult = performUnderwritingAnalysis(transactions, params.categoryCorrections);
  const liquidityMetrics = analyzeLiquidity(transactions);
  const fraudAlerts = generateFraudAlerts(
    reconciliation,
    riskTransactions,
    liquidityMetrics,
    transactions.length,
  );
  const integrityScore = calculateIntegrityScore(reconciliation, riskTransactions, liquidityMetrics);
  console.log(
    `Analysis complete. Integrity score: ${integrityScore}, Confidence avg: ${confidenceSummary.averageScore}, ` +
    `Low confidence: ${confidenceSummary.lowConfidenceCount}/${confidenceSummary.total}, Fraud alerts: ${fraudAlerts.length}`,
  );

  // Use minor-unit math for exact debit/credit totals (no float drift).
  const totalCreditsMinor = sumMinorUnits(transactions.map((t) => t.credit || 0));
  const totalDebitsMinor = sumMinorUnits(transactions.map((t) => t.debit || 0));
  const totalCredits = fromMinorUnits(totalCreditsMinor);
  const totalDebits = fromMinorUnits(totalDebitsMinor);
  const netFlow = fromMinorUnits(totalCreditsMinor - totalDebitsMinor);

  // Use minor units to keep debit/credit category totals exact.
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

  const excelResult = await generateProfessionalExcel({
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
    bankInfo: mergeBankMetadata(
      clientParsedBankMetadata,
      ocrTextBankMetadata,
      collectedBankMetadata,
      extractionResult.bankMetadata,
    ),
  });

    const bankMetadata = mergeBankMetadata(
      clientParsedBankMetadata,
      ocrTextBankMetadata,
      collectedBankMetadata,
      extractionResult.bankMetadata,
    );

    return {
      transactions,
      bankMetadata,
      excelBuffer: excelResult.buffer,
      totals: {
        totalCredits,
        totalDebits,
      },
      pagesWithData: Math.max(1, pagesWithData),
    };
  } finally {
    await sharedPdf?.destroy?.();
  }
};

// ============= MAIN HANDLER =============
Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let supabaseAdmin: BatchSupabaseClient | null = null;

  try {
    const { files, timezone, recaptchaToken, outputMode } = await req.json();
    const requestedOutputMode = outputMode === 'tally_only' ? 'tally_only' : 'standard';
    const userTimezone = (timezone && isValidTimezone(timezone)) ? timezone : 'UTC';
    const trackingKey = await getTrackingKey(req);

    if (!Array.isArray(files) || files.length === 0) {
      return new Response(
        JSON.stringify({ error: 'At least one file is required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    supabaseAdmin = createClient<BatchDatabase>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const supabaseAdminClient = supabaseAdmin!;

    const authHeader = req.headers.get('Authorization');
    let user = null;
    let supabase = supabaseAdminClient;

    if (authHeader && authHeader.startsWith('Bearer ') && authHeader !== 'Bearer null') {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user: authUser }, error: authError } = await supabaseAdminClient.auth.getUser(token);
      if (!authError && authUser) {
        user = authUser;
        supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          { global: { headers: { Authorization: authHeader } } }
        );
      } else {
        console.log('Token validation failed:', authError?.message || 'Invalid token');
      }
    }

    if (!user) {
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
    }

    // Validate input and compute page counts
    const pageCounts: number[] = [];
    for (const file of files as StatementPayload[]) {
      if (!file || typeof file.fileName !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Invalid file payload.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const sanitizedName = sanitizeFileName(file.fileName);
      if (!sanitizedName || sanitizedName.includes('..')) {
        return new Response(
          JSON.stringify({ error: `Invalid file name: ${file.fileName}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const lowerName = sanitizedName.toLowerCase();
      if (!lowerName.endsWith('.pdf') && !lowerName.endsWith('.png') && !lowerName.endsWith('.jpg') && !lowerName.endsWith('.jpeg')) {
        return new Response(
          JSON.stringify({ error: `Unsupported file type: ${sanitizedName}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!file.fileData && !(Array.isArray(file.pdfPageImages) && file.pdfPageImages.length > 0)) {
        return new Response(
          JSON.stringify({ error: `File data required (${sanitizedName})` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (Array.isArray(file.pdfPageImages) && file.pdfPageImages.length > 0) {
        const error = validatePdfPageImages(file.pdfPageImages, sanitizedName);
        if (error) {
          return new Response(
            JSON.stringify({ error }),
            { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      const pageCount = Array.isArray(file.pdfPageImages) && file.pdfPageImages.length > 0
        ? file.pdfPageImages.length
        : 1;
      pageCounts.push(pageCount);
    }

    let conversionsUsed = 0;
    let conversionsLimit = user ? 5 : 2;
    let hasUnlimitedAccess = false;
    let userPlanType = 'free';

    try {
      const effectiveLimit = await resolveEffectiveLimit({
        supabaseAdmin: supabaseAdminClient as unknown as SupabaseLike,
        user,
        trackingKey,
        timezone: userTimezone,
      });
      conversionsUsed = effectiveLimit.conversionsUsed;
      conversionsLimit = effectiveLimit.conversionsLimit;
      hasUnlimitedAccess = effectiveLimit.isUnlimited;
      userPlanType = effectiveLimit.planType || 'free';
    } catch (limitError) {
      console.error('Error checking limit:', limitError);
      const reason = limitError instanceof Error ? limitError.message : String(limitError ?? 'unknown');
      return new Response(
        JSON.stringify({
          error: 'Failed to check usage limit',
          code: 'BATCH_LIMIT_RPC_FAILED',
          reason,
          status: 'error',
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (user && !hasUnlimitedAccess) {
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('plan_type, pages_used_this_month')
        .eq('user_id', user.id)
        .single();

      if (subError) {
        console.error('Failed to load subscription plan type:', subError);
      } else if (subData) {
        userPlanType = subData.plan_type || userPlanType;
      }
    }

    const normalizedPlanType = userPlanType.toLowerCase();
    const isPerPagePlan = normalizedPlanType.startsWith('per_page');
    const isUnlimitedPlan = normalizedPlanType === 'unlimited' && conversionsLimit >= 900000;
    const isPaidPlan = !!user && (isPerPagePlan || isUnlimitedPlan);
    const isFreeMode = !isPaidPlan;
    const underwritingTier = resolveUnderwritingTier(userPlanType, false);
    const remainingQuota = Math.max(0, conversionsLimit - conversionsUsed);

    // Free mode: enforce a 15-page max per PDF before processing.
    if (!hasUnlimitedAccess && isFreeMode) {
      const maxDetectedPages = pageCounts.reduce((max, count) => Math.max(max, count), 0);
      if (maxDetectedPages > FREE_MAX_PDF_PAGES_PER_FILE) {
        return new Response(
          JSON.stringify({
            error: `Free tier allows up to ${FREE_MAX_PDF_PAGES_PER_FILE} PDF pages per file. One selected file has ${maxDetectedPages} pages.`,
            status: 'pdf_too_complex',
            pagesDetected: maxDetectedPages,
            maxPagesAllowed: FREE_MAX_PDF_PAGES_PER_FILE,
            limitReached: true,
            isAuthenticated: !!user,
            signupRequired: !user,
            planType: userPlanType,
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Quota pre-check:
    // - Free mode uses conversion count (1 file = 1 conversion).
    // - Paid mode uses pages, but page charge is known only after OCR, so here we only reject if no quota remains.
    if (!hasUnlimitedAccess) {
      if (isFreeMode) {
        const usageEstimate = Math.max(1, files.length);
        if ((conversionsUsed + usageEstimate) > conversionsLimit) {
          const remainingConversions = Math.max(0, conversionsLimit - conversionsUsed);
          const errorMessage = user
            ? `You can convert ${conversionsLimit} files per day on free tier. You have ${remainingConversions} conversion${remainingConversions === 1 ? '' : 's'} left today.`
            : `You can convert ${conversionsLimit} files per day for free. You have ${remainingConversions} conversion${remainingConversions === 1 ? '' : 's'} left today.`;

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
      } else if (remainingQuota < 1) {
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

    const categoryCorrections = await buildCategoryCorrections(supabaseAdmin, user?.id);
    const successes: ProcessedStatement[] = [];
    const failures: Array<{ fileName: string; error: string }> = [];
    const statementData: StatementData[] = [];
    const paidRemainingQuota = Math.max(0, conversionsLimit - conversionsUsed);
    let paidPagesConsumed = 0;

    for (const file of files as StatementPayload[]) {
      const sanitizedName = sanitizeFileName(file.fileName);
      const fileStartedAt = Date.now();
      const lowerName = sanitizedName.toLowerCase();
      const isPdf = lowerName.endsWith('.pdf');
      const hasPdfPageImages = Array.isArray(file.pdfPageImages) && file.pdfPageImages.length > 0;
      const filePageCount = hasPdfPageImages ? file.pdfPageImages!.length : 1;
      const fileClientParsedTransactions: RawTransaction[] = Array.isArray(file.pdfParsedTransactions)
        ? normalizeRawTransactions(file.pdfParsedTransactions).filter((transaction) => {
            const hasDate = typeof transaction.date === 'string' && transaction.date.trim() && transaction.date !== 'Unknown';
            const hasDescription = typeof transaction.description === 'string' && transaction.description.trim().length > 0;
            const hasAmount =
              Number.isFinite(Number(transaction.debit ?? NaN)) ||
              Number.isFinite(Number(transaction.credit ?? NaN)) ||
              Number.isFinite(Number(transaction.balance ?? NaN));
            return hasDate && hasDescription && hasAmount;
          })
        : [];
      const fileClientParsedBankMetadata = normalizeClientBankMetadata(file.pdfParsedBankMetadata);
      const fileClientParseAssessment = assessClientPdfParsedTransactions(fileClientParsedTransactions, filePageCount);
      const selectableTextDocument = fileClientParsedTransactions.length > 0;
      const forceOcrForDenseFile = selectableTextDocument
        ? false
        : shouldForceOcrForDenseStatement(
          lowerName,
          fileClientParsedBankMetadata,
          fileClientParsedTransactions,
        );
      const forceOcrForLargeDocument =
        isPdf &&
        filePageCount >= FULL_PAGE_OCR_COVERAGE_THRESHOLD &&
        !selectableTextDocument &&
        !fileClientParseAssessment.useDeterministic;
      const fileAdaptiveOcrStrategy = deriveAdaptiveOcrStrategy(
        lowerName,
        filePageCount,
        fileClientParseAssessment,
        forceOcrForDenseFile,
      );
      const forceOcrForPdf =
        isPdf &&
        (
          forceOcrForLargeDocument ||
          (
            !selectableTextDocument &&
            fileClientParsedTransactions.length > 0 &&
            (!fileClientParseAssessment.useDeterministic || forceOcrForDenseFile)
          )
        );

      console.log(
        `Batch file OCR strategy (${sanitizedName}): level=${fileAdaptiveOcrStrategy.level}, strict=${fileAdaptiveOcrStrategy.strictMode}:${fileAdaptiveOcrStrategy.strictMaxPages}, ` +
        `dual=${fileAdaptiveOcrStrategy.dualMode}:${fileAdaptiveOcrStrategy.dualMaxPages}, reasons=${fileAdaptiveOcrStrategy.reasons.join('|') || 'none'}`,
      );

      try {
        if (!hasUnlimitedAccess && !isFreeMode) {
          const remainingPagesBeforeFile = paidRemainingQuota - paidPagesConsumed;
          if (remainingPagesBeforeFile <= 0) {
            failures.push({
              fileName: sanitizedName,
              error: 'No page credits left in your current pack.',
            });
            continue;
          }
        }

        if (
          !hasUnlimitedAccess &&
          isFreeMode &&
          isPdf &&
          hasPdfPageImages &&
          forceOcrForPdf &&
          (fileClientParseAssessment.requiresHeavyOcr || fileAdaptiveOcrStrategy.hardForFreeTier)
        ) {
          failures.push({
            fileName: sanitizedName,
            error: 'Hard PDF detected. This file requires a paid plan for high-accuracy processing.',
          });
          continue;
        }

        // Retrieve bytes (for validation and non-PDF extraction)
        let bytes = new Uint8Array();
        const rawBase64Input = typeof file.fileData === 'string' ? file.fileData.trim() : '';
        const rawBase64PayloadLength = rawBase64Input
          ? (rawBase64Input.match(/^data:[^;]+;base64,(.+)$/)?.[1] || rawBase64Input).replace(/\s+/g, '').length
          : 0;
        const estimatedBase64Bytes = Math.floor(rawBase64PayloadLength * 0.75);
        if (estimatedBase64Bytes > 10 * 1024 * 1024) {
          throw new Error('File exceeds 10MB limit');
        }
        bytes = bytesFromBase64(file.fileData) as Uint8Array<ArrayBuffer>;

        if (bytes.length > 0 && bytes.length > 10 * 1024 * 1024) {
          throw new Error('File exceeds 10MB limit');
        }

        if (bytes.length > 0) {
          if (isPdf) {
            if (bytes[0] !== 0x25 || bytes[1] !== 0x50 || bytes[2] !== 0x44 || bytes[3] !== 0x46) {
              throw new Error('Invalid PDF file format');
            }
          } else if (lowerName.endsWith('.png')) {
            if (bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4E || bytes[3] !== 0x47) {
              throw new Error('Invalid PNG file format');
            }
          } else if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) {
            if (bytes[0] !== 0xFF || bytes[1] !== 0xD8 || bytes[2] !== 0xFF) {
              throw new Error('Invalid JPEG file format');
            }
          }
        }

        const { transactions, bankMetadata, excelBuffer, totals, pagesWithData } = await processStatement({
          fileName: sanitizedName,
          bytes,
          pdfPageImages: file.pdfPageImages,
          pdfParsedTransactions: file.pdfParsedTransactions,
          pdfParsedBankMetadata: file.pdfParsedBankMetadata,
          pdfPassword: file.pdfPassword,
          categoryCorrections,
          forceOcrForPdf,
        });

        if (!hasUnlimitedAccess && !isFreeMode) {
          const remainingPagesBeforeFile = paidRemainingQuota - paidPagesConsumed;
          const pagesToCharge = Math.max(1, pagesWithData);
          if (pagesToCharge > remainingPagesBeforeFile) {
            const periodLabel = isPerPagePlan ? 'pack' : 'plan';
            const message = `This file has data on ${pagesToCharge} page${pagesToCharge === 1 ? '' : 's'}, but only ${remainingPagesBeforeFile} page${remainingPagesBeforeFile === 1 ? '' : 's'} remain in your ${periodLabel}.`;

            failures.push({ fileName: sanitizedName, error: message });
            continue;
          }
          paidPagesConsumed += pagesToCharge;
        }

        const resultPath: string | null = null;

        const excelBase64 = bufferToBase64(excelBuffer);

        successes.push({
          fileName: sanitizedName,
          transactions,
          bankMetadata,
          excelBase64,
          resultPath,
          pagesWithData,
          totals,
        });

        statementData.push({
          fileName: sanitizedName,
          transactions,
          bankMetadata,
        });
      } catch (error) {
        const message = sanitizeError(error);
        failures.push({ fileName: sanitizedName, error: message });
      }
    }

    if (successes.length === 0) {
      return new Response(
        JSON.stringify({ error: 'All statements failed to process.', failures }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Merge validation
    const validation = validateStatementsForMerge(statementData);
    if (failures.length > 0) {
      validation.canMerge = false;
      validation.reasons.push('One or more statements failed to process');
    }
    let mergePayload: {
      available: boolean;
      reasons: string[];
      excelData?: string;
      resultPath?: string | null;
      statementPeriod?: string;
      duplicatesRemoved?: number;
      totals?: { totalDebit: number; totalCredit: number; finalBalance: number | null };
      fileName?: string;
    } = {
      available: validation.canMerge,
      reasons: validation.reasons,
    };

    if (validation.canMerge) {
      const merged = buildMergedStatement(statementData);
      const mergedExcel = await generateMergedStatementsExcel({
        bankInfo: merged.bankInfo,
        statementPeriod: merged.statementPeriod,
        transactions: merged.mergedTransactions,
        totals: merged.totals,
      });
      const mergeResultPath: string | null = null;
      const mergeExcelBase64 = bufferToBase64(mergedExcel.buffer);

      mergePayload = {
        available: true,
        reasons: [],
        excelData: mergeExcelBase64,
        resultPath: mergeResultPath,
        statementPeriod: merged.statementPeriod,
        duplicatesRemoved: merged.duplicatesRemoved,
        totals: merged.totals,
        fileName: 'merged_statements.xlsx',
      };
    }

    const pagesWithDataTotal = successes.reduce((sum, s) => sum + (s.pagesWithData || 1), 0);
    const successfulConversions = successes.length;

    // Increment usage count based on plan
    const incrementBy = isFreeMode ? successfulConversions : pagesWithDataTotal;
    let remaining = Math.max(0, conversionsLimit - conversionsUsed);
    if (incrementBy > 0) {
      if (user && user.id === CENTENNIAL_BONUS_USER_ID && userPlanType === CENTENNIAL_BONUS_PLAN) {
        const bonusResult = await incrementCentennialBonusUsage({
          supabaseAdmin: supabaseAdminClient,
          userId: user.id,
          timezone: userTimezone,
          incrementBy,
        });
        if (!bonusResult.ok) {
          console.error('Error incrementing bonus usage after success:', bonusResult.error);
        } else {
          remaining = bonusResult.remaining;
        }
      } else {
        const rpc = supabaseAdminClient.rpc as unknown as (
          fn: string,
          args: Record<string, unknown>,
        ) => Promise<{ error: { message: string } | null }>;

        const { error: incrementError } = await rpc('increment_usage_count', {
          p_ip_address: user ? undefined : trackingKey,
          p_user_id: user ? user.id : undefined,
          p_increment: incrementBy,
        });
        if (incrementError) {
          console.error('Error incrementing usage after success:', incrementError);
        } else {
          remaining = Math.max(0, conversionsLimit - conversionsUsed - incrementBy);
        }
      }
    }

    const combinedTransactions = successes.flatMap((statement) => statement.transactions);
    const primaryBankInfo = successes.find((statement) => statement.bankMetadata)?.bankMetadata;
    const totalCredits = fromMinorUnits(sumMinorUnits(combinedTransactions.map((t) => t.credit || 0)));
    const totalDebits = fromMinorUnits(sumMinorUnits(combinedTransactions.map((t) => t.debit || 0)));
    const netFlow = fromMinorUnits(toMinorUnits(totalCredits) - toMinorUnits(totalDebits));
    const jsonData = buildJsonExport({
      transactions: combinedTransactions,
      bankMetadata: primaryBankInfo,
      summary: {
        totalCredits,
        totalDebits,
        netFlow,
      },
    });
    const mt940Data = buildMt940Export({
      transactions: combinedTransactions,
      bankMetadata: primaryBankInfo,
    });

    return new Response(
      JSON.stringify({
        success: true,
        separate: {
          results: successes.map((s) => ({
            fileName: s.fileName,
            excelData: s.excelBase64,
            resultPath: s.resultPath,
            totals: s.totals,
            bankInfo: s.bankMetadata,
          })),
          failures,
        },
        merge: mergePayload,
        remaining,
        isAuthenticated: !!user,
        // Include aggregated analytics for batch mode panels
        analytics: successes.length > 0 ? aggregateBatchAnalytics(successes, underwritingTier) : null,
        // Include all transactions for export options
        transactions: combinedTransactions,
        jsonData,
        mt940Data,
        outputMode: requestedOutputMode,
        tallyEnabled: requestedOutputMode === 'tally_only',
        planType: userPlanType,
        bankInfo: primaryBankInfo,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Internal error:', error);
    const errorMessage = sanitizeError(error);
    const reason = error instanceof Error ? error.message : String(error ?? 'unknown');
    return new Response(
      JSON.stringify({
        error: errorMessage,
        code: 'BATCH_INTERNAL_ERROR',
        reason,
      }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
