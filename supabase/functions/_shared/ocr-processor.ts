/* eslint-disable no-useless-escape */
// ============= GROQ VISION OCR PROCESSOR =============
// Using Groq's Llama Vision model for OCR

type HeaderAliasMap = {
  date: string[];
  valueDate: string[];
  description: string[];
  reference: string[];
  debit: string[];
  credit: string[];
  balance: string[];
};

const GENERIC_HEADER_ALIASES: HeaderAliasMap = {
  date: ['transaction date', 'txn date', 'date'],
  valueDate: ['value date', 'posting date', 'value dt'],
  description: ['narration', 'description', 'particular', 'transaction details', 'details'],
  reference: ['reference', 'txn id', 'transaction id', 'ref no', 'chq ref no', 'chq no', 'utr'],
  debit: ['debit amount', 'withdrawal amount', 'withdrawal amt', 'dr amount', 'debit'],
  credit: ['credit amount', 'deposit amount', 'deposit amt', 'cr amount', 'credit'],
  balance: ['running balance', 'closing balance', 'ledger balance', 'available balance', 'balance'],
};

const readEnv = (key: string): string | undefined => {
  if (typeof Deno !== 'undefined' && typeof Deno.env?.get === 'function') {
    return Deno.env.get(key) ?? undefined;
  }
  if (typeof process !== 'undefined' && process.env) {
    const value = process.env[key];
    return value && value.length > 0 ? value : undefined;
  }
  return undefined;
};

export interface BankMetadata {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  currency: string;
  iban?: string;
  ifsc?: string;
  swift?: string;
  routingNumber?: string;
  sortCode?: string;
  bsb?: string;
  micr?: string;
  statementPeriod?: string;
  openingBalance?: number;
  closingBalance?: number;
}

export interface OCRResult {
  success: boolean;
  text?: string;
  transactions?: RawTransaction[];
  bankMetadata?: BankMetadata;
  metadata?: {
    total_rows: number;
    avg_confidence: number;
    issues: string[];
  };
  error?: string;
}

export interface RawTransaction {
  date: string;
  description: string;
  category?: string;
  debit?: number;
  credit?: number;
  balance?: number;
  amount?: number;
  type?: string;
  refNumber?: string;
  confidence?: number;
}

const OCR_PROMPT = `You are an expert OCR and bank statement data extraction specialist for GLOBAL banks.

CRITICAL: Extract ALL data including bank details and transactions.

OUTPUT FORMAT - Return a JSON object with TWO parts:

{
  "bankMetadata": {
    "bankName": "Bank name (e.g., HDFC Bank, Wio Bank, Chase, HSBC, Barclays)",
    "accountNumber": "Account number found in statement",
    "accountHolder": "Account holder name",
    "currency": "3-letter code: USD, AED, INR, EUR, GBP, SGD, etc.",
    "iban": "IBAN if present",
    "ifsc": "IFSC code if present (India)",
    "swift": "SWIFT/BIC code if present",
    "routingNumber": "Routing number if present (US)",
    "sortCode": "Sort code if present (UK)",
    "bsb": "BSB if present (Australia)",
    "micr": "MICR if present",
    "statementPeriod": "e.g., 01/01/2025 - 31/01/2025. Copy the statement header period only; do not infer it from transaction rows or page footers.",
    "openingBalance": 1000.00,
    "closingBalance": 5000.00
  },
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "refNumber": "Reference/Transaction ID copied EXACTLY as shown in the document (string, preserve leading zeros, no truncation, no added prefixes)",
      "description": "transaction narration/description", 
      "debit": 1234.56,
      "credit": 0,
      "balance": 5678.90
    }
  ]
}

BANK DETECTION - Look for these patterns:
- UAE: Wio Bank, Emirates NBD, ADCB, FAB, Mashreq, RAKBank
- India: HDFC, ICICI, SBI, Axis, Kotak, IndusInd, Yes Bank
- USA: Chase, Bank of America, Wells Fargo, Citi, Capital One
- UK: Barclays, HSBC, Lloyds, NatWest, Santander, Monzo
- Singapore: DBS, OCBC, UOB, Standard Chartered
- Europe: Deutsche Bank, BNP Paribas, ING, Revolut, N26

CURRENCY DETECTION - Look at:
- Currency symbol: ₹ = INR, $ = USD, € = EUR, £ = GBP, د.إ = AED
- Column headers: "Amount (AED)", "Balance (INR)", "USD"
- Text mentions: "AED", "USD", "Rupees", "Dollars", "Euros"

REFERENCE NUMBER - Extract from:
- "Ref. Number", "Reference", "Txn ID", "UTR", "NEFT Ref", "IMPS Ref"
- Transaction codes like P123456, N789012, IMPS/456/...
ONLY populate refNumber when the statement has a dedicated reference/ID column.
If the identifier appears only inside Narration/Description text, keep it inside description and set refNumber to "".
COPY EXACTLY AS SHOWN. Do NOT add prefixes or alter case.
IMPORTANT: refNumber must be ONLY identifier/code, not full narration text.
If multiple IDs exist in same row, choose the best primary transaction ID (e.g., UTR/TR REF/AE/S codes).
If no clear ID exists, return an empty string.
If no reference number exists for a row, return an empty string.

DO NOT merge content across different pages or rows.
IGNORE headers, footers, summaries, opening/closing balance lines, and page-break artifacts. Only real transaction rows.

DATE RULES:
1. If both "Transaction Date" and "Value Date"/"Posting Date" exist, use Transaction Date as "date".
2. Use Value Date/Posting Date only when Transaction Date is missing.
3. Always output "date" in YYYY-MM-DD.

AMOUNT RULES:
1. DEBIT = money OUT - positive number
2. CREDIT = money IN - positive number  
3. BALANCE = running balance after transaction
4. Remove currency symbols and commas
5. Handle formats: "1,234.56", "1,23,456", "-500"
6. If statement has separate "Debit" and "Credit" columns, map strictly by column position.
7. If a cell is "-" or blank in Debit/Credit, treat it as 0 (do NOT shift value to other column).
8. If one amount appears in wrong side, verify against running balance change and correct side.
9. Never output negative debit/credit; keep both as positive numbers.
10. If a visible transaction row is missing the amount because the scan is noisy, still keep the row with debit/credit set to 0 rather than merging it into the next row.

Return ONLY valid JSON. No markdown, no code blocks.`;

const OCR_PROMPT_STRICT_TABLE = `You are an expert OCR engine for bank statement TABLES.

Extract ONLY transaction rows from this single statement page and return JSON object:
{
  "bankMetadata": { ...optional metadata fields... },
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "refNumber": "identifier only when dedicated reference column exists, else """,
      "description": "narration text",
      "debit": 0,
      "credit": 0,
      "balance": 0
    }
  ]
}

STRICT TABLE RULES:
1) Use table COLUMN POSITION, not narration meaning.
2) If headers include "Debit Amount", "Credit Amount", "Running Balance":
   - debit must come only from Debit column
   - credit must come only from Credit column
   - running balance must come only from Running Balance column
3) If debit or credit cell is "-" or blank, output 0 for that side.
4) Never move an amount from Debit to Credit (or vice versa) unless running balance math proves mismatch.
5) Keep decimals exactly with 2 places. Do not invent/round/merge values.
6) Keep one JSON row per transaction row. Do not merge adjacent rows.
7) Ignore summary/header/footer lines and page numbers.
8) If both Transaction Date and Value Date exist, use Transaction Date.
9) Never output negative debit or credit; output positive numbers.
10. Only copy statementPeriod from an explicit statement header or date-range label. Do not infer it from transaction rows.
11. If a transaction row is visible but the amount column is unreadable, still return the row with debit/credit as 0. Do not collapse it into a neighboring row.

Reference number rule:
- Populate refNumber only if there is a dedicated reference/ID column.
- If code appears only inside narration text, keep it inside description and set refNumber to "".

Return ONLY valid JSON. No markdown, no code blocks.`;

const pickString = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return undefined;
};

const collapseWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();
const roundMoney2 = (value: number): number => Math.round(value * 100) / 100;

