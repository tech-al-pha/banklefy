// ============= SPECIALIZED AI ORCHESTRATOR =============
// Routes tasks to the best AI for each job, with error tracking
// IMPORTANT: Gemini removed - Groq Vision only for OCR, rule-based for everything else

import { callGroqVisionOCR, normalizeRawTransactions, type RawTransaction, type BankMetadata } from '../_shared/ocr-processor.ts';
import { callMistralCategorizer, type ProcessedTransaction } from '../_shared/mistral-processor.ts';
import { callGroqCategorizer, applyPatternCategorization, CATEGORY_LIST } from '../_shared/categorizer.ts';

// ============= ERROR TRACKING =============
export interface AIProcessingStatus {
  groqVision: { used: boolean; success: boolean; error?: string; time?: number };
  mistral: { used: boolean; success: boolean; error?: string; time?: number };
  groqText: { used: boolean; success: boolean; error?: string; time?: number };
  patternFallback: { used: boolean; success: boolean };
}

export interface ExtractionResult {
  transactions: RawTransaction[];
  status: AIProcessingStatus;
  extractedText?: string;
  bankMetadata?: BankMetadata;
}

export interface CategorizationResult {
  transactions: ProcessedTransaction[];
  status: AIProcessingStatus;
}

// ============= LAYER 1: OCR/EXTRACTION =============
// Groq Vision is the ONLY AI for OCR - deterministic pipeline
// No Gemini, No Lovable AI for extraction

export async function performExtraction(
  base64Data: string,
  mimeType: string,
  extractedText: string
): Promise<ExtractionResult> {
  const status: AIProcessingStatus = {
    groqVision: { used: false, success: false },
    mistral: { used: false, success: false },
    groqText: { used: false, success: false },
    patternFallback: { used: false, success: false },
  };
  
  let transactions: RawTransaction[] = [];
  let finalExtractedText = extractedText;
  
  // ===== STEP 1: Groq Vision (Primary OCR - Fastest) =====
  console.log('🔹 LAYER 1: Groq Vision OCR (Primary - Only AI for OCR)...');
  const groqStartTime = Date.now();
  status.groqVision.used = true;
  
  const ocrResult = await callGroqVisionOCR(base64Data, mimeType);
  status.groqVision.time = Date.now() - groqStartTime;
  const bankMetadata = ocrResult.bankMetadata;
  
  if (ocrResult.success && ocrResult.transactions && ocrResult.transactions.length > 0) {
    transactions = ocrResult.transactions;
    status.groqVision.success = true;
    console.log(`✅ Groq Vision extracted ${transactions.length} transactions in ${status.groqVision.time}ms`);
    return { transactions, status, extractedText: ocrResult.text, bankMetadata };
  } else if (ocrResult.success && ocrResult.text) {
    finalExtractedText = ocrResult.text;
    status.groqVision.success = true;
    console.log(`✅ Groq Vision extracted text (${finalExtractedText.length} chars), will try Groq Text next`);
  } else {
    status.groqVision.error = ocrResult.error || 'No data extracted';
    console.log(`❌ Groq Vision failed: ${status.groqVision.error}`);
  }
  
  // ===== STEP 2: Groq Text (If we have text but no transactions) =====
  if (transactions.length === 0 && finalExtractedText && finalExtractedText.trim().length > 100) {
    console.log('🔹 LAYER 2: Groq Text Extraction...');
    const groqTextStartTime = Date.now();
    status.groqText.used = true;
    
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    if (GROQ_API_KEY) {
      try {
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              {
                role: 'system',
                content: `Extract ALL transactions from this bank statement text.

Return JSON array with: date (YYYY-MM-DD), refNumber (as shown in the document), description, debit (number), credit (number), balance (number).
If both Transaction Date and Value Date/Posting Date exist, use Transaction Date as date.
If refNumber is not present for a row, return an empty string.
Populate refNumber only when a dedicated reference column exists. If ID appears only inside description text, keep it in description and set refNumber to "".
Ignore headers, footers, summaries, opening/closing balance lines, and page-break artifacts.
Return ONLY the JSON array, no markdown.`,
              },
              {
                role: 'user',
                content: finalExtractedText.substring(0, 30000),
              },
            ],
            temperature: 0.1,
            max_tokens: 8000,
          }),
        });
        
        status.groqText.time = Date.now() - groqTextStartTime;
        
        if (groqResponse.ok) {
          const groqData = await groqResponse.json();
          const responseText = groqData.choices?.[0]?.message?.content || '';
          const jsonMatch = responseText.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]) as RawTransaction[];
            transactions = normalizeRawTransactions(parsed);
            status.groqText.success = true;
            console.log(`✅ Groq Text extracted ${transactions.length} transactions in ${status.groqText.time}ms`);
            return { transactions, status, extractedText: finalExtractedText, bankMetadata };
          }
        } else {
          const errorText = await groqResponse.text();
          status.groqText.error = `API error: ${groqResponse.status}`;
          console.log(`❌ Groq Text failed: ${errorText}`);
        }
      } catch (error) {
        status.groqText.error = error instanceof Error ? error.message : 'Unknown error';
        console.log(`❌ Groq Text error: ${status.groqText.error}`);
      }
    } else {
      status.groqText.error = 'API key not configured';
    }
  }
  
  // ===== NO GEMINI OR LOVABLE FALLBACK =====
  // Pipeline is deterministic: Groq Vision → Groq Text → Done
  // If both fail, return empty (pattern fallback happens in categorization)
  
  console.log('⚠️ Groq-only pipeline complete. No AI fallback used.');
  
  return { transactions, status, extractedText: finalExtractedText, bankMetadata };
}

