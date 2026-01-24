// ============= SPECIALIZED AI ORCHESTRATOR =============
// Routes tasks to the best AI for each job, with error tracking

import { callGroqVisionOCR, type RawTransaction } from './ocr-processor.ts';
import { callMistralCategorizer, type ProcessedTransaction } from './mistral-processor.ts';
import { callGroqCategorizer, applyPatternCategorization, CATEGORY_LIST } from './categorizer.ts';

// ============= ERROR TRACKING =============
export interface AIProcessingStatus {
  groqVision: { used: boolean; success: boolean; error?: string; time?: number };
  mistral: { used: boolean; success: boolean; error?: string; time?: number };
  gemini: { used: boolean; success: boolean; error?: string; time?: number };
  lovable: { used: boolean; success: boolean; error?: string; time?: number };
  groqText: { used: boolean; success: boolean; error?: string; time?: number };
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
// Groq Vision is BEST for: Fast image/PDF OCR
// Gemini is BEST for: Complex multi-page analysis, fallback
// Lovable AI: Ultimate fallback

export async function performExtraction(
  base64Data: string,
  mimeType: string,
  extractedText: string
): Promise<ExtractionResult> {
  const status: AIProcessingStatus = {
    groqVision: { used: false, success: false },
    mistral: { used: false, success: false },
    gemini: { used: false, success: false },
    lovable: { used: false, success: false },
    groqText: { used: false, success: false },
    patternFallback: { used: false, success: false },
  };
  
  let transactions: RawTransaction[] = [];
  let finalExtractedText = extractedText;
  
  // ===== STEP 1: Groq Vision (Primary OCR - Fastest) =====
  console.log('🔹 LAYER 1: Groq Vision OCR (Primary)...');
  const groqStartTime = Date.now();
  status.groqVision.used = true;
  
  const ocrResult = await callGroqVisionOCR(base64Data, mimeType);
  status.groqVision.time = Date.now() - groqStartTime;
  
  if (ocrResult.success && ocrResult.transactions && ocrResult.transactions.length > 0) {
    transactions = ocrResult.transactions;
    status.groqVision.success = true;
    console.log(`✅ Groq Vision extracted ${transactions.length} transactions in ${status.groqVision.time}ms`);
    return { transactions, status, extractedText: ocrResult.text };
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
                
Return JSON array with: date (YYYY-MM-DD), description, debit (number), credit (number), balance (number).
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
            transactions = JSON.parse(jsonMatch[0]);
            status.groqText.success = true;
            console.log(`✅ Groq Text extracted ${transactions.length} transactions in ${status.groqText.time}ms`);
            return { transactions, status, extractedText: finalExtractedText };
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
  
  // ===== STEP 3: Gemini (For complex analysis) =====
  if (transactions.length === 0) {
    console.log('🔹 LAYER 3: Gemini Complex Analysis...');
    const geminiStartTime = Date.now();
    status.gemini.used = true;
    
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (GEMINI_API_KEY) {
      try {
        const dataUrl = `data:${mimeType};base64,${base64Data}`;
        
        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `You are an expert bank statement OCR specialist. Extract ALL transactions.

Return JSON array with fields: date (YYYY-MM-DD), description, debit (number), credit (number), balance (number).
Handle all date formats, multiple currencies, Arabic/Hindi text.
Return ONLY the JSON array.`,
                    },
                    {
                      inline_data: {
                        mime_type: mimeType,
                        data: base64Data,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 8000,
              },
            }),
          }
        );
        
        status.gemini.time = Date.now() - geminiStartTime;
        
        if (geminiResponse.ok) {
          const geminiData = await geminiResponse.json();
          const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const jsonMatch = responseText.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            transactions = JSON.parse(jsonMatch[0]);
            status.gemini.success = true;
            console.log(`✅ Gemini extracted ${transactions.length} transactions in ${status.gemini.time}ms`);
            return { transactions, status, extractedText: finalExtractedText };
          }
        } else {
          const errorText = await geminiResponse.text();
          status.gemini.error = `API error: ${geminiResponse.status}`;
          console.log(`❌ Gemini failed: ${errorText}`);
        }
      } catch (error) {
        status.gemini.error = error instanceof Error ? error.message : 'Unknown error';
        console.log(`❌ Gemini error: ${status.gemini.error}`);
      }
    } else {
      status.gemini.error = 'API key not configured';
    }
  }
  
  // ===== STEP 4: Lovable AI (Ultimate Fallback) =====
  if (transactions.length === 0) {
    console.log('🔹 LAYER 4: Lovable AI (Final Fallback)...');
    const lovableStartTime = Date.now();
    status.lovable.used = true;
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      status.lovable.error = 'API key not configured';
      throw new Error('All AI services failed. Please check API configurations.');
    }
    
    try {
      let aiRequestBody;
      
      if (finalExtractedText && finalExtractedText.trim().length > 200) {
        aiRequestBody = {
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content: `Extract ALL transactions from this bank statement.
Return JSON array with: date (YYYY-MM-DD), description, debit (number), credit (number), balance (number).
Return ONLY the JSON array.`,
            },
            {
              role: 'user',
              content: `Extract transactions:\n\n${finalExtractedText}`,
            },
          ],
        };
      } else {
        const dataUrl = `data:${mimeType};base64,${base64Data}`;
        aiRequestBody = {
          model: 'google/gemini-2.5-pro',
          messages: [
            {
              role: 'system',
              content: `Extract ALL transactions from this bank statement image.
Return JSON array with: date (YYYY-MM-DD), description, debit (number), credit (number), balance (number).
Return ONLY the JSON array.`,
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Extract all transactions. Return only JSON array.' },
                { type: 'image_url', image_url: { url: dataUrl } },
              ],
            },
          ],
        };
      }
      
      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(aiRequestBody),
      });
      
      status.lovable.time = Date.now() - lovableStartTime;
      
      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const responseText = aiData.choices?.[0]?.message?.content || '';
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          transactions = JSON.parse(jsonMatch[0]);
          status.lovable.success = true;
          console.log(`✅ Lovable AI extracted ${transactions.length} transactions in ${status.lovable.time}ms`);
        }
      } else {
        const errorText = await aiResponse.text();
        status.lovable.error = `API error: ${aiResponse.status}`;
        console.log(`❌ Lovable AI failed: ${errorText}`);
        
        if (aiResponse.status === 402) {
          throw new Error('AI service credits exhausted');
        }
      }
    } catch (error) {
      status.lovable.error = error instanceof Error ? error.message : 'Unknown error';
      if (error instanceof Error && error.message.includes('credits')) {
        throw error;
      }
      console.log(`❌ Lovable AI error: ${status.lovable.error}`);
    }
  }
  
  return { transactions, status, extractedText: finalExtractedText };
}

