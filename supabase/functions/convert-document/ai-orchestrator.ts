// ============= SPECIALIZED AI ORCHESTRATOR =============
// Routes tasks to the best AI for each job, with error tracking
// IMPORTANT: Gemini removed - Groq Vision only for OCR, rule-based for everything else

import { callGroqVisionOCR, type RawTransaction } from './ocr-processor.ts';
import { callMistralCategorizer, type ProcessedTransaction } from './mistral-processor.ts';
import { callGroqCategorizer, applyPatternCategorization } from './categorizer.ts';

// ============= ERROR TRACKING =============
export interface AIProcessingStatus {
  groqVision: { used: boolean; success: boolean; error?: string; time?: number };
  mistral: { used: boolean; success: boolean; error?: string; time?: number };
  patternFallback: { used: boolean; success: boolean };
}

export interface ExtractionResult {
  transactions: RawTransaction[];
  status: AIProcessingStatus;
  extractedText?: string;
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
  
  if (ocrResult.success) {
    finalExtractedText = ocrResult.text || finalExtractedText;
    transactions = ocrResult.transactions || [];
    status.groqVision.success = true;
    console.log(`✅ Groq Vision OCR done in ${status.groqVision.time}ms (parsedTransactions=${transactions.length})`);
  } else {
    status.groqVision.error = ocrResult.error || 'No data extracted';
    console.log(`❌ Groq Vision failed: ${status.groqVision.error}`);
  }

  // Deterministic pipeline: Groq Vision OCR (raw text) → regex parsing → categorization
  return { transactions, status, extractedText: finalExtractedText };
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
  
  if (status.mistral.used) {
    lines.push(`Mistral: ${status.mistral.success ? '✅ Success' : '❌ Failed'}${status.mistral.time ? ` (${status.mistral.time}ms)` : ''}${status.mistral.error ? ` - ${status.mistral.error}` : ''}`);
  }
  
  if (status.patternFallback.used) {
    lines.push(`Pattern Fallback: ${status.patternFallback.success ? '✅ Used (Rule-Based)' : '❌ Not used'}`);
  }
  
  return lines.join('\n');
}
