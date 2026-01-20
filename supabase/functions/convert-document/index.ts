// ============= AKROMEDA MULTI-LAYERED INTELLIGENCE ENGINE =============
// Main orchestrator that routes to specialized modules

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import * as pdfjsLib from 'https://esm.sh/pdfjs-dist@4.0.379/legacy/build/pdf.mjs';

// Import modular processors
import { 
  callGeminiFlashOCR, 
  classifyDocument, 
  extractTextWithPDFJS,
  type RawTransaction 
} from './ocr-processor.ts';
import { 
  callGroqCategorizer, 
  applyPatternCategorization,
  CATEGORY_LIST,
  type ProcessedTransaction,
} from './categorizer.ts';
import { 
  reconcileBalances, 
  detectDuplicates, 
  detectHighRiskTransactions, 
  detectCircularTrading,
  performUnderwritingAnalysis,
  analyzeLiquidity,
  generateFraudAlerts,
  calculateIntegrityScore,
  type FraudAlert,
  type RiskTransaction,
  type Transaction,
} from './financial-engine.ts';
import { generateProfessionalExcel } from './excel-generator.ts';

// ============= CORS & SECURITY HELPERS =============
const getAllowedOrigin = (requestOrigin: string | null): string => {
  const allowedOrigins = [
    Deno.env.get('ALLOWED_ORIGIN') || '',
    'https://akromeda.lovable.app',
    'http://localhost:8080',
    'http://localhost:5173',
  ].filter(Boolean);
  
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }
  
  const lovableAppPattern = /^https:\/\/[a-z0-9-]+\.lovable\.app$/;
  const lovableProjectPattern = /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/;
  if (requestOrigin && (lovableAppPattern.test(requestOrigin) || lovableProjectPattern.test(requestOrigin))) {
    return requestOrigin;
  }
  
  return allowedOrigins[0] || 'https://akromeda.lovable.app';
};

const getCorsHeaders = (req: Request) => ({
  'Access-Control-Allow-Origin': getAllowedOrigin(req.headers.get('origin')),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
});

const sanitizeError = (error: unknown): string => {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('relation') || msg.includes('table') || msg.includes('column')) {
      return 'Database configuration error';
    }
    if (msg.includes('auth') || msg.includes('jwt') || msg.includes('token')) {
      return 'Authentication failed';
    }
    if (msg.includes('storage') || msg.includes('bucket')) {
      return 'File storage error';
    }
    const safeMessages = [
      'no transactions found in the document',
      'failed to extract transaction data from document',
      'the document has no pages',
      'document appears to be empty or corrupted',
      'unable to read document content',
      'invalid or unsupported document format',
      'password',
      'encrypted',
      'protected',
    ];
    if (safeMessages.some(safe => msg.includes(safe))) {
      return error.message;
    }
    if (msg.includes('ai') || msg.includes('gateway') || msg.includes('lovable')) {
      return 'Processing service unavailable';
    }
    if (msg.includes('api') || msg.includes('fetch')) {
      return 'External service error';
    }
  }
  return 'An unexpected error occurred. Please try again later.';
};

const getClientIp = (req: Request): string => {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const ips = forwarded.split(',').map(ip => ip.trim()).filter(Boolean);
    return ips[ips.length - 1] || 'unknown';
  }
  return req.headers.get('cf-connecting-ip') || 
         req.headers.get('x-real-ip') || 
         'unknown';
};

