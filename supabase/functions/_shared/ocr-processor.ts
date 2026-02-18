// ============= GROQ VISION OCR PROCESSOR =============
// Using Groq's Llama Vision model for OCR

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
    "statementPeriod": "e.g., 01/01/2025 - 31/01/2025",
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

Return ONLY valid JSON. No markdown, no code blocks.`;

const pickString = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return undefined;
};

const collapseWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

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

export async function callGroqVisionOCR(
  imageBase64: string, 
  mimeType: string
): Promise<OCRResult> {
  const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
  
  if (!GROQ_API_KEY) {
    console.log('GROQ_API_KEY not configured, skipping Groq Vision OCR');
    return { success: false, error: 'Groq API key not configured' };
  }
  
  try {
    console.log('Calling Groq Llama Vision for OCR...');
    
    const dataUrl = `data:${mimeType};base64,${imageBase64}`;
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: OCR_PROMPT + '\n\nExtract bank metadata and ALL transactions from this bank statement. Return only JSON object.' },
              { 
                type: 'image_url', 
                image_url: { url: dataUrl } 
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 8000,
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq Vision OCR error:', response.status, errorText);
      return { success: false, error: `Groq API error: ${response.status}` };
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
          return {
            success: true,
            transactions: normalizeRawTransactions(parsed.transactions),
            bankMetadata: normalizeBankMetadata(parsed.bankMetadata),
            text: textContent
          };
        }

        // If it's just an object but has date/description, it might be a single transaction
        if (parsed.date && parsed.description) {
          return { success: true, transactions: normalizeRawTransactions([parsed]), text: textContent };
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
        return { success: true, transactions: normalizeRawTransactions(transactions), text: textContent };
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

// ============= DOCUMENT TYPE CLASSIFIER =============
export interface DocumentClassification {
  type: 'digital' | 'scanned' | 'image';
  textDensity: number;
  needsOCR: boolean;
  confidence: number;
}

export function classifyDocument(
  extractedText: string, 
  fileBytes: Uint8Array, 
  fileName: string
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
  
  // All PDFs need OCR since we can't extract text in edge functions
  return {
    type: 'scanned',
    textDensity: 0,
    needsOCR: true,
    confidence: 1.0,
  };
}