const normalizeReferenceToken = (value: string): string =>
  collapseWhitespace(value)
    .replace(/^[\s#:/.-]+/, '')
    .replace(/[\s#:/.-]+$/, '');

const looksLikeDateToken = (value: string): boolean => {
  const v = value.trim();
  return (
    /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(v) ||
    /^\d{4}[/-]\d{1,2}[/-]\d{1,2}$/.test(v) ||
    /^\d{1,2}:\d{2}(?::\d{2})?$/.test(v)
  );
};

const NON_REF_PHRASES = [
  'transfer',
  'purchase',
  'property',
  'salary',
  'bank charges',
  'monthly account',
  'customer credit',
  'government',
];

type RefCandidate = { value: string; weight: number };

const collectReferenceCandidates = (text: string | undefined, seedWeight: number): RefCandidate[] => {
  if (!text) return [];
  const candidates: RefCandidate[] = [];
  const input = String(text);

  const addMatch = (value: string, weight: number) => {
    const normalized = normalizeReferenceToken(value);
    if (!normalized || normalized.length < 5) return;
    candidates.push({ value: normalized, weight });
  };

  const labelledPattern =
    /\b(?:ref(?:erence)?(?:\s*no)?|txn(?:\s*id)?|transaction(?:\s*id)?|utr|rrn|imps|neft|rtgs|tr\s*ref|chq(?:ue)?(?:\s*no)?)\b[^\S\r\n]*[:#-]?[^\S\r\n]*([A-Za-z0-9Xx./-]{5,})/gi;
  for (const match of input.matchAll(labelledPattern)) {
    addMatch(match[1], seedWeight + 40);
  }

  const patterns: Array<[RegExp, number]> = [
    [/\bAE\d{5,}\b/gi, seedWeight + 38],
    [/\bS\d{5,}\b/gi, seedWeight + 34],
    [/\bFCF[A-Z0-9]{6,}\b/gi, seedWeight + 32],
    [/\b[A-Z]{3,}\d{5,}[A-Z0-9]*\b/gi, seedWeight + 28],
    [/\b[A-Z0-9]{8,}(?:-[A-Z0-9]{2,})+\b/gi, seedWeight + 26],
    [/\b[0-9Xx]{10,20}\b/g, seedWeight + 22],
  ];

  for (const [pattern, weight] of patterns) {
    for (const match of input.matchAll(pattern)) {
      addMatch(match[0], weight);
    }
  }

  const compact = normalizeReferenceToken(input);
  if (compact && compact.length <= 40 && compact.split(' ').length <= 4) {
    addMatch(compact, seedWeight + 12);
  }

  return candidates;
};

const scoreReferenceCandidate = (candidate: string, baseWeight: number): number => {
  const value = normalizeReferenceToken(candidate);
  if (!value) return -999;
  if (looksLikeDateToken(value)) return -999;

  let score = baseWeight;

  const hasLetters = /[A-Za-z]/.test(value);
  const hasDigits = /\d/.test(value);

  if (hasLetters && hasDigits) score += 20;
  if (!value.includes(' ')) score += 8;
  if (value.length >= 6 && value.length <= 28) score += 10;
  if (value.length > 60) score -= 25;

  const lower = value.toLowerCase();
  if (NON_REF_PHRASES.some((phrase) => lower.includes(phrase))) score -= 18;
  if (/^[A-Za-z]+$/.test(value)) score -= 20;
  if (/^[0-9]+$/.test(value) && value.length < 8) score -= 20;

  return score;
};

const selectBestReference = (rawRef: string | undefined, description: string | undefined): string | undefined => {
  if (!rawRef) return undefined;
  const raw = normalizeReferenceToken(rawRef);
  if (!raw) return undefined;

  const rawWords = raw.split(/\s+/).filter(Boolean);
  // Guardrail: if OCR gives full narration in ref field, treat it as no dedicated reference column.
  if (rawWords.length > 6 || raw.length > 80) return undefined;

  const desc = normalizeReferenceToken(description ?? '').toLowerCase();
  const rawLower = raw.toLowerCase();
  if (desc && rawLower.length > 12 && (rawLower.includes(desc) || desc.includes(rawLower))) {
    return undefined;
  }

  const candidates = collectReferenceCandidates(rawRef, 20);

  if (candidates.length === 0) return undefined;

  const seen = new Set<string>();
  let best: { value: string; score: number } | undefined;
  for (const candidate of candidates) {
    const normalized = normalizeReferenceToken(candidate.value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);

    const score = scoreReferenceCandidate(normalized, candidate.weight);
    if (score < 0) continue;
    if (!best || score > best.score) {
      best = { value: normalized, score };
    }
  }

  return best?.value;
};

const normalizeBankMetadata = (raw: Record<string, unknown>): BankMetadata => {
  const get = (keys: string[]): string | undefined => {
    for (const key of keys) {
      if (key in raw) {
        const value = pickString(raw[key]);
        if (value && value.trim()) return value;
      }
    }
    return undefined;
  };

  const numberFrom = (keys: string[]): number | undefined => {
    for (const key of keys) {
      if (key in raw) {
        const value = raw[key];
        if (typeof value === 'number' && !Number.isNaN(value)) return value;
        if (typeof value === 'string') {
          const cleaned = value.replace(/[,\s]/g, '');
          const num = Number(cleaned);
          if (!Number.isNaN(num)) return num;
        }
      }
    }
    return undefined;
  };

  return {
    bankName: get(['bankName', 'bank', 'bank_name', 'bankname', 'institution', 'bankTitle']) || '',
    accountNumber: get(['accountNumber', 'accountNo', 'account_no', 'accNo', 'accNumber', 'account_number', 'accountId', 'acctNo', 'acctNumber', 'a_c_no']) || '',
    accountHolder: get(['accountHolder', 'accountHolderName', 'accountName', 'accHolder', 'account_title', 'accountTitle', 'customerName', 'name']) || '',
    currency: get(['currency', 'currencyCode', 'currency_type', 'currencyType']) || '',
    iban: get(['iban', 'IBAN']),
    ifsc: get(['ifsc', 'ifscCode', 'ifsc_code', 'IFSC']),
    swift: get(['swift', 'swiftCode', 'bic', 'bicCode', 'SWIFT']),
    routingNumber: get(['routingNumber', 'routing_no', 'routing', 'routing_number']),
    sortCode: get(['sortCode', 'sort_code', 'sortcode']),
    bsb: get(['bsb', 'bsbCode', 'bsb_code']),
    micr: get(['micr', 'micrCode', 'micr_code']),
    statementPeriod: get(['statementPeriod', 'statement_period', 'period', 'periodRange', 'dateRange']),
    openingBalance: numberFrom(['openingBalance', 'opening_balance', 'openingBal', 'opening']),
    closingBalance: numberFrom(['closingBalance', 'closing_balance', 'closingBal', 'closing']),
  };
};

const normalizeTransaction = (raw: Record<string, unknown>): RawTransaction => {
  const toNumber = (value: unknown): number | undefined => {
    if (typeof value === 'number' && !Number.isNaN(value)) return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[\s,]/g, '').trim();
      if (!cleaned) return undefined;
      const num = Number(cleaned);
      return Number.isNaN(num) ? undefined : num;
    }
    return undefined;
  };

  const dateRaw =
    raw.txnDate ??
    raw.transactionDate ??
    raw.transaction_date ??
    raw.txn_date ??
    raw.transDate ??
    raw.trans_date ??
    raw.date ??
    raw.valueDate ??
    raw.value_date ??
    raw.postingDate;

  const descriptionRaw =
    raw.description ??
    raw.narration ??
    raw.details ??
    raw.memo ??
    raw.particulars;

  const rawRef =
    raw.refNumber ??
    raw.refNo ??
    raw.referenceNo ??
    raw.referenceNumber ??
    raw.reference ??
    raw.ref ??
    raw.transactionId ??
    raw.transactionID ??
    raw.txnId ??
    raw.txnID ??
    raw.id;
  const cleanedRef = selectBestReference(pickString(rawRef), pickString(descriptionRaw));
  const normalizedType = pickString(raw.type ?? raw.txnType ?? raw.transactionType)?.trim();
  let debit = toNumber(raw.debit ?? raw.dr ?? raw.debitAmount ?? raw.withdrawal ?? raw.withdraw) ?? 0;
  let credit = toNumber(raw.credit ?? raw.cr ?? raw.creditAmount ?? raw.deposit) ?? 0;

  // Normalize signs to positive values and recover common CR/DR sign inversions.
  if (debit < 0 && credit <= 0) {
    credit = Math.abs(debit);
    debit = 0;
  } else if (credit < 0 && debit <= 0) {
    debit = Math.abs(credit);
    credit = 0;
  } else {
    debit = Math.abs(debit);
    credit = Math.abs(credit);
  }

  const typeLower = (normalizedType || '').toLowerCase();
  if (debit > 0 && credit === 0 && /\b(cr|credit)\b/.test(typeLower)) {
    credit = debit;
    debit = 0;
  } else if (credit > 0 && debit === 0 && /\b(dr|debit)\b/.test(typeLower)) {
    debit = credit;
    credit = 0;
  }

  return {
    date: pickString(dateRaw)?.trim() || 'Unknown',
    description: pickString(descriptionRaw)?.trim() || 'Unknown Transaction',
    category: pickString(raw.category)?.trim(),
    debit,
    credit,
    balance: toNumber(raw.balance ?? raw.bal ?? raw.runningBalance),
    amount: toNumber(raw.amount),
    type: normalizedType,
    refNumber: cleanedRef,
  };
};

export const normalizeRawTransactions = (rows: unknown[]): RawTransaction[] => {
  return rows.map((row) => normalizeTransaction(row as Record<string, unknown>));
};

type OcrNormalizeOptions = {
  strictColumnLock?: boolean;
};

const LOW_CONFIDENCE_THRESHOLD = 0.8;
const OCR_WORKER_URL = (readEnv('OCR_WORKER_URL') ?? '').trim().replace(/\/+$/, '');
const OCR_WORKER_API_KEY = (readEnv('OCR_WORKER_API_KEY') ?? '').trim();
const OCR_WORKER_TIMEOUT_MS = Math.max(5000, Number(readEnv('OCR_WORKER_TIMEOUT_MS') ?? '45000'));
const OCR_UNREADABLE_DESCRIPTION = 'UNREADABLE';

const OCR_NOISE_ROW_PATTERN =
  /\b(transaction date|value date|running balance|debit amount|credit amount|description|narration|statement of accounts|account statement|total records|page\s+\d+)\b/i;

const sanitizeStrictNumericToken = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    return String(value);
  }

  const raw = String(value).trim();
  if (!raw) return null;
  let normalizedRaw = raw;
  // Handle trailing minus commonly produced by OCR (e.g., 1,234.56-)
  if (!normalizedRaw.startsWith('-') && normalizedRaw.endsWith('-')) {
    normalizedRaw = `-${normalizedRaw.slice(0, -1)}`;
  }
  // OCR drift repair for numeric fields only (e.g., 1O0.00, 5l2.90).
  if (/[A-Za-z]/.test(normalizedRaw) && /\d/.test(normalizedRaw)) {
    normalizedRaw = normalizedRaw
      .replace(/[oO]/g, '0')
      .replace(/[lI]/g, '1')
      .replace(/[sS]/g, '5')
      .replace(/[bB]/g, '8');
  }

  // Keep only numeric-safe characters for OCR.
  const cleaned = normalizedRaw.replace(/[^\d,.-]/g, '');
  if (!cleaned || cleaned === '-') return null;

  const minusMatches = cleaned.match(/-/g) || [];
  if (minusMatches.length > 1) return null;
  if (minusMatches.length === 1 && !cleaned.startsWith('-')) return null;

  const unsigned = cleaned.replace(/-/g, '');
  if (!unsigned) return null;

  // Strict numeric format validation.
  const usStyle = /^\d{1,3}(?:,\d{3})*(?:\.\d{1,3})?$/.test(unsigned);
  const euStyle = /^\d{1,3}(?:\.\d{3})*(?:,\d{1,3})?$/.test(unsigned);
  const indianStyle = /^\d{1,3}(?:,\d{2})+(?:,\d{3})?(?:\.\d{1,3})?$/.test(unsigned);
  const plainStyle = /^\d+(?:[.,]\d{1,3})?$/.test(unsigned);
  if (!usStyle && !euStyle && !indianStyle && !plainStyle) return null;

  const lastDot = unsigned.lastIndexOf('.');
  const lastComma = unsigned.lastIndexOf(',');
  const decimalSep = lastDot > lastComma ? '.' : lastComma > -1 ? ',' : '';

  let normalized = unsigned;
  if (decimalSep) {
    const parts = unsigned.split(decimalSep);
    if (parts.length !== 2) return null;
    const integerPart = parts[0].replace(/[.,]/g, '');
    const fractionPart = parts[1].replace(/[.,]/g, '');
    if (!/^\d+$/.test(integerPart) || !/^\d+$/.test(fractionPart)) return null;
    normalized = fractionPart.length > 0 ? `${integerPart}.${fractionPart}` : integerPart;
  } else {
    normalized = unsigned.replace(/[.,]/g, '');
    if (!/^\d+$/.test(normalized)) return null;
  }

  if (cleaned.startsWith('-')) normalized = `-${normalized}`;
  return normalized;
};

const parseStrictOcrNumber = (value: unknown, abs = true): number | undefined => {
  const normalized = sanitizeStrictNumericToken(value);
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return undefined;
  const rounded = roundMoney2(parsed);
  return abs ? Math.abs(rounded) : rounded;
};

const isValidOcrTransactionDate = (value: unknown): value is string =>
  typeof value === 'string' && !!parseStatementDate(value.trim());

const isValidOcrDescription = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  const text = collapseWhitespace(value);
  if (!text) return false;
  return !OCR_NOISE_ROW_PATTERN.test(text);
};

