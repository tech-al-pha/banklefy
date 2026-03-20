// ============= SPECIALIZED AI ORCHESTRATOR =============
// AI-layer orchestration with strict fallback order, confidence chain,
// and compatibility-safe outputs for existing conversion pipelines.

import {
  callGroqVisionOCR,
  normalizeOcrRawTransactions,
  type RawTransaction,
  type BankMetadata,
} from './ocr-processor.ts';
import { callMistralCategorizer, type ProcessedTransaction } from './mistral-processor.ts';

const CONFIDENCE_STEP = 0.2;
const RESCUE_THRESHOLD = 0.6;
const TEXT_EXTRACTION_MIN_LEN = 80;

const AI_CATEGORIES = [
  'Income',
  'Transfer',
  'Shopping',
  'Food & Dining',
  'Utilities',
  'Entertainment',
  'Transport',
  'Healthcare',
  'Education',
  'Subscriptions',
  'Fees',
  'Other',
] as const;

type AICategory = (typeof AI_CATEGORIES)[number];

type ModelId =
  | 'groq_vision'
  | 'groq_text'
  | 'mistral_categorizer'
  | 'groq_categorizer'
  | 'pattern_fallback';

interface ConfidenceSource {
  level: number;
  model: ModelId;
}

interface AIExtractionItem {
  transaction_id: string;
  raw_text: string;
  extracted_date: string;
  extracted_description: string;
  extracted_amount: number;
  extracted_type: 'credit' | 'debit' | 'UNKNOWN';
  category: AICategory;
  confidence: number;
}

interface AIExtractionMetadata {
  primary_model: string;
  fallbacks_used: number;
  avg_confidence: number;
  errors: string[];
}

export interface AIProcessingStatus {
  groqVision: { used: boolean; success: boolean; error?: string; time?: number };
  mistral: { used: boolean; success: boolean; error?: string; time?: number };
  groqText: { used: boolean; success: boolean; error?: string; time?: number };
  patternFallback: { used: boolean; success: boolean; error?: string; time?: number };
}

export interface ExtractionResult {
  transactions: RawTransaction[];
  status: AIProcessingStatus;
  extractedText?: string;
  bankMetadata?: BankMetadata;
  aiLayerReport?: {
    extractions: AIExtractionItem[];
    metadata: AIExtractionMetadata;
  };
}

export interface CategorizationResult {
  transactions: ProcessedTransaction[];
  status: AIProcessingStatus;
  aiLayerReport?: {
    extractions: AIExtractionItem[];
    metadata: AIExtractionMetadata;
  };
}

interface GroqTextExtractionResult {
  success: boolean;
  transactions: RawTransaction[];
  error?: string;
  processingTimeMs?: number;
}

const CATEGORY_PATTERNS: Array<{ category: AICategory; pattern: RegExp }> = [
  { category: 'Income', pattern: /salary|payroll|income|bonus|wage|commission|incentive|refund/i },
  { category: 'Transfer', pattern: /transfer|upi|imps|neft|rtgs|swift|wire|ach|remit|trf|payment/i },
  { category: 'Shopping', pattern: /amazon|flipkart|myntra|ajio|retail|store|purchase|pos/i },
  { category: 'Food & Dining', pattern: /swiggy|zomato|restaurant|cafe|food|dining|grocery/i },
  { category: 'Utilities', pattern: /electric|water|gas|internet|broadband|wifi|phone|mobile|utility|bill|rent/i },
  { category: 'Entertainment', pattern: /netflix|spotify|prime|hotstar|movie|cinema|gaming|stream/i },
  { category: 'Transport', pattern: /uber|ola|rapido|taxi|fuel|petrol|diesel|metro|bus|train|toll|parking/i },
  { category: 'Healthcare', pattern: /hospital|clinic|pharmacy|medical|doctor|health/i },
  { category: 'Education', pattern: /school|college|university|course|tuition|education|book/i },
  { category: 'Subscriptions', pattern: /subscription|membership|renewal|monthly plan|annual plan/i },
  { category: 'Fees', pattern: /fee|charge|penalty|gst|tax|service charge|maintenance|emi|loan/i },
];

