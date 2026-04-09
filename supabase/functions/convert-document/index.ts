// ============= BANKLEFY MULTI-LAYERED INTELLIGENCE ENGINE =============
// Main orchestrator that routes to specialized AI modules
// STRICT USAGE CONTROL: IP-based limits, page limits, admin whitelist

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// Import modular processors
import {
  assessClientPdfParsedTransactions,
  classifyDocument,
  callGroqVisionOCR,
  callMistralVisionOCR,
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
import { parseStatementDateToTimestamp } from '../_shared/date-parsing.ts';
import {
  CATEGORY_LIST,
  fallbackCategorize,
  type ProcessedTransaction,
} from '../_shared/categorizer.ts';
import { chooseStatementPeriodLabel } from '../_shared/statement-period.ts';
import { FULL_PAGE_OCR_COVERAGE_THRESHOLD, shouldUseFullPageOcrCoverage } from '../_shared/ocr-routing.ts';
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
import { runStandardizedExportPipeline, encodeArtifactToBase64 } from '../_shared/export-orchestrator.ts';
import { buildJsonExport, buildMt940Export } from '../_shared/export-formatters.ts';
import type { ExportFormat } from '../_shared/export-builders.ts';
import { sanitizeTransactions } from '../_shared/transaction-sanitizer.ts';
import { isPdfPasswordError } from '../_shared/pdf-errors.ts';
import { fromMinorUnits, sumMinorUnits, toMinorUnits } from '../_shared/money.ts';
import { getTrackingKey } from '../_shared/client-id.ts';
import { resolveEffectiveLimit, type LimitResolverDatabase, type SupabaseLike } from '../_shared/limit-resolver.ts';
import {
  detectPdfAmountColumnLayout,
  extractAnchoredAmountsFromLayout,
  type PdfAmountColumnLayout,
} from '../_shared/pdf-column-layout.ts';
import type { Database as AppDatabase } from '../../../src/integrations/supabase/types.ts';

type ConversionRow = AppDatabase['public']['Tables']['conversions']['Row'];

type ConversionInsert = AppDatabase['public']['Tables']['conversions']['Insert'];

type ConversionUpdate = Partial<ConversionInsert>;

type LooseTable = {
  Row: Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: [];
};

type ConversionProcessingTimings = Record<string, unknown>;

type SubscriptionRow = LimitResolverDatabase['public']['Tables']['subscriptions']['Row'] & {
  pages_used_this_month?: number | null;
};

type SubscriptionInsert = LimitResolverDatabase['public']['Tables']['subscriptions']['Insert'] & {
  pages_used_this_month?: number | null;
};

type SubscriptionUpdate = LimitResolverDatabase['public']['Tables']['subscriptions']['Update'] & {
  pages_used_this_month?: number | null;
};

type AnonymousUsageRow = LimitResolverDatabase['public']['Tables']['anonymous_usage']['Row'];
type AnonymousUsageInsert = LimitResolverDatabase['public']['Tables']['anonymous_usage']['Insert'];
type AnonymousUsageUpdate = LimitResolverDatabase['public']['Tables']['anonymous_usage']['Update'];

type DocumentDatabase = {
  public: Omit<AppDatabase['public'], 'Tables'> & {
    Tables: Omit<AppDatabase['public']['Tables'], 'anonymous_usage' | 'conversions' | 'subscriptions'> & {
      category_corrections: LooseTable;
      anonymous_usage: {
        Row: AnonymousUsageRow;
        Insert: AnonymousUsageInsert;
        Update: AnonymousUsageUpdate;
        Relationships: [];
      };
      conversions: {
        Row: ConversionRow;
        Insert: ConversionInsert;
        Update: ConversionUpdate;
        Relationships: [];
      };
      fraud_alerts: LooseTable;
      risk_analysis: LooseTable;
      subscriptions: {
        Row: SubscriptionRow;
        Insert: SubscriptionInsert;
        Update: SubscriptionUpdate;
        Relationships: [];
      };
    };
  };
};

type DocumentSupabaseClient = SupabaseClient<DocumentDatabase>;

type ConversionTimingStorage = {
  sourcePath?: string | null;
  resultPath?: string | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const getProcessingTimings = (value: unknown): Record<string, unknown> => {
  return isRecord(value) ? { ...value } : {};
};

const getTimingStorage = (value: unknown): ConversionTimingStorage => {
  if (!isRecord(value)) {
    return {};
  }

  const storage = isRecord(value.storage) ? value.storage : null;
  return {
    sourcePath: typeof storage?.sourcePath === 'string' ? storage.sourcePath : null,
    resultPath: typeof storage?.resultPath === 'string' ? storage.resultPath : null,
  };
};

const mergeProcessingTimings = (existing: unknown, patch: Record<string, unknown>): ConversionProcessingTimings => {
  return {
    ...getProcessingTimings(existing),
    ...patch,
  } as ConversionProcessingTimings;
};

type SubscriptionLookupRow = {
  conversions_used?: number | null;
  conversions_limit?: number | null;
  last_reset_date?: string | null;
  timezone?: string | null;
  tier?: string | null;
  plan_type?: string | null;
  free_daily_limit?: number | null;
  free_daily_used?: number | null;
  monthly_limit?: number | null;
  monthly_used?: number | null;
  yearly_limit?: number | null;
  yearly_used?: number | null;
  pack_limit?: number | null;
  pack_used?: number | null;
  monthly_reset_date?: string | null;
  yearly_reset_date?: string | null;
  pages_used_this_month?: number | null;
};

type AnonymousUsageLookupRow = {
  conversions_count?: number | null;
  conversions_used?: number | null;
  last_reset_date?: string | null;
  timezone?: string | null;
  ip_address?: string | null;
  tracking_key?: string | null;
};

type AnonymousUsageLookupInsert = {
  ip_address?: string;
  tracking_key?: string;
  conversions_count?: number;
  last_reset_date?: string;
  timezone?: string;
};

type AnonymousUsageLookupUpdate = Partial<AnonymousUsageLookupInsert>;

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

const DATE_TOKEN_SOURCE =
  '(?:\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4}|\\d{1,2}[/-][A-Za-z]{3,9}[/-]\\d{2,4}|\\d{1,2}\\s+[A-Za-z]{3,9}\\s+\\d{2,4}|[A-Za-z]{3,9}\\s+\\d{1,2},?\\s+\\d{2,4})';
const DATE_TOKEN = new RegExp(DATE_TOKEN_SOURCE);
const FLEXIBLE_PREFIX_SOURCE = '(?:\\s*\\d+\\s+)?(?:[A-Za-z0-9._/-]+\\s+)?';
const ROW_START_PATTERN = new RegExp(`^${FLEXIBLE_PREFIX_SOURCE}(${DATE_TOKEN_SOURCE})\\s+(${DATE_TOKEN_SOURCE})\\s+(.+)$`);
const GROUPED_AMOUNT_SOURCE = '(?:\\d{1,3}(?:,\\d{2,3})+|\\d{1,7})';
const AMOUNT_NUMBER_SOURCE = `(?:${GROUPED_AMOUNT_SOURCE})(?:\\.\\d{1,4})?`;
const AMOUNT_TOKEN_SOURCE = `[+-]?(?:\\(?${AMOUNT_NUMBER_SOURCE}\\)?)(?:\\s*(?:CR|DR))?`;
const AMOUNT_PATTERN = new RegExp(AMOUNT_TOKEN_SOURCE, 'g');
const AMOUNT_TOKEN_PATTERN = new RegExp(`^${AMOUNT_TOKEN_SOURCE}$`, 'i');
const DATE_TOKEN_FLEX_PATTERN = new RegExp(`(${DATE_TOKEN_SOURCE})`);
const DASH_PLACEHOLDER = /^[-\u2013\u2014]+$/;
const normalizeDashToken = (token: string): string => token.replace(/[–—]/g, '-');

const MONTH_INDEX: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const normalizeTwoDigitYear = (yearRaw: number): number => {
  if (!Number.isFinite(yearRaw)) return yearRaw;
  if (yearRaw >= 100) return yearRaw;
  return yearRaw < 50 ? 2000 + yearRaw : 1900 + yearRaw;
};

const normalizeDate = (value: string): string => {
  const raw = value.trim().replace(/\s+/g, ' ');
  const slashDate = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (slashDate) {
    const day = Number(slashDate[1]);
    const month = Number(slashDate[2]);
    const yearRaw = Number(slashDate[3]);
    const year = normalizeTwoDigitYear(yearRaw);
    if (
      Number.isFinite(day) &&
      Number.isFinite(month) &&
      Number.isFinite(year) &&
      day >= 1 &&
      day <= 31 &&
      month >= 1 &&
      month <= 12
    ) {
      return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  const monthDate = raw.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{2,4})$/);
  if (monthDate) {
    const day = Number(monthDate[1]);
    const monthName = monthDate[2].toLowerCase();
    const month = MONTH_INDEX[monthName];
    const yearRaw = Number(monthDate[3]);
    const year = normalizeTwoDigitYear(yearRaw);
    if (
      Number.isFinite(day) &&
      Number.isFinite(month) &&
      Number.isFinite(year) &&
      day >= 1 &&
      day <= 31
    ) {
      return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  const monthFirstDate = raw.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{2,4})$/);
  if (monthFirstDate) {
    const monthName = monthFirstDate[1].toLowerCase();
    const month = MONTH_INDEX[monthName];
    const day = Number(monthFirstDate[2]);
    const yearRaw = Number(monthFirstDate[3]);
    const year = normalizeTwoDigitYear(yearRaw);
    if (
      Number.isFinite(day) &&
      Number.isFinite(month) &&
      Number.isFinite(year) &&
      day >= 1 &&
      day <= 31
    ) {
      return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  return raw;
};

const parseAmount = (value: string): number => {
  const raw = String(value || '').trim();
  if (!raw) return 0;
  const hasParens = raw.startsWith('(') && raw.endsWith(')');
  const marker = raw.match(/\b(CR|DR)\b/i)?.[1]?.toUpperCase();
  const normalized = raw
    .replace(/\b(CR|DR)\b/gi, '')
    .replace(/[(),]/g, '')
    .trim();
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return 0;
  if (hasParens) return -Math.abs(amount);
  if (marker === 'DR') return -Math.abs(amount);
  if (marker === 'CR') return Math.abs(amount);
  return amount;
};

const inferDebitCreditFromContext = (
  text: string,
  amount: number,
): { debit: number; credit: number } => {
  const lower = text.toLowerCase();
  const absAmount = Math.abs(amount);
  if (amount < 0 || /\bdr\b|\bdebit\b|withdraw|purchase|payment|charge|charges|chgs|fee|atm|pos\b|sent\b|outward|transfer to/i.test(lower)) {
    return { debit: absAmount, credit: 0 };
  }
  if (amount > 0 && (/\bcr\b|\bcredit\b|deposit|salary|refund|interest|received|inward|transfer from/i.test(lower))) {
    return { debit: 0, credit: absAmount };
  }
  if (amount > 0) {
    // In single-amount statements (e.g. Wio), positive values are typically credits.
    return { debit: 0, credit: absAmount };
  }
  return { debit: absAmount, credit: 0 };
};

const isNoiseLine = (line: string): boolean => {
  const lower = line.toLowerCase();
  if (!lower) return true;
  const hasArabic = /[\u0600-\u06FF]/.test(line);
  if (lower.includes("account statement")) return true;
  if (/^from\s+\d{1,2}\/\d{1,2}\/\d{2,4}\s+to\s+\d{1,2}\/\d{1,2}\/\d{2,4}\b/i.test(line)) return true;
  if (lower.includes("total records")) return true;
  if (lower.includes("transaction date") && lower.includes("value date")) return true;
  if (lower.includes("running balance")) return true;
  if (lower.includes('opening balance')) return true;
  if (lower.includes('closing balance')) return true;
  if (lower.includes('summary of accounts')) return true;
  if (lower.includes('account holder name')) return true;
  if (lower.includes('account type')) return true;
  if (lower.includes('account opened')) return true;
  if (lower.includes('amount balance')) return true;
  if (lower.includes('date ref. number description')) return true;
  if (lower.includes('(incl. vat)')) return true;
  if (lower.includes('please review this account statement')) return true;
  if (lower.includes('within 30 days. if no issues are reported')) return true;
  if (lower.includes("correct (subject to the bank's right to correct errors)")) return true;
  if (lower.includes('to raise a complaint, contact wio bank customer service')) return true;
  if (lower.includes('this bank is regulated by cbuae')) return true;
  if (lower.includes('total debit')) return true;
  if (lower.includes('total credit')) return true;
  if (lower.includes('generated on')) return true;
  if (lower.includes('this is a system generated')) return true;
  if (/^page\s*\d+(\s*of\s*\d+)?$/i.test(line)) return true;
  if (
    hasArabic &&
    !DATE_TOKEN.test(line) &&
    !/\bP\d{6,}\b/i.test(line) &&
    !hasLikelyAmountTail(line)
  ) {
    return true;
  }
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

const detectAmountColumns = (lineEntries: LineEntry[]): PdfAmountColumnLayout | null =>
  detectPdfAmountColumnLayout(
    lineEntries,
    (value) => AMOUNT_TOKEN_PATTERN.test(value),
  );

const extractAnchoredAmounts = (
  entry: LineEntry,
  layout: PdfAmountColumnLayout | null,
): { debit: number; credit: number; balance: number } | null => {
  return extractAnchoredAmountsFromLayout(entry, layout, {
    inferSide: inferDebitCreditFromContext,
    isAmountToken: (value) => AMOUNT_TOKEN_PATTERN.test(value),
    parseAmount,
  });
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
  const cleaned = normalizeDashToken(text).trim();
  if (!cleaned) return null;

  const amountPart = `(-?(?:${AMOUNT_NUMBER_SOURCE}))`;
  const debitBlankPattern =
    new RegExp(`^(.*?)(?:\\s|^)([-\\u2013\\u2014]+)\\s+${amountPart}\\s+${amountPart}\\s*$`);
  const debitBlankMatch = cleaned.match(debitBlankPattern);
  if (debitBlankMatch && DASH_PLACEHOLDER.test(debitBlankMatch[2])) {
    const [, prefix, , creditToken, balanceToken] = debitBlankMatch;
    return {
      textWithoutAmounts: prefix.trim(),
      debit: 0,
      credit: parseAmount(creditToken),
      balance: parseAmount(balanceToken),
    };
  }

  const creditBlankPattern =
    new RegExp(`^(.*?)${amountPart}\\s+([-\\u2013\\u2014]+)\\s+${amountPart}\\s*$`);
  const creditBlankMatch = cleaned.match(creditBlankPattern);
  if (creditBlankMatch && DASH_PLACEHOLDER.test(creditBlankMatch[3])) {
    const [, prefix, debitToken, , balanceToken] = creditBlankMatch;
    return {
      textWithoutAmounts: prefix.trim(),
      debit: parseAmount(debitToken),
      credit: 0,
      balance: parseAmount(balanceToken),
    };
  }

  return null;
};

const extractTrailingAmounts = (
  text: string,
): { textWithoutAmounts: string; debit: number; credit: number; balance: number } | null => {
  const sanitized = normalizeDashToken(text)
    .replace(/\(\s*rate:\s*[^)]*\)/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!sanitized) return null;

  const rawTokens = sanitized.split(/\s+/);
  const cleanedTokens = rawTokens.map((token) => token.replace(/[,:;]+$/g, '').trim());
  const amountLikePattern = new RegExp(`^[+-]?(?:\\(?${AMOUNT_NUMBER_SOURCE}\\)?)(?:\\s*(?:CR|DR))?$`, 'i');
  const monthTokenPattern = /^(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)$/i;

  let tailStart = cleanedTokens.length;
  for (let i = cleanedTokens.length - 1; i >= 0; i -= 1) {
    const token = cleanedTokens[i];
    if (!token) {
      if (tailStart < cleanedTokens.length) break;
      continue;
    }
    if (amountLikePattern.test(token) || DASH_PLACEHOLDER.test(token)) {
      const prevToken = i > 0 ? cleanedTokens[i - 1] : '';
      const looksLikeMonthYear = /^(?:19|20)\d{2}$/.test(token) && monthTokenPattern.test(prevToken);
      if (looksLikeMonthYear) {
        if (tailStart < cleanedTokens.length) break;
        continue;
      }
      tailStart = i;
      continue;
    }
    if (tailStart < cleanedTokens.length) break;
  }

  if (tailStart >= cleanedTokens.length) return null;
  const tailTokens = cleanedTokens.slice(tailStart);
  const numericTail = tailTokens.filter((token) => !DASH_PLACEHOLDER.test(token));
  if (numericTail.length < 2) return null;

  const balanceToken = numericTail[numericTail.length - 1];
  const balance = Math.abs(parseAmount(balanceToken));
  if (!Number.isFinite(balance)) return null;

  const leadingTokens = tailTokens.slice(0, Math.max(0, tailTokens.length - 1));
  const parsedLeading = leadingTokens.map((token) => {
    if (DASH_PLACEHOLDER.test(token)) return 0;
    return parseAmount(token);
  });

  let debit = 0;
  let credit = 0;

  if (parsedLeading.length >= 2) {
    const first = parsedLeading[parsedLeading.length - 2] ?? 0;
    const second = parsedLeading[parsedLeading.length - 1] ?? 0;
    const firstAbs = Math.abs(first);
    const secondAbs = Math.abs(second);

    if (firstAbs > 0 && secondAbs > 0) {
      debit = firstAbs;
      credit = secondAbs;
    } else if (firstAbs > 0) {
      debit = firstAbs;
    } else if (secondAbs > 0) {
      credit = secondAbs;
    }
  } else if (parsedLeading.length === 1) {
    const inferred = inferDebitCreditFromContext(sanitized, parsedLeading[0]);
    debit = inferred.debit;
    credit = inferred.credit;
  }

  const descriptionTokens = rawTokens.slice(0, tailStart);
  const textWithoutAmounts = descriptionTokens.join(' ').replace(/\s+/g, ' ').trim();
  if (!textWithoutAmounts) return null;

  return {
    textWithoutAmounts,
    debit,
    credit,
    balance,
  };
};

const extractFlexibleAmounts = (
  text: string,
): { textWithoutAmounts: string; debit: number; credit: number; balance: number } | null => {
  const trailing = extractTrailingAmounts(text);
  if (trailing) return trailing;

  const strict = extractAmounts(text) || extractAmountsWithDashPlaceholders(text);
  if (strict) return strict;

  const normalizedText = normalizeDashToken(text);
  const amountRegex = new RegExp(`([+-]?\\(?${AMOUNT_NUMBER_SOURCE}\\)?)(?:\\s*(CR|DR))?`, 'gi');
  const matches: Array<{ raw: string; marker: string | null }> = [];
  let match: RegExpExecArray | null;
  while ((match = amountRegex.exec(normalizedText)) !== null) {
    matches.push({ raw: match[0], marker: match[2] ? match[2].toUpperCase() : null });
  }
  if (matches.length < 2) return null;

  const amount = parseAmount(matches[matches.length - 2].raw);
  const balance = parseAmount(matches[matches.length - 1].raw);
  const explicitMarker = matches[matches.length - 2].marker;
  const markerText = explicitMarker ? `${normalizedText} ${explicitMarker}` : normalizedText;
  const inferred = explicitMarker === 'CR'
    ? { debit: 0, credit: Math.abs(amount) }
    : explicitMarker === 'DR'
      ? { debit: Math.abs(amount), credit: 0 }
      : inferDebitCreditFromContext(markerText, amount);

  return {
    textWithoutAmounts: normalizedText.replace(amountRegex, ' ').replace(/\s+/g, ' ').trim(),
    debit: inferred.debit,
    credit: inferred.credit,
    balance: Math.abs(balance),
  };
};

const isStrictAmountToken = (value: string): boolean =>
  new RegExp(`^${AMOUNT_TOKEN_SOURCE}$`, 'i').test(value);

const findLeadingDateToken = (tokens: LineToken[]): { value: string; index: number } | null => {
  const maxIndex = Math.min(2, tokens.length - 1);
  for (let i = 0; i <= maxIndex; i += 1) {
    const cleaned = tokens[i].text.replace(/[.,;:]+$/g, '').trim();
    if (DATE_TOKEN.test(cleaned)) {
      return { value: cleaned, index: i };
    }
  }
  return null;
};

const buildTokenFallbackRows = (
  lineEntries: LineEntry[],
  amountCenters: PdfAmountColumnLayout | null,
): RawTransaction[] => {
  const fallbackRows: RawTransaction[] = [];
  for (const entry of lineEntries) {
    const line = entry.text.trim().replace(/\s+/g, ' ');
    if (!line || isNoiseLine(line)) continue;

    const leadingDate = findLeadingDateToken(entry.tokens);
    if (!leadingDate) continue;

    const anchored = extractAnchoredAmounts(entry, amountCenters);
    const trailingTokens = entry.tokens
      .slice(leadingDate.index + 1)
      .map((token) => token.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    const parsedAmounts = anchored
      ? {
          textWithoutAmounts: trailingTokens,
          debit: anchored.debit,
          credit: anchored.credit,
          balance: anchored.balance,
        }
      : extractFlexibleAmounts(trailingTokens);
    if (!parsedAmounts) continue;

    const numericTokenCount = entry.tokens.filter((token) => isStrictAmountToken(token.text)).length;
    if (numericTokenCount < 2 && parsedAmounts.balance === 0) continue;

    const description = (parsedAmounts.textWithoutAmounts || trailingTokens).trim();
    if (!description || description.length < 2) continue;

    fallbackRows.push({
      date: normalizeDate(leadingDate.value),
      description,
      debit: parsedAmounts.debit,
      credit: parsedAmounts.credit,
      balance: parsedAmounts.balance,
      refNumber: '',
    });
  }
  return fallbackRows;
};

const MASHREQ_PREFIX_PATTERNS = [
  'visa purchase',
  'ipp transfer',
  'inward remittance',
  'acct to acct transfer',
  'atm cash withdrawal',
  'atm/ccdm cash deposit',
  'atm usage fees',
  'value added tax',
  'monthly maintenance fee',
  'dds payment',
] as const;

const isLikelyMashreqStatement = (lines: string[]): boolean => {
  const text = lines.join('\n').toLowerCase();
  return text.includes('mashreq') || text.includes('mashreqbank') || text.includes('mashreq neo');
};

const isMashreqNoiseLine = (line: string): boolean => {
  const lower = line.toLowerCase().trim();
  if (!lower) return true;
  if (isNoiseLine(line)) return true;
  if (/[\u0600-\u06FF]/.test(line)) return true;
  if (lower.startsWith('dear customer')) return true;
  if (lower.includes('the items and balance shown on this statement')) return true;
  if (lower.includes('report any discrepancies')) return true;
  if (lower.includes('verified. report any discrepancies')) return true;
  if (lower.includes('of the statement date, otherwise the content will be assumed')) return true;
  if (lower.includes('all charges, terms and conditions are subject to change')) return true;
  if (lower.includes('please note that for foreign currency amounts')) return true;
  if (lower.includes('full compliance with all applicable laws')) return true;
  if (lower.includes('transactions related to sudan are restricted')) return true;
  if (lower.includes('mashreqbank psc is regulated')) return true;
  if (/^page\s*\d+\s*of\s*\d+$/i.test(lower)) return true;
  if (lower === 'accurate.') return true;
  return false;
};

const isMashreqPrefixStart = (line: string): boolean => {
  const lower = line.toLowerCase().trim();
  return MASHREQ_PREFIX_PATTERNS.some((prefix) => lower.startsWith(prefix));
};

const getMashreqSameLineBalance = (entry: LineEntry, balanceCenter: number): number | null => {
  const token =
    entry.tokens
      .filter((candidate) => candidate.x >= Math.max(460, balanceCenter - 45) && isStrictAmountToken(candidate.text))
      .sort((left, right) => Math.abs(left.x - balanceCenter) - Math.abs(right.x - balanceCenter))[0] ?? null;
  if (!token) return null;
  const value = Math.abs(parseAmount(token.text));
  return Number.isFinite(value) ? value : null;
};

const isMashreqBalanceOnlyLine = (entry: LineEntry, balanceCenter: number): boolean => {
  if (entry.tokens.length !== 1) return false;
  const token = entry.tokens[0];
  if (token.x < Math.max(460, balanceCenter - 45)) return false;
  return isStrictAmountToken(token.text);
};

const cleanMashreqDescriptionPart = (line: string): string => {
  const compact = line
    .replace(/the items and balance shown on this statement of account should be.*/i, '')
    .replace(/verified\. report any discrepancies.*/i, '')
    .replace(/all charges, terms and conditions are subject to change\.?/i, '')
    .replace(/please note that for foreign currency amounts.*$/i, '')
    .replace(/mashreqbank psc is regulated.*$/i, '')
    .replace(/^page\s*\d+\s*of\s*\d+$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[\s-]+|[\s-]+$/g, '');
  if (!compact) return '';
  if (/^\d{6,}$/.test(compact)) return '';
  if (/^(?:001|085|010)$/i.test(compact)) return '';
  return compact;
};

const extractMashreqMetadataFromText = (text: string): BankMetadata | undefined => {
  if (!text || !isLikelyMashreqStatement(text.split(/\r?\n/))) return undefined;

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const metadata: BankMetadata = {
    bankName: 'Mashreq NEO',
    accountNumber: '',
    accountHolder: '',
    currency: '',
  };

  const statementPeriodMatch = text.match(/Statement for period\s+(.+?)\s+to\s+(.+?)(?:\r?\n|$)/i);
  if (statementPeriodMatch) {
    metadata.statementPeriod = `${statementPeriodMatch[1].trim()} - ${statementPeriodMatch[2].trim()}`;
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    const branchMatch = line.match(/^Branch:\s*(.+)$/i);
    if (branchMatch && !metadata.bankName) {
      metadata.bankName = branchMatch[1].trim();
      continue;
    }

    if (/^Account Number\b/i.test(line)) {
      const inlineAccountMatch = line.match(/^Account Number\s*[:\-]?\s*([A-Z0-9]{6,})$/i);
      if (inlineAccountMatch) {
        metadata.accountNumber = inlineAccountMatch[1].trim();
        continue;
      }

      const nextLine = lines[index + 1] ?? '';
      const nextAccountMatch = nextLine.match(/([A-Z0-9]{8,})/i);
      if (nextAccountMatch) {
        metadata.accountNumber = nextAccountMatch[1].trim();
      }
      continue;
    }

    const accountCurrencyMatch = line.match(/^(.+?)\s+Account Currency\s+([A-Z]{3})$/i);
    if (accountCurrencyMatch) {
      metadata.accountHolder = accountCurrencyMatch[1].trim();
      metadata.currency = accountCurrencyMatch[2].trim().toUpperCase();
      continue;
    }

    const ibanMatch = line.match(/^IBAN\s+([A-Z]{2}\d{2}[A-Z0-9\s]{10,})$/i);
    if (ibanMatch) {
      metadata.iban = ibanMatch[1].replace(/\s+/g, '').toUpperCase();
      continue;
    }
  }

  return mergeBankMetadata(metadata);
};

const classifyMashreqCategory = (description: string, debit: number, credit: number): string => {
  const lower = description.toLowerCase();
  if (lower.includes('visa purchase')) return 'Card Purchase';
  if (lower.includes('atm cash withdrawal')) return 'Cash Withdrawal';
  if (lower.includes('atm/ccdm cash deposit')) return 'Cash Deposit';
  if (lower.includes('monthly maintenance fee') || lower.includes('atm usage fees')) return 'Bank Fee';
  if (lower.includes('value added tax')) return 'Tax';
  if (lower.includes('dds payment')) return 'Payment';
  if (lower.includes('inward remittance')) return 'Transfer In';
  if (lower.includes('acct to acct transfer')) return credit > 0 ? 'Transfer In' : 'Transfer Out';
  if (lower.includes('ipp transfer')) return credit > 0 ? 'Transfer In' : 'Transfer Out';
  return credit > 0 ? 'Credit' : 'Debit';
};

const extractMashreqTransactions = (
  lineEntries: LineEntry[],
  amountCenters: PdfAmountColumnLayout | null,
): RawTransaction[] => {
  const debitCenter = amountCenters?.debitCenter ?? 335;
  const creditCenter = amountCenters?.creditCenter ?? 412;
  const balanceCenter = amountCenters?.balanceCenter ?? 500;
  const rows: RawTransaction[] = [];
  let pendingPrefix: string[] = [];
  let current: {
    date: string;
    dateTokens: LineToken[];
    prefixLines: string[];
    bodyLines: string[];
    tailLines: string[];
    balance: number | null;
  } | null = null;

  const finalize = () => {
    if (!current) return;
    const amountTokens = current.dateTokens.filter((token) =>
      token.x >= Math.min(debitCenter, creditCenter) - 20 &&
      token.x < balanceCenter - 20 &&
      isStrictAmountToken(token.text)
    );
    const amountToken =
      amountTokens.sort((left, right) => {
        const leftDist = Math.min(Math.abs(left.x - debitCenter), Math.abs(left.x - creditCenter));
        const rightDist = Math.min(Math.abs(right.x - debitCenter), Math.abs(right.x - creditCenter));
        return leftDist - rightDist;
      })[0] ?? null;
    const balance = current.balance;
    if (!amountToken || !Number.isFinite(balance)) {
      current = null;
      return;
    }

    const amount = Math.abs(parseAmount(amountToken.text));
    const debit = Math.abs(amountToken.x - debitCenter) <= Math.abs(amountToken.x - creditCenter) ? amount : 0;
    const credit = debit === 0 ? amount : 0;
    const refTokens = current.dateTokens
      .filter((token) => token.x >= 90 && token.x < 320)
      .map((token) => token.text);
    const alphaNumericRefs = refTokens.filter((token) => /[A-Za-z]/.test(token) && /\d/.test(token));
    const shortDigitRefs = refTokens.filter((token) => /^\d{4,8}$/.test(token));
    const refNumber = [...shortDigitRefs, ...alphaNumericRefs].join(' ').trim();
    const description = [...current.prefixLines, ...current.bodyLines, ...current.tailLines]
      .map(cleanMashreqDescriptionPart)
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!description) {
      current = null;
      return;
    }

    rows.push({
      date: current.date,
      description,
      debit,
      credit,
      balance,
      refNumber,
      category: classifyMashreqCategory(description, debit, credit),
    });
    current = null;
  };

  for (const entry of lineEntries) {
    const line = entry.text.trim();
    if (line === '__PAGE_BREAK__') continue;
    if (isMashreqNoiseLine(line)) continue;

    const firstToken = entry.tokens[0]?.text ?? '';
    const isDateStart = (entry.tokens[0]?.x ?? 999) < 80 && /^\d{4}-\d{2}-\d{2}$/.test(firstToken);
    if (isDateStart) {
      finalize();
      current = {
        date: normalizeDate(firstToken),
        dateTokens: entry.tokens,
        prefixLines: pendingPrefix,
        bodyLines: [],
        tailLines: [],
        balance: getMashreqSameLineBalance(entry, balanceCenter),
      };
      pendingPrefix = [];
      continue;
    }

    if (!current) {
      if (isMashreqPrefixStart(line)) {
        pendingPrefix = [line];
      }
      continue;
    }

    if (!Number.isFinite(current.balance as number)) {
      if (isMashreqBalanceOnlyLine(entry, balanceCenter)) {
        current.balance = Math.abs(parseAmount(entry.tokens[0].text));
      } else {
        current.bodyLines.push(line);
      }
      continue;
    }

    if (isMashreqPrefixStart(line)) {
      finalize();
      pendingPrefix = [line];
      continue;
    }

    current.tailLines.push(line);
  }

  finalize();
  return rows;
};

const hasLikelyAmountTail = (text: string): boolean => {
  if (extractFlexibleAmounts(text)) return true;
  const normalizedText = normalizeDashToken(text);
  const matches = normalizedText.match(new RegExp(`-?${AMOUNT_NUMBER_SOURCE}`, 'g')) || [];
  if (matches.length >= 2) return true;
  // Placeholder variants: amount + '-' + balance OR '-' + amount + balance
  const debitBlankTail = normalizedText.match(
    new RegExp(`(?:^|\\s)([-\\u2013\\u2014]+)\\s+${AMOUNT_NUMBER_SOURCE}\\s+${AMOUNT_NUMBER_SOURCE}\\s*$`),
  );
  if (debitBlankTail && DASH_PLACEHOLDER.test(debitBlankTail[1])) {
    return true;
  }
  const creditBlankTail = normalizedText.match(
    new RegExp(`(${AMOUNT_NUMBER_SOURCE})\\s+([-\\u2013\\u2014]+)\\s+(${AMOUNT_NUMBER_SOURCE})\\s*$`),
  );
  if (creditBlankTail && DASH_PLACEHOLDER.test(creditBlankTail[2])) {
    return true;
  }
  return false;
};

const ROW_START_PATTERN_SINGLE = new RegExp(`^${FLEXIBLE_PREFIX_SOURCE}(${DATE_TOKEN_SOURCE})\\s+(.+)$`);
const ROW_START_PATTERN_MONTH = new RegExp(`^${FLEXIBLE_PREFIX_SOURCE}(\\d{1,2}\\s+[A-Za-z]{3,9}\\s+\\d{2,4})\\s+(.+)$`);
const ROW_START_PATTERN_MONTH_PAIR =
  new RegExp(`^${FLEXIBLE_PREFIX_SOURCE}(\\d{1,2}\\s+[A-Za-z]{3,9}\\s+\\d{2,4})\\s+(\\d{1,2}\\s+[A-Za-z]{3,9}\\s+\\d{2,4})\\s+(.+)$`);
const FALLBACK_ROW_START_PATTERN = new RegExp(`^${FLEXIBLE_PREFIX_SOURCE}(${DATE_TOKEN_SOURCE})\\s+(.+)$`);

type ExtractPdfTextOptions = {
  allowSingleDate?: boolean;
  pageStart?: number;
  pageEnd?: number;
  pdfDocument?: PdfDocumentProxy;
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

const detectPdfTotalPagesFromBytes = async (
  bytes: Uint8Array,
  password?: string,
  options?: { pdfDocument?: PdfDocumentProxy },
): Promise<number> => {
  if (!bytes || bytes.length === 0) return 0;
  const shouldDestroyPdf = !options?.pdfDocument;
  const pdf = options?.pdfDocument ?? await loadPdfDocumentFromBytes(bytes, password);
  try {
    return Number(pdf.numPages || 0);
  } finally {
    if (shouldDestroyPdf) {
      await pdf.destroy?.();
    }
  }
};

const extractPdfTextTransactionsFromBytes = async (
  bytes: Uint8Array,
  password?: string,
  options?: ExtractPdfTextOptions,
): Promise<{ transactions: RawTransaction[]; text: string }> => {
  if ((!bytes || bytes.length === 0) && !options?.pdfDocument) return { transactions: [], text: '' };
  const shouldDestroyPdf = !options?.pdfDocument;
  const pdf = options?.pdfDocument ?? await loadPdfDocumentFromBytes(bytes, password);

  try {
    const rows: Array<RawTransaction & { _descriptionParts: string[]; _sourceLineNumber?: number; _sourceRawLine?: string }> = [];
    let current: (RawTransaction & { _descriptionParts: string[]; _sourceLineNumber?: number; _sourceRawLine?: string }) | null = null;
    const allLines: string[] = [];
    const allLineEntries: LineEntry[] = [];
    let currentLineNumber = 0;

    const flushCurrent = () => {
      if (!current) return;
      if (!current.date) {
        console.log("[ROW_DROP]", {
          reason: "invalid_date",
          lineNumber: current._sourceLineNumber ?? currentLineNumber,
          rawLine: current._sourceRawLine ?? current.description ?? "",
        });
        current = null;
        return;
      }
      if (!current.debit && !current.credit && !current.balance) {
        console.log("[ROW_DROP]", {
          reason: "no_amount",
          lineNumber: current._sourceLineNumber ?? currentLineNumber,
          rawLine: current._sourceRawLine ?? current.description ?? "",
        });
        current = null;
        return;
      }
      current.description = current._descriptionParts.join(' ').replace(/\s+/g, ' ').trim();
      rows.push(current);
      current = null;
    };

    const startPage = Math.max(1, Math.min(pdf.numPages, options?.pageStart ?? 1));
    const endPage = Math.max(startPage, Math.min(pdf.numPages, options?.pageEnd ?? pdf.numPages));
    for (let pageNum = startPage; pageNum <= endPage; pageNum += 1) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent?.();
      const lineEntries = groupTokensIntoLines((textContent?.items || []) as Array<Record<string, unknown>>);
      allLineEntries.push(...lineEntries);
      allLineEntries.push({ text: '__PAGE_BREAK__', tokens: [] });
      allLines.push(...lineEntries.map((entry) => entry.text));
    }

    const amountCenters = detectAmountColumns(allLineEntries);
    const mashreqLineEntries = allLineEntries.filter((entry) => entry.text !== '__PAGE_BREAK__');
    if (isLikelyMashreqStatement(allLines)) {
      const mashreqRows = extractMashreqTransactions(mashreqLineEntries, amountCenters);
      if (mashreqRows.length >= Math.max(20, Math.ceil(pdf.numPages * 4))) {
        console.log("[ROW_COUNT]", {
          stage: "mashreq_specialized_parse",
          totalAfter: mashreqRows.length,
        });
        return { transactions: mashreqRows, text: allLines.join('\n') };
      }
    }

    for (const entry of allLineEntries) {
      currentLineNumber += 1;
      const line = entry.text;
      if (line === '__PAGE_BREAK__') {
        flushCurrent();
        continue;
      }
      if (isNoiseLine(line)) {
        console.log("[ROW_DROP]", {
          reason: "noise",
          lineNumber: currentLineNumber,
          rawLine: line,
        });
        continue;
      }

      const rowStart = line.match(ROW_START_PATTERN);
      let monthPairMatch = null;
      if (!rowStart) {
        monthPairMatch = line.match(ROW_START_PATTERN_MONTH_PAIR);
      }
      let singleDateMatch = null;
      const matchesSingleDate = ROW_START_PATTERN_SINGLE.test(line);

      const singleDateAllowed =
        options?.allowSingleDate ||
        hasLikelyAmountTail(line) ||
        (
          matchesSingleDate &&
          !isNoiseLine(line)
        );
      if (!rowStart && !monthPairMatch && singleDateAllowed) {
        singleDateMatch = line.match(ROW_START_PATTERN_SINGLE);
        if (!singleDateMatch) {
          singleDateMatch = line.match(ROW_START_PATTERN_MONTH);
        }
      }
      if (rowStart || monthPairMatch || singleDateMatch) {
        flushCurrent();
        const transactionDateToken = rowStart
          ? rowStart[1]
          : monthPairMatch
            ? monthPairMatch[1]
            : singleDateMatch?.[1] ?? '';
        const trailing = rowStart
          ? rowStart[3]
          : monthPairMatch
            ? monthPairMatch[3]
            : singleDateMatch?.[2] ?? '';
        const amounts = extractFlexibleAmounts(trailing);
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
          _sourceLineNumber: currentLineNumber,
          _sourceRawLine: line,
          _descriptionParts: descriptionText ? [descriptionText] : [],
        };
        continue;
      }

      if (!current) continue;
      const maybeAmounts = extractFlexibleAmounts(line);
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

  const singleAmountPattern = new RegExp(`^${AMOUNT_TOKEN_SOURCE}$`, 'i');
      const singleAmountToken = line.trim();
      if (
        current &&
        singleAmountPattern.test(singleAmountToken) &&
        !ROW_START_PATTERN_SINGLE.test(line) &&
        !ROW_START_PATTERN.test(line) &&
        !ROW_START_PATTERN_MONTH_PAIR.test(line) &&
        !ROW_START_PATTERN_MONTH.test(line)
      ) {
        const amountValue = parseAmount(singleAmountToken);
        if (current.debit === 0 && current.credit === 0) {
          if (amountValue < 0) {
            current.debit = Math.abs(amountValue);
          } else {
            current.credit = Math.abs(amountValue);
          }
        } else if (current.balance === 0) {
          current.balance = amountValue;
        } else {
          current._descriptionParts.push(line);
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

    const totalBeforePostParseFilter = rows.length;
    let transactions = rows
      .filter((row) => {
        const hasDate = Boolean(row.date);
        const hasDescription = Boolean(row.description);
        const hasBalance = Number.isFinite(row.balance as number);
        const keep = hasDate && hasDescription && hasBalance;
        if (!keep) {
          const reason = !hasDate
            ? "invalid_date"
            : (!hasBalance ? "no_amount" : "normalization_reject");
          console.log("[ROW_DROP]", {
            reason,
            lineNumber: row._sourceLineNumber ?? null,
            rawLine: row._sourceRawLine ?? row.description ?? "",
          });
        }
        return keep;
      })
      .map(({ _descriptionParts, _sourceLineNumber, _sourceRawLine, ...rest }) => rest);

    const currentTransactionBounds = getTransactionDateBounds(transactions);
    const textDateBounds = getTextDateBounds(allLines.join('\n'));
    const coverageGapDetected = Boolean(
      (textDateBounds.end != null && currentTransactionBounds.end != null &&
        textDateBounds.end - currentTransactionBounds.end >= DAY_IN_MS),
    );

    // Fallback parser for text-based PDFs where line-anchored parsing under-extracts
    // or clearly stops before the extracted text / statement period does.
    const recoveryThreshold = Math.max(12, Math.ceil(pdf.numPages * 4));
    if (pdf.numPages >= 5 && allLines.length > 0 && (transactions.length < recoveryThreshold || coverageGapDetected)) {
      const regexFallbackRows: RawTransaction[] = [];
      for (const rawLine of allLines) {
        const line = rawLine.trim().replace(/\s+/g, ' ');
        if (!line || isNoiseLine(line)) continue;

        const dateMatch = line.match(FALLBACK_ROW_START_PATTERN);
        if (!dateMatch) continue;

        const dateToken = dateMatch[1];
        const remainder = dateMatch[2] || '';
        const amounts = extractFlexibleAmounts(remainder);
        if (!amounts) continue;

        const description = (amounts.textWithoutAmounts || remainder).trim();
        if (!description || description.length < 2) continue;

        regexFallbackRows.push({
          date: normalizeDate(dateToken),
          description,
          debit: amounts.debit,
          credit: amounts.credit,
          balance: amounts.balance,
          refNumber: '',
        });
      }

      const tokenFallbackRows = buildTokenFallbackRows(allLineEntries, amountCenters);
      const fallbackRows =
        tokenFallbackRows.length > regexFallbackRows.length ? tokenFallbackRows : regexFallbackRows;

      const fallbackBounds = getTransactionDateBounds(fallbackRows);
      const fallbackExtendsCoverage =
        fallbackBounds.end != null &&
        currentTransactionBounds.end != null &&
        fallbackBounds.end > currentTransactionBounds.end;

      if (fallbackRows.length > transactions.length || fallbackExtendsCoverage) {
        const recoveredRows = mergeOcrTransactionsDeterministic(transactions, fallbackRows);
        const recoveredBounds = getTransactionDateBounds(recoveredRows);
        const recoveredExtendsCoverage =
          recoveredBounds.end != null &&
          currentTransactionBounds.end != null &&
          recoveredBounds.end > currentTransactionBounds.end;
        transactions =
          recoveredRows.length > transactions.length || recoveredExtendsCoverage
            ? recoveredRows
            : fallbackRows;
      }
    }

    console.log("[ROW_COUNT]", {
      stage: "deterministic_parse",
      totalBefore: totalBeforePostParseFilter,
      totalAfter: transactions.length,
    });

    return { transactions, text: allLines.join('\n') };
  } finally {
    if (shouldDestroyPdf) {
      await pdf.destroy?.();
    }
  }
};

const extractDeterministicPdfTransactions = async ({
  bytes,
  password,
  totalPages,
  useChunkMode,
  allowSingleDate,
  pdfDocument,
}: {
  bytes: Uint8Array;
  password?: string;
  totalPages: number;
  useChunkMode: boolean;
  allowSingleDate?: boolean;
  pdfDocument?: PdfDocumentProxy;
}): Promise<{ transactions: RawTransaction[]; text: string; chunked: boolean; chunksProcessed: number }> => {
  if (!useChunkMode) {
    const parsed = await extractPdfTextTransactionsFromBytes(bytes, password, { allowSingleDate, pdfDocument });
    return {
      transactions: parsed.transactions,
      text: parsed.text,
      chunked: false,
      chunksProcessed: 1,
    };
  }

  const canonicalTransactions: RawTransaction[] = [];
  const textParts: string[] = [];
  let chunksProcessed = 0;

  const shouldDestroyPdf = !pdfDocument;
  const pdf = pdfDocument ?? await loadPdfDocumentFromBytes(bytes, password);
  try {
    const cappedTotalPages = Math.max(0, Math.min(pdf.numPages, totalPages));
    for (let start = 0; start < cappedTotalPages; start += CHUNK_SIZE) {
      const end = Math.min(start + CHUNK_SIZE, cappedTotalPages);
      let parsedChunk: { transactions: RawTransaction[]; text: string } | null =
        await extractPdfTextTransactionsFromBytes(bytes, password, {
          allowSingleDate,
          pageStart: start + 1,
          pageEnd: end,
          pdfDocument: pdf,
        });

      if (parsedChunk.transactions.length > 0) {
        canonicalTransactions.push(...parsedChunk.transactions);
      }
      let chunkText: string | null = parsedChunk.text || null;
      if (chunkText) {
        textParts.push(chunkText);
      }
      chunksProcessed += 1;

      // Memory safety: release per-chunk intermediates immediately.
      chunkText = null;
      parsedChunk = null;
    }
  } finally {
    if (shouldDestroyPdf) {
      await pdf.destroy?.();
    }
  }

  return {
    transactions: canonicalTransactions,
    text: textParts.join('\n'),
    chunked: true,
    chunksProcessed,
  };
};

type SelectiveOcrPagePlan = {
  selected: Array<{ pageNumber: number; imageDataUrl: string }>;
  totalProvidedPages: number;
  reasons: string[];
  pageDiagnostics: Array<{
    pageNumber: number;
    rows: number;
    useDeterministic: boolean;
    mismatchRatio: number;
    anomalyRate: number;
    needsOcr: boolean;
  }>;
};

const buildSelectiveOcrPagePlan = async ({
  bytes,
  password,
  totalPages,
  pageImages,
  pdfDocument,
}: {
  bytes: Uint8Array;
  password?: string;
  totalPages: number;
  pageImages: string[];
  pdfDocument?: PdfDocumentProxy;
}): Promise<SelectiveOcrPagePlan> => {
  const totalProvidedPages = Array.isArray(pageImages) ? pageImages.length : 0;
  const fallbackAll = pageImages.map((imageDataUrl, index) => ({ pageNumber: index + 1, imageDataUrl }));
  const reasons: string[] = [];

  if (shouldUseFullPageOcrCoverage(totalProvidedPages)) {
    reasons.push('large_document_full_coverage');
    return {
      selected: fallbackAll,
      totalProvidedPages,
      reasons,
      pageDiagnostics: [],
    };
  }

  if (!bytes || bytes.length === 0 || totalProvidedPages === 0) {
    reasons.push('no_pdf_bytes_or_page_images');
    return {
      selected: fallbackAll,
      totalProvidedPages,
      reasons,
      pageDiagnostics: [],
    };
  }

  const lastPage = Math.max(0, Math.min(totalPages, totalProvidedPages));
  if (lastPage === 0) {
    reasons.push('no_pages_to_process');
    return {
      selected: [],
      totalProvidedPages,
      reasons,
      pageDiagnostics: [],
    };
  }

  const selectedIndexes = new Set<number>();
  const shouldDestroyPdf = !pdfDocument;
  const pdf = pdfDocument ?? await loadPdfDocumentFromBytes(bytes, password);
  let diagnostics: SelectiveOcrPagePlan['pageDiagnostics'] = [];
  try {
    diagnostics = (await Promise.all(
      Array.from({ length: lastPage }, async (_, idx) => {
        const pageNumber = idx + 1;
        const singlePage = await extractPdfTextTransactionsFromBytes(bytes, password, {
          pageStart: pageNumber,
          pageEnd: pageNumber,
          pdfDocument: pdf,
        });
        const assessment = assessClientPdfParsedTransactions(singlePage.transactions, 1);
        const sparseRows = singlePage.transactions.length < 2;
        const needsOcr =
          sparseRows ||
          !assessment.useDeterministic ||
          assessment.mismatchRatio >= 0.22 ||
          assessment.anomalyRate >= 0.2;

        return {
          pageNumber,
          rows: singlePage.transactions.length,
          useDeterministic: assessment.useDeterministic,
          mismatchRatio: assessment.mismatchRatio,
          anomalyRate: assessment.anomalyRate,
          needsOcr,
        };
      }),
    )) as SelectiveOcrPagePlan['pageDiagnostics'];
    for (const diagnostic of diagnostics) {
      if (diagnostic.needsOcr) {
        selectedIndexes.add(diagnostic.pageNumber - 1);
      }
    }
  } finally {
    if (shouldDestroyPdf) {
      await pdf.destroy?.();
    }
  }

  if (selectedIndexes.size === 0) {
    reasons.push('all_pages_deterministic_stable_using_first_page_guard');
    selectedIndexes.add(0);
  }

  const selected = Array.from(selectedIndexes.values())
    .sort((a, b) => a - b)
    .map((index) => ({ pageNumber: index + 1, imageDataUrl: pageImages[index] }))
    .filter((entry) => typeof entry.imageDataUrl === 'string' && entry.imageDataUrl.length > 0);

  reasons.push(`selected_${selected.length}_of_${totalProvidedPages}`);
  return {
    selected: selected.length > 0 ? selected : fallbackAll,
    totalProvidedPages,
    reasons,
    pageDiagnostics: diagnostics,
  };
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
              `Populate refNumber only when a dedicated reference column exists. If ID appears only inside description text, keep it in description and set refNumber to "".\n` +
              `Ignore headers, footers, summaries, opening/closing balance lines, and page-break artifacts.\n` +
              `Map debit/credit strictly by their table columns. If a column has "-" or blank, set that side to 0.\n` +
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
    const responseText = String(groqData.choices?.[0]?.message?.content || '').trim();
    const tokenUsage = Number(groqData?.usage?.total_tokens || 0);

    const tryParseRows = (candidate: string): RawTransaction[] | null => {
      try {
        const parsed = JSON.parse(candidate);
        return Array.isArray(parsed) ? (parsed as RawTransaction[]) : null;
      } catch {
        return null;
      }
    };

    const tryRepairTruncatedArray = (candidate: string): RawTransaction[] | null => {
      const start = candidate.indexOf('[');
      if (start < 0) return null;
      let repaired = candidate.slice(start);

      if (!repaired.includes(']')) {
        const lastComplete = Math.max(repaired.lastIndexOf('},'), repaired.lastIndexOf('}'));
        if (lastComplete > 0) {
          repaired = repaired.slice(0, lastComplete + 1);
        }
        repaired = repaired.replace(/,\s*$/, '');
        repaired = `${repaired}]`;
      }

      const openBraces = (repaired.match(/\{/g) || []).length;
      const closeBraces = (repaired.match(/\}/g) || []).length;
      if (openBraces > closeBraces) {
        repaired += '}'.repeat(openBraces - closeBraces);
      }

      return tryParseRows(repaired);
    };

    const candidates: string[] = [];
    const markdownMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (markdownMatch?.[1]) candidates.push(markdownMatch[1].trim());
    const jsonArrayMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonArrayMatch?.[0]) candidates.push(jsonArrayMatch[0].trim());
    candidates.push(responseText);

    let parsed: RawTransaction[] | null = null;
    for (const candidate of candidates) {
      parsed = tryParseRows(candidate);
      if (parsed) break;
      parsed = tryRepairTruncatedArray(candidate);
      if (parsed) break;
    }
    if (!parsed) return { rows: null, tokenUsage, rescueConfidence: 0 };
    const normalized = normalizeRawTransactions(parsed);
    const flow = scoreRunningBalanceFlow(normalized);
    const mismatch = flow.total > 0 ? flow.mismatchRatio : 1;
    const rescueConfidence = clamp01(1 - mismatch);
    return {
      rows: normalized.length > 0 ? normalized : null,
      tokenUsage,
      rescueConfidence,
    };
  } catch {
    return { rows: null, tokenUsage: 0, rescueConfidence: 0 };
  }
};

const getExpectedBalanceForOrder = (
  rows: RawTransaction[],
  index: number,
  debit: number,
  credit: number,
  reverseOrder: boolean,
): number => {
  const prev = reverseOrder ? rows[index + 1] : rows[index - 1];
  const prevBalance = Number(prev?.balance ?? NaN);
  if (!Number.isFinite(prevBalance)) return Number.NaN;
  return prevBalance + credit - debit;
};

const countDebitCreditMismatches = (rows: RawTransaction[], reverseOrder: boolean): number => {
  const resolveBalance = (value: unknown): number => {
    const direct = Number(value ?? NaN);
    if (Number.isFinite(direct)) return direct;
    const parsed = parseAmount(String(value ?? ''));
    return Number.isFinite(parsed) ? parsed : NaN;
  };
  let mismatches = 0;
  const startIndex = reverseOrder ? 0 : 1;
  const endIndex = reverseOrder ? rows.length - 1 : rows.length;
  for (let i = startIndex; i < endIndex; i += 1) {
    const current = rows[i];
    const prev = reverseOrder ? rows[i + 1] : rows[i - 1];
    if (!prev) continue;
    const currentBalance = resolveBalance(current.balance);
    if (!Number.isFinite(currentBalance)) continue;
    const credit = Number(current.credit ?? 0);
    const debit = Number(current.debit ?? 0);
    const asIsExpected = getExpectedBalanceForOrder(rows, i, debit, credit, reverseOrder);
    const swappedExpected = getExpectedBalanceForOrder(rows, i, credit, debit, reverseOrder);
    if (!Number.isFinite(asIsExpected) || !Number.isFinite(swappedExpected)) continue;
    const asIsDiff = Math.abs(asIsExpected - currentBalance);
    const swappedDiff = Math.abs(swappedExpected - currentBalance);
    if (swappedDiff + 0.01 < asIsDiff) mismatches += 1;
  }
  return mismatches;
};

const detectDebitCreditOrderFromDates = (rows: RawTransaction[]): 'chron' | 'reverse' | null => {
  if (rows.length < 3) return null;
  const timestamps = rows
    .map((row) => {
      const parsed = parseStatementTimestamp(row.date);
      return parsed == null ? NaN : parsed;
    })
    .filter((value) => Number.isFinite(value));

  if (timestamps.length < 3) return null;

  let asc = 0;
  let desc = 0;
  for (let i = 1; i < timestamps.length; i += 1) {
    const delta = timestamps[i] - timestamps[i - 1];
    if (delta > 0) asc += 1;
    if (delta < 0) desc += 1;
  }

  const directionalMoves = asc + desc;
  if (directionalMoves < 2) return null;
  if (asc >= Math.ceil(directionalMoves * 0.6)) return 'chron';
  if (desc >= Math.ceil(directionalMoves * 0.6)) return 'reverse';
  return null;
};

const applyDebitCreditHardRule = (rows: RawTransaction[]): { rows: RawTransaction[]; order: 'chron' | 'reverse' } => {
  const resolveBalance = (value: unknown): number => {
    const direct = Number(value ?? NaN);
    if (Number.isFinite(direct)) return direct;
    const parsed = parseAmount(String(value ?? ''));
    return Number.isFinite(parsed) ? parsed : NaN;
  };
  if (rows.length < 2) return { rows, order: 'chron' };
  const mismatchesChron = countDebitCreditMismatches(rows, false);
  const mismatchesReverse = countDebitCreditMismatches(rows, true);
  const dateOrder = detectDebitCreditOrderFromDates(rows);
  const order: 'chron' | 'reverse' =
    dateOrder ?? (mismatchesReverse + 1 < mismatchesChron ? 'reverse' : 'chron');
  const updated = rows.map((row) => ({ ...row }));

  for (let i = 0; i < updated.length; i += 1) {
    const current = updated[i];
    const prev = order === 'reverse' ? updated[i + 1] : updated[i - 1];
    if (!prev) continue;
    const currentBalance = resolveBalance(current.balance);
    const prevBalance = resolveBalance(prev.balance);
    if (!Number.isFinite(currentBalance) || !Number.isFinite(prevBalance)) continue;
    const delta = currentBalance - prevBalance;
    if (Math.abs(delta) < 0.005) continue;
    const debit = Number(current.debit ?? 0);
    const credit = Number(current.credit ?? 0);
    const amount = credit > 0 ? credit : debit > 0 ? debit : 0;
    if (amount === 0) continue;
    const asIsExpected = prevBalance + credit - debit;
    const swappedExpected = prevBalance + debit - credit;
    const asIsDiff = Math.abs(asIsExpected - currentBalance);
    const swappedDiff = Math.abs(swappedExpected - currentBalance);
    const amountTolerance = Math.max(0.02, amount * 0.002);
    const canSwap =
      swappedDiff + 0.01 < asIsDiff &&
      asIsDiff - swappedDiff >= 0.02 &&
      swappedDiff <= amountTolerance;
    if (!canSwap) continue;
    if (delta > 0 && credit === 0 && debit > 0) {
      current.credit = amount;
      current.debit = 0;
      current.type = 'credit';
    } else if (delta < 0 && debit === 0 && credit > 0) {
      current.debit = amount;
      current.credit = 0;
      current.type = 'debit';
    }
  }

  return { rows: updated, order };
};

const applyOcrPostParseAdjustments = (rows: RawTransaction[]): { rows: RawTransaction[]; order: 'chron' | 'reverse' } => {
  const resolveBalance = (value: unknown): number => {
    const direct = Number(value ?? NaN);
    if (Number.isFinite(direct)) return direct;
    const parsed = parseAmount(String(value ?? ''));
    return Number.isFinite(parsed) ? parsed : NaN;
  };
  const { rows: anchored, order } = applyDebitCreditHardRule(rows);
  const updated = anchored.map((row) => ({ ...row }));
  const startIndex = order === 'reverse' ? 0 : 1;
  const endIndex = order === 'reverse' ? updated.length - 1 : updated.length;

  for (let i = startIndex; i < endIndex; i += 1) {
    const current = updated[i];
    const prev = order === 'reverse' ? updated[i + 1] : updated[i - 1];
    if (!prev) continue;
    const currentBalance = resolveBalance(current.balance);
    const prevBalance = resolveBalance(prev.balance);
    if (!Number.isFinite(currentBalance) || !Number.isFinite(prevBalance)) continue;
    const delta = currentBalance - prevBalance;
    if (Math.abs(delta) < 0.005) continue;

    const debit = Number(current.debit ?? 0);
    const credit = Number(current.credit ?? 0);

    if (debit === 0 && credit === 0) {
      if (delta > 0) {
        current.credit = Math.abs(delta);
        current.type = 'credit';
      } else {
        current.debit = Math.abs(delta);
        current.type = 'debit';
      }
      continue;
    }

    if (debit > 0 && credit > 0) {
      if (delta > 0) {
        current.credit = Math.max(debit, credit);
        current.debit = 0;
        current.type = 'credit';
      } else {
        current.debit = Math.max(debit, credit);
        current.credit = 0;
        current.type = 'debit';
      }
    }
  }

  return { rows: updated, order };
};

const FREE_MAX_PDF_PAGES_PER_FILE = 15; // Free-tier per-file PDF cap
const GLOBAL_PDF_PAGE_CAP = 250;
const CHUNK_THRESHOLD = 10;
const CHUNK_SIZE = 25;
const MAX_TEXT_PDF_BYTES = 100 * 1024 * 1024;
const MAX_IMAGE_UPLOAD_BYTES = 50 * 1024 * 1024;
const MAX_PDF_PAGE_IMAGES = Number(Deno.env.get('MAX_PDF_PAGE_IMAGES') ?? '250');
const OCR_CONCURRENCY_BATCH_SIZE = 10; // Process OCR pages in parallel batches of 10 for speed
const MAX_PDF_PAGE_IMAGE_BYTES = Number(Deno.env.get('MAX_PDF_PAGE_IMAGE_BYTES') ?? `${3 * 1024 * 1024}`); // 3MB
const MAX_PDF_PAGE_IMAGES_TOTAL_BYTES = Number(Deno.env.get('MAX_PDF_PAGE_IMAGES_TOTAL_BYTES') ?? `${20 * 1024 * 1024}`); // 20MB
type DualOcrMode = 'off' | 'smart' | 'always';
const normalizeDualOcrMode = (value: string | undefined): DualOcrMode => {
  const mode = (value || '').trim().toLowerCase();
  if (mode === 'off' || mode === 'always' || mode === 'smart') return mode;
  return 'smart';
};
const OCR_DUAL_PROVIDER_MODE = normalizeDualOcrMode(Deno.env.get('OCR_DUAL_PROVIDER_MODE') ?? 'off');
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
  Math.min(1, Number(Deno.env.get('DETERMINISTIC_CONFIDENCE_THRESHOLD') ?? '0.80')),
);
const OCR_ACCEPTABLE_CONFIDENCE_THRESHOLD = Math.max(
  0,
  Math.min(1, Number(Deno.env.get('OCR_ACCEPTABLE_CONFIDENCE_THRESHOLD') ?? '0.75')),
);
const AI_RESCUE_ENABLED = (Deno.env.get('AI_RESCUE_ENABLED') ?? 'true').trim().toLowerCase() !== 'false';
const AI_RESCUE_MAX_ROWS = Math.max(1, Number(Deno.env.get('AI_RESCUE_MAX_ROWS') ?? '4'));
const AI_RESCUE_MIN_MISMATCH = Math.max(0, Math.min(1, Number(Deno.env.get('AI_RESCUE_MIN_MISMATCH') ?? '0.18')));
const AI_RESCUE_MIN_TEXT_CHARS = Math.max(200, Number(Deno.env.get('AI_RESCUE_MIN_TEXT_CHARS') ?? '1200'));
const ENABLE_STAGE_6B_AUTO_REPROCESS = false;
const EXPECTED_TEXT_TOTAL_MS = Math.max(500, Number(Deno.env.get('EXPECTED_TEXT_TOTAL_MS') ?? '3500'));
const EXPECTED_OCR_TOTAL_MS = Math.max(1500, Number(Deno.env.get('EXPECTED_OCR_TOTAL_MS') ?? '14000'));
const EXPECTED_AI_TOTAL_MS = Math.max(2500, Number(Deno.env.get('EXPECTED_AI_TOTAL_MS') ?? '18000'));

type ParseMode = 'deterministic' | 'ocr' | 'ai_rescue';

type StructuralScanResult = {
  pdfType: 'TEXT' | 'IMAGE' | 'HYBRID' | 'UNKNOWN';
  hasSelectableText: boolean;
  hasStrongSelectableText: boolean;
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

const toBase64FromBytes = (bytes: Uint8Array): string => {
  if (!bytes || bytes.length === 0) return '';
  // Chunked base64 encoding to avoid stack overflow for large files (50MB+)
  const ENCODE_CHUNK = 8192;
  const parts: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += ENCODE_CHUNK) {
    const end = Math.min(offset + ENCODE_CHUNK, bytes.length);
    let chunk = '';
    for (let i = offset; i < end; i++) {
      chunk += String.fromCharCode(bytes[i]);
    }
    parts.push(chunk);
  }
  return btoa(parts.join(''));
};

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
  const normalizedPageCount = Number.isFinite(pageCount) ? Math.max(1, Math.floor(pageCount)) : 1;
  const selectableCharsPerPage = selectableTextChars / normalizedPageCount;
  const hasSelectableText = selectableTextChars > 0;
  const hasStrongSelectableText = selectableCharsPerPage >= 80;
  const isDigitallyGenerated = isPdf && hasSelectableText;

  let pdfType: StructuralScanResult['pdfType'] = 'UNKNOWN';
  if (!isPdf) {
    pdfType = 'IMAGE';
  } else if (hasStrongSelectableText) {
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
    hasStrongSelectableText,
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

const computePrintableRatio = (text: string): number => {
  if (!text) return 0;
  const compact = text.replace(/\s+/g, '');
  if (!compact) return 0;
  let printable = 0;
  for (let i = 0; i < compact.length; i += 1) {
    const code = compact.charCodeAt(i);
    if (code >= 32 && code !== 127) printable += 1;
  }
  return clamp01(printable / compact.length);
};

const countDateLikeRows = (text: string): number => {
  if (!text) return 0;
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return 0;

  const startPattern = /^(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4})\b/;
  let rowLikeCount = 0;
  for (const line of lines) {
    if (startPattern.test(line)) rowLikeCount += 1;
  }
  if (rowLikeCount > 0) return rowLikeCount;

  const matches = text.match(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g);
  return matches ? matches.length : 0;
};

const countAmountLikeRows = (text: string): number => {
  if (!text) return 0;
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  let count = 0;
  for (const line of lines) {
    if (hasLikelyAmountTail(line)) {
      count += 1;
    }
  }
  return count;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const parseStatementTimestamp = (value: unknown): number | null => {
  return parseStatementDateToTimestamp(value);
};

const getTransactionDateBounds = (rows: RawTransaction[]): { start?: number; end?: number } => {
  const timestamps = rows
    .map((row) => parseStatementTimestamp(row.date))
    .filter((value): value is number => value != null && Number.isFinite(value));
  if (timestamps.length === 0) return {};
  timestamps.sort((a, b) => a - b);
  return {
    start: timestamps[0],
    end: timestamps[timestamps.length - 1],
  };
};

const getStatementPeriodBounds = (statementPeriod?: string): { start?: number; end?: number } => {
  if (!statementPeriod) return {};
  const matches = statementPeriod.match(/\d{1,4}[/-]\d{1,2}[/-]\d{1,4}/g);
  if (!matches || matches.length < 2) return {};
  const start = parseStatementTimestamp(matches[0]);
  const end = parseStatementTimestamp(matches[1]);
  if (start == null || end == null) return {};
  return { start, end };
};

const getTextDateBounds = (text: string): { start?: number; end?: number } => {
  if (!text) return {};

  const timestamps: number[] = [];
  const datePattern =
    /\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{2,4})\b/g;
  for (const line of text.split('\n')) {
    const matches = line.match(datePattern) || [];
    for (const token of matches) {
      const timestamp = parseStatementTimestamp(token);
      if (timestamp != null && Number.isFinite(timestamp)) {
        timestamps.push(timestamp);
      }
    }
  }

  if (timestamps.length === 0) return {};
  timestamps.sort((a, b) => a - b);
  return {
    start: timestamps[0],
    end: timestamps[timestamps.length - 1],
  };
};

const detectStatementCoverageGap = (
  rows: RawTransaction[],
  statementPeriod: string | undefined,
  pageCount: number,
): { hasGap: boolean; reasons: string[] } => {
  const reasons: string[] = [];
  const normalizedPageCount = Number.isFinite(pageCount) ? Math.max(1, Math.floor(pageCount)) : 1;
  const rowsPerPage = rows.length / normalizedPageCount;

  if (normalizedPageCount >= 8 && rowsPerPage < 7.5) {
    reasons.push(`sparse_text_rows_${rowsPerPage.toFixed(1)}_per_page`);
  }

  const periodBounds = getStatementPeriodBounds(statementPeriod);
  const rowBounds = getTransactionDateBounds(rows);
  if (periodBounds.start == null || periodBounds.end == null || rowBounds.start == null || rowBounds.end == null) {
    return { hasGap: reasons.length > 0, reasons };
  }

  const endOvershootDays = (rowBounds.end - periodBounds.end) / DAY_IN_MS;
  const endShortfallDays = (periodBounds.end - rowBounds.end) / DAY_IN_MS;

  if (endOvershootDays > 1) {
    reasons.push(`rows_extend_beyond_statement_period_by_${Math.round(endOvershootDays)}d`);
  } else if (normalizedPageCount >= 8 && endShortfallDays > 10) {
    reasons.push(`extracted_rows_end_too_early_by_${Math.round(endShortfallDays)}d`);
  }

  return { hasGap: reasons.length > 0, reasons };
};

const computeDateContinuityScore = (rows: RawTransaction[]): number => {
  if (!rows.length) return 0;
  const parsed = rows
    .map((row) => parseStatementTimestamp(row.date))
    .filter((value): value is number => value != null && Number.isFinite(value))
    .map((timestamp) => new Date(timestamp));
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
  const aliases = {
    date: ['transaction date', 'txn date', 'date', 'value date', 'posting date'],
    description: ['narration', 'description', 'details', 'particulars', 'transaction details'],
    debit: ['debit', 'withdrawal', 'dr amount', 'debit amount'],
    credit: ['credit', 'deposit', 'cr amount', 'credit amount'],
    balance: ['balance', 'running balance', 'available balance', 'ledger balance'],
  };
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

  const amountTriples = (text.match(new RegExp(
    `(${AMOUNT_NUMBER_SOURCE})\\s+(${AMOUNT_NUMBER_SOURCE})\\s+(${AMOUNT_NUMBER_SOURCE})`,
    'g',
  )) || []).length;
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
  const expectedRowsFromDate = countDateLikeRows(sourceText);
  const expectedRowsFromAmounts = countAmountLikeRows(sourceText);
  const estimatedRows = Math.max(rows.length, expectedRowsFromDate, expectedRowsFromAmounts);
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
}: {
  fileName: string;
  extractedText: string;
}): BankDetectionLayerResult => {
  const signalText = `${fileName}\n${extractedText}`.toLowerCase();
  const signals: string[] = [];
  const bankDetectors: Array<{ id: string; pattern: RegExp }> = [
    { id: 'enbd', pattern: /\bemirates\s+nbd\b|\benbd\b/ },
    { id: 'adcb', pattern: /\badcb\b|abu dhabi commercial bank/ },
    { id: 'emirates_islamic', pattern: /\bemirates\s+islamic\b/ },
    { id: 'mashreq', pattern: /\bmashreq\b/ },
    { id: 'wio', pattern: /\bwio\b/ },
    { id: 'hdfc', pattern: /\bhdfc\b/ },
    { id: 'icici', pattern: /\bicici\b/ },
    { id: 'axis', pattern: /\baxis\b/ },
    { id: 'sbi', pattern: /\bsbi\b|state bank of india/ },
    { id: 'kotak', pattern: /\bkotak\b/ },
    { id: 'hsbc', pattern: /\bhsbc\b/ },
    { id: 'citi', pattern: /\bciti\b|citibank/ },
    { id: 'chase', pattern: /\bjp\s*morgan\b|\bchase\b/ },
    { id: 'bank_of_america', pattern: /bank of america|\bbofa\b/ },
    { id: 'wells_fargo', pattern: /wells fargo/ },
    { id: 'barclays', pattern: /\bbarclays\b/ },
    { id: 'dbs', pattern: /\bdbs\b/ },
    { id: 'ocbc', pattern: /\bocbc\b/ },
    { id: 'uob', pattern: /\buob\b/ },
    { id: 'deutsche', pattern: /deutsche bank/ },
  ];
  const matchedBank = bankDetectors.find((entry) => entry.pattern.test(signalText));
  if (matchedBank) {
    signals.push('header_keyword_match');
  }
  if (/\b[a-z]{4}0[a-z0-9]{6}\b/i.test(signalText)) {
    signals.push('ifsc_pattern');
  }
  if (/statement of account|account statement|bank statement/.test(signalText)) {
    signals.push('statement_title_pattern');
  }

  if (matchedBank) {
    return {
      bankId: matchedBank.id,
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

const buildMinimalStructuredLines = (rawText: string): string => {
  const lines = rawText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => new RegExp(`\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4}|${AMOUNT_NUMBER_SOURCE}`).test(line))
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
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${secretKey}&response=${token}`,
      signal: controller.signal,
    });
    const data = await response.json();
    console.log('reCAPTCHA verification result:', { success: data.success });
    return data.success === true;
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return false;
  } finally {
    clearTimeout(timeout);
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
  const parsed = parseStatementTimestamp(value);
  if (parsed == null) return null;
  return new Date(parsed).toISOString().slice(0, 10);
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

  const hasArabicScript = (value: string): boolean => /[\u0600-\u06FF]/.test(value);
  const hasLikelyDate = (value: string): boolean =>
    /\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(value) || /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i.test(value);
  const sanitizeMetadataString = (key: keyof BankMetadata, value: string): string | null => {
    const normalized = value.replace(/\s+/g, ' ').trim();
    if (!normalized) return null;
    if (normalized.length > 140) return null;

    // Drop legal footer/header noise that sometimes leaks from PDF text.
    if (/correct\s*\(subject to the bank/i.test(normalized)) return null;
    if (/for assistance|customer service|raise a complaint/i.test(normalized)) return null;

    if (key === 'bankName') {
      if (hasArabicScript(normalized)) return null;
      if (normalized.length > 80) return null;
      const bankLike = /(bank|adcb|emirates|nbd|wio|hdfc|icici|sbi|fab|mashreq|islamic)/i.test(normalized);
      if (!bankLike) return null;
      return normalized;
    }

    if (key === 'accountHolder') {
      if (/currency|interest rate|account opened|closing balance|account number|account holder name/i.test(normalized)) {
        return null;
      }
      if ((normalized.match(/\d/g) || []).length >= 5) return null;
      if (normalized.length < 3) return null;
      return normalized;
    }

    if (key === 'accountNumber') {
      const compact = normalized.replace(/[^A-Za-z0-9]/g, '');
      const digitCount = (compact.match(/\d/g) || []).length;
      if (compact.length < 6 || digitCount < 6) return null;
      return compact;
    }

    if (key === 'iban') {
      const compact = normalized.replace(/\s+/g, '').toUpperCase();
      if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(compact)) return null;
      return compact;
    }

    if (key === 'statementPeriod') {
      if (!hasLikelyDate(normalized)) return null;
      return normalized;
    }

    if (key === 'currency') {
      const code = normalizeCurrencyCode(normalized);
      if (!code || code.length !== 3) return null;
      return code;
    }

    return normalized;
  };

  const assignString = (key: keyof BankMetadata, value: unknown) => {
    if (typeof value !== 'string') return;
    const cleaned = sanitizeMetadataString(key, value);
    if (!cleaned) return;
    const current = merged[key];
    if (typeof current === 'string' && current.trim()) return;
    writable[key] = cleaned;
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

const normalizeDedupeText = (value: string | undefined): string =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeDedupeReference = (value: string | undefined): string =>
  String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .trim();

const chooseBetterDedupeRow = (current: Transaction, incoming: Transaction): Transaction => {
  const currentRef = normalizeDedupeReference(current.refNumber);
  const incomingRef = normalizeDedupeReference(incoming.refNumber);
  if (!currentRef && incomingRef) return incoming;
  if (currentRef && !incomingRef) return current;

  const currentDesc = normalizeDedupeText(current.description);
  const incomingDesc = normalizeDedupeText(incoming.description);
  if (incomingDesc.length > currentDesc.length + 4) return incoming;
  return current;
};

const areLikelyDuplicateRows = (left: Transaction, right: Transaction): boolean => {
  const leftRef = normalizeDedupeReference(left.refNumber);
  const rightRef = normalizeDedupeReference(right.refNumber);
  if (leftRef && rightRef) {
    return leftRef === rightRef;
  }

  const leftDesc = normalizeDedupeText(left.description);
  const rightDesc = normalizeDedupeText(right.description);
  if (leftDesc && rightDesc) {
    return leftDesc === rightDesc;
  }

  return !leftRef && !rightRef && !leftDesc && !rightDesc;
};

const dedupeAndSortTransactions = (rows: Transaction[]): Transaction[] => {
  const buckets = new Map<string, Transaction[]>();
  const deduped: Transaction[] = [];

  for (const row of rows) {
    const numericKey = [
      String(row.date || '').trim(),
      Number(row.debit || 0).toFixed(2),
      Number(row.credit || 0).toFixed(2),
      Number(row.balance || 0).toFixed(2),
    ].join('|');

    const bucket = buckets.get(numericKey) ?? [];
    let merged = false;
    for (let i = 0; i < bucket.length; i += 1) {
      if (!areLikelyDuplicateRows(bucket[i], row)) continue;
      bucket[i] = chooseBetterDedupeRow(bucket[i], row);
      merged = true;
      break;
    }

    if (!merged) {
      bucket.push(row);
    }
    buckets.set(numericKey, bucket);
  }

  for (const bucketRows of buckets.values()) {
    deduped.push(...bucketRows);
  }

  deduped.sort((a, b) => {
    const aTime = parseStatementDateToTimestamp(a.date);
    const bTime = parseStatementDateToTimestamp(b.date);
    if (aTime == null && bTime == null) return 0;
    if (aTime == null) return 1;
    if (bTime == null) return -1;
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

const normalizeRequestedFormat = (value: unknown): ExportFormat => {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : 'xlsx';
  if (raw === 'csv') return 'csv';
  if (raw === 'json') return 'json';
  if (raw === 'mt940') return 'mt940';
  if (raw === 'fraud_report') return 'fraud_report';
  if (raw === 'foir_report') return 'foir_report';
  return 'xlsx';
};

const getCurrentPackFromLimit = (conversionsLimit: number): string | null => {
  if (conversionsLimit >= 11000) return 'per_page_pack_pro';
  if (conversionsLimit >= 1000) return 'per_page_pack_basic';
  if (conversionsLimit >= 50) return 'per_page_power';
  if (conversionsLimit >= 25) return 'per_page_standard';
  if (conversionsLimit >= 10) return 'per_page_lite';
  return null;
};

const resolveCurrentPlanType = (planType: string, conversionsLimit: number): string => {
  const inferredPack = getCurrentPackFromLimit(conversionsLimit);
  if (planType === 'free') return inferredPack ?? 'free';
  if (planType === 'unlimited') return conversionsLimit >= 900000 ? 'unlimited' : (inferredPack ?? 'free');
  if (planType.startsWith('per_page')) return planType;
  return planType;
};

const resolvePlanType = (row: SubscriptionLookupRow | null): string => {
  if (!row) return 'free';
  const conversionsLimit = toNumber(row.conversions_limit, 0);
  const planType = normalizePlan(row.plan_type);
  if (planType !== 'free') return resolveCurrentPlanType(planType, conversionsLimit);
  return resolveCurrentPlanType(normalizePlan(row.tier), conversionsLimit);
};

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
  if (normalizedPlan === 'free') return dateParts.isoDate;
  if (normalizedPlan === 'unlimited' || normalizedPlan.startsWith('per_page')) return null;
  return null;
};

const updateAnonymousUsage = async (
  supabaseAdmin: DocumentSupabaseClient,
  keyColumn: 'ip_address' | 'tracking_key',
  trackingKey: string,
  payload: AnonymousUsageLookupUpdate,
) => {
  const { error } = await supabaseAdmin
    .from('anonymous_usage')
    .update(payload)
    .eq(keyColumn, trackingKey);

  return { error };
};

const readAnonymousUsage = async (
  supabaseAdmin: DocumentSupabaseClient,
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
  supabaseAdmin: DocumentSupabaseClient;
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

      let row: SubscriptionLookupRow | null = subscriptionResponse.data;

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
          })
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

        row = created.data ?? {
          conversions_used: 0,
          conversions_limit: 5,
          last_reset_date: today,
          plan_type: 'free',
        };
      }

      const planType = resolvePlanType(row);
      const rowData = row;
      const explicitLimit = toNumber(rowData?.conversions_limit, 0);
      const hasBuckets =
        Object.prototype.hasOwnProperty.call(rowData, 'free_daily_limit') ||
        Object.prototype.hasOwnProperty.call(rowData, 'pack_limit');
      const lastResetDate = toDateString(rowData?.last_reset_date);
      const resetBoundary = getResetBoundary(planType, dateParts);

      if (hasBuckets) {
        const freeLimit = toNumber(rowData?.free_daily_limit, 5);
        let freeUsed = toNumber(rowData?.free_daily_used, 0);
        const packLimit = toNumber(rowData?.pack_limit, 0);
        const packUsed = toNumber(rowData?.pack_used, 0);

        if (planType === 'free' && (!lastResetDate || lastResetDate < dateParts.isoDate)) {
          freeUsed = 0;
          const { error: resetError } = await supabaseAdmin
            .from('subscriptions')
            .update({
              free_daily_used: 0,
              last_reset_date: dateParts.isoDate,
              timezone,
            })
            .eq('user_id', userId);
          if (resetError) {
            console.error('Fallback subscription reset failed:', resetError);
          }
        }

        if (planType.startsWith('per_page') || packLimit > 0) {
          const resolvedPlan = planType.startsWith('per_page')
            ? planType
            : resolveCurrentPlanType('free', packLimit);
          return {
            conversionsUsed: packUsed,
            conversionsLimit: packLimit,
            planType: resolvedPlan,
          };
        }

        return {
          conversionsUsed: freeUsed,
          conversionsLimit: freeLimit,
          planType: 'free',
        };
      }

      const conversionsLimit = explicitLimit > 0 ? explicitLimit : toNumber(rowData?.free_daily_limit, 5);
      let conversionsUsed = toNumber(rowData?.conversions_used, 0);

      if (planType === 'free' && resetBoundary && (!lastResetDate || lastResetDate < resetBoundary)) {
        const { error: resetError } = await supabaseAdmin
          .from('subscriptions')
          .update({
            conversions_used: 0,
            last_reset_date: resetBoundary,
            timezone,
          })
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

    let row: AnonymousUsageLookupRow | null = anonRead.data;
    const keyColumn = anonRead.keyColumn;

    if (!row) {
      const insertPayload: AnonymousUsageLookupInsert = {
        conversions_count: 0,
        last_reset_date: today,
        timezone,
      };
      insertPayload[keyColumn] = trackingKey;

      const created = await supabaseAdmin
        .from('anonymous_usage')
        .insert(insertPayload)
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

      row = created.data ?? {
        conversions_count: 0,
        last_reset_date: today,
        timezone,
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
  supabaseAdmin: DocumentSupabaseClient;
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
          });
        return { ok: !insertError, error: insertError };
      }

      const rowData = row;
      const hasBuckets =
        Object.prototype.hasOwnProperty.call(rowData, 'free_daily_limit') ||
        Object.prototype.hasOwnProperty.call(rowData, 'pack_limit');
      if (hasBuckets) {
        const freeLimit = toNumber(rowData.free_daily_limit, 5);
        const freeUsed = toNumber(rowData.free_daily_used, 0);
        const packLimit = toNumber(rowData.pack_limit, 0);
        const packUsed = toNumber(rowData.pack_used, 0);
        const normalizedPlanType = typeof rowData.plan_type === 'string' ? rowData.plan_type.toLowerCase() : '';

        if (normalizedPlanType.startsWith('per_page') || packLimit > 0) {
          const currentLimit = toNumber(rowData.conversions_limit, 0) || packLimit;
          const nextValue = Math.min(currentLimit > 0 ? currentLimit : Number.MAX_SAFE_INTEGER, toNumber(rowData.conversions_used, 0) + incrementBy);

          const { error: updateError } = await supabaseAdmin
            .from('subscriptions')
            .update({
              pack_used: nextValue,
              conversions_used: nextValue,
              conversions_limit: Math.max(currentLimit, nextValue),
              timezone,
            })
            .eq('user_id', userId);
          return { ok: !updateError, error: updateError };
        }

        const nextFreeUsed = Math.min(freeLimit, freeUsed + incrementBy);
        const conversionsUsed = nextFreeUsed;
        const conversionsLimit = freeLimit;

        const { error: updateError } = await supabaseAdmin
          .from('subscriptions')
          .update({
            free_daily_used: nextFreeUsed,
            conversions_used: conversionsUsed,
            conversions_limit: conversionsLimit,
            timezone,
          })
          .eq('user_id', userId);
        return { ok: !updateError, error: updateError };
      }

      const nextValue = toNumber(rowData.conversions_used, 0) + incrementBy;
      const { error: updateError } = await supabaseAdmin
        .from('subscriptions')
        .update({ conversions_used: nextValue, timezone })
        .eq('user_id', userId);
      return { ok: !updateError, error: updateError };
    }

    const anonRead = await readAnonymousUsage(supabaseAdmin, trackingKey);
    if (anonRead.error) {
      return { ok: false, error: anonRead.error };
    }

    const keyColumn = anonRead.keyColumn;
    const row: AnonymousUsageLookupRow | null = anonRead.data;

    if (!row) {
      const payload: AnonymousUsageLookupInsert = {
        conversions_count: incrementBy,
        last_reset_date: today,
        timezone,
      };
      payload[keyColumn] = trackingKey;
      const { error: insertError } = await supabaseAdmin
        .from('anonymous_usage')
        .insert(payload);
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

  let supabaseAdmin: DocumentSupabaseClient | null = null;
  let sharedPdf: PdfDocumentProxy | null = null;
  const totalStart = Date.now();
  const timing: Record<string, number> = {
    text_extract_ms: 0,
    deterministic_parse_ms: 0,
    confidence_ms: 0,
    ocr_ms: 0,
    ai_ms: 0,
    validation_ms: 0,
    output_ms: 0,
    total_ms: 0,
  };
  const pipelineDiagnostics: Record<string, Record<string, unknown>> = {};
  const traceLog = (label: string, payload?: unknown) => {
    const ts = new Date().toISOString();
    if (typeof payload === 'undefined') {
      console.log(`[TRACE ${ts}] ${label}`);
      return;
    }
    console.log(`[TRACE ${ts}] ${label}`, payload);
  };

  try {
    // Parse request
    const {
      fileName,
      fileData: base64FileData,
      timezone,
      recaptchaToken,
      outputMode,
      requestedFormat,
      pdfPassword,
      pdfPageImages,
      pdfParsedTransactions,
      pdfParsedBankMetadata,
    } = await req.json();
    const requestedOutputMode = outputMode === 'tally_only' ? 'tally_only' : 'standard';
    const normalizedRequestedFormat = normalizeRequestedFormat(requestedFormat);
    const userTimezone = (timezone && isValidTimezone(timezone)) ? timezone : 'UTC';
    traceLog('request_payload_metrics', {
      hasFileData: typeof base64FileData === 'string',
      fileDataLength: typeof base64FileData === 'string' ? base64FileData.length : 0,
      pdfPageImagesCount: Array.isArray(pdfPageImages) ? pdfPageImages.length : 0,
    });
    
    // Robust client tracking to prevent bypasses
    const trackingKey = await getTrackingKey(req);

    // Create Supabase admin client (service role for privileged operations)
    supabaseAdmin = createClient<DocumentDatabase>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const supabaseAdminClient = supabaseAdmin!;
    // ============= AUTHENTICATION CHECK =============
    // Detect authenticated users via Authorization: Bearer <token> header
    // Use supabaseAdmin.auth.getUser(token) to validate the token server-side
    const authHeader = req.headers.get('Authorization');
    let user = null;
    let supabase = supabaseAdminClient;

    if (authHeader && authHeader.startsWith('Bearer ') && authHeader !== 'Bearer null') {
      const token = authHeader.replace('Bearer ', '');

      // Validate token using admin client for secure server-side verification
      const { data: { user: authUser }, error: authError } = await supabaseAdminClient.auth.getUser(token);

      if (!authError && authUser) {
        user = authUser;
        console.log('Authenticated user detected');

        // Create user-scoped client for RLS-protected operations
        supabase = createClient<DocumentDatabase>(
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
    const rawBase64Input = typeof base64FileData === 'string' ? base64FileData.trim() : '';
    const hasBase64FileData = rawBase64Input.length > 0;
    const isPdfByName = fileName.toLowerCase().endsWith('.pdf');
    const maxIncomingBytes = isPdfByName ? MAX_TEXT_PDF_BYTES : MAX_IMAGE_UPLOAD_BYTES;
    const rawBase64PayloadLength = hasBase64FileData
      ? (rawBase64Input.match(/^data:[^;]+;base64,(.+)$/)?.[1] || rawBase64Input).replace(/\s+/g, '').length
      : 0;
    const estimatedBase64Bytes = Math.floor(rawBase64PayloadLength * 0.75);
    if (hasBase64FileData && estimatedBase64Bytes > maxIncomingBytes) {
      return new Response(
        JSON.stringify({ error: `File exceeds ${Math.round(maxIncomingBytes / (1024 * 1024))}MB limit` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!hasBase64FileData) {
      return new Response(
        JSON.stringify({ error: 'File data required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
    let fileSource: 'storage' | 'base64' | 'none' = 'none';

    {
      try {
        const dataUrlMatch = rawBase64Input.match(/^data:[^;]+;base64,(.+)$/);
        const base64Content = (dataUrlMatch?.[1] || rawBase64Input || '').replace(/\s+/g, '');
        if (!base64Content) {
          bytes = new Uint8Array();
          fileSource = 'none';
        } else {
          const binaryString = atob(base64Content);
          bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          fileSource = 'base64';
        }
        traceLog('file_decode_metrics', {
          hasFileData: hasBase64FileData,
          rawLength: rawBase64Input.length,
          decodedBytes: bytes.length,
          fileSource,
        });
      } catch {
        return new Response(
          JSON.stringify({ error: 'Invalid file data' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Validate file size (10MB limit) when we actually have original bytes
    if (bytes.length > 0 && bytes.length > maxIncomingBytes) {
      return new Response(
        JSON.stringify({ error: `File exceeds ${Math.round(maxIncomingBytes / (1024 * 1024))}MB limit` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate magic bytes
    const lowerFileName = fileName.toLowerCase();
    const isPdf = lowerFileName.endsWith('.pdf');
    if (isPdf && bytes.length === 0) {
      return new Response(
        JSON.stringify({
          code: 'PDF_BYTES_MISSING',
          error: 'PDF bytes missing. Please upload with original file data.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    let pageCount = hasPdfPageImages ? (pdfPageImages as string[]).length : 1;
    if (isPdf && bytes.length > 0) {
      try {
        sharedPdf = await loadPdfDocumentFromBytes(bytes.slice(), pdfPassword);
        const detectedPageCount = await detectPdfTotalPagesFromBytes(bytes, pdfPassword, {
          pdfDocument: sharedPdf,
        });
        if (Number.isFinite(detectedPageCount) && detectedPageCount > 0) {
          pageCount = detectedPageCount;
        }
      } catch (pageCountError) {
        if (isPdfPasswordError(pageCountError)) {
          const hasPassword = typeof pdfPassword === 'string' && pdfPassword.trim().length > 0;
          return new Response(
            JSON.stringify({
              error: hasPassword ? 'INVALID_PASSWORD' : 'PASSWORD_REQUIRED',
              message: hasPassword
                ? 'Incorrect password. Please try again.'
                : 'This PDF is password protected. Please enter the password to continue.',
              requiresPassword: true,
              status: hasPassword ? 'invalid_password' : 'password_required',
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
        console.warn('Failed to detect total PDF pages from bytes:', pageCountError);
      }
    }

    if (isPdf && pageCount > GLOBAL_PDF_PAGE_CAP) {
      return new Response(
        JSON.stringify({
          code: 'PAGE_LIMIT_EXCEEDED',
          message: `Maximum ${GLOBAL_PDF_PAGE_CAP} pages allowed per document.`,
          error: `Maximum ${GLOBAL_PDF_PAGE_CAP} pages allowed per document.`,
        }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const useChunkMode = isPdf && bytes.length > 0 && pageCount > CHUNK_THRESHOLD;
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
      fileSource,
      fileSizeBytes: bytes.length,
      pageCount,
      isPdf,
      hasPdfPageImages,
      chunkMode: useChunkMode,
      chunkSize: useChunkMode ? CHUNK_SIZE : undefined,
    };
    traceLog('upload_metrics', {
      fileSizeBytes: bytes.length,
      pageCount,
      isPdf,
      hasPdfPageImages,
      chunkMode: useChunkMode,
    });

    // ============= USAGE LIMITS ENFORCEMENT =============
    // Shared limit resolver (single source of truth with check-usage-limit)
    const traceSkipLimits = (Deno.env.get('TRACE_SKIP_LIMITS') ?? '').trim().toLowerCase() === 'true';
    let limitState;
    if (traceSkipLimits) {
      traceLog('trace_skip_limits_enabled', { mode: 'debug', reason: 'TRACE_SKIP_LIMITS=true' });
      limitState = {
        conversionsUsed: 0,
        conversionsLimit: 999999,
        remaining: 999999,
        limitReached: false,
        isAuthenticated: !!user,
        planType: user ? 'unlimited' : 'free',
        isAdmin: !!user,
        isOwner: false,
        isUnlimited: true,
      };
    } else {
      try {
        limitState = await resolveEffectiveLimit({
          supabaseAdmin: supabaseAdminClient as unknown as SupabaseLike,
          user,
          trackingKey,
          timezone: userTimezone,
        });
      } catch (limitError) {
        console.error('Failed to resolve effective limit:', limitError);
        limitState = {
          conversionsUsed: 0,
          conversionsLimit: user ? 5 : 2,
          remaining: user ? 5 : 2,
          limitReached: false,
          isAuthenticated: !!user,
          planType: 'free',
          isAdmin: false,
          isOwner: false,
          isUnlimited: false,
        };
      }
    }

    const conversionsUsed = limitState.conversionsUsed;
    const conversionsLimit = limitState.conversionsLimit;
    const userPlanType = limitState.planType;
    const hasUnlimitedAccess = limitState.isUnlimited;

    console.log('Usage info:', {
      conversionsUsed,
      conversionsLimit,
      user: !!user,
      planType: userPlanType,
      isUnlimited: hasUnlimitedAccess,
    });

    const normalizedPlanType = userPlanType.toLowerCase();
    const isPerPagePlan = normalizedPlanType.startsWith('per_page');
    const isUnlimitedPlan = normalizedPlanType === 'unlimited' && conversionsLimit >= 900000;
    const isPaidPlan = !!user && (isPerPagePlan || isUnlimitedPlan);
    const isFreeMode = !isPaidPlan;
    const underwritingTier = resolveUnderwritingTier(userPlanType, false);
    const remainingQuota = Math.max(0, conversionsLimit - conversionsUsed);

    // Free mode: one file = one conversion, plus a 15-page per-file PDF cap.
    if (!hasUnlimitedAccess && isFreeMode && isPdf && pageCount > FREE_MAX_PDF_PAGES_PER_FILE) {
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
    if (!hasUnlimitedAccess) {
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

    const conversion = null;

    // ============= LAYER 1: SMART DOCUMENT ROUTER =============
    console.log('Starting multi-layered AI conversion for:', fileName);

    let extractedText = '';
    let rawTransactions: RawTransaction[] = [];

    // ============= LAYER 2: INTELLIGENT PROCESSING ROUTER =============
    let serverParsedTransactions: RawTransaction[] = [];
    if (
      isPdf &&
      bytes.length > 0
    ) {
      try {
        const textStart = Date.now();
        const serverParsed = await extractDeterministicPdfTransactions({
          bytes,
          password: pdfPassword,
          totalPages: pageCount,
          useChunkMode,
          pdfDocument: sharedPdf ?? undefined,
        });
        timing.text_extract_ms += Date.now() - textStart;
        if (serverParsed.text) extractedText = serverParsed.text;
        serverParsedTransactions = serverParsed.transactions;
        if (serverParsedTransactions.length > 0) {
          console.log(`Server text parse extracted ${serverParsedTransactions.length} transactions.`);
        }
        pipelineDiagnostics.deterministicChunking = {
          ok: true,
          enabled: serverParsed.chunked,
          chunkSize: serverParsed.chunked ? CHUNK_SIZE : undefined,
          chunksProcessed: serverParsed.chunksProcessed,
          totalPages: pageCount,
          extractedRows: serverParsedTransactions.length,
        };
      } catch (error) {
        if (isPdfPasswordError(error)) {
          const hasPassword = typeof pdfPassword === 'string' && pdfPassword.trim().length > 0;
          return new Response(
            JSON.stringify({
              error: hasPassword ? 'INVALID_PASSWORD' : 'PASSWORD_REQUIRED',
              message: hasPassword
                ? 'Incorrect password. Please try again.'
                : 'This PDF is password protected. Please enter the password to continue.',
              requiresPassword: true,
              status: hasPassword ? 'invalid_password' : 'password_required',
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
        console.error('Server text extraction failed:', error);
        pipelineDiagnostics.deterministicChunking = {
          ok: false,
          enabled: useChunkMode,
          chunkSize: useChunkMode ? CHUNK_SIZE : undefined,
          totalPages: pageCount,
          error: sanitizeError(error),
        };
      }
    }

    const rawTextLength = extractedText.length;
    const charsPerPage = pageCount > 0 ? Number((rawTextLength / pageCount).toFixed(2)) : rawTextLength;
    const printableRatio = computePrintableRatio(extractedText);
    const structuralScan = runStructuralScan({
      isPdf,
      fileName,
      bytes,
      pageCount,
      extractedText,
    });
    const classification = classifyDocument(extractedText, bytes, fileName, {
      rawTextLength,
      charsPerPage,
      selectableTextDetected: structuralScan.hasSelectableText,
    });
    traceLog('raw_text_metrics', {
      rawTextLength,
      charsPerPage,
      selectableTextDetected: structuralScan.hasSelectableText,
      printableRatio,
    });
    pipelineDiagnostics.structuralScan = {
      ok: true,
      classification,
      printableRatio,
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
    const parsedTransactionsInput = Array.isArray(serverParsedTransactions) && serverParsedTransactions.length > 0
      ? serverParsedTransactions
      : (Array.isArray(pdfParsedTransactions) ? pdfParsedTransactions : []);
    if (Array.isArray(serverParsedTransactions) && serverParsedTransactions.length > 0) {
      console.log(
        `Using server deterministic rows as primary source (${serverParsedTransactions.length})` +
          `${Array.isArray(pdfParsedTransactions) ? ` over client rows (${pdfParsedTransactions.length})` : ''}.`,
      );
    }
    const deterministicStart = Date.now();
    const normalizedParsedTransactions: RawTransaction[] = Array.isArray(parsedTransactionsInput)
      ? normalizeRawTransactions(parsedTransactionsInput)
      : [];
    const totalBeforeNormalization = normalizedParsedTransactions.length;
    const clientParsedTransactions: RawTransaction[] = normalizedParsedTransactions.filter((transaction, index) => {
      const hasDate = typeof transaction.date === 'string' && transaction.date.trim() && transaction.date !== 'Unknown';
      const hasDescription = typeof transaction.description === 'string' && transaction.description.trim().length > 0;
      const hasAmount =
        Number.isFinite(Number(transaction.debit ?? NaN)) ||
        Number.isFinite(Number(transaction.credit ?? NaN)) ||
        Number.isFinite(Number(transaction.balance ?? NaN));
      const keep = hasDate && hasDescription && hasAmount;
      if (!keep) {
        const reason = !hasDate
          ? "invalid_date"
          : (!hasAmount ? "no_amount" : "normalization_reject");
        console.log("[ROW_DROP]", {
          reason,
          lineNumber: index + 1,
          rawLine: transaction.description ?? "",
        });
      }
      return keep;
    });
    console.log("[ROW_COUNT]", {
      stage: "normalization_filter",
      totalBefore: totalBeforeNormalization,
      totalAfter: clientParsedTransactions.length,
    });
    traceLog('deterministic_rows_extracted', {
      count: clientParsedTransactions.length,
    });
    const clientParsedBankMetadata = normalizeClientBankMetadata(pdfParsedBankMetadata);
    const clientPdfParseAssessment = assessClientPdfParsedTransactions(clientParsedTransactions, pageCount);
    const deterministicCoverageGap = detectStatementCoverageGap(
      clientParsedTransactions,
      clientParsedBankMetadata?.statementPeriod,
      pageCount,
    );
    const deterministicTextDocument = isPdf && clientParsedTransactions.length > 0;
    const selectableTextDocument =
      isPdf && (structuralScan.hasSelectableText === true || deterministicTextDocument);
    const strongTextPdf =
      isPdf &&
      (
        structuralScan.pdfType === 'TEXT' ||
        structuralScan.hasStrongSelectableText === true
      );
    const forceOcrForIncompleteTextExtraction =
      isPdf &&
      hasPdfPageImages &&
      deterministicCoverageGap.hasGap &&
      !strongTextPdf &&
      !selectableTextDocument;
    timing.deterministic_parse_ms = Date.now() - deterministicStart;
    const mustUseDeterministicClientPdf =
      isPdf && !hasPdfPageImages && clientParsedTransactions.length > 0;
    const forceOcrForDenseStatement = selectableTextDocument || strongTextPdf
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
    const computeConfidenceBreakdownTimed = (payload: {
      rows: RawTransaction[];
      sourceText: string;
      bankId: string;
      headerConfidenceHint: number;
    }): ConfidenceBreakdown => {
      const startedAt = Date.now();
      const result = computeConfidenceBreakdown(payload);
      timing.confidence_ms += Date.now() - startedAt;
      return result;
    };
    const bankDetection = pickBankBySignals({
      fileName,
      extractedText,
    });
    pipelineDiagnostics.bankDetection = {
      ok: true,
      bankId: bankDetection.bankId,
      detectionConfidence: bankDetection.detectionConfidence,
      signals: bankDetection.signals,
    };
    const selectedBankId = bankDetection.bankId;
    const deterministicConfidenceBreakdown = computeConfidenceBreakdownTimed({
      rows: clientParsedTransactions,
      sourceText: extractedText,
      bankId: selectedBankId,
      headerConfidenceHint: bankDetection.detectionConfidence,
    });
    traceLog('confidence_breakdown', {
      score: deterministicConfidenceBreakdown.score,
      parseSuccessRatio: deterministicConfidenceBreakdown.parseSuccessRatio,
      dateContinuityScore: deterministicConfidenceBreakdown.dateContinuityScore,
      balanceValidationScore: deterministicConfidenceBreakdown.balanceValidationScore,
      headerMatchScore: deterministicConfidenceBreakdown.headerMatchScore,
      columnAlignmentScore: deterministicConfidenceBreakdown.columnAlignmentScore,
      errorFlags: deterministicConfidenceBreakdown.errorFlags,
    });
    const internalGateConfidence = deterministicConfidenceBreakdown.score;
    const deterministicConfidenceHigh = internalGateConfidence >= DETERMINISTIC_CONFIDENCE_THRESHOLD;
    const selectableTextDeterministicFastPath =
      isPdf &&
      structuralScan.hasSelectableText &&
      clientParsedTransactions.length >= Math.max(4, Math.min(10, pageCount)) &&
      deterministicConfidenceBreakdown.parseSuccessRatio >= 0.65 &&
      deterministicConfidenceBreakdown.dateContinuityScore >= 0.5 &&
      deterministicConfidenceBreakdown.columnAlignmentScore >= 0.6 &&
      clientPdfParseAssessment.mismatchRatio <= 0.65 &&
      !forceOcrForIncompleteTextExtraction;
    const preferDeterministicFastPath =
      PDF_DETERMINISTIC_FAST_PATH_ENABLED &&
      isPdf &&
      clientParsedTransactions.length >= PDF_DETERMINISTIC_FAST_PATH_MIN_ROWS &&
      clientPdfParseAssessment.mismatchRatio <= PDF_DETERMINISTIC_FAST_PATH_MAX_MISMATCH &&
      !forceOcrForIncompleteTextExtraction;
    const forceOcrForLargeDocument =
      isPdf &&
      pageCount >= FULL_PAGE_OCR_COVERAGE_THRESHOLD &&
      !strongTextPdf &&
      !selectableTextDocument;
    const hardTextGateActive =
      isPdf &&
      (selectableTextDocument || strongTextPdf) &&
      clientParsedTransactions.length > 0 &&
      !forceOcrForLargeDocument &&
      !forceOcrForIncompleteTextExtraction &&
      !forceOcrForDenseStatement;
    const forceDeterministicForSelectableText =
      isPdf &&
      (structuralScan.hasSelectableText === true || strongTextPdf) &&
      clientParsedTransactions.length > 0 &&
      !forceOcrForLargeDocument &&
      !forceOcrForIncompleteTextExtraction;
    const disallowOcrForTextPdf =
      isPdf &&
      (strongTextPdf || (structuralScan.hasSelectableText === true && clientParsedTransactions.length > 0));
    let skipOCR = false;
    if (hardTextGateActive || forceDeterministicForSelectableText || disallowOcrForTextPdf) {
      console.log('HARD TEXT GATE ACTIVATED - SKIPPING OCR');
      skipOCR = true;
    }
    console.log(
      `Adaptive OCR strategy: level=${adaptiveOcrStrategy.level}, strict=${adaptiveOcrStrategy.strictMode}:${adaptiveOcrStrategy.strictMaxPages}, ` +
      `dual=${adaptiveOcrStrategy.dualMode}:${adaptiveOcrStrategy.dualMaxPages}, reasons=${adaptiveOcrStrategy.reasons.join('|') || 'none'}`,
    );
    if (clientParsedTransactions.length > 0) {
      console.log(
        `Deterministic confidence=${internalGateConfidence.toFixed(3)} (parse=${deterministicConfidenceBreakdown.parseSuccessRatio.toFixed(3)}, date=${deterministicConfidenceBreakdown.dateContinuityScore.toFixed(3)}, balance=${deterministicConfidenceBreakdown.balanceValidationScore.toFixed(3)}).`,
      );
    }
    pipelineDiagnostics.confidenceScoring = {
      ok: true,
      deterministic: deterministicConfidenceBreakdown,
      threshold: DETERMINISTIC_CONFIDENCE_THRESHOLD,
    };
    const canUseDeterministicClientPdf =
      skipOCR ||
      (
        isPdf &&
        clientParsedTransactions.length > 0 &&
        (
          deterministicConfidenceHigh ||
          selectableTextDeterministicFastPath ||
          clientPdfParseAssessment.useDeterministic ||
          (mustUseDeterministicClientPdf && !hasPdfPageImages) ||
          (preferDeterministicFastPath && deterministicConfidenceHigh)
        ) &&
        (
          deterministicConfidenceHigh ||
          selectableTextDeterministicFastPath ||
          !forceOcrForDenseStatement ||
          (mustUseDeterministicClientPdf && !hasPdfPageImages)
        ) &&
        !forceOcrForIncompleteTextExtraction &&
        !forceOcrForLargeDocument
      ) ||
      forceDeterministicForSelectableText ||
      disallowOcrForTextPdf;
    const ocrDecisionLineRef =
      "supabase/functions/convert-document/index.ts:3282 (if canUseDeterministicClientPdf) / :3301 (else if isPdf && hasPdfPageImages => OCR)";
    const ocrFailedConditions: string[] = [];
    if (!canUseDeterministicClientPdf) {
      if (clientParsedTransactions.length <= 0) ocrFailedConditions.push('deterministic_rows_missing');
      if (!deterministicConfidenceHigh) ocrFailedConditions.push('deterministic_confidence_below_threshold');
      if (!selectableTextDeterministicFastPath) ocrFailedConditions.push('selectable_text_fast_path_not_met');
      if (!clientPdfParseAssessment.useDeterministic) ocrFailedConditions.push('assessment_useDeterministic_false');
      if (forceOcrForDenseStatement) ocrFailedConditions.push('force_ocr_for_dense_statement_true');
      if (forceOcrForIncompleteTextExtraction) {
        ocrFailedConditions.push(
          `statement_coverage_gap:${deterministicCoverageGap.reasons.join('|') || 'unknown'}`,
        );
      }
      if (mustUseDeterministicClientPdf && hasPdfPageImages) {
        ocrFailedConditions.push('must_use_deterministic_condition_not_applicable_with_page_images');
      }
      if (!hasPdfPageImages) ocrFailedConditions.push('pdf_page_images_not_provided');
    } else if (hardTextGateActive) {
      ocrFailedConditions.push('hard_text_gate_override');
    }
    const ocrTriggerReason =
      ocrFailedConditions.length > 0
        ? ocrFailedConditions.join(' | ')
        : 'deterministic_gate_false';
    traceLog('ocr_decision_gate', {
      reason: ocrTriggerReason,
      failedConditions: ocrFailedConditions,
      decisionLine: ocrDecisionLineRef,
      confidence: internalGateConfidence,
      threshold: DETERMINISTIC_CONFIDENCE_THRESHOLD,
    });
    let processedVia: 'deterministic' | 'ocr' | 'ai_rescue' = 'ocr';
    // UI-facing confidence can differ from internal gate confidence.
    let finalConfidenceScore = internalGateConfidence;
    const finalErrorFlags = [...deterministicConfidenceBreakdown.errorFlags];
    let aiUsed = false;
    pipelineDiagnostics.decisionGate = {
      ok: true,
      internalGateConfidence,
      confidenceScore: internalGateConfidence,
      threshold: DETERMINISTIC_CONFIDENCE_THRESHOLD,
      skipOcr: canUseDeterministicClientPdf,
      forceDeterministicForSelectableText,
      disallowOcrForTextPdf,
    };

    if (preferDeterministicFastPath && !clientPdfParseAssessment.useDeterministic) {
      console.log(
        `Deterministic fast-path override enabled (${clientParsedTransactions.length} rows, mismatch=${clientPdfParseAssessment.mismatchRatio.toFixed(3)}).`,
      );
    }
    if (selectableTextDeterministicFastPath && !deterministicConfidenceHigh) {
      console.log(
        `Selectable-text deterministic fast-path enabled (${clientParsedTransactions.length} rows, parse=${deterministicConfidenceBreakdown.parseSuccessRatio.toFixed(3)}, mismatch=${clientPdfParseAssessment.mismatchRatio.toFixed(3)}).`,
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
          `(confidence=${internalGateConfidence.toFixed(3)}, mismatch=${clientPdfParseAssessment.mismatchRatio.toFixed(3)}, anomaly=${clientPdfParseAssessment.anomalyRate.toFixed(3)}, dense=${forceOcrForDenseStatement})`,
      );
    }

    if (
      isPdf &&
      hasPdfPageImages &&
      !canUseDeterministicClientPdf &&
      !hasUnlimitedAccess &&
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
    let selectedOcrPages: Array<{ pageNumber: number; imageDataUrl: string }> = Array.isArray(pdfPageImages)
      ? (pdfPageImages as string[]).map((imageDataUrl, index) => ({ pageNumber: index + 1, imageDataUrl }))
      : [];

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
        extractedText,
      };
      processedVia = 'deterministic';
      pagesWithData = Math.max(1, pageCount);
      pipelineDiagnostics.ocrStage = {
        ok: true,
        skipped: true,
        reason: 'deterministic_confidence_high',
      };
    } else if (isPdf && hasPdfPageImages && !disallowOcrForTextPdf) {
      console.log("OCR TRIGGERED BECAUSE:", ocrTriggerReason);
      traceLog('ocr_trigger_detail', {
        reason: ocrTriggerReason,
        failedConditions: ocrFailedConditions,
        decisionLine: ocrDecisionLineRef,
      });
      // Build a minimal status object consistent with ai-orchestrator
      const status: AIProcessingStatus = {
        groqVision: { used: true, success: false },
        mistral: { used: false, success: false },
        groqText: { used: false, success: false },
        patternFallback: { used: false, success: false },
      };

      const errors: string[] = [];
      const ocrProvidersFailedDetails: string[] = [];
      const start = Date.now();
      const collected: RawTransaction[] = [];
      pagesWithData = 0;
      let combinedText = '';
      let strictRetryCount = 0;
      let dualProviderCount = 0;
      const effectiveStrictMode = OCR_SINGLE_PASS_ONLY ? 'off' : adaptiveOcrStrategy.strictMode;
      const effectiveStrictMaxPages = OCR_SINGLE_PASS_ONLY ? 0 : Math.min(1, adaptiveOcrStrategy.strictMaxPages);
      // Lean mode: single OCR provider only.
      const effectiveDualMode: DualOcrMode = 'off';
      const effectiveDualMaxPages = 0;
      const useStrictFirstPass = !OCR_SINGLE_PASS_ONLY &&
        (adaptiveOcrStrategy.strictFirstPass || !structuralScan.hasSelectableText);

      if (!structuralScan.hasSelectableText && hasPdfPageImages) {
        pipelineDiagnostics.ocrStage = {
          ok: true,
          skipped: false,
          totalProvidedPages: selectedOcrPages.length,
          selectedPages: selectedOcrPages.map((entry) => entry.pageNumber),
          selectionReasons: ['image_only_structural_scan'],
          pageDiagnostics: [],
        };
        console.log(`Skipping selective OCR page plan (image-only document): using all ${selectedOcrPages.length} page(s).`);
      } else {
        try {
          const ocrPagePlan = await buildSelectiveOcrPagePlan({
            bytes,
            password: pdfPassword,
            totalPages: pageCount,
            pageImages: pdfPageImages as string[],
            pdfDocument: sharedPdf ?? undefined,
          });
          selectedOcrPages = ocrPagePlan.selected;
          pipelineDiagnostics.ocrStage = {
            ok: true,
            skipped: false,
            totalProvidedPages: ocrPagePlan.totalProvidedPages,
            selectedPages: selectedOcrPages.map((entry) => entry.pageNumber),
            selectionReasons: ocrPagePlan.reasons,
            pageDiagnostics: ocrPagePlan.pageDiagnostics,
          };
          console.log(
            `Selective OCR plan: selected ${selectedOcrPages.length}/${ocrPagePlan.totalProvidedPages} page(s)`,
          );
        } catch (planError) {
          console.error('Selective OCR page planning failed, falling back to all provided pages:', planError);
        }
      }

      // Process OCR pages in concurrency-limited batches to handle 100+ page PDFs
      // within the 5-minute timeout while avoiding API rate limits.
      const processOcrPage = async (pageEntry: { pageNumber: number; imageDataUrl: string }, index: number) => {
          const img = pageEntry.imageDataUrl;
          if (typeof img !== 'string') {
            return { pageResult: null as OCRResult | null, error: 'Invalid OCR page image payload', strictUsed: false, dualUsed: false, providersFailed: false };
          }

          const match = img.match(/^data:([^;]+);base64,(.+)$/);
          if (!match) {
            return { pageResult: null as OCRResult | null, error: 'Invalid OCR page image encoding', strictUsed: false, dualUsed: false, providersFailed: false };
          }

          const pageMime = match[1];
          const pageBase64 = match[2];
          let pageResult: OCRResult | null = null;
          let strictUsed = false;
          let dualUsed = false;
          let providersFailed = false;
          let groqFailureReason: string | null = null;
          try {
            let groqResult: OCRResult | null = null;
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
                if (groqNeedsMistralPass) {
                  console.log(
                    `Mistral OCR fallback used for low-quality Groq page result (page ${pageEntry.pageNumber}).`,
                  );
                }
              } else {
                if (groqHasRows && groqResult) {
                  pageResult = groqResult;
                  return { pageResult, error: null, strictUsed, dualUsed, providersFailed };
                } else {
                  providersFailed = true;
                  const failureParts = [
                    groqFailureReason || 'Groq returned empty OCR result',
                    mistralFailureReason || 'Mistral returned empty OCR result',
                  ];
                  return {
                    pageResult: null as OCRResult | null,
                    error: `OCR_PROVIDERS_FAILED: page ${pageEntry.pageNumber} (${failureParts.join(' | ')})`,
                    strictUsed,
                    dualUsed: true,
                    providersFailed,
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
              const chosenResult = chooseBetterVisionResult(pageResult, strictResult);
              if (chosenResult !== pageResult) {
                console.log('Using strict-table OCR pass for a PDF page (better extraction quality).');
                pageResult = chosenResult;
              }
            }

            return { pageResult, error: null, strictUsed, dualUsed, providersFailed };
          } catch (pageError) {
            return {
              pageResult: null as OCRResult | null,
              error: pageError instanceof Error ? pageError.message : 'OCR page processing failed',
              strictUsed,
              dualUsed,
              providersFailed,
            };
          }
      };

      // Batch OCR processing with concurrency limit to prevent API overload
      type OcrPageResult = Awaited<ReturnType<typeof processOcrPage>>;
      const ocrPageResults: OcrPageResult[] = [];
      for (let batchStart = 0; batchStart < selectedOcrPages.length; batchStart += OCR_CONCURRENCY_BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + OCR_CONCURRENCY_BATCH_SIZE, selectedOcrPages.length);
        const batchEntries = selectedOcrPages.slice(batchStart, batchEnd);
        const batchResults = await Promise.all(
          batchEntries.map((entry, batchIdx) => processOcrPage(entry, batchStart + batchIdx)),
        );
        ocrPageResults.push(...batchResults);
        if (batchEnd < selectedOcrPages.length) {
          console.log(`OCR batch ${Math.floor(batchStart / OCR_CONCURRENCY_BATCH_SIZE) + 1} complete (${batchEnd}/${selectedOcrPages.length} pages)`);
        }
      }

      for (const pageOutcome of ocrPageResults) {
        if (pageOutcome.strictUsed) strictRetryCount += 1;
        if (pageOutcome.dualUsed) dualProviderCount += 1;
        if (pageOutcome.error) {
          errors.push(pageOutcome.error);
          if (pageOutcome.providersFailed) {
            ocrProvidersFailedDetails.push(pageOutcome.error);
          }
          continue;
        }

        const pageResult = pageOutcome.pageResult;
        if (pageResult && pageResult.success && pageResult.transactions && pageResult.transactions.length > 0) {
          pagesWithData += 1;
          collected.push(...pageResult.transactions);
          if (pageResult.text) combinedText += (combinedText ? '\n' : '') + pageResult.text;
          if (pageResult.bankMetadata) {
            collectedBankMetadata = mergeBankMetadata(collectedBankMetadata, pageResult.bankMetadata);
            console.log('Bank metadata detected:', collectedBankMetadata);
          }
        } else {
          errors.push(pageResult?.error || 'No data extracted');
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

      if (
        collected.length === 0 &&
        ocrProvidersFailedDetails.length > 0 &&
        deterministicDataset.length === 0
      ) {
        return new Response(
          JSON.stringify({
            error: 'OCR_PROVIDERS_FAILED',
            code: 'OCR_PROVIDERS_FAILED',
            message: 'Both OCR providers failed to extract data from this document.',
            details: ocrProvidersFailedDetails,
          }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      extractionResult = {
        transactions: collected,
        status,
        extractedText: combinedText,
        bankMetadata: collectedBankMetadata,
      };
      ocrDataset = collected.map((row) => ({ ...row }));
      pipelineDiagnostics.ocrStage = {
        ...(pipelineDiagnostics.ocrStage || { ok: true, skipped: false }),
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
      } else if (collected.length === 0 && structuralScan.hasSelectableText) {
        console.log('OCR failed on selectable-text PDF; forcing deterministic-only fallback.');
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
      const base64Data = toBase64FromBytes(bytes);

      const mimeType = isPdf ? 'application/pdf' :
        lowerFileName.endsWith('.png') ? 'image/png' : 'image/jpeg';

      if (isPdf) {
        if (disallowOcrForTextPdf) {
          extractionResult = {
            transactions: clientParsedTransactions,
            status: {
              groqVision: { used: false, success: false },
              mistral: { used: false, success: false },
              groqText: { used: false, success: false },
              patternFallback: { used: false, success: false },
            },
            extractedText,
            bankMetadata: collectedBankMetadata,
          };
          processedVia = 'deterministic';
          pagesWithData = Math.max(1, pageCount);
          pipelineDiagnostics.ocrStage = {
            ok: true,
            skipped: true,
            reason: 'text_pdf_ocr_disabled',
          };
        } else {
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
      }

      if (!isPdf) {
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
    }

    // Stage 6b: auto reprocess low-confidence rows (strict OCR) only when needed.
    if (
      ENABLE_STAGE_6B_AUTO_REPROCESS &&
      isPdf &&
      hasPdfPageImages &&
      !OCR_SINGLE_PASS_ONLY &&
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
        for (const pageEntry of selectedOcrPages) {
          const img = pageEntry.imageDataUrl;
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

    const deterministicReconcileConfidence = computeConfidenceBreakdownTimed({
      rows: deterministicDataset,
      sourceText: extractedText,
      bankId: selectedBankId,
      headerConfidenceHint: bankDetection.detectionConfidence,
    });
    const ocrReconcileConfidence = computeConfidenceBreakdownTimed({
      rows: ocrDataset.length > 0 ? ocrDataset : extractionResult.transactions,
      sourceText: extractionResult.extractedText || extractedText,
      bankId: selectedBankId,
      headerConfidenceHint: bankDetection.detectionConfidence,
    });

    rawTransactions = extractionResult.transactions;
    extractedText = extractionResult.extractedText || '';

    if (deterministicDataset.length > 0 && ocrDataset.length > 0) {
      const mergedDataset = mergeOcrTransactionsDeterministic(deterministicDataset, ocrDataset);
      const mergedConfidence = computeConfidenceBreakdownTimed({
        rows: mergedDataset,
        sourceText: extractionResult.extractedText || extractedText,
        bankId: selectedBankId,
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

    const textPdfZeroAiMode =
      isPdf &&
      structuralScan.hasSelectableText === true;

    const shouldAttemptAiRescue =
      !textPdfZeroAiMode &&
      AI_RESCUE_ENABLED &&
      processedVia !== 'deterministic' &&
      extractedText &&
      rawTransactions.length > 0 &&
      rawTransactions.length <= AI_RESCUE_MAX_ROWS &&
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
          const rescueConfidence = computeConfidenceBreakdownTimed({
            rows: rescueRows,
            sourceText: minimalStructuredLines,
            bankId: selectedBankId,
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

    const ocrTextBankMetadata = extractBankMetadataFromOcrText(extractedText);

    // Log extraction status
    console.log(generateStatusReport(extractionResult.status));

    if (
      (!rawTransactions || rawTransactions.length === 0) &&
      structuralScan.hasSelectableText &&
      deterministicDataset.length > 0
    ) {
      console.log(
        `Safe fallback activated after OCR failure on selectable-text PDF (${deterministicDataset.length} deterministic rows).`,
      );
      rawTransactions = deterministicDataset.map((row) => ({ ...row }));
      processedVia = 'deterministic';
    }

    if ((!rawTransactions || rawTransactions.length === 0) && extractedText.trim().length > 0) {
      const zeroRowRescueReason = 'zero_row_text_rescue';
      const minimalStructuredLines = buildMinimalStructuredLines(extractedText);
      if (minimalStructuredLines.length >= AI_RESCUE_MIN_TEXT_CHARS) {
        console.log(`AI rescue triggered (${zeroRowRescueReason}).`);
        const rescueStart = Date.now();
        extractionResult.status.groqText.used = true;
        const rescueResult = await attemptGroqTextRescue(minimalStructuredLines);
        const rescueDuration = Date.now() - rescueStart;
        extractionResult.status.groqText.time = rescueDuration;
        timing.ai_ms += rescueDuration;
        aiUsed = true;

        if (rescueResult.rows && rescueResult.rows.length > 0) {
          rawTransactions = rescueResult.rows;
          processedVia = 'ai_rescue';
          pagesWithData = Math.max(1, pagesWithData);
          finalConfidenceScore = computeConfidenceBreakdownTimed({
            rows: rescueResult.rows,
            sourceText: minimalStructuredLines,
            bankId: selectedBankId,
            headerConfidenceHint: bankDetection.detectionConfidence,
          }).score;
          extractionResult.status.groqText.success = true;
          pipelineDiagnostics.aiRescue = {
            ok: true,
            used: true,
            reason: zeroRowRescueReason,
            tokenUsage: rescueResult.tokenUsage,
            rescueConfidence: rescueResult.rescueConfidence,
            finalConfidenceScore,
          };
          console.log(`AI rescue accepted (${rescueResult.rows.length} rows).`);
        } else {
          extractionResult.status.groqText.success = false;
          extractionResult.status.groqText.error = 'AI rescue returned no rows';
          pipelineDiagnostics.aiRescue = {
            ok: false,
            used: true,
            reason: zeroRowRescueReason,
            tokenUsage: rescueResult.tokenUsage,
            rescueConfidence: rescueResult.rescueConfidence,
            error: 'no_rows',
          };
        }
      }
    }

    if (!rawTransactions || rawTransactions.length === 0) {
      // Generate error report for debugging
      const errorDetails = [];
      const status = extractionResult.status;

      if (status.groqVision.used && !status.groqVision.success) {
        errorDetails.push(`Groq Vision: ${status.groqVision.error}`);
      }
      if (status.mistral.used && !status.mistral.success) {
        errorDetails.push(`Mistral: ${status.mistral.error}`);
      }
      if (status.groqText.used && !status.groqText.success) {
        errorDetails.push(`Groq Text: ${status.groqText.error}`);
      }

      console.error('All AI services failed:', errorDetails.join(' | '));
      throw new Error(`No transactions found. AI Status: ${errorDetails.join(' | ')}`);
    }

    // Paid mode is page-based and charges only pages that actually contain data.
    if (!hasUnlimitedAccess && isPaidPlan) {
      const pagesToCharge = Math.max(1, pagesWithData);
      if ((conversionsUsed + pagesToCharge) > conversionsLimit) {
        const remainingPages = Math.max(0, conversionsLimit - conversionsUsed);
        const periodLabel = isPerPagePlan ? 'pack' : 'plan';
        const errorMessage = `This file has data on ${pagesToCharge} page${pagesToCharge === 1 ? '' : 's'}, but only ${remainingPages} page${remainingPages === 1 ? '' : 's'} remain in your ${periodLabel}.`;

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

    // ============= LAYER 3: CATEGORIZATION =============
    // For text-based PDFs, keep categorization pure code (pattern fallback) with zero AI.
    console.log('=== Starting Categorization ===');
    const categorizationResult = textPdfZeroAiMode
      ? {
          transactions: fallbackCategorize(rawTransactions),
          status: {
            ...extractionResult.status,
            mistral: { used: false, success: false },
            groqText: { used: false, success: false },
            patternFallback: { used: true, success: true },
          },
        }
      : await performCategorization(rawTransactions, extractionResult.status);
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
      ocrTextBankMetadata,
      collectedBankMetadata,
      extractionResult.bankMetadata,
      clientParsedBankMetadata,
    );
    let transactions = sanitizeTransactions(extractedTransactions, {
      openingBalance: provisionalBankInfo?.openingBalance,
      closingBalance: provisionalBankInfo?.closingBalance,
      preserveAmounts: selectableTextDocument || processedVia === 'deterministic',
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
        corrections.forEach((c: { description_pattern?: unknown; corrected_category?: unknown }) => {
          if (typeof c.description_pattern !== 'string' || typeof c.corrected_category !== 'string') {
            return;
          }
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

    // ============= LAYER 5: STANDARDIZED EXPORT ORCHESTRATION =============
    console.log('Starting standardized export orchestration...');

    // Use minor-unit math for exact debit/credit totals (no float drift).
    const totalCreditsMinor = sumMinorUnits(transactions.map((t) => t.credit || 0));
    const totalDebitsMinor = sumMinorUnits(transactions.map((t) => t.debit || 0));
    const totalCredits = fromMinorUnits(totalCreditsMinor);
    const totalDebits = fromMinorUnits(totalDebitsMinor);
    const netFlow = fromMinorUnits(totalCreditsMinor - totalDebitsMinor);

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

    const underwritingAnalysis = buildUnderwritingPayload(underwritingResult, underwritingTier);
    const riskAnalysis = {
      integrityScore,
      balanceMismatches: reconciliation.mismatches.length,
      averageDailyBalance: liquidityMetrics.avgBalance,
      maxDip: { amount: liquidityMetrics.minBalance, date: liquidityMetrics.maxDipDate },
      maxPeak: liquidityMetrics.maxBalance,
      riskFlags: riskTransactions.map((r) => ({ type: r.type, count: r.indices.length })),
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
    const outputStart = Date.now();
    const inferredMashreqBankInfo = extractMashreqMetadataFromText(
      extractionResult.extractedText || extractedText || '',
    );
    const bankInfo = mergeBankMetadata(
      clientParsedBankMetadata,
      ocrTextBankMetadata,
      collectedBankMetadata,
      extractionResult.bankMetadata,
      inferredMashreqBankInfo,
    );
    if (bankInfo) {
      bankInfo.currency = normalizeCurrencyCode(bankInfo.currency);
      const correctedStatementPeriod = chooseStatementPeriodLabel(bankInfo.statementPeriod, transactions);
      if (correctedStatementPeriod) {
        bankInfo.statementPeriod = correctedStatementPeriod;
      }
    }

    let resultPath: string | null = null;
    let downloadUrl: string | null = null;
    let remaining = Math.max(0, conversionsLimit - conversionsUsed);
    const incrementBy = isFreeMode ? 1 : Math.max(1, pagesWithData);
    const creditsBeforeExport = remaining;

    const exportResult = await runStandardizedExportPipeline({
      sessionId: conversion?.id ?? crypto.randomUUID(),
      structuredTransactions: transactions,
      bankId: selectedBankId,
      confidenceScore: finalConfidenceScore,
      parseMode: processedVia,
      fraudAnalysis: riskAnalysis,
      analytics,
      userPlan: userPlanType,
      requestedFormat: normalizedRequestedFormat,
      fraudFlags,
      creditsRemainingBefore: creditsBeforeExport,
      planAllowsFraudOverride: false,
      allowFraudReport: underwritingTier !== 'none',
      allowFoirReport: underwritingTier !== 'none',
      statementReference: conversion?.id ?? undefined,
      bankInfo,
      xlsxContext: {
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
        bankInfo,
      },
      jsonSummary: {
        totalCredits,
        totalDebits,
        netFlow,
      },
      includeCompatibilityBundle: false,
      prepareDownload: async (artifact) => ({
        downloadUrl: null,
        storagePath: null,
        fileSize: artifact.fileBuffer.byteLength,
      }),
      commitExportTransaction: async (payload) => {
        const currentRemaining = Math.max(0, conversionsLimit - conversionsUsed);
        const remainingAfterDebit = Math.max(0, conversionsLimit - conversionsUsed - incrementBy);

        const { error: incrementError } = await (supabaseAdminClient.rpc as any)('increment_usage_count', {
          p_ip_address: user ? undefined : trackingKey,
          p_user_id: user ? user.id : undefined,
          p_increment: incrementBy,
        });
        if (incrementError) {
          return {
            ok: false,
            creditsRemaining: currentRemaining,
            error: `Credit deduction failed: ${incrementError.message}`,
          };
        }

        return {
          ok: true,
          creditsRemaining: remainingAfterDebit,
        };
      },
      auditExport: async (payload) => {
        console.log('EXPORT_AUDIT', {
          ...payload,
          userId: user?.id ?? null,
        });
      },
    });

    if (!exportResult.ok) {
      const status =
        exportResult.error.code === 'EXPORT_CREDITS_EXHAUSTED'
          ? 402
          : exportResult.error.code === 'EXPORT_PLAN_RESTRICTED_FORMAT'
            ? 403
            : 400;
      return new Response(
        JSON.stringify({
          error: exportResult.error.message,
          code: exportResult.error.code,
          details: exportResult.error.details,
          exportMode: 'standardized',
        }),
        { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    transactions = exportResult.transactions;
    remaining = exportResult.creditsRemaining;
    resultPath = exportResult.storagePath;
    downloadUrl = exportResult.downloadUrl;

    const compatibility = exportResult.compatibility;
    const excelArtifact = compatibility.xlsx ?? (exportResult.primary.format === 'xlsx' ? exportResult.primary : undefined);
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

    let excelBase64: string | null = null;
    if (!user || !resultPath) {
      excelBase64 = encodeArtifactToBase64(excelArtifact);
    }

    if (user && conversion) {
      await supabaseAdminClient
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
        } as unknown as DocumentDatabase['public']['Tables']['risk_analysis']['Insert']);

      for (const alert of fraudAlerts) {
        await supabaseAdminClient
          .from('fraud_alerts')
          .insert({
            user_id: user.id,
            conversion_id: conversion.id,
            alert_type: alert.type,
            severity: alert.severity,
            description: alert.description,
            affected_rows: alert.affectedRows,
            metadata: alert.metadata,
          } as DocumentDatabase['public']['Tables']['fraud_alerts']['Insert']);
      }
    }

    pipelineDiagnostics.export = {
      ok: true,
      format: exportResult.format,
      rowCount: exportResult.rowCount,
      fileSize: exportResult.fileSize,
      planName: exportResult.planName,
      creditsRemaining: exportResult.creditsRemaining,
      downloadPrepared: !!exportResult.downloadUrl || !!resultPath || !!excelBase64,
    };

    timing.output_ms += Date.now() - outputStart;

    console.log(`Conversion complete. ${transactions.length} transactions processed.`);
    console.log('=== Final AI Processing Report ===');
    console.log(generateStatusReport(categorizationResult.status));

    const aiStatus = {
      groqVision: categorizationResult.status.groqVision,
      groqText: categorizationResult.status.groqText,
      mistral: categorizationResult.status.mistral,
      patternFallback: categorizationResult.status.patternFallback,
    };

    timing.total_ms = Date.now() - totalStart;
    console.log('Timing summary (ms):', timing);
    traceLog('stage_timing_trace_ms', {
      text_extraction_ms: timing.text_extract_ms,
      deterministic_parse_ms: timing.deterministic_parse_ms,
      confidence_computation_ms: timing.confidence_ms,
      ocr_call_ms: timing.ocr_ms,
      ai_rescue_ms: timing.ai_ms,
      total_ms: timing.total_ms,
    });
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
    return new Response(
      JSON.stringify({
        success: true,
        conversionId: conversion?.id || null,
        resultPath: resultPath,
        downloadUrl: downloadUrl ?? undefined,
        format: exportResult.format,
        rowCount: exportResult.rowCount,
        fileSize: exportResult.fileSize,
        transactions: transactions,
        bankId: selectedBankId,
        confidenceScore: finalConfidenceScore,
        fraudFlags,
        aiUsed: aiUsed || processedVia === 'ai_rescue',
        parseMode: processedVia as ParseMode,
        planName: exportResult.planName,
        creditsRemaining: exportResult.creditsRemaining,
        exportMode: exportResult.exportMode,
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
    timing.total_ms = Date.now() - totalStart;
    traceLog('stage_timing_trace_ms', {
      text_extraction_ms: timing.text_extract_ms,
      deterministic_parse_ms: timing.deterministic_parse_ms,
      confidence_computation_ms: timing.confidence_ms,
      ocr_call_ms: timing.ocr_ms,
      ai_rescue_ms: timing.ai_ms,
      total_ms: timing.total_ms,
      failed: true,
    });
    const errorMessage = sanitizeError(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  } finally {
    if (sharedPdf) {
      try {
        await sharedPdf.destroy?.();
      } catch (destroyError) {
        console.error('Failed to destroy shared PDF document:', destroyError);
      } finally {
        sharedPdf = null;
      }
    }
  }
});
