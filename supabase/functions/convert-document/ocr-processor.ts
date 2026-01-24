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

const OCR_PROMPT = `You are an expert OCR and bank statement data extraction specialist with advanced image recognition capabilities.

CRITICAL OCR INSTRUCTIONS:
1. Carefully examine EVERY pixel of the document for transaction data
2. For scanned/image documents: Use OCR to read text even if slightly blurry or at an angle
3. Look for transaction tables - columns for: Date, Description/Narration, Debit/Withdrawal, Credit/Deposit, Balance
4. If image quality is poor, make best-effort extraction
5. Process ALL pages of multi-page documents
6. Handle watermarks, stamps, and overlapping text
7. Recognize various fonts and handwritten annotations

UNIVERSAL SCHEMA (all fields required):
- date: Normalized to YYYY-MM-DD format (handle DD/MM/YYYY, MM/DD/YYYY, DD-Mon-YY, etc.)
- description: Clean transaction description
- category: Classify into: Salary/Income, Transfer In, Transfer Out, Bills & Utilities, Shopping, Food & Dining, Transportation, Entertainment, Healthcare, Education, Insurance, Investments, Loan/EMI, Cash, Bank Fees, Other
- debit: Amount debited (positive number, 0 if credit)
- credit: Amount credited (positive number, 0 if debit)
- balance: Running balance after transaction

BANK-SPECIFIC HANDLING:
- Emirates Islamic/NBD: Handle Arabic text alongside English
- HDFC/ICICI/SBI: Handle lakhs format (1,23,456)
- US Banks: Handle MM/DD/YYYY dates, ACH/Wire transfers
- UK Banks: Handle DD/MM/YYYY, Faster Payments/BACS

Return ONLY a valid JSON array, no markdown, no explanation.`;

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
