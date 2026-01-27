// ============= GROQ VISION OCR PROCESSOR =============
// Using Groq's Llama Vision model for OCR

export interface BankMetadata {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  currency: string;
  iban?: string;
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
    "statementPeriod": "e.g., 01/01/2025 - 31/01/2025",
    "openingBalance": 1000.00,
    "closingBalance": 5000.00
  },
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "refNumber": "Reference/Transaction ID from the document (P123456, UTR123, TXN789, etc.)",
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

AMOUNT RULES:
1. DEBIT = money OUT - positive number
2. CREDIT = money IN - positive number  
3. BALANCE = running balance after transaction
4. Remove currency symbols and commas
5. Handle formats: "1,234.56", "1,23,456", "-500"

Return ONLY valid JSON. No markdown, no code blocks.`;

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
            transactions: parsed.transactions, 
            bankMetadata: parsed.bankMetadata,
            text: textContent 
          };
        }
        
        // If it's just an object but has date/description, it might be a single transaction
        if (parsed.date && parsed.description) {
          return { success: true, transactions: [parsed], text: textContent };
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
        return { success: true, transactions, text: textContent };
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