// ============= LAYER 2: CATEGORIZATION =============
// Mistral is BEST for: Structured output, categorization, text cleaning
// Groq is backup: Fast but less precise
// Pattern matching: Final fallback (rule-based, no AI)

export async function performCategorization(
  transactions: RawTransaction[],
  existingStatus: AIProcessingStatus
): Promise<CategorizationResult> {
  const status = { ...existingStatus };
  let categorizedTransactions: ProcessedTransaction[] = [];
  
  // ===== STEP 1: Mistral (Primary Categorizer - Best for structured output) =====
  console.log('🔹 CATEGORIZATION: Mistral (Primary)...');
  status.mistral.used = true;
  
  const mistralResult = await callMistralCategorizer(transactions);
  
  if (mistralResult.success && mistralResult.transactions && mistralResult.transactions.length > 0) {
    categorizedTransactions = mistralResult.transactions;
    status.mistral.success = true;
    status.mistral.time = mistralResult.processingTime;
    console.log(`✅ Mistral categorized ${categorizedTransactions.length} transactions`);
    return { transactions: categorizedTransactions, status };
  } else {
    status.mistral.error = mistralResult.error || 'No data returned';
    console.log(`❌ Mistral categorization failed: ${status.mistral.error}`);
  }
  
  // ===== STEP 2: Groq (Backup Categorizer) =====
  console.log('🔹 CATEGORIZATION: Groq (Backup)...');
  
  const groqResult = await callGroqCategorizer(transactions);
  
  if (groqResult.success && groqResult.transactions) {
    categorizedTransactions = groqResult.transactions;
    console.log(`✅ Groq categorized ${categorizedTransactions.length} transactions`);
    return { transactions: categorizedTransactions, status };
  } else {
    console.log(`❌ Groq categorization failed: ${groqResult.error || 'Unknown error'}`);
  }
  
  // ===== STEP 3: Pattern-Based Fallback (RULE-BASED, NO AI) =====
  console.log('🔹 CATEGORIZATION: Pattern Fallback (Rule-Based)...');
  status.patternFallback.used = true;
  
  categorizedTransactions = applyPatternCategorization(transactions);
  status.patternFallback.success = true;
  console.log(`✅ Pattern fallback categorized ${categorizedTransactions.length} transactions`);
  
  return { transactions: categorizedTransactions, status };
}

// ============= STATUS REPORT GENERATOR =============
export function generateStatusReport(status: AIProcessingStatus): string {
  const lines: string[] = ['=== AI Processing Report (Groq-Only Pipeline) ==='];
  
  if (status.groqVision.used) {
    lines.push(`Groq Vision OCR: ${status.groqVision.success ? '✅ Success' : '❌ Failed'}${status.groqVision.time ? ` (${status.groqVision.time}ms)` : ''}${status.groqVision.error ? ` - ${status.groqVision.error}` : ''}`);
  }
  
  if (status.groqText.used) {
    lines.push(`Groq Text: ${status.groqText.success ? '✅ Success' : '❌ Failed'}${status.groqText.time ? ` (${status.groqText.time}ms)` : ''}${status.groqText.error ? ` - ${status.groqText.error}` : ''}`);
  }
  
  if (status.mistral.used) {
    lines.push(`Mistral: ${status.mistral.success ? '✅ Success' : '❌ Failed'}${status.mistral.time ? ` (${status.mistral.time}ms)` : ''}${status.mistral.error ? ` - ${status.mistral.error}` : ''}`);
  }
  
  if (status.patternFallback.used) {
    lines.push(`Pattern Fallback: ${status.patternFallback.success ? '✅ Used (Rule-Based)' : '❌ Not used'}`);
  }
  
  return lines.join('\n');
}