async function verifyRecaptcha(token: string): Promise<boolean> {
  const secretKey = Deno.env.get('RECAPTCHA_SECRET_KEY');
  if (!secretKey) {
    console.error('RECAPTCHA_SECRET_KEY not configured');
    return false;
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${secretKey}&response=${token}`,
    });
    const data = await response.json();
    console.log('reCAPTCHA verification result:', { success: data.success });
    return data.success === true;
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return false;
  }
}

const isValidTimezone = (tz: string): boolean => {
  if (!tz || typeof tz !== 'string' || tz.length > 50) return false;
  const validPattern = /^[A-Za-z0-9_/+-]+$/;
  return validPattern.test(tz);
};

// ============= MAIN HANDLER =============
Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request
    const { fileId, fileName, fileData: base64FileData, timezone, recaptchaToken, pdfPassword } = await req.json();
    const userTimezone = (timezone && isValidTimezone(timezone)) ? timezone : 'UTC';
    const ipAddress = getClientIp(req);

    // Create Supabase clients
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check authentication
    const authHeader = req.headers.get('Authorization');
    let user = null;
    let supabase = supabaseAdmin;
    
    if (authHeader && authHeader !== 'Bearer null') {
      supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user: authUser } } = await supabase.auth.getUser();
      user = authUser;
    }

    // Anonymous users require reCAPTCHA
    if (!user) {
      if (!recaptchaToken) {
        return new Response(
          JSON.stringify({ error: 'CAPTCHA verification required for anonymous users' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const isValidCaptcha = await verifyRecaptcha(recaptchaToken);
      if (!isValidCaptcha) {
        return new Response(
          JSON.stringify({ error: 'CAPTCHA verification failed. Please try again.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log('reCAPTCHA verified successfully for anonymous user');
    }

    console.log('Processing conversion:', { 
      isAuthenticated: !!user, 
      ipAddress: user ? 'hidden' : ipAddress,
      timezone: userTimezone 
    });

    // Validate request
    if (!fileName) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: fileName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!user && !base64FileData) {
      return new Response(
        JSON.stringify({ error: 'File data required for anonymous users' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (user && !fileId) {
      return new Response(
        JSON.stringify({ error: 'File ID required for authenticated users' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof fileName !== 'string' || fileName.length > 255 || fileName.includes('..') || fileName.includes('/')) {
      return new Response(
        JSON.stringify({ error: 'Invalid file name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get file bytes
    let bytes: Uint8Array;

    if (user && fileId) {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('bank-statements')
        .download(`${user.id}/${fileId}`);

      if (downloadError || !fileData) {
        return new Response(
          JSON.stringify({ error: 'File not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const buffer = await fileData.arrayBuffer();
      bytes = new Uint8Array(buffer);
    } else {
      try {
        const base64Content = base64FileData.split(',')[1] || base64FileData;
        const binaryString = atob(base64Content);
        bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
      } catch {
        return new Response(
          JSON.stringify({ error: 'Invalid file data' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Validate file size (10MB limit)
    if (bytes.length > 10 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: 'File exceeds 10MB limit' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate magic bytes
    const lowerFileName = fileName.toLowerCase();
    if (lowerFileName.endsWith('.pdf')) {
      if (bytes[0] !== 0x25 || bytes[1] !== 0x50 || bytes[2] !== 0x44 || bytes[3] !== 0x46) {
        return new Response(
          JSON.stringify({ error: 'Invalid PDF file format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (lowerFileName.endsWith('.png')) {
      if (bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4E || bytes[3] !== 0x47) {
        return new Response(
          JSON.stringify({ error: 'Invalid PNG file format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (lowerFileName.endsWith('.jpg') || lowerFileName.endsWith('.jpeg')) {
      if (bytes[0] !== 0xFF || bytes[1] !== 0xD8 || bytes[2] !== 0xFF) {
        return new Response(
          JSON.stringify({ error: 'Invalid JPEG file format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ error: 'Unsupported file type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check usage limits
    const { data: limitResult, error: limitError } = await supabaseAdmin.rpc('check_and_reset_daily_limit', {
      p_ip_address: user ? null : ipAddress,
      p_user_id: user ? user.id : null,
      p_timezone: userTimezone
    });

    if (limitError) {
      console.error('Error checking limit:', limitError);
      return new Response(
        JSON.stringify({ error: 'Failed to check usage limit' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const usageInfo = limitResult && limitResult.length > 0 ? limitResult[0] : null;
    const conversionsUsed = usageInfo?.conversions_used ?? 0;
    const conversionsLimit = usageInfo?.conversions_limit ?? (user ? 6 : 100);

    console.log('Usage info:', { conversionsUsed, conversionsLimit, user: !!user });

    if (conversionsUsed >= conversionsLimit) {
      return new Response(
        JSON.stringify({
          error: 'Conversion limit reached',
          limitReached: true,
          isAuthenticated: !!user,
          message: user 
            ? `You have reached your daily limit of ${conversionsLimit} conversions.`
            : `You have reached your daily limit of ${conversionsLimit} free conversions. Sign up for a free account to get 6 conversions per day!`,
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Increment usage count
    const { error: incrementError } = await supabaseAdmin.rpc('increment_usage_count', {
      p_ip_address: user ? null : ipAddress,
      p_user_id: user ? user.id : null
    });

    if (incrementError) {
      console.error('Error incrementing usage:', incrementError);
      return new Response(
        JSON.stringify({ error: 'Failed to update usage count' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create conversion record for authenticated users
    let conversion = null;
    if (user) {
      const { data: convData, error: convError } = await supabase
        .from('conversions')
        .insert({
          user_id: user.id,
          original_filename: fileName,
          file_path: fileId,
          status: 'processing',
        })
        .select()
        .single();

      if (convError) {
        console.error('Failed to create conversion record:', convError);
      } else {
        conversion = convData;
      }
    }

    // ============= LAYER 1: SMART DOCUMENT ROUTER =============
    console.log('Starting multi-layered AI conversion for:', fileName);
    
    let extractedText = '';
    let rawTransactions: RawTransaction[] = [];
    let pageCount = 0;
    
    // First, try to extract text directly (for password-protected PDFs)
    if (lowerFileName.endsWith('.pdf')) {
      try {
        // Check if PDF needs a password
        try {
          const testResult = await extractTextWithPDFJS(bytes, pdfjsLib);
          extractedText = testResult.text;
          pageCount = testResult.pageCount;
          console.log('PDF is not encrypted, extracted text length:', extractedText.length);
        } catch (pdfError: unknown) {
          const errorMsg = pdfError instanceof Error ? pdfError.message : String(pdfError);
          console.log('PDF check result:', errorMsg);
          
          const isPasswordError = 
            errorMsg.includes('PasswordException') ||
            errorMsg.includes('Incorrect Password') ||
            errorMsg.includes('No password given') ||
            (errorMsg.toLowerCase().includes('password') && errorMsg.toLowerCase().includes('required'));
          
          if (isPasswordError) {
            if (!pdfPassword || !pdfPassword.trim()) {
              return new Response(
                JSON.stringify({ 
                  error: 'This PDF is password-protected. Please enter the password and try again.',
                  requiresPassword: true 
                }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
            
            // Try with password
            try {
              const result = await extractTextWithPDFJS(bytes, pdfjsLib, pdfPassword);
              extractedText = result.text;
              pageCount = result.pageCount;
              console.log('PDF decrypted successfully, pages:', pageCount);
            } catch (decryptError: unknown) {
              const decryptMsg = decryptError instanceof Error ? decryptError.message : String(decryptError);
              console.log('PDF decryption error:', decryptMsg);
              
              if (decryptMsg.toLowerCase().includes('incorrect password') || 
                  decryptMsg.toLowerCase().includes('wrong password') ||
                  decryptMsg.toLowerCase().includes('invalid password')) {
                return new Response(
                  JSON.stringify({ 
                    error: 'Incorrect PDF password. Please check and try again.',
                    requiresPassword: true,
                    wrongPassword: true
                  }),
                  { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }
              throw decryptError;
            }
          }
        }
      } catch (outerError) {
        console.log('PDF processing outer error, will try OCR:', outerError);
      }
    }

    // ============= LAYER 2: INTELLIGENT PROCESSING ROUTER =============
    const classification = classifyDocument(extractedText, bytes, fileName);
    console.log('Document classification:', classification);

    // Convert bytes to base64 for OCR if needed
    const chunkSize = 8192;
    let base64Data = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      base64Data += String.fromCharCode(...chunk);
    }
    base64Data = btoa(base64Data);
    
    const mimeType = lowerFileName.endsWith('.pdf') ? 'application/pdf' : 
                     lowerFileName.endsWith('.png') ? 'image/png' : 'image/jpeg';

    if (classification.needsOCR) {
      // Use Gemini Flash for OCR on scanned/image documents
      console.log(`Document needs OCR (type: ${classification.type}), using Gemini Flash...`);
      
      const ocrResult = await callGeminiFlashOCR(base64Data, mimeType);
      
      if (ocrResult.success && ocrResult.transactions && ocrResult.transactions.length > 0) {
        rawTransactions = ocrResult.transactions;
        console.log(`Gemini OCR extracted ${rawTransactions.length} transactions`);
      } else if (ocrResult.success && ocrResult.text) {
        extractedText = ocrResult.text;
        console.log('Gemini OCR extracted text, will parse for transactions');
      } else {
        console.log('Gemini OCR failed or returned no data, falling back to Lovable AI');
      }
    }

    // If we don't have transactions yet, use Lovable AI for extraction
    if (rawTransactions.length === 0) {
      console.log('Using Lovable AI for transaction extraction...');
      
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (!LOVABLE_API_KEY) {
        throw new Error('LOVABLE_API_KEY not configured');
      }

      // Build AI request based on whether we have text or need image processing
      let aiRequestBody;
      
      if (extractedText && extractedText.trim().length > 200) {
        // Text-based extraction (digital PDF or already OCR'd)
        console.log('Using text-based extraction');
        aiRequestBody = {
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content: `You are an expert bank statement data extraction specialist. Extract ALL transactions.

UNIVERSAL SCHEMA (all fields required):
- date: Normalized to YYYY-MM-DD format
- description: Clean transaction description
- category: One of: ${CATEGORY_LIST.join(', ')}
- debit: Amount debited (positive number, 0 if credit)
- credit: Amount credited (positive number, 0 if debit)
- balance: Running balance after transaction

BANK-SPECIFIC HANDLING:
- Emirates Islamic/NBD: Handle Arabic text alongside English
- HDFC/ICICI/SBI: Handle lakhs format (1,23,456)
- US Banks: Handle MM/DD/YYYY dates
- UK Banks: Handle DD/MM/YYYY

Return ONLY a valid JSON array, no markdown, no explanation.`
            },
            {
              role: 'user',
              content: `Extract ALL transactions from this bank statement:\n\n${extractedText}`
            }
          ],
        };
      } else {
        // Image-based extraction
        console.log('Using image-based extraction');
        const dataUrl = `data:${mimeType};base64,${base64Data}`;
        
        aiRequestBody = {
          model: 'google/gemini-2.5-pro',
          messages: [
            {
              role: 'system',
              content: `You are an expert OCR and bank statement data extraction specialist.

UNIVERSAL SCHEMA (all fields required):
- date: Normalized to YYYY-MM-DD format
- description: Clean transaction description
- category: One of: ${CATEGORY_LIST.join(', ')}
- debit: Amount debited (positive number, 0 if credit)
- credit: Amount credited (positive number, 0 if debit)
- balance: Running balance after transaction

Return ONLY a valid JSON array, no markdown, no explanation.`
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Extract ALL transactions from this bank statement. Return only the JSON array.' },
                { type: 'image_url', image_url: { url: dataUrl } }
              ]
            }
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

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error('AI API error:', aiResponse.status, errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          const rawError = errorData?.error?.metadata?.raw;
          if (rawError) {
            const parsedRaw = JSON.parse(rawError);
            const errorMessage = parsedRaw?.error?.message;
            if (errorMessage) {
              if (errorMessage.toLowerCase().includes('no pages')) {
                throw new Error('The document has no pages. Please upload a valid PDF with readable content.');
              }
              if (errorMessage.toLowerCase().includes('password') || 
                  errorMessage.toLowerCase().includes('encrypted')) {
                throw new Error('This PDF is password-protected. Please enter the correct password and try again.');
              }
            }
          }
        } catch (parseErr) {
          if (parseErr instanceof Error && 
              (parseErr.message.includes('document') || parseErr.message.includes('password'))) {
            throw parseErr;
          }
        }
        
        throw new Error('Unable to read document content. Please ensure the file is not corrupted.');
      }

      const aiData = await aiResponse.json();
      const responseText = aiData.choices?.[0]?.message?.content || '';
      
      // Parse JSON from response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        rawTransactions = JSON.parse(jsonMatch[0]);
        console.log(`Lovable AI extracted ${rawTransactions.length} transactions`);
      } else {
        throw new Error('No JSON array found in AI response');
      }
    }

    if (!rawTransactions || rawTransactions.length === 0) {
      throw new Error('No transactions found in the document');
    }

    // ============= LAYER 3: GROQ CATEGORIZATION (Lightning Fast) =============
    console.log('Starting Groq categorization...');
    
    let categorizedTransactions: ProcessedTransaction[];
    
    const groqResult = await callGroqCategorizer(rawTransactions);
    
    if (groqResult.success && groqResult.transactions) {
      categorizedTransactions = groqResult.transactions;
      console.log('Groq categorization successful');
    } else {
      // Fallback to pattern-based categorization
      console.log('Using pattern-based categorization fallback');
      categorizedTransactions = applyPatternCategorization(rawTransactions);
    }

    // Convert to Transaction type for financial engine
    const transactions: Transaction[] = categorizedTransactions.map(t => ({
      date: t.date,
      description: t.description,
      category: t.category,
      debit: t.debit,
      credit: t.credit,
      balance: t.balance,
      isDuplicate: t.isDuplicate,
      duplicateGroup: t.duplicateGroup,
      balanceMismatch: t.balanceMismatch,
      expectedBalance: t.expectedBalance,
      riskFlag: t.riskFlag,
    }));

    // ============= LAYER 4: FINANCIAL ENGINE (Pure TypeScript) =============
    console.log('Starting financial analysis...');
    
    // Balance Reconciliation
    const reconciliation = reconcileBalances(transactions);
    console.log(`Balance reconciliation: ${reconciliation.mismatches.length} mismatches, integrity: ${reconciliation.integrityScore}`);
    
    // Duplicate Detection
    const duplicateCount = detectDuplicates(transactions);
    console.log(`Duplicate detection: ${duplicateCount} duplicates found`);
    
    // High-Risk Transaction Detection
    const riskTransactions = detectHighRiskTransactions(transactions);
    console.log(`High-risk detection: ${riskTransactions.length} risk types found`);
    
    // Circular Trading Detection
    const circularResult = detectCircularTrading(transactions);
    if (circularResult) {
      riskTransactions.push(circularResult);
    }
    console.log(`Circular trading: ${circularResult ? circularResult.indices.length : 0} transactions flagged`);
    
    // Fetch user's category corrections for behavioral learning
    let categoryCorrections: Map<string, string> | undefined;
    if (user) {
      const { data: corrections } = await supabaseAdmin
        .from('category_corrections')
        .select('description_pattern, corrected_category, weight')
        .eq('user_id', user.id)
        .order('weight', { ascending: false });
      
      if (corrections && corrections.length > 0) {
        categoryCorrections = new Map();
        corrections.forEach((c: { description_pattern: string; corrected_category: string }) => {
          categoryCorrections!.set(c.description_pattern.toLowerCase(), c.corrected_category);
        });
        console.log(`Loaded ${corrections.length} category corrections for user`);
      }
    }
    
    // FOIR and Underwriting Analysis
    const underwritingResult = performUnderwritingAnalysis(transactions, categoryCorrections);
    console.log(`FOIR Analysis: score=${underwritingResult.foir.score}%, status=${underwritingResult.foir.status}`);
    
    // Liquidity Analysis
    const liquidityMetrics = analyzeLiquidity(transactions);
    
    // Generate Fraud Alerts
    const fraudAlerts = generateFraudAlerts(
      reconciliation,
      riskTransactions,
      liquidityMetrics,
      transactions.length
    );
    
    // Calculate Final Integrity Score
    const integrityScore = calculateIntegrityScore(reconciliation, riskTransactions, liquidityMetrics);
    console.log(`Analysis complete. Integrity score: ${integrityScore}, Fraud alerts: ${fraudAlerts.length}`);

    // ============= LAYER 5: PROFESSIONAL EXCEL EXPORT =============
    console.log('Generating professional Excel export...');
    
    const totalCredits = transactions.reduce((sum, t) => sum + (t.credit || 0), 0);
    const totalDebits = transactions.reduce((sum, t) => sum + (t.debit || 0), 0);
    
    // Category breakdown
    const categoryBreakdown: Record<string, { count: number; totalDebit: number; totalCredit: number }> = {};
    transactions.forEach(t => {
      if (!categoryBreakdown[t.category]) {
        categoryBreakdown[t.category] = { count: 0, totalDebit: 0, totalCredit: 0 };
      }
      categoryBreakdown[t.category].count++;
      categoryBreakdown[t.category].totalDebit += t.debit || 0;
      categoryBreakdown[t.category].totalCredit += t.credit || 0;
    });

    // Build underwriting analysis for response
    const underwritingAnalysis = {
      salaryCredits: underwritingResult.salaryCredits,
      emiDebits: underwritingResult.emiDebits,
      monthlyBreakdown: underwritingResult.monthlyBreakdown,
      summary: {
        avgMonthlyIncome: underwritingResult.foir.avgMonthlyIncome,
        avgMonthlyEMI: underwritingResult.foir.avgMonthlyEMI,
        foirScore: underwritingResult.foir.score,
        foirStatus: underwritingResult.foir.status,
        emiByLoanType: underwritingResult.emiByLoanType,
        totalSalaryDetected: underwritingResult.salaryCredits.length,
        totalEMIDetected: underwritingResult.emiDebits.length,
      },
      eligibility: underwritingResult.eligibility,
    };

    // Build risk analysis for response
    const riskAnalysis = {
      integrityScore,
      balanceMismatches: reconciliation.mismatches.length,
      averageDailyBalance: liquidityMetrics.avgBalance,
      maxDip: { amount: liquidityMetrics.minBalance, date: liquidityMetrics.maxDipDate },
      maxPeak: liquidityMetrics.maxBalance,
      riskFlags: riskTransactions.map(r => ({ type: r.type, count: r.indices.length })),
      fraudAlerts,
      foirScore: underwritingResult.foir.score,
      avgMonthlyIncome: underwritingResult.foir.avgMonthlyIncome,
      avgMonthlyEMI: underwritingResult.foir.avgMonthlyEMI,
    };

    const analytics = {
      totalTransactions: transactions.length,
      totalCredits,
      totalDebits,
      netFlow: totalCredits - totalDebits,
      duplicateCount,
      categoryBreakdown,
      riskAnalysis,
      underwriting: underwritingAnalysis,
    };

    // Generate Excel with ExcelJS
    const excelBuffer = await generateProfessionalExcel(transactions, analytics);
    
    let resultPath = null;

    // Upload for authenticated users
    if (user && conversion) {
      resultPath = `${user.id}/results/${conversion.id}.xlsx`;
      const { error: uploadResultError } = await supabase.storage
        .from('bank-statements')
        .upload(resultPath, excelBuffer, {
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          upsert: false,
        });

      if (uploadResultError) {
        console.error('Failed to upload result:', uploadResultError);
        resultPath = null;
      } else {
        console.log('Excel file uploaded successfully');

        // Update conversion status
        await supabase
          .from('conversions')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            result_path: resultPath,
          })
          .eq('id', conversion.id);
          
        // Store risk analysis
        await supabaseAdmin
          .from('risk_analysis')
          .upsert({
            user_id: user.id,
            conversion_id: conversion.id,
            integrity_score: integrityScore,
            balance_mismatches: reconciliation.mismatches.length,
            average_daily_balance: liquidityMetrics.avgBalance,
            max_dip_amount: liquidityMetrics.minBalance,
            max_dip_date: liquidityMetrics.maxDipDate,
            total_inflow: totalCredits,
            total_outflow: totalDebits,
            net_cashflow: totalCredits - totalDebits,
            foir_score: underwritingResult.foir.score,
            salary_credits: underwritingResult.salaryCredits,
            emi_debits: underwritingResult.emiDebits,
            risk_flags: riskAnalysis.riskFlags,
          });
          
        // Store fraud alerts
        for (const alert of fraudAlerts) {
          await supabaseAdmin
            .from('fraud_alerts')
            .insert({
              user_id: user.id,
              conversion_id: conversion.id,
              alert_type: alert.type,
              severity: alert.severity,
              description: alert.description,
              affected_rows: alert.affectedRows,
              metadata: alert.metadata,
            });
        }
      }
    }

    // Convert Excel buffer to base64 for anonymous users
    const excelBytes = new Uint8Array(excelBuffer);
    let excelBase64 = '';
    const excelChunkSize = 8192;
    for (let i = 0; i < excelBytes.length; i += excelChunkSize) {
      const chunk = excelBytes.subarray(i, i + excelChunkSize);
      excelBase64 += String.fromCharCode(...chunk);
    }
    excelBase64 = btoa(excelBase64);

    console.log(`Conversion complete. ${transactions.length} transactions processed.`);

    return new Response(
      JSON.stringify({
        success: true,
        conversionId: conversion?.id || null,
        resultPath: resultPath,
        transactions: transactions,
        analytics: analytics,
        excelData: user ? null : excelBase64,
        message: 'Conversion completed successfully',
        remaining: conversionsLimit - conversionsUsed - 1,
        isAuthenticated: !!user,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Internal error:', error);
    const errorMessage = sanitizeError(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
