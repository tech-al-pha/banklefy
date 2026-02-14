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
COPY EXACTLY AS SHOWN. Do NOT add prefixes or alter case.
If no reference number exists for a row, return an empty string.

DO NOT merge content across different pages or rows.
IGNORE headers, footers, summaries, opening/closing balance lines, and page-break artifacts. Only real transaction rows.

AMOUNT RULES:
1. DEBIT = money OUT - positive number
2. CREDIT = money IN - positive number  
3. BALANCE = running balance after transaction
4. Remove currency symbols and commas
5. Handle formats: "1,234.56", "1,23,456", "-500"

Return ONLY valid JSON. No markdown, no code blocks.`;

const pickString = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return undefined;
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
    raw.date ??
    raw.txnDate ??
    raw.transactionDate ??
    raw.valueDate ??
    raw.postingDate;

  const descriptionRaw =
    raw.description ??
    raw.narration ??
    raw.details ??
    raw.memo ??
    raw.particulars;

  const extractRefFromText = (text?: string | null): string | undefined => {
    if (!text) return undefined;
    const value = String(text);
    const patterns = [
      /(?:ref(?:erence)?|ref no|txn|transaction|utr|rrn|imps|neft|upi|rtgs|id|tr ref)[:\-\s#]*([A-Za-z0-9\/\-]{5,})/i,
    ];
    for (const pattern of patterns) {
      const match = value.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return undefined;
  };

  let ref =
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
  if (ref === undefined || ref === null || String(ref).trim() === '') {
    const refFromDesc = extractRefFromText(pickString(descriptionRaw));
    if (refFromDesc) {
      ref = refFromDesc;
    }
  }

  return {
    date: pickString(dateRaw)?.trim() || 'Unknown',
    description: pickString(descriptionRaw)?.trim() || 'Unknown Transaction',
    category: pickString(raw.category)?.trim(),
    debit: toNumber(raw.debit ?? raw.dr ?? raw.debitAmount ?? raw.withdrawal ?? raw.withdraw),
    credit: toNumber(raw.credit ?? raw.cr ?? raw.creditAmount ?? raw.deposit),
    balance: toNumber(raw.balance ?? raw.bal ?? raw.runningBalance),
    amount: toNumber(raw.amount),
    type: pickString(raw.type ?? raw.txnType ?? raw.transactionType)?.trim(),
    refNumber: ref === undefined || ref === null ? undefined : String(ref),
  };
};

const normalizeTransactions = (rows: unknown[]): RawTransaction[] => {
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
            transactions: normalizeTransactions(parsed.transactions), 
            bankMetadata: normalizeBankMetadata(parsed.bankMetadata),
            text: textContent 
          };
        }
        
        // If it's just an object but has date/description, it might be a single transaction
        if (parsed.date && parsed.description) {
          return { success: true, transactions: normalizeTransactions([parsed]), text: textContent };
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
        return { success: true, transactions: normalizeTransactions(transactions), text: textContent };
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