const normalizeOcrTransaction = (raw: Record<string, unknown>): RawTransaction | null => {
  const dateRaw =
    raw.txnDate ??
    raw.transactionDate ??
    raw.transaction_date ??
    raw.txn_date ??
    raw.transDate ??
    raw.trans_date ??
    raw.date ??
    raw.valueDate ??
    raw.value_date ??
    raw.postingDate;

  const descriptionRaw =
    raw.description ??
    raw.narration ??
    raw.details ??
    raw.memo ??
    raw.particulars;

  if (!isValidOcrTransactionDate(pickString(dateRaw))) return null;
  const rawDescriptionText = pickString(descriptionRaw);
  const hasValidDescription = isValidOcrDescription(rawDescriptionText);

  const normalizedDate = parseStatementDate(String(dateRaw).trim()) || String(dateRaw).trim();
  const description = hasValidDescription
    ? collapseWhitespace(String(descriptionRaw))
    : OCR_UNREADABLE_DESCRIPTION;
  const rawRef =
    raw.refNumber ??
    raw.refNo ??
    raw.referenceNo ??
    raw.referenceNumber ??
    raw.reference ??
    raw.ref ??
    raw.transactionId ??
    raw.transactionID ??
    raw.txnId ??
    raw.txnID ??
    raw.id;
  const cleanedRef = selectBestReference(pickString(rawRef), description);
  const normalizedType = pickString(raw.type ?? raw.txnType ?? raw.transactionType)?.trim();
  const typeTags: string[] = [];
  if (normalizedType) typeTags.push(normalizedType);
  if (!hasValidDescription) typeTags.push('low_confidence');

  let debit = parseStrictOcrNumber(
    raw.debit ?? raw.dr ?? raw.debitAmount ?? raw.withdrawal ?? raw.withdraw,
    true,
  ) ?? 0;
  let credit = parseStrictOcrNumber(
    raw.credit ?? raw.cr ?? raw.creditAmount ?? raw.deposit,
    true,
  ) ?? 0;
  const balance = parseStrictOcrNumber(raw.balance ?? raw.bal ?? raw.runningBalance, false);
  const amount = parseStrictOcrNumber(raw.amount, true) ?? 0;
  if (debit <= 0 && credit <= 0) {
    const typeLower = (normalizedType || '').toLowerCase();
    if (amount > 0 && /\b(cr|credit)\b/.test(typeLower)) {
      credit = amount;
    } else if (amount > 0 && /\b(dr|debit)\b/.test(typeLower)) {
      debit = amount;
    }
  }
  const hasBalance = Number.isFinite(balance as number);
  if (debit <= 0 && credit <= 0 && !hasBalance && amount <= 0) return null;

  const typeLower = (normalizedType || '').toLowerCase();
  if (debit > 0 && credit > 0) {
    if (/\b(cr|credit)\b/.test(typeLower)) {
      credit = Math.max(credit, debit);
      debit = 0;
    } else if (/\b(dr|debit)\b/.test(typeLower)) {
      debit = Math.max(debit, credit);
      credit = 0;
    }
  }

  if (!hasBalance) typeTags.push('low_confidence');

  return {
    date: normalizedDate,
    description,
    category: pickString(raw.category)?.trim(),
    debit: roundMoney2(debit),
    credit: roundMoney2(credit),
    balance: hasBalance ? roundMoney2(Number(balance)) : undefined,
    amount: amount > 0 ? amount : undefined,
    type: typeTags.join('|') || undefined,
    refNumber: cleanedRef,
  };
};

const setLowConfidence = (row: RawTransaction): RawTransaction => {
  if (!row.type) return { ...row, type: 'low_confidence' };
  if (row.type.toLowerCase().includes('low_confidence')) return row;
  return { ...row, type: `${row.type}|low_confidence` };
};

const appendTypeTag = (row: RawTransaction, tag: string): RawTransaction => {
  const current = String(row.type || '').trim();
  if (!current) return { ...row, type: tag };
  if (current.split('|').includes(tag)) return row;
  return { ...row, type: `${current}|${tag}` };
};

const lockColumnsByBalanceDirection = (rows: RawTransaction[], strictMode: boolean): RawTransaction[] => {
  if (!strictMode || rows.length <= 1) return rows;
  const normalized = rows.map((row) => ({ ...row }));

  for (let i = 1; i < normalized.length; i += 1) {
    const prev = Number(normalized[i - 1].balance ?? NaN);
    const curr = Number(normalized[i].balance ?? NaN);
    if (!Number.isFinite(prev) || !Number.isFinite(curr)) continue;
    const delta = roundMoney2(curr - prev);
    if (Math.abs(delta) < 0.01) continue;

    const debit = roundMoney2(Math.abs(Number(normalized[i].debit || 0)));
    const credit = roundMoney2(Math.abs(Number(normalized[i].credit || 0)));
    const preferredSide: 'credit' | 'debit' = delta > 0 ? 'credit' : 'debit';
    const deltaAbs = roundMoney2(Math.abs(delta));
    const amount = chooseBalanceAwareAmount(debit, credit, deltaAbs, preferredSide);
    if (amount <= 0) continue;

    if (preferredSide === 'credit') {
      normalized[i].credit = amount;
      normalized[i].debit = 0;
    } else {
      normalized[i].debit = amount;
      normalized[i].credit = 0;
    }
  }

  return normalized;
};

const replaceDigitAt = (value: string, index: number, digit: string): string =>
  `${value.slice(0, index)}${digit}${value.slice(index + 1)}`;

const toAmountString = (value: number): string => roundMoney2(value).toFixed(2);

// Try the common OCR/Groq amount drift patterns before we trust the raw number.
const buildAmountCorrectionCandidates = (amount: number): number[] => {
  const candidates = new Set<number>();
  const addCandidate = (value: number) => {
    if (!Number.isFinite(value) || value <= 0) return;
    candidates.add(roundMoney2(value));
  };

  addCandidate(amount * 10);
  addCandidate(amount * 100);
  addCandidate(amount * 1000);
  addCandidate(amount / 10);
  addCandidate(amount / 100);
  addCandidate(amount / 1000);

  const compactAmount = toAmountString(amount).replace('.', '');
  for (let i = 0; i < compactAmount.length; i += 1) {
    const current = compactAmount[i];
    if (!/\d/.test(current)) continue;
    for (let d = 0; d <= 9; d += 1) {
      const digit = String(d);
      if (digit === current) continue;
      const swapped = replaceDigitAt(compactAmount, i, digit);
      const normalized = Number(`${swapped.slice(0, -2)}.${swapped.slice(-2)}`);
      addCandidate(normalized);
    }
    if (current === '6') addCandidate(Number(replaceDigitAt(compactAmount, i, '8').replace(/(\d{2})$/, '.$1')));
    if (current === '6') addCandidate(Number(replaceDigitAt(compactAmount, i, '9').replace(/(\d{2})$/, '.$1')));
    if (current === '8') addCandidate(Number(replaceDigitAt(compactAmount, i, '6').replace(/(\d{2})$/, '.$1')));
    if (current === '8') addCandidate(Number(replaceDigitAt(compactAmount, i, '9').replace(/(\d{2})$/, '.$1')));
    if (current === '9') addCandidate(Number(replaceDigitAt(compactAmount, i, '6').replace(/(\d{2})$/, '.$1')));
    if (current === '9') addCandidate(Number(replaceDigitAt(compactAmount, i, '8').replace(/(\d{2})$/, '.$1')));
  }

  return [...candidates];
};

const repairAmountUsingBalanceDelta = (observedAmount: number, expectedAmount: number): number => {
  if (!Number.isFinite(observedAmount) || observedAmount <= 0) return observedAmount;
  if (!Number.isFinite(expectedAmount) || expectedAmount <= 0) return roundMoney2(observedAmount);

  const target = roundMoney2(expectedAmount);
  const observed = roundMoney2(observedAmount);
  let best = observed;
  let bestDiff = Math.abs(observed - target);

  for (const candidate of buildAmountCorrectionCandidates(observed)) {
    const diff = Math.abs(candidate - target);
    if (diff + 0.0001 < bestDiff) {
      best = candidate;
      bestDiff = diff;
    }
  }

  const acceptanceWindow = Math.max(2, target * 0.05);
  if (bestDiff <= acceptanceWindow && bestDiff < Math.abs(observed - target)) {
    return roundMoney2(best);
  }

  return observed;
};

// Use the running balance to pick the amount that is most internally consistent.
const chooseBalanceAwareAmount = (
  debit: number,
  credit: number,
  expectedAmount: number,
  preferredSide: 'debit' | 'credit',
): number => {
  const candidates: Array<{ amount: number; side: 'debit' | 'credit' }> = [];
  if (debit > 0) {
    candidates.push({ amount: repairAmountUsingBalanceDelta(debit, expectedAmount), side: 'debit' });
  }
  if (credit > 0) {
    candidates.push({ amount: repairAmountUsingBalanceDelta(credit, expectedAmount), side: 'credit' });
  }

  if (candidates.length === 0) return 0;
  if (candidates.length === 1) return roundMoney2(candidates[0].amount);

  let best = candidates[0];
  let bestDiff = Math.abs(best.amount - expectedAmount);
  for (let i = 1; i < candidates.length; i += 1) {
    const candidate = candidates[i];
    const diff = Math.abs(candidate.amount - expectedAmount);
    if (diff + 0.0001 < bestDiff) {
      best = candidate;
      bestDiff = diff;
      continue;
    }
    if (Math.abs(diff - bestDiff) <= 0.01 && candidate.side === preferredSide && best.side !== preferredSide) {
      best = candidate;
      bestDiff = diff;
    }
  }

  return roundMoney2(best.amount);
};

const applyRowLevelBalanceValidation = (rows: RawTransaction[]): RawTransaction[] => {
  if (rows.length <= 1) return rows;
  const normalized = rows.map((row) => ({ ...row }));
  const tolerance = 1;

  for (let i = 1; i < normalized.length; i += 1) {
    const prevBalance = Number(normalized[i - 1].balance ?? NaN);
    const currentBalance = Number(normalized[i].balance ?? NaN);
    if (!Number.isFinite(prevBalance) || !Number.isFinite(currentBalance)) {
      normalized[i] = setLowConfidence(normalized[i]);
      continue;
    }

    let debit = roundMoney2(Math.abs(Number(normalized[i].debit || 0)));
    let credit = roundMoney2(Math.abs(Number(normalized[i].credit || 0)));
    const expectedBalance = roundMoney2(prevBalance + credit - debit);
    const diff = roundMoney2(Math.abs(expectedBalance - currentBalance));
    if (diff <= tolerance) {
      normalized[i].debit = debit;
      normalized[i].credit = credit;
      continue;
    }

    const delta = roundMoney2(currentBalance - prevBalance);
    const deltaAbs = roundMoney2(Math.abs(delta));
    if (deltaAbs <= 0) {
      normalized[i] = setLowConfidence({ ...normalized[i], debit, credit });
      continue;
    }

    if (debit <= 0 && credit <= 0) {
      if (delta > 0) {
        credit = deltaAbs;
      } else {
        debit = deltaAbs;
      }

      const inferredExpectedBalance = roundMoney2(prevBalance + credit - debit);
      const inferredDiff = roundMoney2(Math.abs(inferredExpectedBalance - currentBalance));
      if (inferredDiff <= tolerance) {
        normalized[i].debit = debit;
        normalized[i].credit = credit;
        normalized[i] = appendTypeTag(normalized[i], 'balance_inferred');
      } else {
        normalized[i] = setLowConfidence({ ...normalized[i], debit, credit });
      }
      continue;
    }

    const direction: 'credit' | 'debit' = delta >= 0 ? 'credit' : 'debit';
    const finalAmount = chooseBalanceAwareAmount(debit, credit, deltaAbs, direction);
    if (finalAmount <= 0) {
      normalized[i] = setLowConfidence({ ...normalized[i], debit, credit });
      continue;
    }

    if (direction === 'credit') {
      credit = finalAmount;
      debit = 0;
    } else {
      debit = finalAmount;
      credit = 0;
    }

    const correctedExpectedBalance = roundMoney2(prevBalance + credit - debit);
    const correctedDiff = roundMoney2(Math.abs(correctedExpectedBalance - currentBalance));
    if (correctedDiff <= tolerance) {
      normalized[i].debit = debit;
      normalized[i].credit = credit;
    } else {
      normalized[i] = setLowConfidence({ ...normalized[i], debit, credit });
    }
  }

  return normalized;
};

