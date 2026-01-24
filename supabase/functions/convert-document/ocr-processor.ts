// ============= GROQ VISION OCR PROCESSOR =============
// Using Groq's Llama Vision model for OCR

export interface OCRResult {
  success: boolean;
  text?: string;
  transactions?: RawTransaction[];
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
}

const OCR_PROMPT = `You are an expert OCR and bank statement data extraction specialist.

CRITICAL: Extract ALL transactions with their EXACT NUMERICAL amounts from the document.

OUTPUT FORMAT - Return JSON array with these exact fields:
[
  {
    "date": "YYYY-MM-DD",
    "description": "transaction narration/description", 
    "debit": 1234.56,
    "credit": 0,
    "balance": 5678.90
  }
]

AMOUNT EXTRACTION RULES:
1. DEBIT = money going OUT (withdrawals, payments, fees) - MUST be a positive number
2. CREDIT = money coming IN (deposits, salary, transfers received) - MUST be a positive number  
3. BALANCE = running balance after transaction - MUST be the exact number shown
4. If amount column is empty or "-", use 0
5. Remove commas from numbers: "1,234.56" becomes 1234.56
6. Handle Indian format: "1,23,456" becomes 123456
7. Handle negative signs: "-500" for debit means debit: 500

DATE FORMAT:
- Convert any date format to YYYY-MM-DD
- DD/MM/YYYY, DD-MM-YYYY, DD Mon YYYY → YYYY-MM-DD

LOOK FOR TABLE COLUMNS:
- Date/Value Date/Transaction Date
- Particulars/Narration/Description/Details
- Withdrawal/Debit/Dr/Out
- Deposit/Credit/Cr/In  
- Balance/Running Balance/Closing Balance

Return ONLY valid JSON array. No markdown, no explanation, no code blocks.`;

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
              { type: 'text', text: OCR_PROMPT + '\n\nExtract ALL transactions from this bank statement. Return only JSON array.' },
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
    
    // Parse JSON from response
    const jsonMatch = textContent.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        const transactions = JSON.parse(jsonMatch[0]);
        console.log(`Groq Vision OCR extracted ${transactions.length} transactions`);
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
