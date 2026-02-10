// ============= AKROMEDA MULTI-LAYERED INTELLIGENCE ENGINE =============
// Main orchestrator that routes to specialized AI modules
// STRICT USAGE CONTROL: IP-based limits, page limits, admin whitelist

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// Import modular processors
import { 
  classifyDocument, 
  callGroqVisionOCR,
  type RawTransaction,
  type BankMetadata,
} from '../_shared/ocr-processor.ts';
import { 
  CATEGORY_LIST,
  type ProcessedTransaction,
} from '../_shared/categorizer.ts';
import { 
  performExtraction,
  performCategorization,
  generateStatusReport,
  type AIProcessingStatus,
} from '../_shared/ai-orchestrator.ts';
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
} from '../_shared/financial-engine.ts';
import { generateProfessionalExcel } from '../_shared/excel-generator.ts';
import { sanitizeTransactions } from '../_shared/transaction-sanitizer.ts';
import { fromMinorUnits, sumMinorUnits, toMinorUnits } from '../_shared/money.ts';

// ============= ADMIN WHITELIST (Server-Side Only) =============
const ADMIN_EMAILS = ['inspirexali@gmail.com'];
const MAX_PAGES_FREE = 6; // Max pages for free/normal users
const MAX_PDF_PAGE_IMAGES = Number(Deno.env.get('MAX_PDF_PAGE_IMAGES') ?? '60');
const MAX_PDF_PAGE_IMAGE_BYTES = Number(Deno.env.get('MAX_PDF_PAGE_IMAGE_BYTES') ?? `${3 * 1024 * 1024}`); // 3MB
const MAX_PDF_PAGE_IMAGES_TOTAL_BYTES = Number(Deno.env.get('MAX_PDF_PAGE_IMAGES_TOTAL_BYTES') ?? `${30 * 1024 * 1024}`); // 30MB

// ============= DEPLOYMENT-AGNOSTIC CORS =============
// Allows requests from any origin. The edge function runs on Supabase infrastructure
// and the frontend can be hosted anywhere (Vercel, Netlify, Cloudflare, etc.)
const getAllowedOrigin = (requestOrigin: string | null): string => {
  const envOrigin = Deno.env.get('ALLOWED_ORIGIN');
  
  const allowedOrigins = [
    envOrigin,
    'https://akromeda.lovable.app',
    'https://akromeda.vercel.app',
    'http://localhost:8080',
    'http://localhost:5173',
    'http://localhost:3000',
  ].filter(Boolean) as string[];
  
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }
  
  // Allow *.lovable.app and *.lovableproject.com
  const lovableAppPattern = /^https:\/\/[a-z0-9-]+\.lovable\.app$/;
  const lovableProjectPattern = /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/;
  if (requestOrigin && (lovableAppPattern.test(requestOrigin) || lovableProjectPattern.test(requestOrigin))) {
    return requestOrigin;
  }
  
  // Allow *.vercel.app (Vercel previews)
  const vercelPattern = /^https:\/\/[a-z0-9-]+\.vercel\.app$/;
  if (requestOrigin && vercelPattern.test(requestOrigin)) {
    return requestOrigin;
  }
  
  // Allow any origin if ALLOWED_ORIGIN is set to '*'
  if (envOrigin === '*' && requestOrigin) {
    return requestOrigin;
  }
  
  return requestOrigin || allowedOrigins[0] || '*';
};

const getCorsHeaders = (req: Request) => ({
  'Access-Control-Allow-Origin': getAllowedOrigin(req.headers.get('origin')),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
});