const scoreOcrRowConfidence = (
  row: RawTransaction,
  previousRow: RawTransaction | undefined,
  hasBalanceColumn: boolean,
): number => {
  let score = 1.0;
  const description = String(row.description || '').trim();
  const debit = Math.abs(Number(row.debit || 0));
  const credit = Math.abs(Number(row.credit || 0));
  const balance = Number(row.balance ?? NaN);
  const lowConfidenceTag = String(row.type || '').toLowerCase().includes('low_confidence');

  if (!description || description === OCR_UNREADABLE_DESCRIPTION) score -= 0.45;
  if (hasBalanceColumn && !Number.isFinite(balance)) score -= 0.45;
  if ((debit <= 0 && credit <= 0) || (debit > 0 && credit > 0)) score -= 0.3;
  if (lowConfidenceTag) score -= 0.3;

  if (previousRow && Number.isFinite(Number(previousRow.balance)) && Number.isFinite(balance)) {
    const prevBalance = Number(previousRow.balance ?? NaN);
    const expected = roundMoney2(prevBalance + credit - debit);
    const diff = Math.abs(expected - balance);
    if (diff > 1) score -= 0.35;
    else if (diff > 0.2) score -= 0.1;
  }

  return Math.max(0.2, Math.min(1, roundMoney2(score)));
};

const addOcrConfidence = (rows: RawTransaction[]): RawTransaction[] => {
  const hasBalanceColumn = rows.some((row) => Number.isFinite(Number(row.balance ?? NaN)));
  return rows.map((row, index) => ({
    ...row,
    confidence: scoreOcrRowConfidence(row, index > 0 ? rows[index - 1] : undefined, hasBalanceColumn),
  }));
};

const summarizeOcrMetadata = (rows: RawTransaction[], issues: string[] = []) => {
  const totalRows = rows.length;
  const avgConfidence =
    totalRows > 0
      ? roundMoney2(
          rows.reduce((sum, row) => sum + Number(row.confidence ?? 0.5), 0) / totalRows,
        )
      : 0;

  const lowConfidenceRows = rows.filter((row) => Number(row.confidence ?? 0) < LOW_CONFIDENCE_THRESHOLD).length;
  const unreadableRows = rows.filter((row) => row.description === OCR_UNREADABLE_DESCRIPTION).length;
  const uniqueIssues = [...issues];
  if (lowConfidenceRows > 0) uniqueIssues.push(`low_confidence_rows:${lowConfidenceRows}`);
  if (unreadableRows > 0) uniqueIssues.push(`unreadable_rows:${unreadableRows}`);

  return {
    total_rows: totalRows,
    avg_confidence: avgConfidence,
    issues: Array.from(new Set(uniqueIssues)),
  };
};

const hasLowConfidenceRows = (rows: RawTransaction[]): boolean =>
  rows.some((row) => Number(row.confidence ?? 0) < LOW_CONFIDENCE_THRESHOLD);

const scoreDatasetQuality = (rows: RawTransaction[]): number => {
  if (!rows.length) return 0;
  const flow = scoreRunningBalanceFlow(rows);
  const avgConfidence =
    rows.reduce((sum, row) => sum + Number(row.confidence ?? 0.5), 0) / rows.length;
  const sizeBoost = Math.min(0.1, rows.length / 500);
  return roundMoney2(avgConfidence - flow.mismatchRatio * 0.7 + sizeBoost);
};

const selectBetterOcrDataset = (
  currentRows: RawTransaction[],
  candidateRows: RawTransaction[],
): RawTransaction[] => {
  if (candidateRows.length === 0) return currentRows;
  if (currentRows.length === 0) return candidateRows;

  const currentScore = scoreDatasetQuality(currentRows);
  const candidateScore = scoreDatasetQuality(candidateRows);
  if (candidateScore > currentScore + 0.03) return candidateRows;

  const currentFlow = scoreRunningBalanceFlow(currentRows);
  const candidateFlow = scoreRunningBalanceFlow(candidateRows);
  const scoreGap = Math.abs(candidateScore - currentScore);
  if (
    scoreGap <= 0.02 &&
    candidateRows.length > currentRows.length &&
    candidateFlow.mismatchRatio <= currentFlow.mismatchRatio + 0.05
  ) {
    return candidateRows;
  }

  return currentRows;
};

export const normalizeOcrRawTransactions = (
  rows: unknown[],
  options?: OcrNormalizeOptions,
): RawTransaction[] => {
  const normalizedRows: RawTransaction[] = [];
  for (const row of rows) {
    const parsed = normalizeOcrTransaction(row as Record<string, unknown>);
    if (!parsed) continue;
    normalizedRows.push(parsed);
  }

  const locked = lockColumnsByBalanceDirection(normalizedRows, options?.strictColumnLock ?? true);
  const validated = applyRowLevelBalanceValidation(locked);
  return addOcrConfidence(validated);
};

export async function callTesseractOcrWorker(
  imageBase64: string,
  mimeType: string,
  fileName?: string,
): Promise<OCRResult> {
  if (!OCR_WORKER_URL) {
    return {
      success: false,
      error: 'Tesseract OCR worker not configured',
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OCR_WORKER_TIMEOUT_MS);
  try {
    const response = await fetch(`${OCR_WORKER_URL}/ocr/page`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(OCR_WORKER_API_KEY ? { 'x-api-key': OCR_WORKER_API_KEY } : {}),
      },
      body: JSON.stringify({
        imageBase64,
        mimeType,
        fileName,
        debug: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      return {
        success: false,
        error: `Tesseract OCR worker error: ${response.status}${errorText ? ` ${errorText}` : ''}`,
      };
    }

    const payload = await response.json() as {
      success?: boolean;
      text?: string;
      transactions?: unknown[];
      bankMetadata?: Record<string, unknown> | null;
      error?: string;
    };

    if (!payload.success) {
      return {
        success: false,
        error: payload.error || 'Tesseract OCR worker returned failure',
      };
    }

    const normalizedTransactions = Array.isArray(payload.transactions)
      ? normalizeOcrRawTransactions(payload.transactions, { strictColumnLock: true })
      : [];

    return {
      success: normalizedTransactions.length > 0 || Boolean(payload.text),
      transactions: normalizedTransactions,
      bankMetadata: payload.bankMetadata ? normalizeBankMetadata(payload.bankMetadata) : undefined,
      metadata: summarizeOcrMetadata(normalizedTransactions),
      text: payload.text || '',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Tesseract OCR worker request failed',
    };
  } finally {
    clearTimeout(timeout);
  }
}

type GroqVisionOcrOptions = {
  strictTableMode?: boolean;
};

export async function callGroqVisionOCR(
  imageBase64: string,
  mimeType: string,
  options?: GroqVisionOcrOptions,
): Promise<OCRResult> {
  const GROQ_API_KEY = readEnv('GROQ_API_KEY');
  
  if (!GROQ_API_KEY) {
    console.log('GROQ_API_KEY not configured, skipping Groq Vision OCR');
    return { success: false, error: 'Groq API key not configured' };
  }
  
  try {
    const strictTableMode = options?.strictTableMode === true;
    const prompt = strictTableMode ? OCR_PROMPT_STRICT_TABLE : OCR_PROMPT;
    console.log(`Calling Groq Llama Vision for OCR (${strictTableMode ? 'strict-table' : 'standard'})...`);
    
    const dataUrl = `data:${mimeType};base64,${imageBase64}`;

    const requestPayload = {
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt + '\n\nExtract bank metadata and ALL transactions from this bank statement. Return only JSON object.' },
            {
              type: 'image_url',
              image_url: { url: dataUrl }
            }
          ]
        }
      ],
      // Keep this deterministic and structured for table extraction.
      response_format: { type: 'json_object' as const },
      temperature: 0,
      top_p: 1,
      max_tokens: strictTableMode ? 9500 : 8000,
    };

    let response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload)
    });
    
    if (!response.ok) {
      const firstErrorText = await response.text();
      // Some environments may reject response_format for this endpoint/model.
      // Retry once without response_format before failing hard.
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
          })
        });
      }
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Groq Vision OCR error:', response.status, errorText || firstErrorText);
        return { success: false, error: `Groq API error: ${response.status}` };
      }
    }
    
    const data = await response.json();
    const textContent = data.choices?.[0]?.message?.content;
    
    if (!textContent) {
      return { success: false, error: 'No content in Groq response' };
    }
    
    // Try to parse as new format (object with bankMetadata and transactions)
    const objectMatch = textContent.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        const parsed = JSON.parse(objectMatch[0]);

        // Check if it's the new format with bankMetadata
        if (parsed.bankMetadata && parsed.transactions) {
          console.log(`Groq Vision OCR extracted ${parsed.transactions.length} transactions with bank metadata`);
          const normalizedTransactions = normalizeOcrRawTransactions(parsed.transactions, { strictColumnLock: strictTableMode });
          const issues: string[] = [];

          if (!strictTableMode && normalizedTransactions.length > 0 && hasLowConfidenceRows(normalizedTransactions)) {
            // Lean pipeline: avoid nested OCR retries inside provider-level function.
            // Retry orchestration is controlled only by convert-document.
            issues.push('low_confidence_detected');
          }

          return {
            success: true,
            transactions: normalizedTransactions,
            bankMetadata: normalizeBankMetadata(parsed.bankMetadata),
            metadata: summarizeOcrMetadata(normalizedTransactions, issues),
            text: textContent
          };
        }

        // If it's just an object but has date/description, it might be a single transaction
        if (parsed.date && parsed.description) {
          const normalizedTransactions = normalizeOcrRawTransactions([parsed], { strictColumnLock: strictTableMode });
          return {
            success: true,
            transactions: normalizedTransactions,
            metadata: summarizeOcrMetadata(normalizedTransactions),
            text: textContent,
          };
        }
      } catch (parseError) {
        console.log('Object parse failed, trying array format...');
      }
    }
    
    // Fallback: Try to parse as array (old format)
    const jsonMatch = textContent.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        const transactions = JSON.parse(jsonMatch[0]);
        console.log(`Groq Vision OCR extracted ${transactions.length} transactions (legacy format)`);
        const normalizedTransactions = normalizeOcrRawTransactions(transactions, { strictColumnLock: strictTableMode });
        return {
          success: true,
          transactions: normalizedTransactions,
          metadata: summarizeOcrMetadata(normalizedTransactions),
          text: textContent,
        };
      } catch (parseError) {
        console.error('Failed to parse Groq JSON:', parseError);
        return { success: true, text: textContent };
      }
    }
    
    return { success: true, text: textContent };
  } catch (error) {
    console.error('Groq Vision OCR error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export async function callMistralVisionOCR(
  imageBase64: string,
  mimeType: string,
): Promise<OCRResult> {
  const MISTRAL_API_KEY = readEnv('MISTRAL_API_KEY');
  if (!MISTRAL_API_KEY) {
    return { success: false, error: 'Mistral API key not configured' };
  }

  try {
    const dataUrl = `data:${mimeType};base64,${imageBase64}`;
    const response = await fetch('https://api.mistral.ai/v1/ocr', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MISTRAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-ocr-latest',
        document: {
          type: 'image_url',
          image_url: dataUrl,
        },
        include_image_base64: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Mistral OCR error:', response.status, errorText);
      return { success: false, error: `Mistral OCR API error: ${response.status}` };
    }

    const payload = await response.json() as Record<string, unknown>;
    const pages = Array.isArray(payload.pages) ? payload.pages as Array<Record<string, unknown>> : [];
    const markdownText = pages
      .map((page) => (typeof page.markdown === 'string' ? page.markdown : ''))
      .filter(Boolean)
      .join('\n');

    const bankMetadata = pages.length > 0 && typeof pages[0].dimensions === 'object'
      ? undefined
      : undefined;

    if (!markdownText.trim()) {
      return { success: true, text: '', transactions: [] };
    }

    let transactions = parseTransactionsFromMarkdownTables(markdownText);
    if (transactions.length === 0) {
      transactions = recoverAdcbTransactionsFromOcrText(markdownText);
    }
    const normalizedTransactions = normalizeOcrRawTransactions(transactions, { strictColumnLock: true });

    return {
      success: true,
      text: markdownText,
      transactions: normalizedTransactions,
      metadata: summarizeOcrMetadata(normalizedTransactions),
      bankMetadata,
    };
  } catch (error) {
    console.error('Mistral OCR failure:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Mistral OCR request failed',
    };
  }
}

const MONTH_TO_NUM: Record<string, string> = {
  jan: '01',
  january: '01',
  feb: '02',
  february: '02',
  mar: '03',
  march: '03',
  apr: '04',
  april: '04',
  may: '05',
  jun: '06',
  june: '06',
  jul: '07',
  july: '07',
  aug: '08',
  august: '08',
  sep: '09',
  sept: '09',
  september: '09',
  oct: '10',
  october: '10',
  nov: '11',
  november: '11',
  dec: '12',
  december: '12',
};

const parseStatementDate = (value: string, defaultYear?: string): string | undefined => {
  const normalizeTwoDigitYear = (yearToken: string): string => {
    if (yearToken.length !== 2) return yearToken;
    const parsed = Number(yearToken);
    if (!Number.isFinite(parsed)) return `20${yearToken}`;
    return parsed < 50 ? `20${yearToken}` : `19${yearToken}`;
  };

  const clean = value.trim();
  const iso = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const slash = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (slash) {
    const dd = slash[1].padStart(2, '0');
    const mm = slash[2].padStart(2, '0');
    const yyyy = normalizeTwoDigitYear(slash[3]);
    return `${yyyy}-${mm}-${dd}`;
  }

  const monthText = clean.match(/^(\d{1,2})[-/ ]([A-Za-z]{3,9})[-/ ](\d{2,4})$/);
  const monthTextWithoutYear = clean.match(/^(\d{1,2})[-/ ]([A-Za-z]{3,9})[-/]?$/);
  const monthFirst = clean.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{2,4})$/);
  const monthFirstWithoutYear = clean.match(/^([A-Za-z]{3,9})\s+(\d{1,2})$/);
  const dateMatch = monthText || monthTextWithoutYear || monthFirst || monthFirstWithoutYear;
  if (!dateMatch) return undefined;
  const dd = monthText || monthTextWithoutYear ? dateMatch[1].padStart(2, '0') : dateMatch[2].padStart(2, '0');
  const mm = MONTH_TO_NUM[(monthText || monthTextWithoutYear) ? dateMatch[2].toLowerCase() : dateMatch[1].toLowerCase()];
  if (!mm) return undefined;
  const yearTokenRaw = monthText
    ? monthText[3]
    : monthFirst
      ? monthFirst[3]
      : defaultYear;
  let yearToken = yearTokenRaw;
  if (yearToken && defaultYear) {
    const yearNum = Number(yearToken);
    // OCR often repeats the day token as a fake year (e.g., 07-Jan-07). Treat it as missing year.
    if (Number.isFinite(yearNum) && yearNum >= 0 && yearNum <= 31) {
      yearToken = defaultYear;
    }
  }
  if (!yearToken) return undefined;
  const yyyy = normalizeTwoDigitYear(yearToken);
  return `${yyyy}-${mm}-${dd}`;
};

