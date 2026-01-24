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

// IMPORTANT (Deterministic pipeline): Groq Vision is used ONLY for OCR (image/PDF page → raw text).
// We DO NOT ask the model to infer/compute debit/credit/balance.
// After OCR, we parse transactions using rule-based + regex logic.
const OCR_PROMPT = `You are an OCR engine. Transcribe the document EXACTLY as seen.

CRITICAL:
1) Output MUST be plain text (NOT JSON).
2) Preserve line breaks and table row structure as much as possible.
3) Do NOT summarize, do NOT categorize, do NOT calculate.
4) Ensure all numbers (amounts/balances) are transcribed exactly.

Return only the plain text transcription.`;

const monthMap: Record<string, number> = {
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

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function normalizeDate(raw: string): string {
  const s = (raw || '').trim();
  if (!s) return '';

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (dmy) {
    const dd = Number(dmy[1]);
    const mm = Number(dmy[2]);
    let yyyy = Number(dmy[3]);
    if (yyyy < 100) yyyy = 2000 + yyyy;
    return `${yyyy}-${pad2(mm)}-${pad2(dd)}`;
  }

  // DD Mon YYYY
  const mon = s.match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{2,4})$/);
  if (mon) {
    const dd = Number(mon[1]);
    const mKey = mon[2].toLowerCase();
    const mm = monthMap[mKey] ?? monthMap[mKey.slice(0, 3)] ?? 0;
    let yyyy = Number(mon[3]);
    if (yyyy < 100) yyyy = 2000 + yyyy;
    if (mm >= 1 && mm <= 12) {
      return `${yyyy}-${pad2(mm)}-${pad2(dd)}`;
    }
  }

  return s;
}

function parseAmount(raw: string): number {
  const s = (raw || '')
    .replace(/[₹$,AEDa-zA-Z]/g, '')
    .replace(/[\s]/g, '')
    .replace(/,/g, '')
    .trim();

  if (!s || s === '-' || s === '—') return 0;
  const num = Number(String(s).replace(/^-/g, ''));
  return Number.isFinite(num) ? Math.abs(num) : 0;
}

// Extract transactions from OCR text using deterministic regex.
// Strategy: find lines starting with a date and ending with 2-3 numeric columns (amounts/balance).
export function parseTransactionsFromOCRText(text: string): RawTransaction[] {
  if (!text) return [];

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Heuristic: if we find a header line, start after it
  let startAt = 0;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].toLowerCase();
    if (l.includes('date') && l.includes('balance') && (l.includes('debit') || l.includes('withdraw') || l.includes('credit') || l.includes('deposit'))) {
      startAt = i + 1;
      break;
    }
  }

  const out: RawTransaction[] = [];
  const datePrefix = /^(\d{4}-\d{2}-\d{2}|\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|\d{1,2}\s+[A-Za-z]{3,}\s+\d{2,4})\b/;
  const tail3 = /(-?\d[\d,]*\.?\d{0,2})\s+(-?\d[\d,]*\.?\d{0,2})\s+(-?\d[\d,]*\.?\d{0,2})\s*$/;
  const tail2 = /(-?\d[\d,]*\.?\d{0,2})\s+(-?\d[\d,]*\.?\d{0,2})\s*$/;

  for (let i = startAt; i < lines.length; i++) {
    const line = lines[i];
    const dm = line.match(datePrefix);
    if (!dm) continue;

    const dateRaw = dm[1];
    const rest = line.slice(dm[0].length).trim();
    if (!rest) continue;

    // Try 3-column tail: debit credit balance (or withdrawal deposit balance)
    const m3 = rest.match(tail3);
    if (m3) {
      const description = rest.replace(m3[0], '').trim();
      out.push({
        date: normalizeDate(dateRaw),
        description: description || 'Unknown Transaction',
        debit: parseAmount(m3[1]),
        credit: parseAmount(m3[2]),
        balance: parseAmount(m3[3]),
      });
      continue;
    }

    // Try 2-column tail: amount + balance
    const m2 = rest.match(tail2);
    if (m2) {
      const description = rest.replace(m2[0], '').trim();
      const amt = parseAmount(m2[1]);
      const bal = parseAmount(m2[2]);
      const hint = (description + ' ' + rest).toLowerCase();
      const isCredit = /\b(cr|credit|deposit|received)\b/.test(hint);
      const isDebit = /\b(dr|debit|withdraw|paid|purchase|fee|charge)\b/.test(hint);

      out.push({
        date: normalizeDate(dateRaw),
        description: description || 'Unknown Transaction',
        debit: isCredit && !isDebit ? 0 : amt,
        credit: isCredit && !isDebit ? amt : 0,
        balance: bal,
      });
    }
  }

  return out;
}

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
    
    const parsed = parseTransactionsFromOCRText(textContent);
    console.log(`Groq Vision OCR text length=${textContent.length}, parsedTransactions=${parsed.length}`);
    return { success: true, text: textContent, transactions: parsed };
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