const sanitizeError = (error: unknown): string => {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();

    // During debugging we WANT to surface which provider failed.
    // These messages are already sanitized by us (no secrets) and help avoid wasting credits.
    const debugPassThrough = [
      'ai status:',
      'groq vision:',
      'groq text:',
      'gemini:',
      'mistral:',
      'lovable ai:',
      'credits exhausted',
      'requires page images',
      'pdf requires page images',
    ];
    if (debugPassThrough.some((s) => msg.includes(s))) {
      return error.message;
    }

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
    return ips[0] || 'unknown';
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

const estimateBase64Bytes = (base64: string): number => {
  const cleaned = base64.trim();
  const padding = cleaned.endsWith('==') ? 2 : cleaned.endsWith('=') ? 1 : 0;
  return Math.floor((cleaned.length * 3) / 4) - padding;
};

// ============= MAIN HANDLER =============
Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request
    const { fileId, fileName, fileData: base64FileData, timezone, recaptchaToken, pdfPassword, pdfPageImages, clientId } = await req.json();
    const userTimezone = (timezone && isValidTimezone(timezone)) ? timezone : 'UTC';
    const ipAddress = getClientIp(req);
    const trackingKey = ipAddress !== 'unknown' ? ipAddress : (clientId ? `client:${clientId}` : ipAddress);

    // Create Supabase admin client (service role for privileged operations)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ============= AUTHENTICATION CHECK =============
    // Detect authenticated users via Authorization: Bearer <token> header
    // Use supabaseAdmin.auth.getUser(token) to validate the token server-side
    const authHeader = req.headers.get('Authorization');
    let user = null;
    let supabase = supabaseAdmin;
    
    if (authHeader && authHeader.startsWith('Bearer ') && authHeader !== 'Bearer null') {
      const token = authHeader.replace('Bearer ', '');
      
      // Validate token using admin client for secure server-side verification
      const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
      
      if (!authError && authUser) {
        user = authUser;
        console.log('Authenticated user detected:', { userId: user.id, email: user.email });
        
        // Create user-scoped client for RLS-protected operations
        supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          { global: { headers: { Authorization: authHeader } } }
        );
      } else {
        console.log('Token validation failed:', authError?.message || 'Invalid token');
      }
    }

    // ============= reCAPTCHA ENFORCEMENT =============
    // RULE: reCAPTCHA is ONLY required for anonymous (unauthenticated) users
    // Authenticated users with valid tokens COMPLETELY SKIP reCAPTCHA
    if (!user) {
      console.log('Anonymous user detected - reCAPTCHA required');
      
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
    } else {
      console.log('Authenticated user - reCAPTCHA SKIPPED');
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

    if (!user && !base64FileData && !(Array.isArray(pdfPageImages) && pdfPageImages.length > 0)) {
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

    // Validate PDF page images payload size to avoid memory/time blowups
    if (Array.isArray(pdfPageImages) && pdfPageImages.length > 0) {
      if (pdfPageImages.length > MAX_PDF_PAGE_IMAGES) {
        return new Response(
          JSON.stringify({ error: `Too many page images (max ${MAX_PDF_PAGE_IMAGES})` }),
          { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let totalBytes = 0;
      for (const img of pdfPageImages) {
        if (typeof img !== 'string') continue;
        const match = img.match(/^data:([^;]+);base64,(.+)$/);
        const base64Payload = match ? match[2] : img;
        const sizeBytes = estimateBase64Bytes(base64Payload);
        totalBytes += sizeBytes;
        if (sizeBytes > MAX_PDF_PAGE_IMAGE_BYTES) {
          return new Response(
            JSON.stringify({ error: `A page image exceeds ${Math.round(MAX_PDF_PAGE_IMAGE_BYTES / (1024 * 1024))}MB` }),
            { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (totalBytes > MAX_PDF_PAGE_IMAGES_TOTAL_BYTES) {
          return new Response(
            JSON.stringify({ error: `Total page images exceed ${Math.round(MAX_PDF_PAGE_IMAGES_TOTAL_BYTES / (1024 * 1024))}MB` }),
            { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Get file bytes
    let bytes: Uint8Array;

    if (user && fileId) {
      const { data: fileData, error: downloadError } = await supabaseAdmin.storage
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
        // If PDF pages are provided as images, we may not have a PDF base64.
        const base64Content = base64FileData?.split?.(',')?.[1] || base64FileData;
        if (!base64Content) {
          bytes = new Uint8Array();
        } else {
        const binaryString = atob(base64Content);
        bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        }
      } catch {
        return new Response(
          JSON.stringify({ error: 'Invalid file data' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Validate file size (10MB limit) when we actually have original bytes
    if (bytes.length > 0 && bytes.length > 10 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: 'File exceeds 10MB limit' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate magic bytes
    const lowerFileName = fileName.toLowerCase();
    const isPdf = lowerFileName.endsWith('.pdf');
    const hasPdfPageImages = Array.isArray(pdfPageImages) && pdfPageImages.length > 0;
    const pageCount = hasPdfPageImages ? (pdfPageImages as string[]).length : 1;
    if (isPdf) {
      // If client provided page images, we might not have original PDF bytes.
      if (bytes.length > 0 && (bytes[0] !== 0x25 || bytes[1] !== 0x50 || bytes[2] !== 0x44 || bytes[3] !== 0x46)) {
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

    // ============= USAGE LIMITS ENFORCEMENT =============
    // Check usage limits - IP-based for anonymous, user-based for authenticated
    const { data: limitResult, error: limitError } = await supabaseAdmin.rpc('check_and_reset_daily_limit', {
      p_ip_address: user ? null : trackingKey,
      p_user_id: user ? user.id : null,
      p_timezone: userTimezone
    });

    if (limitError) {
      console.error('Error checking limit:', limitError);
      return new Response(
        JSON.stringify({ error: 'Failed to check usage limit', status: 'error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const usageInfo = limitResult && limitResult.length > 0 ? limitResult[0] : null;
    const conversionsUsed = usageInfo?.conversions_used ?? 0;
    const conversionsLimit = usageInfo?.conversions_limit ?? (user ? 5 : 2); // Default: 5 for users, 2 for anon

    console.log('Usage info:', { conversionsUsed, conversionsLimit, user: !!user });

    // Check if admin (bypass limits for simple PDFs)
    const isAdmin = user && ADMIN_EMAILS.includes(user.email?.toLowerCase() || '');
    console.log('Admin check:', { isAdmin, email: user?.email });

    const isPaidUser = !!user && conversionsLimit > 5;
    const usageEstimate = isPaidUser ? pageCount : 1;

    // Enforce limits (admin bypasses for simple PDFs)
    if (!isAdmin && (conversionsUsed + usageEstimate) > conversionsLimit) {
      return new Response(
        JSON.stringify({
          error: user 
            ? (isPaidUser
                ? `You have reached your usage limit of ${conversionsLimit}.`
                : `You have reached your daily limit of ${conversionsLimit} conversions.`)
            : 'Free limit reached. Please sign up to continue.',
          status: 'anonymous_limit_reached',
          limitReached: true,
          isAuthenticated: !!user,
          signupRequired: !user,
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============= PAGE LIMIT ENFORCEMENT =============
    // Check PDF page count for non-admin users
    // Each plan has specific page limits
    
    // Plan page limits
    const planLimits: Record<string, number> = {
      'monthly_basic': 300,
      'monthly_pro': 1000,
      'monthly_enterprise': 4500,
      'yearly_lite': 5000,
      'yearly_full': 15000,
      'yearly_pro': 65000,
      'per_page': 1, // per page plan users
    };
    
    // Check if user is special admin user (no limits)
    const isSpecialUser = user?.email === 'inspirexali@gmail.com';
    
    // Variables for plan tracking (defined outside block for scope access)
    let userPlanLimit = MAX_PAGES_FREE;
    let userPlanType = 'free';
    let pagesUsedThisMonth = 0;
    let totalPagesAfterConversion = pageCount;
    
    if (isSpecialUser) {
      console.log('Special user detected - unlimited pages allowed:', user?.email);
    } else {
      // Check user's plan and page limit
      if (user) {
        const { data: subData, error: subError } = await supabase
          .from('subscriptions')
          .select('plan_type, pages_used_this_month')
          .eq('user_id', user.id)
          .single();
        
        if (!subError && subData && subData.plan_type) {
          userPlanType = subData.plan_type;
          pagesUsedThisMonth = subData.pages_used_this_month || 0;
          userPlanLimit = planLimits[subData.plan_type] || MAX_PAGES_FREE;
        }
      }
      
      totalPagesAfterConversion = pagesUsedThisMonth + pageCount;
      
      console.log('Page limit check:', { 
        pageCount, 
        isAdmin, 
        userPlanType, 
        userPlanLimit,
        pagesUsedThisMonth,
        totalAfterThisConversion: totalPagesAfterConversion,
        isPdf 
      });

      // Check if pages exceed the plan limit
      if (!isAdmin && totalPagesAfterConversion > userPlanLimit) {
        return new Response(
          JSON.stringify({
            error: `Your ${userPlanType} plan allows ${userPlanLimit} pages per month. You have ${pagesUsedThisMonth} pages used and this PDF has ${pageCount} pages.`,
            status: 'page_limit_exceeded',
            pagesDetected: pageCount,
            pagesUsed: pagesUsedThisMonth,
            planLimit: userPlanLimit,
            planType: userPlanType,
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
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
          pages_processed: pageCount,
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
    
    // ============= LAYER 2: INTELLIGENT PROCESSING ROUTER =============
    const classification = classifyDocument(extractedText, bytes, fileName);
    console.log('Document classification:', classification);

    // ============= SPECIALIZED AI EXTRACTION =============
    // NOTE: Groq Vision models do NOT accept PDFs directly.
    // For PDFs we require the client to send rendered page images (pdfPageImages) to avoid "invalid image data"
    // and to prevent wasting credits on doomed fallbacks.
    console.log('=== Starting Specialized AI Pipeline ===');

    let extractionResult: Awaited<ReturnType<typeof performExtraction>>;

    // isPdf and hasPdfPageImages already defined above for page limit check
    // Track bank metadata across pages
    let collectedBankMetadata: BankMetadata | undefined;
    let pagesWithData = 1;

    if (isPdf && hasPdfPageImages) {
      // Build a minimal status object consistent with ai-orchestrator
      const status: AIProcessingStatus = {
        groqVision: { used: true, success: false },
        mistral: { used: false, success: false },
        groqText: { used: false, success: false },
        patternFallback: { used: false, success: false },
      };

      const errors: string[] = [];
      const start = Date.now();
      const collected: RawTransaction[] = [];
      pagesWithData = 0;
      let combinedText = '';

      for (const img of pdfPageImages as string[]) {
        if (typeof img !== 'string') continue;
        const match = img.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) continue;
        const pageMime = match[1];
        const pageBase64 = match[2];
        const res = await callGroqVisionOCR(pageBase64, pageMime);
        if (res.success && res.transactions && res.transactions.length > 0) {
          pagesWithData += 1;
          collected.push(...res.transactions);
          if (res.text) combinedText += (combinedText ? '\n' : '') + res.text;
          // Capture bank metadata from first page that has it
          if (!collectedBankMetadata && res.bankMetadata) {
            collectedBankMetadata = res.bankMetadata;
            console.log('Bank metadata detected:', collectedBankMetadata);
          }
        } else {
          errors.push(res.error || 'No data extracted');
        }
      }

      status.groqVision.time = Date.now() - start;
      status.groqVision.success = collected.length > 0;
      if (!status.groqVision.success) {
        status.groqVision.error = errors[0] || 'No data extracted from PDF page images';
      }

      extractionResult = {
        transactions: collected,
        status,
        extractedText: combinedText,
        bankMetadata: collectedBankMetadata,
      };
    } else {
      // Convert bytes to base64 for OCR
      const chunkSize = 8192;
      let base64Data = '';
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        base64Data += String.fromCharCode(...chunk);
      }
      base64Data = btoa(base64Data);

      const mimeType = isPdf ? 'application/pdf' :
        lowerFileName.endsWith('.png') ? 'image/png' : 'image/jpeg';

      if (isPdf) {
        return new Response(
          JSON.stringify({
            error: 'PDF requires page images for processing. Please retry (the app will render pages) or upload JPG/PNG.',
            requiresPageImages: true,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      extractionResult = await performExtraction(base64Data, mimeType, extractedText);
    }

    rawTransactions = extractionResult.transactions;
    extractedText = extractionResult.extractedText || '';

    // Log extraction status
    console.log(generateStatusReport(extractionResult.status));

    if (!rawTransactions || rawTransactions.length === 0) {
      // Generate error report for debugging
      const errorDetails = [];
      const status = extractionResult.status;
      
      if (status.groqVision.used && !status.groqVision.success) {
        errorDetails.push(`Groq Vision: ${status.groqVision.error}`);
      }
      if (status.groqText.used && !status.groqText.success) {
        errorDetails.push(`Groq Text: ${status.groqText.error}`);
      }
      
      console.error('All AI services failed:', errorDetails.join(' | '));
      throw new Error(`No transactions found. AI Status: ${errorDetails.join(' | ')}`);
    }

    // ============= LAYER 3: SPECIALIZED CATEGORIZATION =============
    // Mistral is BEST for categorization, Groq as backup, Pattern as fallback
    console.log('=== Starting Specialized Categorization ===');
    
    const categorizationResult = await performCategorization(rawTransactions, extractionResult.status);
    const categorizedTransactions = categorizationResult.transactions;
    
    // Log final status
    console.log(generateStatusReport(categorizationResult.status));

    // Convert to Transaction type for financial engine
    const extractedTransactions: Transaction[] = categorizedTransactions.map(t => ({
      date: t.date,
      description: t.originalDescription || t.description,
      category: t.category,
      debit: t.debit,
      credit: t.credit,
      balance: t.balance,
      refNumber: t.refNumber,
      isDuplicate: t.isDuplicate,
      duplicateGroup: t.duplicateGroup,
      balanceMismatch: t.balanceMismatch,
      expectedBalance: t.expectedBalance,
      riskFlag: t.riskFlag,
    }));
    const transactions = sanitizeTransactions(extractedTransactions);

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
    
    // Use minor-unit math for exact debit/credit totals (no float drift).
    const totalCreditsMinor = sumMinorUnits(transactions.map((t) => t.credit || 0));
    const totalDebitsMinor = sumMinorUnits(transactions.map((t) => t.debit || 0));
    const totalCredits = fromMinorUnits(totalCreditsMinor);
    const totalDebits = fromMinorUnits(totalDebitsMinor);
    const netFlow = fromMinorUnits(totalCreditsMinor - totalDebitsMinor);
    
    // Category breakdown
    const categoryBreakdownMinor: Record<string, { count: number; totalDebitMinor: number; totalCreditMinor: number }> = {};
    transactions.forEach((t) => {
      if (!categoryBreakdownMinor[t.category]) {
        categoryBreakdownMinor[t.category] = { count: 0, totalDebitMinor: 0, totalCreditMinor: 0 };
      }
      categoryBreakdownMinor[t.category].count++;
      categoryBreakdownMinor[t.category].totalDebitMinor += toMinorUnits(t.debit || 0);
      categoryBreakdownMinor[t.category].totalCreditMinor += toMinorUnits(t.credit || 0);
    });
    const categoryBreakdown: Record<string, { count: number; totalDebit: number; totalCredit: number }> = {};
    Object.entries(categoryBreakdownMinor).forEach(([category, data]) => {
      categoryBreakdown[category] = {
        count: data.count,
        totalDebit: fromMinorUnits(data.totalDebitMinor),
        totalCredit: fromMinorUnits(data.totalCreditMinor),
      };
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
      netFlow,
      duplicateCount,
      categoryBreakdown,
      riskAnalysis,
      underwriting: underwritingAnalysis,
    };

    // Generate Excel (styled)
    const bankInfo = collectedBankMetadata || extractionResult.bankMetadata;
    const excelResult = generateProfessionalExcel({
      transactions,
      analytics: {
        totalCredits,
        totalDebits,
        netFlow,
        duplicateCount,
        categoryBreakdown,
      },
      underwriting: underwritingResult,
      fraudAlerts,
      liquidity: liquidityMetrics,
      reconciliation,
      bankInfo, // NEW: Pass bank metadata
    });
    const excelBuffer = excelResult.buffer;
    
    let resultPath = null;

    // Upload for authenticated users
    if (user && conversion) {
      resultPath = `${user.id}/results/${conversion.id}.xlsx`;
      // Use octet-stream to avoid storage MIME type restrictions
      const { error: uploadResultError } = await supabase.storage
        .from('bank-statements')
        .upload(resultPath, excelBuffer, {
          contentType: 'application/octet-stream',
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
            net_cashflow: netFlow,
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
    console.log('=== Final AI Processing Report ===');
    console.log(generateStatusReport(categorizationResult.status));

    // Build AI status for debugging
    const aiStatus = {
      groqVision: categorizationResult.status.groqVision,
      groqText: categorizationResult.status.groqText,
      mistral: categorizationResult.status.mistral,
      patternFallback: categorizationResult.status.patternFallback,
    };

    // Update monthly page usage based on pages that actually contained data
    if (user && !isSpecialUser) {
      const pagesToAdd = Math.max(1, pagesWithData);
      const updatedPagesUsed = pagesUsedThisMonth + pagesToAdd;
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({ pages_used_this_month: updatedPagesUsed })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Failed to update pages used:', updateError);
      } else {
        console.log(`Updated pages used for user ${user.id}: ${updatedPagesUsed}/${userPlanLimit}`);
      }
    }

    // Increment usage count ONLY after successful conversion (prevents wasting credits/limit on failures)
    const incrementBy = user ? (isPaidUser ? Math.max(1, pagesWithData) : 1) : 1;
    let remaining = conversionsLimit - conversionsUsed;
    const { error: incrementError } = await supabaseAdmin.rpc('increment_usage_count', {
      p_ip_address: user ? null : trackingKey,
      p_user_id: user ? user.id : null,
      p_increment: incrementBy,
    });
    if (incrementError) {
      console.error('Error incrementing usage after success:', incrementError);
    } else {
      remaining = conversionsLimit - conversionsUsed - incrementBy;
    }

    return new Response(
      JSON.stringify({
        success: true,
        conversionId: conversion?.id || null,
        resultPath: resultPath,
        transactions: transactions,
        analytics: analytics,
        bankInfo,
        // Always return excelData - storage upload may fail due to MIME restrictions
        excelData: excelBase64,
        message: 'Conversion completed successfully',
        remaining,
        isAuthenticated: !!user,
        aiStatus, // For debugging - shows which AI did what
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