const normalizeMoneyToken = (value: string): string => {
  let raw = value.trim();
  if (!raw) return '';

  // Keep only numeric/sign/separator characters.
  raw = raw.replace(/[^\d,.-]/g, '');
  if (!raw) return '';

  // Preserve negative sign only at the front.
  const isNegative = raw.startsWith('-');
  raw = raw.replace(/-/g, '');

  const dotCount = (raw.match(/\./g) || []).length;
  const commaCount = (raw.match(/,/g) || []).length;

  // Determine decimal separator by the rightmost separator.
  const lastDot = raw.lastIndexOf('.');
  const lastComma = raw.lastIndexOf(',');
  const decimalSeparator = lastDot > lastComma ? '.' : lastComma > -1 ? ',' : '';

  let normalized = raw;
  if (decimalSeparator) {
    const lastSepIndex = normalized.lastIndexOf(decimalSeparator);
    const integerPart = normalized.slice(0, lastSepIndex).replace(/[.,]/g, '');
    const fractionPart = normalized.slice(lastSepIndex + 1).replace(/[.,]/g, '');
    if (fractionPart.length > 0) {
      normalized = `${integerPart}.${fractionPart}`;
    } else {
      normalized = integerPart;
    }
  } else if (dotCount > 1 || commaCount > 1) {
    // Fallback for malformed values with repeated separators but no clear decimal split.
    const lastSep = Math.max(lastDot, lastComma);
    const integerPart = normalized.slice(0, lastSep).replace(/[.,]/g, '');
    const fractionPart = normalized.slice(lastSep + 1).replace(/[.,]/g, '');
    normalized = fractionPart ? `${integerPart}.${fractionPart}` : integerPart;
  } else {
    normalized = normalized.replace(/[.,]/g, '');
  }

  if (isNegative) normalized = `-${normalized}`;
  return normalized;
};

const parseMoney = (value: string): number => {
  const normalized = normalizeMoneyToken(value);
  if (!normalized) return 0;
  const num = Number(normalized);
  return Number.isFinite(num) ? num : 0;
};

const parseMoneyMaybe = (value: string | undefined): number | undefined => {
  if (!value) return undefined;

  const direct = parseMoney(value);
  if (Number.isFinite(direct) && Math.abs(direct) > 0) {
    return Math.abs(direct);
  }

  const match = value.match(/-?\d{1,3}(?:[., ]\d{3})+[.,]\d{2}|-?\d{1,3}(?:,\d{3})*\.\d{2}|-?\d+\.\d{2}/);
  if (!match) return undefined;
  const parsed = parseMoney(match[0]);
  return Number.isFinite(parsed) ? Math.abs(parsed) : undefined;
};

const roundTo2 = (value: number): number => Math.round(value * 100) / 100;

const toFiniteAmount = (value: unknown): number => {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;
  return roundTo2(Math.abs(n));
};

const toFiniteBalance = (value: unknown): number | undefined => {
  const n = Number(value ?? NaN);
  if (!Number.isFinite(n)) return undefined;
  return roundTo2(n);
};

export const correctMinorBalanceDrift = (
  transactions: RawTransaction[],
  maxDiff = 0.1,
): { transactions: RawTransaction[]; correctedCount: number } => {
  if (!transactions || transactions.length <= 1) {
    return {
      transactions: (transactions || []).map((row) => ({
        ...row,
        debit: toFiniteAmount(row.debit),
        credit: toFiniteAmount(row.credit),
        balance: toFiniteBalance(row.balance),
      })),
      correctedCount: 0,
    };
  }

  const normalized = transactions.map((row) => ({
    ...row,
    debit: toFiniteAmount(row.debit),
    credit: toFiniteAmount(row.credit),
    balance: toFiniteBalance(row.balance),
  }));

  let correctedCount = 0;
  let prevBalance = normalized[0].balance;

  for (let i = 1; i < normalized.length; i += 1) {
    const row = normalized[i];
    const currentBalance = row.balance;
    if (!Number.isFinite(Number(prevBalance)) || !Number.isFinite(Number(currentBalance))) {
      prevBalance = currentBalance;
      continue;
    }

    const expected = roundTo2(Number(prevBalance) + Number(row.credit || 0) - Number(row.debit || 0));
    const diff = roundTo2(Number(currentBalance) - expected);

    if (Math.abs(diff) > 0 && Math.abs(diff) <= maxDiff) {
      normalized[i] = {
        ...row,
        balance: expected,
      };
      correctedCount += 1;
      prevBalance = expected;
      continue;
    }

    prevBalance = currentBalance;
  }

  return { transactions: normalized, correctedCount };
};

const detectBankNameFromText = (text: string): string | undefined => {
  const lines = text
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const headerText = lines.slice(0, 40).join(' ');
  const headerCandidates: Array<[RegExp, string]> = [
    [/state bank of india/i, 'State Bank of India'],
    [/hdfc bank/i, 'HDFC Bank'],
    [/icici bank/i, 'ICICI Bank'],
    [/axis bank/i, 'Axis Bank'],
    [/emirates\s+nbd/i, 'Emirates NBD'],
    [/abu dhabi commercial bank/i, 'ADCB'],
    [/first abu dhabi bank/i, 'FAB'],
    [/wio bank/i, 'Wio Bank'],
    [/bank of baroda/i, 'Bank of Baroda'],
    [/punjab national bank/i, 'Punjab National Bank'],
    [/kotak mahindra bank/i, 'Kotak Mahindra Bank'],
    [/canara bank/i, 'Canara Bank'],
    [/indian bank/i, 'Indian Bank'],
    [/idfc first bank/i, 'IDFC FIRST Bank'],
    [/federal bank/i, 'Federal Bank'],
    [/yes bank/i, 'YES Bank'],
    [/chase/i, 'Chase'],
    [/bank of america/i, 'Bank of America'],
    [/wells fargo/i, 'Wells Fargo'],
    [/citibank|citi bank/i, 'Citi'],
    [/barclays/i, 'Barclays'],
    [/hsbc/i, 'HSBC'],
    [/lloyds/i, 'Lloyds'],
    [/natwest/i, 'NatWest'],
    [/monzo/i, 'Monzo'],
    [/revolut/i, 'Revolut'],
    [/dbs/i, 'DBS'],
    [/ocbc/i, 'OCBC'],
    [/uob/i, 'UOB'],
    [/standard chartered/i, 'Standard Chartered'],
  ];

  for (const [pattern, label] of headerCandidates) {
    if (pattern.test(headerText)) return label;
  }

  const lower = text.toLowerCase();
  const knownBanks: Array<[RegExp, string]> = [
    [/state bank of india|sbi/i, 'State Bank of India'],
    [/hdfc/i, 'HDFC Bank'],
    [/icici/i, 'ICICI Bank'],
    [/axis bank/i, 'Axis Bank'],
    [/adcb|abu dhabi commercial bank/i, 'ADCB'],
    [/emirates\s+nbd/i, 'Emirates NBD'],
    [/fab|first abu dhabi bank/i, 'FAB'],
    [/wio bank|wio/i, 'Wio Bank'],
  ];

  for (const [pattern, label] of knownBanks) {
    if (pattern.test(lower)) return label;
  }
  return undefined;
};