// ============= LAYER 2: CATEGORIZATION =============
// Mistral is BEST for: Structured output, categorization, text cleaning
// Groq is backup: Fast but less precise
// Pattern matching: Final fallback

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
  
  // ===== STEP 3: Pattern-Based Fallback =====
  console.log('🔹 CATEGORIZATION: Pattern Fallback...');
  status.patternFallback.used = true;
  
  categorizedTransactions = applyPatternCategorization(transactions);
  status.patternFallback.success = true;
  console.log(`✅ Pattern fallback categorized ${categorizedTransactions.length} transactions`);
  
  return { transactions: categorizedTransactions, status };
}

// ============= STATUS REPORT GENERATOR =============
export function generateStatusReport(status: AIProcessingStatus): string {
  const lines: string[] = ['=== AI Processing Report ==='];
  
  if (status.groqVision.used) {
    lines.push(`Groq Vision OCR: ${status.groqVision.success ? '✅ Success' : '❌ Failed'}${status.groqVision.time ? ` (${status.groqVision.time}ms)` : ''}${status.groqVision.error ? ` - ${status.groqVision.error}` : ''}`);
  }
  
  if (status.groqText.used) {
    lines.push(`Groq Text: ${status.groqText.success ? '✅ Success' : '❌ Failed'}${status.groqText.time ? ` (${status.groqText.time}ms)` : ''}${status.groqText.error ? ` - ${status.groqText.error}` : ''}`);
  }
  
  if (status.gemini.used) {
    lines.push(`Gemini: ${status.gemini.success ? '✅ Success' : '❌ Failed'}${status.gemini.time ? ` (${status.gemini.time}ms)` : ''}${status.gemini.error ? ` - ${status.gemini.error}` : ''}`);
  }
  
  if (status.mistral.used) {
    lines.push(`Mistral: ${status.mistral.success ? '✅ Success' : '❌ Failed'}${status.mistral.time ? ` (${status.mistral.time}ms)` : ''}${status.mistral.error ? ` - ${status.mistral.error}` : ''}`);
  }
  
  if (status.lovable.used) {
    lines.push(`Lovable AI: ${status.lovable.success ? '✅ Success' : '❌ Failed'}${status.lovable.time ? ` (${status.lovable.time}ms)` : ''}${status.lovable.error ? ` - ${status.lovable.error}` : ''}`);
  }
  
  if (status.patternFallback.used) {
    lines.push(`Pattern Fallback: ${status.patternFallback.success ? '✅ Used' : '❌ Not used'}`);
  }
  
  return lines.join('\n');
}