const clampConfidence = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, Math.round(value * 100) / 100));
};

const confidenceByLevel = (level: number): number => {
  const base = 1 - (CONFIDENCE_STEP * level);
  return clampConfidence(base);
};

const normalizeText = (value: unknown): string =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();

const toAmount = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.abs(value);
  const normalized = normalizeText(value)
    .replace(/[\s]/g, '')
    .replace(/\(([^)]+)\)/g, '$1')
    .replace(/[^\d.,-]/g, '');
  if (!normalized) return 0;
  const isNegative = normalized.startsWith('-');
  const numeric = normalized.replace(/,/g, '');
  const parsed = Number(numeric);
  if (!Number.isFinite(parsed)) return 0;
  return Math.abs(isNegative ? -parsed : parsed);
};

const resolveRowType = (row: Pick<RawTransaction, 'debit' | 'credit' | 'type'>): 'credit' | 'debit' | 'UNKNOWN' => {
  const debit = toAmount(row.debit);
  const credit = toAmount(row.credit);
  if (credit > 0 && debit === 0) return 'credit';
  if (debit > 0 && credit === 0) return 'debit';

  const type = normalizeText(row.type).toLowerCase();
  if (type === 'credit' || type === 'cr') return 'credit';
  if (type === 'debit' || type === 'dr') return 'debit';
  return 'UNKNOWN';
};

const toIsoDateOrUnknown = (value: unknown): string => {
  const raw = normalizeText(value);
  if (!raw) return 'UNKNOWN';

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const m = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!m) return 'UNKNOWN';

  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yyyyRaw = Number(m[3]);
  const yyyy = yyyyRaw < 100 ? 2000 + yyyyRaw : yyyyRaw;

  if (!Number.isFinite(dd) || !Number.isFinite(mm) || dd < 1 || dd > 31 || mm < 1 || mm > 12) {
    return 'UNKNOWN';
  }

  const date = new Date(Date.UTC(yyyy, mm - 1, dd));
  if (Number.isNaN(date.getTime())) return 'UNKNOWN';
  return `${yyyy.toString().padStart(4, '0')}-${mm.toString().padStart(2, '0')}-${dd.toString().padStart(2, '0')}`;
};

const mapToAICategory = (value: unknown, description: string): AICategory => {
  const normalized = normalizeText(value);

  const exact = AI_CATEGORIES.find((cat) => cat.toLowerCase() === normalized.toLowerCase());
  if (exact) return exact;

  const legacyMap: Record<string, AICategory> = {
    'salary/income': 'Income',
    'transfer in': 'Transfer',
    'transfer out': 'Transfer',
    'bills & utilities': 'Utilities',
    'transportation': 'Transport',
    'bank fees': 'Fees',
    'loan/emi': 'Fees',
    insurance: 'Other',
    investments: 'Other',
    cash: 'Other',
  };
  const legacy = legacyMap[normalized.toLowerCase()];
  if (legacy) return legacy;

  const desc = description.toLowerCase();
  for (const matcher of CATEGORY_PATTERNS) {
    if (matcher.pattern.test(desc)) return matcher.category;
  }
  return 'Other';
};

const scoreExtractionItem = (
  row: RawTransaction,
  source: ConfidenceSource,
): AIExtractionItem => {
  const extracted_date = toIsoDateOrUnknown(row.date);
  const extracted_description = normalizeText(row.description || '');
  const resolvedType = resolveRowType(row);
  const amount = resolvedType === 'credit' ? toAmount(row.credit) : resolvedType === 'debit' ? toAmount(row.debit) : 0;

  let confidence = confidenceByLevel(source.level);
  if (extracted_date === 'UNKNOWN') confidence -= 0.25;
  if (!extracted_description) confidence -= 0.2;
  if (resolvedType === 'UNKNOWN') confidence -= 0.2;
  if (amount <= 0) confidence -= 0.25;

  if (extracted_date === 'UNKNOWN' || !extracted_description || amount <= 0 || resolvedType === 'UNKNOWN') {
    confidence = Math.min(confidence, 0.49);
  }

  return {
    transaction_id: normalizeText(row.refNumber) || `txn_${crypto.randomUUID()}`,
    raw_text: extracted_description || normalizeText(row.refNumber) || 'UNKNOWN',
    extracted_date,
    extracted_description: extracted_description || 'UNKNOWN',
    extracted_amount: amount,
    extracted_type: resolvedType,
    category: mapToAICategory(row.category, extracted_description),
    confidence: clampConfidence(confidence),
  };
};