const pickLongest = (values: string[]): string | undefined => {
  const cleaned = values.map((v) => v.trim()).filter(Boolean);
  if (cleaned.length === 0) return undefined;
  return cleaned.sort((a, b) => b.length - a.length)[0];
};

const extractCurrencyCode = (text: string): string | undefined => {
  const match = text.toUpperCase().match(/\b(AED|USD|INR|EUR|GBP|SAR|QAR|OMR|KWD|BHD|SGD|AUD|CAD|CHF)\b/);
  return match?.[1];
};

const extractAccountNumberFromText = (text: string): string | undefined => {
  const accountLine =
    text.match(/account\s*(?:no|number)\.?\s*:\s*([^\n]+)/i)?.[1] ||
    text.match(/a\/c\s*no\.?\s*:\s*([^\n]+)/i)?.[1];
  if (!accountLine) return undefined;

  const beforeName = accountLine.split(/account\s*name\s*:/i)[0];
  const compact = beforeName.replace(/\s+/g, ' ').trim();
  const direct = compact.match(/\b[A-Z0-9-]{8,}\b/g);
  if (direct && direct.length > 0) {
    // Prefer candidate with most digits.
    const ranked = direct
      .map((token) => ({ token, digits: (token.match(/\d/g) || []).length }))
      .sort((a, b) => b.digits - a.digits || b.token.length - a.token.length);
    return ranked[0].token;
  }
  return undefined;
};

const extractAccountHolderFromText = (text: string): string | undefined => {
  const direct = text.match(/account\s*name\s*:\s*([^\n]+)/i)?.[1];
  if (direct) {
    const value = direct.replace(/\s+/g, ' ').trim();
    if (value) return value;
  }
  return undefined;
};

const extractStatementPeriodFromText = (text: string): string | undefined => {
  const lines = text
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const patterns: RegExp[] = [
    /statement of transactions[\s\S]{0,120}?for the period\s+(.+?)\s+(?:to|[-–—])\s+(.+)$/i,
    /statement period\s*[:\-]?\s*(.+?)\s+(?:to|[-–—])\s+(.+)$/i,
    /date range\s*[:\-]?\s*(.+?)\s+(?:to|[-–—])\s+(.+)$/i,
    /\bperiod\b\s*[:\-]?\s*(.+?)\s+(?:to|[-–—])\s+(.+)$/i,
    /start\s*date\s*:\s*(.+?)\s+end\s*date\s*:\s*(.+)$/i,
    /\bfrom\b\s*:?\s*(.+?)\s+(?:to|[-–—])\s+(.+)$/i,
  ];

  for (const rawLine of lines.slice(0, 120)) {
    const line = rawLine.replace(/\s+/g, ' ').trim();
    if (!/(statement of transactions|statement period|for the period|date range|\bperiod\b|\bfrom\b)/i.test(line)) continue;
    if (
      /(transaction date|value date|debit|credit|balance|particulars|withdrawals|deposits)/i.test(line) &&
      !/(statement of transactions|statement period|for the period|date range)/i.test(line)
    ) {
      continue;
    }

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (!match) continue;
      const from = parseStatementDate(match[1]) || match[1].trim();
      const to = parseStatementDate(match[2]) || match[2].trim();
      if (from && to) {
        return `${from} - ${to}`;
      }
    }
  }
  return undefined;
};

export const extractBankMetadataFromOcrText = (text: string): BankMetadata | undefined => {
  const input = String(text || '');
  if (!input.trim()) return undefined;

  const ibanMatches = input.toUpperCase().match(/\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g) || [];
  const iban = pickLongest(Array.from(new Set(ibanMatches)));

  const openingBalance = parseMoneyMaybe(
    input.match(/opening(?:\s+balance)?\s*:\s*([0-9,]+\.\d{2})/i)?.[1],
  );
  const closingBalance = parseMoneyMaybe(
    input.match(/closing(?:\s*\(available\))?\s*balance\s*:\s*([0-9,]+\.\d{2})/i)?.[1],
  );

  const metadata: BankMetadata = {
    bankName: detectBankNameFromText(input) || '',
    accountNumber: extractAccountNumberFromText(input) || '',
    accountHolder: extractAccountHolderFromText(input) || '',
    currency: extractCurrencyCode(input) || '',
    iban,
    statementPeriod: extractStatementPeriodFromText(input),
    openingBalance,
    closingBalance,
  };

  const hasValue = Object.values(metadata).some((value) => {
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'number') return Number.isFinite(value);
    return false;
  });

  return hasValue ? metadata : undefined;
};

