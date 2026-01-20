// ============= GEMINI FLASH OCR PROCESSOR =============
// Specialized for scanned/image documents

export interface GeminiOCRResult {
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

const GEMINI_OCR_PROMPT = `You are an expert OCR and bank statement data extraction specialist with advanced image recognition capabilities.

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

export async function callGeminiFlashOCR(
  imageBase64: string, 
  mimeType: string
): Promise<GeminiOCRResult> {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  
  if (!GEMINI_API_KEY) {
    console.log('GEMINI_API_KEY not configured, skipping Gemini OCR');
    return { success: false, error: 'Gemini API key not configured' };
  }
  
  try {
    console.log('Calling Gemini 1.5 Flash for OCR...');
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: GEMINI_OCR_PROMPT + '\n\nExtract ALL transactions from this bank statement. Return only JSON array.' },
              { 
                inline_data: { 
                  mime_type: mimeType, 
                  data: imageBase64 
                } 
              }
            ]
          }],
          generationConfig: { 
            temperature: 0.1,
            maxOutputTokens: 8192,
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          ]
        })
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini OCR error:', response.status, errorText);
      return { success: false, error: `Gemini API error: ${response.status}` };
    }
    
    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textContent) {
      return { success: false, error: 'No content in Gemini response' };
    }
    
    // Parse JSON from response
    const jsonMatch = textContent.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        const transactions = JSON.parse(jsonMatch[0]);
        console.log(`Gemini OCR extracted ${transactions.length} transactions`);
        return { success: true, transactions, text: textContent };
      } catch (parseError) {
        console.error('Failed to parse Gemini JSON:', parseError);
        return { success: true, text: textContent };
      }
    }
    
    return { success: true, text: textContent };
  } catch (error) {
    console.error('Gemini OCR error:', error);
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
  
  // Calculate text density for PDFs
  const textLength = extractedText.length;
  const textDensity = fileBytes.length > 0 ? textLength / fileBytes.length : 0;
  
  // If text density > 0.01 and text > 500 chars, it's a digital PDF
  if (textDensity > 0.01 && textLength > 500) {
    return {
      type: 'digital',
      textDensity,
      needsOCR: false,
      confidence: Math.min(1.0, textDensity * 10),
    };
  }
  
  // Otherwise it's likely scanned
  return {
    type: 'scanned',
    textDensity,
    needsOCR: true,
    confidence: 1.0 - Math.min(0.9, textDensity * 10),
  };
}

// ============= TEXT EXTRACTION FROM PDFJS =============
export async function extractTextWithPDFJS(
  bytes: Uint8Array,
  pdfjsLib: any,
  password?: string
): Promise<{ text: string; pageCount: number }> {
  try {
    const loadingOptions: any = { data: bytes.slice() };
    if (password) {
      loadingOptions.password = password.trim();
    }
    
    const loadingTask = pdfjsLib.getDocument(loadingOptions);
    const pdfDocument = await loadingTask.promise;
    
    const textParts: string[] = [];
    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .filter((item: any) => 'str' in item)
        .map((item: any) => item.str || '')
        .join(' ');
      textParts.push(`--- Page ${pageNum} ---\n${pageText}`);
    }
    
    return {
      text: textParts.join('\n\n'),
      pageCount: pdfDocument.numPages,
    };
  } catch (error) {
    console.error('PDFJS extraction error:', error);
    throw error;
  }
}