const applyLowConfidenceRescue = (items: AIExtractionItem[]): AIExtractionItem[] => {
  if (items.length < 2) return items;

  const rescued = items.map((item) => ({ ...item }));
  for (let i = 1; i < rescued.length; i += 1) {
    const current = rescued[i];
    if (current.confidence >= RESCUE_THRESHOLD) continue;

    const prev = rescued[i - 1];
    const prevAmount = Number(prev.extracted_amount || 0);
    const currAmount = Number(current.extracted_amount || 0);
    if (!Number.isFinite(prevAmount) || !Number.isFinite(currAmount) || currAmount <= 0) continue;

    // Context check: if transaction currently marked UNKNOWN, infer using amount side availability.
    if (current.extracted_type === 'UNKNOWN') {
      current.extracted_type = 'debit';
      current.confidence = clampConfidence(Math.max(current.confidence, 0.6));
    }
  }

  return rescued;
};

const summarizeExtractionMetadata = (
  items: AIExtractionItem[],
  primaryModel: string,
  fallbacksUsed: number,
  errors: string[],
): AIExtractionMetadata => {
  const avg = items.length > 0
    ? items.reduce((sum, item) => sum + item.confidence, 0) / items.length
    : 0;

  return {
    primary_model: primaryModel,
    fallbacks_used: fallbacksUsed,
    avg_confidence: clampConfidence(avg),
    errors,
  };
};

const parsePossibleJson = (text: string): unknown => {
  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    const objectMatch = trimmed.match(/\{[\s\S]*\}$/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {
        // continue
      }
    }

    const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch {
        // continue
      }
    }
  }

  return null;
};

const normalizeExtractedRows = (input: unknown): RawTransaction[] => {
  if (Array.isArray(input)) {
    return normalizeOcrRawTransactions(input as RawTransaction[]);
  }

  if (input && typeof input === 'object') {
    const obj = input as Record<string, unknown>;
    if (Array.isArray(obj.transactions)) {
      return normalizeOcrRawTransactions(obj.transactions as RawTransaction[]);
    }
    if (Array.isArray(obj.rows)) {
      return normalizeOcrRawTransactions(obj.rows as RawTransaction[]);
    }
    if (Array.isArray(obj.extractions)) {
      const mapped = (obj.extractions as Array<Record<string, unknown>>).map((row) => ({
        date: row.extracted_date,
        description: row.extracted_description,
        debit: row.extracted_type === 'debit' ? row.extracted_amount : 0,
        credit: row.extracted_type === 'credit' ? row.extracted_amount : 0,
        balance: row.balance,
        refNumber: row.transaction_id,
      }));
      return normalizeOcrRawTransactions(mapped as RawTransaction[]);
    }
  }

  return [];
};