const normalizeMarkdownText = (value: string): string =>
  value
    .replace(/\r/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/\t/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const splitMarkdownRow = (line: string): string[] => {
  const trimmed = line.trim();
  if (!trimmed.includes('|')) return [];
  const rawParts = trimmed.split('|').map((part) => part.trim());
  const startsWithPipe = trimmed.startsWith('|');
  const endsWithPipe = trimmed.endsWith('|');
  const parts = [...rawParts];
  if (startsWithPipe && parts.length > 0 && parts[0] === '') parts.shift();
  if (endsWithPipe && parts.length > 0 && parts[parts.length - 1] === '') parts.pop();
  return parts;
};

const isMarkdownSeparatorRow = (cells: string[]): boolean => {
  if (cells.length === 0) return false;
  return cells.every((cell) => /^:?-{2,}:?$/.test(cell.replace(/\s+/g, '')));
};

const normalizeHeaderCell = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

type MarkdownHeaderMap = {
  dateIndex: number;
  valueDateIndex?: number;
  descriptionIndex?: number;
  refIndex?: number;
  debitIndex?: number;
  creditIndex?: number;
  balanceIndex?: number;
};

const matchesHeaderAlias = (normalizedHeader: string, alias: string): boolean => {
  if (!alias) return false;
  if (normalizedHeader === alias) return true;
  // Avoid broad false matches (e.g., "date" matching "value date")
  if (alias.length < 6) return false;
  return normalizedHeader.includes(alias);
};

const hasHeaderAlias = (normalizedHeader: string, aliases: string[]): boolean =>
  aliases.some((alias) => matchesHeaderAlias(normalizedHeader, alias));

const buildMarkdownHeaderMap = (headers: string[], aliases: HeaderAliasMap): MarkdownHeaderMap | null => {
  let dateIndex = -1;
  let valueDateIndex = -1;
  let descriptionIndex = -1;
  let refIndex = -1;
  let debitIndex = -1;
  let creditIndex = -1;
  let balanceIndex = -1;

  headers.forEach((header, index) => {
    const h = normalizeHeaderCell(header);
    if (hasHeaderAlias(h, aliases.valueDate) || h.includes('posting date')) {
      valueDateIndex = index;
      return;
    }
    if (hasHeaderAlias(h, aliases.date) || h.includes('transaction date') || h.startsWith('txn date')) {
      dateIndex = index;
      return;
    }
    if (hasHeaderAlias(h, aliases.description) || h.includes('particular')) {
      descriptionIndex = index;
      return;
    }
    if (hasHeaderAlias(h, aliases.reference) || h.includes('reference') || h.includes('txn id')) {
      refIndex = index;
      return;
    }
    if (hasHeaderAlias(h, aliases.debit) || h.startsWith('debit') || h.endsWith(' debit')) {
      debitIndex = index;
      return;
    }
    if (hasHeaderAlias(h, aliases.credit) || h.startsWith('credit') || h.endsWith(' credit')) {
      creditIndex = index;
      return;
    }
    if (hasHeaderAlias(h, aliases.balance) || h.includes('running balance') || h.endsWith(' balance')) {
      balanceIndex = index;
    }
  });

  if (dateIndex < 0 && valueDateIndex >= 0) dateIndex = valueDateIndex;
  if (dateIndex < 0) return null;
  if (debitIndex < 0 && creditIndex < 0 && balanceIndex < 0) return null;

  return {
    dateIndex,
    valueDateIndex: valueDateIndex >= 0 ? valueDateIndex : undefined,
    descriptionIndex: descriptionIndex >= 0 ? descriptionIndex : undefined,
    refIndex: refIndex >= 0 ? refIndex : undefined,
    debitIndex: debitIndex >= 0 ? debitIndex : undefined,
    creditIndex: creditIndex >= 0 ? creditIndex : undefined,
    balanceIndex: balanceIndex >= 0 ? balanceIndex : undefined,
  };
};

const parseTransactionsFromMarkdownTables = (markdown: string): RawTransaction[] => {
  const lines = normalizeMarkdownText(markdown).split('\n').map((line) => line.trim()).filter(Boolean);
  const headerAliases = GENERIC_HEADER_ALIASES;
  const rows: RawTransaction[] = [];
  let index = 0;

  while (index < lines.length) {
    const headerCells = splitMarkdownRow(lines[index]);
    if (headerCells.length < 3) {
      index += 1;
      continue;
    }

    const headerMap = buildMarkdownHeaderMap(headerCells, headerAliases);
    if (!headerMap) {
      index += 1;
      continue;
    }

    const separatorCells = splitMarkdownRow(lines[index + 1] || '');
    if (!isMarkdownSeparatorRow(separatorCells)) {
      index += 1;
      continue;
    }

    index += 2;
    while (index < lines.length) {
      const cells = splitMarkdownRow(lines[index]);
      if (cells.length === 0) break;
      if (isMarkdownSeparatorRow(cells)) {
        index += 1;
        continue;
      }
      if (cells.length < headerCells.length - 2) break;

      const dateToken = cells[headerMap.dateIndex];
      const parsedDate = parseStatementDate(dateToken || '');
      if (!parsedDate) {
        index += 1;
        continue;
      }

      const descriptionPieces: string[] = [];
      if (headerMap.descriptionIndex !== undefined && cells[headerMap.descriptionIndex]) {
        descriptionPieces.push(cells[headerMap.descriptionIndex]);
      }
      if (descriptionPieces.length === 0) {
        cells.forEach((cell, colIdx) => {
          if (
            colIdx === headerMap.dateIndex ||
            colIdx === headerMap.valueDateIndex ||
            colIdx === headerMap.debitIndex ||
            colIdx === headerMap.creditIndex ||
            colIdx === headerMap.balanceIndex ||
            colIdx === headerMap.refIndex
          ) {
            return;
          }
          if (cell) descriptionPieces.push(cell);
        });
      }

      const debit = parseMoneyMaybe(headerMap.debitIndex !== undefined ? cells[headerMap.debitIndex] : undefined) || 0;
      const credit = parseMoneyMaybe(headerMap.creditIndex !== undefined ? cells[headerMap.creditIndex] : undefined) || 0;
      const balance = parseMoneyMaybe(headerMap.balanceIndex !== undefined ? cells[headerMap.balanceIndex] : undefined);
      const refNumber = headerMap.refIndex !== undefined ? normalizeReferenceToken(cells[headerMap.refIndex] || '') : '';

      if (!Number.isFinite(balance as number)) {
        index += 1;
        continue;
      }

      rows.push({
        date: parsedDate,
        description: collapseWhitespace(descriptionPieces.join(' ').replace(/\|/g, ' ')) || 'Transaction',
        debit: Math.abs(debit),
        credit: Math.abs(credit),
        balance: Number(balance),
        refNumber: refNumber || undefined,
      });

      index += 1;
    }
  }

  return rows;
};

type CandidateRow = {
  row: RawTransaction;
  index: number;
};

const normalizeDateKey = (date: string | undefined): string => {
  if (!date) return '';
  const parsed = parseStatementDate(date);
  return parsed || date.trim();
};

const toMinor = (value: number | undefined): number => Math.round((Number(value) || 0) * 100);

const rowQualityScore = (row: RawTransaction, previousBalance?: number): number => {
  let score = 0;
  const debit = Math.abs(Number(row.debit || 0));
  const credit = Math.abs(Number(row.credit || 0));
  const balance = Number(row.balance ?? NaN);
  const descriptionLen = (row.description || '').trim().length;
  const refLen = (row.refNumber || '').trim().length;

  score += Math.min(26, Math.floor(descriptionLen / 3));
  if (refLen > 0) score += Math.min(8, Math.floor(refLen / 3) + 2);
  if ((debit > 0 && credit === 0) || (credit > 0 && debit === 0)) score += 24;
  if (debit > 0 && credit > 0) score -= 14;
  if (debit === 0 && credit === 0) score -= 30;

  if (Number.isFinite(previousBalance) && Number.isFinite(balance)) {
    const diff = Math.abs((Number(previousBalance) + credit - debit) - balance);
    score += Math.max(-30, 16 - Math.round(diff * 4));
  }

  return score;
};

const buildFallbackMatchKey = (row: RawTransaction): string => {
  const dateKey = normalizeDateKey(row.date);
  const amountMinor = Math.max(toMinor(row.debit), toMinor(row.credit));
  return `${dateKey}|${amountMinor}`;
};

const findBestSecondaryMatch = (
  primaryRow: RawTransaction,
  secondaryRows: CandidateRow[],
): number => {
  if (secondaryRows.length === 0) return -1;

  const primaryDate = normalizeDateKey(primaryRow.date);
  const primaryBalanceMinor = toMinor(primaryRow.balance);
  const primaryFallbackKey = buildFallbackMatchKey(primaryRow);
  let bestIndex = -1;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let i = 0; i < secondaryRows.length; i += 1) {
    const candidate = secondaryRows[i].row;
    const candidateDate = normalizeDateKey(candidate.date);
    if (primaryDate && candidateDate && primaryDate !== candidateDate) continue;

    const candidateBalanceMinor = toMinor(candidate.balance);
    const balanceDiff = Math.abs(primaryBalanceMinor - candidateBalanceMinor);

    let score = Number.POSITIVE_INFINITY;
    if (Number.isFinite(primaryBalanceMinor) && Number.isFinite(candidateBalanceMinor)) {
      score = balanceDiff;
    } else if (buildFallbackMatchKey(candidate) === primaryFallbackKey) {
      score = 0;
    }

    if (score < bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  if (bestIndex < 0) return -1;
  return bestScore <= 200 ? bestIndex : -1;
};

export const mergeOcrTransactionsDeterministic = (
  primaryRows: RawTransaction[],
  secondaryRows: RawTransaction[],
): RawTransaction[] => {
  if (primaryRows.length === 0) return secondaryRows;
  if (secondaryRows.length === 0) return primaryRows;

  const secondaryPool: CandidateRow[] = secondaryRows.map((row, index) => ({ row, index }));
  const merged: RawTransaction[] = [];
  const dedupe = new Set<string>();
  let previousBalance: number | undefined;

  const commitRow = (row: RawTransaction) => {
    const key = `${normalizeDateKey(row.date)}|${toMinor(row.debit)}|${toMinor(row.credit)}|${toMinor(row.balance)}`;
    if (dedupe.has(key)) return;
    dedupe.add(key);
    merged.push(row);
    const b = Number(row.balance ?? NaN);
    previousBalance = Number.isFinite(b) ? b : previousBalance;
  };

  for (const primaryRow of primaryRows) {
    const matchIndex = findBestSecondaryMatch(primaryRow, secondaryPool);
    if (matchIndex < 0) {
      commitRow(primaryRow);
      continue;
    }

    const [matched] = secondaryPool.splice(matchIndex, 1);
    const primaryScore = rowQualityScore(primaryRow, previousBalance);
    const secondaryScore = rowQualityScore(matched.row, previousBalance);
    commitRow(secondaryScore > primaryScore ? matched.row : primaryRow);
  }

  for (const leftover of secondaryPool.sort((a, b) => a.index - b.index)) {
    commitRow(leftover.row);
  }

  return merged;
};

const isLikelyAdcbStatementText = (value: string): boolean => {
  const lower = value.toLowerCase();
  return (
    (lower.includes('statement of accounts') || lower.includes('statement of account')) &&
    (lower.includes('adcb') || lower.includes('procash')) &&
    lower.includes('debit') &&
    lower.includes('credit')
  );
};

type AdcbRowDraft = {
  date: string;
  rawText: string;
  amount: number;
  balance: number;
  refNumber?: string;
  sideHint?: 'debit' | 'credit';
};

const scoreBalanceTransition = (
  prevBalance: number,
  amount: number,
  nextBalance: number,
): { asCreditDiff: number; asDebitDiff: number } => {
  const asCreditDiff = Math.abs((prevBalance + amount) - nextBalance);
  const asDebitDiff = Math.abs((prevBalance - amount) - nextBalance);
  return { asCreditDiff, asDebitDiff };
};

const buildDescriptionFromAdcbRow = (raw: string): string => {
  return raw
    .replace(/^\s*[[(]?\d+\s*/g, ' ')
    .replace(/\b\d{1,2}[-/](?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[-/]\d{2,4}\b/gi, ' ')
    .replace(/\b\d{1,2}[-/](?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/gi, ' ')
    .replace(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g, ' ')
    .replace(/\b(?:phub|mob|m\d{6,}|ae\d{5,}|e\d{6,})[a-z0-9/.-]*\b/gi, ' ')
    .replace(/\b\d{1,3}(?:,\d{3})*\.\d{2}\b/g, ' ')
    .replace(/\b(?:debit|credit|running|balance|value|date|reference|amount)\b/gi, ' ')
    .replace(/[_[\]{}|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const inferAdcbSideHintFromRawRow = (
  rawRow: string,
  balanceToken: string,
): 'debit' | 'credit' | undefined => {
  if (!rawRow || !balanceToken) return undefined;
  const normalizedBalance = balanceToken.replace(/\s+/g, '');
  if (!normalizedBalance) return undefined;

  const normalizedRow = rawRow.replace(/\s+/g, ' ');
  const balancePattern = new RegExp(`${escapeRegex(normalizedBalance)}\\b`, 'i');
  const balanceMatch = normalizedRow.match(balancePattern);
  if (!balanceMatch || typeof balanceMatch.index !== 'number') return undefined;

  const beforeBalance = normalizedRow.slice(0, balanceMatch.index);
  const tailTokens =
    beforeBalance.match(/-|\d{1,3}(?:[., ]\d{3})+[.,]\d{2}|\d{1,3}(?:,\d{3})*\.\d{2}|\d+\.\d{2}/g) || [];
  if (tailTokens.length < 2) return undefined;

  const prevToken = tailTokens[tailTokens.length - 2];
  const lastToken = tailTokens[tailTokens.length - 1];
  if (prevToken === '-' && lastToken !== '-') return 'credit';
  if (lastToken === '-' && prevToken !== '-') return 'debit';
  return undefined;
};

const determineDefaultStatementYear = (ocrText: string): string | undefined => {
  const startDate = ocrText.match(/start\s+date[^0-9]*(\d{1,2}[-/][A-Za-z]{3}[-/]\d{2,4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i);
  if (startDate) {
    const parsed = parseStatementDate(startDate[1]);
    if (parsed) return parsed.slice(0, 4);
  }
  const reportDate = ocrText.match(/report\s+date[^0-9]*(\d{1,2}[-/][A-Za-z]{3}[-/]\d{2,4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i);
  if (reportDate) {
    const parsed = parseStatementDate(reportDate[1]);
    if (parsed) return parsed.slice(0, 4);
  }
  return undefined;
};

const extractAdcbDraftRowsFromText = (ocrText: string): AdcbRowDraft[] => {
  const normalizedLines = ocrText
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) =>
      line
        .replace(/[|]/g, ' ')
        .replace(/[_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean);

  const tableHeaderPattern = /value\s+bank\s+customer\s+description/i;
  const rowStartPattern =
    /^\s*[[(]?\d+\s+[^\n]*?\d{1,2}\s*[-/]\s*[A-Za-z]{3}\s*[-/]/i;
  const rowStartDateLeadPattern = /^\s*[[(]?\d{1,2}\s*[-/]\s*[A-Za-z]{3}\s*[-/]?/i;
  const rowStartHintPattern = /\b(?:phub|mob|b\/o|trf|salary|o\/w)\b/i;
  const dateTokenPattern = /(\d{1,2}\s*[-/]\s*[A-Za-z]{3}(?:\s*[-/]\s*\d{2,4})?)/i;
  const amountPattern = /\d{1,3}(?:[., ]\d{3})+[.,]\d{2}|\d{1,3}(?:,\d{3})*\.\d{2}|\d+\.\d{2}/g;
  const drafts: AdcbRowDraft[] = [];
  const defaultYear = determineDefaultStatementYear(ocrText);
  let tableSeen = false;

  let current: { dateRaw: string; parts: string[] } | null = null;
  const flushCurrent = () => {
    if (!current) return;
    const joined = current.parts.join(' ').replace(/\s+/g, ' ').trim();
    const amounts = joined.match(amountPattern) || [];
    if (amounts.length >= 2) {
      const amountToken = amounts[amounts.length - 2];
      const balanceToken = amounts[amounts.length - 1];
      const amount = parseMoney(amountToken);
      const balance = parseMoney(balanceToken);
      const parsedDate =
        parseStatementDate(current.dateRaw.replace(/\s+/g, ''), defaultYear) ||
        parseStatementDate(current.dateRaw, defaultYear);
      if (parsedDate && Number.isFinite(amount) && Number.isFinite(balance) && amount > 0) {
        const refMatch = joined.match(/\b(?:PHUB|MOB|M\d{6,}|AE\d{5,})[A-Z0-9/.-]*\b/i);
        const sideHint = inferAdcbSideHintFromRawRow(joined, balanceToken);
        drafts.push({
          date: parsedDate,
          rawText: joined,
          amount,
          balance,
          refNumber: refMatch?.[0],
          sideHint,
        });
      }
    }
    current = null;
  };

  for (const line of normalizedLines) {
    if (tableHeaderPattern.test(line)) {
      tableSeen = true;
      continue;
    }
    if (!tableSeen) continue;
    if (/^date value date|statement of accounts|total debit amount|total credit amount|this is a system generated statement/i.test(line)) continue;
    const fixedLine = line.replace(/(\d{1,2})\s*-\s*([A-Za-z]{3})\s*-\s*(\d{2,4})/g, '$1-$2-$3');
    const isRowStart =
      rowStartPattern.test(fixedLine) ||
      (rowStartDateLeadPattern.test(fixedLine) && rowStartHintPattern.test(fixedLine));

    if (isRowStart) {
      flushCurrent();
      const dateToken = fixedLine.match(dateTokenPattern)?.[1];
      if (!dateToken) continue;
      current = { dateRaw: dateToken, parts: [fixedLine] };
      continue;
    }

    if (current) {
      current.parts.push(fixedLine);
    }
  }
  flushCurrent();

  return drafts;
};

const determineFirstBalance = (ocrText: string): number | undefined => {
  const patterns = [
    /opening\s*(?:\/\s*)?balance[^0-9]*(\d{1,3}(?:[., ]\d{3})+[.,]\d{2}|\d+\.\d{2})/i,
    /openingbalance[^0-9]*(\d{1,3}(?:[., ]\d{3})+[.,]\d{2}|\d+\.\d{2})/i,
  ];
  for (const pattern of patterns) {
    const match = ocrText.match(pattern);
    if (!match) continue;
    const value = parseMoney(match[1]);
    if (Number.isFinite(value)) return value;
  }
  return undefined;
};

const inferDebitCreditFromDrafts = (drafts: AdcbRowDraft[], openingBalance?: number): RawTransaction[] => {
  if (drafts.length === 0) return [];

  const rows: RawTransaction[] = [];
  let prevBalance = Number.isFinite(openingBalance as number) ? Number(openingBalance) : undefined;

  for (let i = 0; i < drafts.length; i += 1) {
    const draft = drafts[i];
    const description = buildDescriptionFromAdcbRow(draft.rawText) || 'Transaction';

    let debit = 0;
    let credit = 0;
    const baseAmount = Math.abs(draft.amount);
    let resolvedAmount = baseAmount;

    if (prevBalance !== undefined) {
      const delta = draft.balance - prevBalance;
      const deltaAbs = Math.abs(delta);
      resolvedAmount = repairAmountUsingBalanceDelta(baseAmount, deltaAbs);

      if (deltaAbs > 0.01) {
        if (delta > 0) {
          credit = resolvedAmount;
        } else {
          debit = resolvedAmount;
        }
      } else if (draft.sideHint === 'credit') {
        credit = resolvedAmount;
      } else if (draft.sideHint === 'debit') {
        debit = resolvedAmount;
      } else {
        const { asCreditDiff, asDebitDiff } = scoreBalanceTransition(prevBalance, resolvedAmount, draft.balance);
        if (asCreditDiff <= asDebitDiff) {
          credit = resolvedAmount;
        } else {
          debit = resolvedAmount;
        }
      }
    } else if (draft.sideHint === 'credit') {
      credit = resolvedAmount;
    } else if (draft.sideHint === 'debit') {
      debit = resolvedAmount;
    } else if (i + 1 < drafts.length) {
      const nextDelta = drafts[i + 1].balance - draft.balance;
      if (nextDelta < 0) {
        credit = resolvedAmount;
      } else {
        debit = resolvedAmount;
      }
    } else {
      debit = resolvedAmount;
    }

    rows.push({
      date: draft.date,
      description,
      debit,
      credit,
      balance: draft.balance,
      refNumber: draft.refNumber,
    });

    prevBalance = draft.balance;
  }

  return rows;
};

export const scoreRunningBalanceFlow = (transactions: RawTransaction[]): { mismatchRatio: number; total: number; matched: number } => {
  if (transactions.length <= 1) {
    return { mismatchRatio: 0, total: Math.max(0, transactions.length - 1), matched: Math.max(0, transactions.length - 1) };
  }

  let matched = 0;
  let total = 0;
  for (let i = 1; i < transactions.length; i += 1) {
    const prev = Number(transactions[i - 1].balance ?? NaN);
    const current = Number(transactions[i].balance ?? NaN);
    const debit = Math.abs(Number(transactions[i].debit ?? 0));
    const credit = Math.abs(Number(transactions[i].credit ?? 0));
    if (!Number.isFinite(prev) || !Number.isFinite(current)) continue;

    total += 1;
    const diff = Math.abs((prev + credit - debit) - current);
    const magnitude = Math.max(Math.abs(debit), Math.abs(credit), Math.abs(prev), Math.abs(current));
    const tolerance = Math.max(0.05, Math.min(3, magnitude * 0.0015)); // 0.15% tolerance, capped at 3
    if (diff <= tolerance) matched += 1;
  }

  const mismatchRatio = total > 0 ? (total - matched) / total : 1;
  return { mismatchRatio, total, matched };
};

export type ClientPdfParseAssessment = {
  useDeterministic: boolean;
  requiresHeavyOcr: boolean;
  mismatchRatio: number;
  anomalyRate: number;
  reason: string;
};

const computeBalanceDeltaAmountAnomalyRate = (transactions: RawTransaction[]): { checks: number; anomalies: number; rate: number } => {
  if (transactions.length <= 1) {
    return { checks: 0, anomalies: 0, rate: 0 };
  }

  let checks = 0;
  let anomalies = 0;

  for (let i = 1; i < transactions.length; i += 1) {
    const prev = Number(transactions[i - 1].balance ?? NaN);
    const current = Number(transactions[i].balance ?? NaN);
    if (!Number.isFinite(prev) || !Number.isFinite(current)) continue;

    const delta = Math.abs(current - prev);
    if (delta < 10) continue;

    const debit = Math.abs(Number(transactions[i].debit ?? 0));
    const credit = Math.abs(Number(transactions[i].credit ?? 0));
    const amount = Math.max(debit, credit);
    checks += 1;

    if (!Number.isFinite(amount) || amount <= 0) {
      anomalies += 1;
      continue;
    }

    const diff = Math.abs(delta - amount);
    const tolerance = Math.max(1, delta * 0.02); // 2% tolerance for OCR noise
    const amountTooSmall = amount < delta * 0.6;
    const largeResidual = diff > delta * 0.2;

    if (diff > tolerance && (amountTooSmall || largeResidual)) {
      anomalies += 1;
    }
  }

  return {
    checks,
    anomalies,
    rate: checks > 0 ? anomalies / checks : 0,
  };
};

export const assessClientPdfParsedTransactions = (
  transactions: RawTransaction[],
  pageCount = 1,
): ClientPdfParseAssessment => {
  const normalizedPageCount = Number.isFinite(pageCount) ? Math.max(1, Math.floor(pageCount)) : 1;
  const flow = scoreRunningBalanceFlow(transactions);
  const mismatchRatio = flow.total > 0 ? flow.mismatchRatio : 0;
  const anomalyStats = computeBalanceDeltaAmountAnomalyRate(transactions);
  const anomalyRate = anomalyStats.rate;

  if (transactions.length === 0) {
    return {
      useDeterministic: false,
      requiresHeavyOcr: normalizedPageCount >= 3,
      mismatchRatio: 1,
      anomalyRate: 1,
      reason:
        normalizedPageCount >= 3
          ? 'No reliable text-layer rows found in a multi-page PDF'
          : 'No reliable text-layer rows found; OCR fallback required',
    };
  }

  if (normalizedPageCount >= 3 && transactions.length < Math.max(6, normalizedPageCount * 2)) {
    return {
      useDeterministic: false,
      requiresHeavyOcr: true,
      mismatchRatio,
      anomalyRate,
      reason: 'Text-layer extraction is too sparse for this multi-page PDF',
    };
  }

  const severeMismatch = transactions.length >= 8 && flow.total >= 5 && mismatchRatio >= 0.45;
  const severeAnomaly =
    anomalyStats.checks >= 3 &&
    anomalyStats.anomalies >= 2 &&
    anomalyRate >= 0.45;
  if (severeMismatch || severeAnomaly) {
    return {
      useDeterministic: false,
      requiresHeavyOcr: true,
      mismatchRatio,
      anomalyRate,
      reason: 'Deterministic text-layer data is unreliable and needs heavy OCR',
    };
  }

  const needsOcrValidation =
    (transactions.length >= 6 && flow.total >= 4 && mismatchRatio >= 0.22) ||
    (anomalyStats.checks >= 3 && anomalyRate >= 0.2);
  if (needsOcrValidation) {
    return {
      useDeterministic: false,
      requiresHeavyOcr: false,
      mismatchRatio,
      anomalyRate,
      reason: 'Deterministic text-layer data needs OCR validation',
    };
  }

  return {
    useDeterministic: true,
    requiresHeavyOcr: false,
    mismatchRatio,
    anomalyRate,
    reason: 'Deterministic text-layer extraction is stable',
  };
};

export const recoverAdcbTransactionsFromOcrText = (ocrText: string): RawTransaction[] => {
  if (!ocrText || !isLikelyAdcbStatementText(ocrText)) return [];
  const drafts = extractAdcbDraftRowsFromText(ocrText);
  if (drafts.length === 0) return [];
  const openingBalance = determineFirstBalance(ocrText);
  return inferDebitCreditFromDrafts(drafts, openingBalance);
};

// ============= DOCUMENT TYPE CLASSIFIER =============
export interface DocumentClassification {
  type: 'digital' | 'text' | 'scanned' | 'image';
  textDensity: number;
  needsOCR: boolean;
  confidence: number;
}

export interface DocumentClassificationMetrics {
  rawTextLength: number;
  charsPerPage: number;
  selectableTextDetected: boolean;
}

export function classifyDocument(
  extractedText: string, 
  fileBytes: Uint8Array, 
  fileName: string,
  metrics?: DocumentClassificationMetrics,
): DocumentClassification {
  const lowerName = fileName.toLowerCase();
  
  // Images always need OCR
  if (!lowerName.endsWith('.pdf')) {
    return {
      type: 'image',
      textDensity: 0,
      needsOCR: true,
      confidence: 1.0,
    };
  }

  if (metrics?.selectableTextDetected === true && (metrics?.charsPerPage ?? 0) > 50) {
    return {
      type: 'text',
      textDensity: metrics.charsPerPage || metrics.rawTextLength || 0,
      needsOCR: false,
      confidence: 1.0,
    };
  }

  return {
    type: 'scanned',
    textDensity: metrics?.charsPerPage || 0,
    needsOCR: true,
    confidence: 0.5,
  };
}
