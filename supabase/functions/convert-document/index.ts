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

const balanceMismatchRatio = (transactions: RawTransaction[] | undefined): number => {
  if (!transactions || transactions.length === 0) return 1;
  const flow = scoreRunningBalanceFlow(transactions);
  return flow.total > 0 ? flow.mismatchRatio : 1;
};

const COMPLEX_BANK_LAYOUT_HINT_REGEX =
  /(adcb|procash|statement of accounts|beneficiary|remitter|swift|debit amount|credit amount|running balance|emirates nbd|emirates islamic|mashreq|wio)/i;
const DENSE_TABLE_BANK_HINT_REGEX =
  /(adcb|procash|statement of accounts|emirates nbd|emirates islamic|mashreq|wio)/i;
const DUAL_PASS_BANK_HINT_REGEX =
  /(adcb|procash|statement of accounts|value date|running balance|debit amount|credit amount|emirates nbd|emirates islamic|mashreq|wio)/i;

const shouldForceOcrForDenseStatement = (
  fileNameLower: string,
  bankMetadata: BankMetadata | undefined,
  transactions: RawTransaction[],
): boolean => {
  const bankHint = `${fileNameLower} ${String(bankMetadata?.bankName || '')}`.toLowerCase();
  if (DENSE_TABLE_BANK_HINT_REGEX.test(bankHint)) return true;
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
  if (COMPLEX_BANK_LAYOUT_HINT_REGEX.test(fileNameLower)) {
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
  const likelyDenseTableBank = DENSE_TABLE_BANK_HINT_REGEX.test(fileNameLower);
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
  const likelyDenseTableBank = DUAL_PASS_BANK_HINT_REGEX.test(bankHints);
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
      const conversionsLimit = toNumber(row.conversions_limit, 5);
      let conversionsUsed = toNumber(row.conversions_used, 0);
      const lastResetDate = toDateString(row.last_reset_date);
      const resetBoundary = getResetBoundary(planType, dateParts);

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

      const nextValue = toNumber((row as Record<string, unknown>).conversions_used, 0) + incrementBy;
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
    const classification = classifyDocument(extractedText, bytes, fileName);
    console.log('Document classification:', classification);

    // ============= SPECIALIZED AI EXTRACTION =============
    // NOTE: Groq Vision models do NOT accept PDFs directly.
    // For PDFs we require the client to send rendered page images (pdfPageImages) to avoid "invalid image data"
    // and to prevent wasting credits on doomed fallbacks.
    console.log('=== Starting Specialized AI Pipeline ===');

    let extractionResult: Awaited<ReturnType<typeof performExtraction>>;
    const clientParsedTransactions: RawTransaction[] = Array.isArray(pdfParsedTransactions)
      ? normalizeRawTransactions(pdfParsedTransactions).filter((transaction) => {
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
    const clientPdfParseAssessment = assessClientPdfParsedTransactions(clientParsedTransactions, pageCount);
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
    console.log(
      `Adaptive OCR strategy: level=${adaptiveOcrStrategy.level}, strict=${adaptiveOcrStrategy.strictMode}:${adaptiveOcrStrategy.strictMaxPages}, ` +
      `dual=${adaptiveOcrStrategy.dualMode}:${adaptiveOcrStrategy.dualMaxPages}, reasons=${adaptiveOcrStrategy.reasons.join('|') || 'none'}`,
    );
    const canUseDeterministicClientPdf =
      isPdf &&
      clientParsedTransactions.length > 0 &&
      clientPdfParseAssessment.useDeterministic &&
      !forceOcrForDenseStatement;

    if (isPdf && clientParsedTransactions.length > 0 && !canUseDeterministicClientPdf) {
      console.log(
        `Ignoring deterministic client PDF rows (${clientParsedTransactions.length}) and falling back to OCR: ${clientPdfParseAssessment.reason} ` +
          `(mismatch=${clientPdfParseAssessment.mismatchRatio.toFixed(3)}, anomaly=${clientPdfParseAssessment.anomalyRate.toFixed(3)}, dense=${forceOcrForDenseStatement})`,
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
      const effectiveStrictMode = adaptiveOcrStrategy.strictMode;
      const effectiveStrictMaxPages = adaptiveOcrStrategy.strictMaxPages;
      const effectiveDualMode = adaptiveOcrStrategy.dualMode;
      const effectiveDualMaxPages = adaptiveOcrStrategy.dualMaxPages;
      const useStrictFirstPass = OCR_WORKER_MODE !== 'primary' && adaptiveOcrStrategy.strictFirstPass;

      for (const img of pdfPageImages as string[]) {
        if (typeof img !== 'string') continue;
        const match = img.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) continue;
        const pageMime = match[1];
        const pageBase64 = match[2];
        let pageResult: OCRResult | null = null;

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
        return new Response(
          JSON.stringify({
            error: 'PDF requires page images for processing. Please retry (the app will render pages) or upload JPG/PNG.',
            requiresPageImages: true,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      extractionResult = await performExtraction(base64Data, mimeType, extractedText);
    }

    rawTransactions = extractionResult.transactions;
    extractedText = extractionResult.extractedText || '';

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
    const transactions = sanitizeTransactions(extractedTransactions, {
      openingBalance: provisionalBankInfo?.openingBalance,
      closingBalance: provisionalBankInfo?.closingBalance,
    });

    // ============= LAYER 4: FINANCIAL ENGINE (Pure TypeScript) =============
    console.log('Starting financial analysis...');

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
      riskAnalysis,
      ...(underwritingAnalysis ? { underwriting: underwritingAnalysis } : {}),
    };

    // Generate Excel (styled)
    const bankInfo = mergeBankMetadata(
      clientParsedBankMetadata,
      ocrTextBankMetadata,
      collectedBankMetadata,
      extractionResult.bankMetadata,
    );
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

    // Update monthly page usage based on pages that actually contained data
    if (user && !isAdmin && (isMonthlyPlan || isYearlyPlan)) {
      const pagesToAdd = Math.max(1, pagesWithData);
      const updatedPagesUsed = pagesUsedThisMonth + pagesToAdd;
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({ pages_used_this_month: updatedPagesUsed })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Failed to update pages used:', updateError);
      } else {
        console.log(`Updated pages used: ${updatedPagesUsed}/${userPlanLimit}`);
      }
    }

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

    return new Response(
      JSON.stringify({
        success: true,
        conversionId: conversion?.id || null,
        resultPath: resultPath,
        transactions: transactions,
        analytics: analytics,
        bankInfo,
        excelData: excelBase64 ?? undefined,
        jsonData,
        mt940Data,
        outputMode: requestedOutputMode,
        tallyEnabled: requestedOutputMode === 'tally_only',
        message: 'Conversion completed successfully',
        remaining,
        isAuthenticated: !!user,
        aiStatus, // For debugging - shows which AI did what
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