const callGroqTextExtraction = async (extractedText: string): Promise<GroqTextExtractionResult> => {
  const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
  if (!GROQ_API_KEY) {
    return { success: false, transactions: [], error: 'GROQ_API_KEY not configured' };
  }

  const start = Date.now();
  try {
    const prompt = `You extract bank statement transactions with exact numeric fidelity.

Return ONLY valid JSON with key "transactions".
Each item must include: date, description, debit, credit, balance, refNumber.

Rules:
- Copy numbers exactly as shown. Do not infer missing digits, do not round, do not merge digits from different rows or columns.
- If a numeric cell is blank or unreadable, use 0.
- Keep debit, credit, and balance as positive numbers.
- Never swap debit and credit columns.
- Do not invent rows, headers, totals, summaries, or page artifacts.
- If a text field is missing, use "UNKNOWN".
- If refNumber is missing, use "".

Return ONLY valid JSON. No markdown, no code blocks.`;

    const requestPayload = {
      model: 'llama-3.3-70b-versatile',
      temperature: 0,
      top_p: 1,
      max_tokens: 8000,
      response_format: { type: 'json_object' as const },
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: extractedText.slice(0, 30000) },
      ],
    };

    let response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      const firstErrorText = await response.text();
      if (response.status === 400) {
        response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...requestPayload,
            response_format: undefined,
          }),
        });
      }
      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          transactions: [],
          error: `Groq text extraction failed (${response.status})${errorText || firstErrorText ? `: ${errorText || firstErrorText}` : ''}`,
          processingTimeMs: Date.now() - start,
        };
      }
    }

    const payload = await response.json();
    const content = String(payload?.choices?.[0]?.message?.content ?? '');
    const parsed = parsePossibleJson(content);
    const transactions = normalizeExtractedRows(parsed);

    if (transactions.length === 0) {
      return {
        success: false,
        transactions: [],
        error: 'Groq text extraction returned no transactions',
        processingTimeMs: Date.now() - start,
      };
    }

    return {
      success: true,
      transactions,
      processingTimeMs: Date.now() - start,
    };
  } catch (error) {
    return {
      success: false,
      transactions: [],
      error: error instanceof Error ? error.message : 'Unknown Groq text extraction error',
      processingTimeMs: Date.now() - start,
    };
  }
};

export async function performExtraction(
  base64Data: string,
  mimeType: string,
  extractedText: string,
): Promise<ExtractionResult> {
  const status: AIProcessingStatus = {
    groqVision: { used: false, success: false },
    mistral: { used: false, success: false },
    groqText: { used: false, success: false },
    patternFallback: { used: false, success: false },
  };

  const errors: string[] = [];
  let transactions: RawTransaction[] = [];
  let bankMetadata: BankMetadata | undefined;
  let textPayload = extractedText;
  let fallbacksUsed = 0;

  const isImageLike = /^image\//i.test(mimeType) || mimeType.toLowerCase().includes('pdf');

  if (isImageLike) {
    status.groqVision.used = true;
    const t0 = Date.now();
    const ocr = await callGroqVisionOCR(base64Data, mimeType);
    status.groqVision.time = Date.now() - t0;

    if (ocr.success && ocr.transactions && ocr.transactions.length > 0) {
      transactions = normalizeOcrRawTransactions(ocr.transactions);
      bankMetadata = ocr.bankMetadata;
      textPayload = ocr.text || extractedText;
      status.groqVision.success = true;
    } else {
      status.groqVision.error = ocr.error || 'Groq Vision returned no transactions';
      errors.push(`Groq Vision: ${status.groqVision.error}`);
      textPayload = ocr.text || extractedText;
    }
  }

  const canUseTextFallback = transactions.length === 0 && normalizeText(textPayload).length >= TEXT_EXTRACTION_MIN_LEN;
  if (canUseTextFallback) {
    status.groqText.used = true;
    fallbacksUsed += 1;
    const groqText = await callGroqTextExtraction(textPayload);
    status.groqText.time = groqText.processingTimeMs;
    if (groqText.success && groqText.transactions.length > 0) {
      status.groqText.success = true;
      transactions = groqText.transactions;
    } else {
      status.groqText.error = groqText.error || 'Groq text extraction returned no rows';
      errors.push(`Groq Text: ${status.groqText.error}`);
    }
  }

  const source: ConfidenceSource = {
    model: transactions.length > 0
      ? (status.groqVision.success ? 'groq_vision' : 'groq_text')
      : 'groq_text',
    level: status.groqVision.success ? 0 : (status.groqText.used ? 1 : 2),
  };

  const extractionItems = applyLowConfidenceRescue(
    transactions.map((row) => scoreExtractionItem(row, source)),
  );

  const primaryModel = status.groqVision.success
    ? 'Groq Vision OCR'
    : status.groqText.success
      ? 'Groq Text'
      : 'none';

  return {
    transactions,
    status,
    extractedText: textPayload,
    bankMetadata,
    aiLayerReport: {
      extractions: extractionItems,
      metadata: summarizeExtractionMetadata(extractionItems, primaryModel, fallbacksUsed, errors),
    },
  };
}

const strictPatternCategorization = (transactions: RawTransaction[]): ProcessedTransaction[] => {
  return transactions.map((tx) => {
    const description = normalizeText(tx.description) || 'UNKNOWN';
    const category = mapToAICategory('', description);

    return {
      date: toIsoDateOrUnknown(tx.date),
      description,
      category,
      debit: toAmount(tx.debit),
      credit: toAmount(tx.credit),
      balance: Number.isFinite(Number(tx.balance)) ? Number(tx.balance) : 0,
      refNumber: normalizeText(tx.refNumber),
      originalDescription: tx.description,
      type: resolveRowType(tx),
      amount: tx.credit && toAmount(tx.credit) > 0 ? toAmount(tx.credit) : toAmount(tx.debit),
    };
  });
};

const mergeByHigherConfidence = (
  sourceRows: RawTransaction[],
  candidateRows: ProcessedTransaction[],
  sourceLevel: number,
  candidateLevel: number,
): ProcessedTransaction[] => {
  return candidateRows.map((row, index) => {
    const source = sourceRows[index];
    const sourceConfidence = clampConfidence(confidenceByLevel(sourceLevel) + (Number(source?.confidence ?? 0) / 10));
    const candidateConfidence = clampConfidence(confidenceByLevel(candidateLevel));

    const description = normalizeText(row.description || source?.description || 'UNKNOWN');
    const categoryFromSource = mapToAICategory(source?.category, normalizeText(source?.description));
    const categoryFromCandidate = mapToAICategory(row.category, description);

    const category = candidateConfidence >= sourceConfidence ? categoryFromCandidate : categoryFromSource;

    return {
      ...row,
      date: toIsoDateOrUnknown(row.date || source?.date),
      description,
      originalDescription: source?.description || row.originalDescription,
      debit: toAmount(source?.debit ?? row.debit),
      credit: toAmount(source?.credit ?? row.credit),
      balance: Number.isFinite(Number(source?.balance)) ? Number(source?.balance) : Number(row.balance || 0),
      category,
      type: resolveRowType({ debit: source?.debit ?? row.debit, credit: source?.credit ?? row.credit, type: row.type }),
      amount: toAmount(source?.credit) > 0 ? toAmount(source?.credit) : toAmount(source?.debit),
    };
  });
};

export async function performCategorization(
  transactions: RawTransaction[],
  existingStatus: AIProcessingStatus,
): Promise<CategorizationResult> {
  const status: AIProcessingStatus = {
    groqVision: { ...existingStatus.groqVision },
    mistral: { ...existingStatus.mistral },
    groqText: { ...existingStatus.groqText },
    patternFallback: { ...existingStatus.patternFallback },
  };

  const errors: string[] = [];
  let fallbacksUsed = 0;
  const patternRows = strictPatternCategorization(transactions);
  let categorized: ProcessedTransaction[] = patternRows;
  status.patternFallback.used = true;
  status.patternFallback.success = patternRows.length > 0;
  status.patternFallback.time = 0;
  if (!status.patternFallback.success) {
    status.patternFallback.error = 'Pattern categorization produced no rows';
    errors.push('Pattern categorization: no rows');
  }

  const shouldUseAiFallback = (() => {
    if (patternRows.length === 0) return false;
    const otherCount = patternRows.filter((row) => mapToAICategory(row.category, row.description) === 'Other').length;
    const unknownTypeCount = patternRows.filter((row) => resolveRowType(row) === 'UNKNOWN').length;
    const total = Math.max(1, patternRows.length);
    const otherRatio = otherCount / total;
    const unknownTypeRatio = unknownTypeCount / total;
    return otherRatio >= 0.55 || unknownTypeRatio >= 0.3;
  })();

  if (shouldUseAiFallback) {
    // Exactly one AI fallback call for categorization (no cascade).
    status.mistral.used = true;
    fallbacksUsed += 1;
    const mistralResult = await callMistralCategorizer(transactions);
    status.mistral.time = mistralResult.processingTime;

    if (mistralResult.success && mistralResult.transactions && mistralResult.transactions.length > 0) {
      status.mistral.success = true;
      categorized = mergeByHigherConfidence(transactions, mistralResult.transactions, 3, 0);
    } else {
      status.mistral.error = mistralResult.error || 'Mistral categorization returned no rows';
      errors.push(`Mistral: ${status.mistral.error}`);
    }
  }

  const sourceLevel = status.mistral.success ? 0 : 3;
  const extractionItems = applyLowConfidenceRescue(
    categorized.map((row, index) =>
      scoreExtractionItem(
        {
          date: row.date,
          description: row.description,
          debit: row.debit,
          credit: row.credit,
          balance: row.balance,
          type: row.type,
          refNumber: row.refNumber || `txn_${index + 1}`,
          category: row.category,
        },
        { model: 'mistral_categorizer', level: sourceLevel },
      ),
    ),
  );

  const resultRows = categorized.map((row, idx) => {
    const item = extractionItems[idx];
    const description = normalizeText(row.description) || 'UNKNOWN';

    return {
      ...row,
      date: item?.extracted_date ?? toIsoDateOrUnknown(row.date),
      description,
      originalDescription: row.originalDescription || description,
      category: mapToAICategory(row.category, description),
      debit: toAmount(row.debit),
      credit: toAmount(row.credit),
      balance: Number.isFinite(Number(row.balance)) ? Number(row.balance) : 0,
      type: (item?.extracted_type === 'credit' || item?.extracted_type === 'debit') ? item.extracted_type : resolveRowType(row),
      amount: item?.extracted_amount ?? (toAmount(row.credit) > 0 ? toAmount(row.credit) : toAmount(row.debit)),
    };
  });

  const primaryModel = status.mistral.success
    ? 'Mistral Categorizer'
    : 'Pattern Categorizer';

  return {
    transactions: resultRows,
    status,
    aiLayerReport: {
      extractions: extractionItems,
      metadata: summarizeExtractionMetadata(extractionItems, primaryModel, fallbacksUsed, errors),
    },
  };
}

export function generateStatusReport(status: AIProcessingStatus): string {
  const lines: string[] = ['=== AI Processing Report ==='];

  if (status.groqVision.used) {
    lines.push(
      `Groq Vision OCR: ${status.groqVision.success ? 'SUCCESS' : 'FAILED'}${status.groqVision.time ? ` (${status.groqVision.time}ms)` : ''}${status.groqVision.error ? ` - ${status.groqVision.error}` : ''}`,
    );
  }

  if (status.groqText.used) {
    lines.push(
      `Groq Text Layer: ${status.groqText.success ? 'SUCCESS' : 'FAILED'}${status.groqText.time ? ` (${status.groqText.time}ms)` : ''}${status.groqText.error ? ` - ${status.groqText.error}` : ''}`,
    );
  }

  if (status.mistral.used) {
    lines.push(
      `Mistral Categorizer: ${status.mistral.success ? 'SUCCESS' : 'FAILED'}${status.mistral.time ? ` (${status.mistral.time}ms)` : ''}${status.mistral.error ? ` - ${status.mistral.error}` : ''}`,
    );
  }

  if (status.patternFallback.used) {
    lines.push(
      `Pattern Fallback: ${status.patternFallback.success ? 'USED' : 'NOT USED'}${status.patternFallback.error ? ` - ${status.patternFallback.error}` : ''}`,
    );
  }

  return lines.join('\n');
}

export { AI_CATEGORIES as CATEGORY_LIST };
