// ============= MULTI-STATEMENT CONVERSION (BATCH) =============
// Processes multiple statements in one request and optionally returns a merged Excel.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

import {
  callGroqVisionOCR,
  type RawTransaction,
  type BankMetadata,
} from '../_shared/ocr-processor.ts';
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
  type Transaction,
} from '../_shared/financial-engine.ts';
import {
  generateProfessionalExcel,
  generateMergedStatementsExcel,
} from '../_shared/excel-generator.ts';
import {
  buildMergedStatement,
  validateStatementsForMerge,
  type StatementData,
} from '../_shared/multi-statement.ts';

// ============= ADMIN WHITELIST (Server-Side Only) =============
const ADMIN_EMAILS = ['inspirexali@gmail.com'];
const MAX_PAGES_FREE = 6; // Max pages for free/normal users
const MAX_PDF_PAGE_IMAGES = Number(Deno.env.get('MAX_PDF_PAGE_IMAGES') ?? '60');
const MAX_PDF_PAGE_IMAGE_BYTES = Number(Deno.env.get('MAX_PDF_PAGE_IMAGE_BYTES') ?? `${3 * 1024 * 1024}`); // 3MB
const MAX_PDF_PAGE_IMAGES_TOTAL_BYTES = Number(Deno.env.get('MAX_PDF_PAGE_IMAGES_TOTAL_BYTES') ?? `${30 * 1024 * 1024}`); // 30MB

// ============= DEPLOYMENT-AGNOSTIC CORS =============
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
  
  const lovableAppPattern = /^https:\/\/[a-z0-9-]+\.lovable\.app$/;
  const lovableProjectPattern = /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/;
  if (requestOrigin && (lovableAppPattern.test(requestOrigin) || lovableProjectPattern.test(requestOrigin))) {
    return requestOrigin;
  }
  
  const vercelPattern = /^https:\/\/[a-z0-9-]+\.vercel\.app$/;
  if (requestOrigin && vercelPattern.test(requestOrigin)) {
    return requestOrigin;
  }
  
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
    const debugPassThrough = [
      'ai status:',
      'groq vision:',
      'groq text:',
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

const estimateBase64Bytes = (base64: string): number => {
  const cleaned = base64.trim();
  const padding = cleaned.endsWith('==') ? 2 : cleaned.endsWith('=') ? 1 : 0;
  return Math.floor((cleaned.length * 3) / 4) - padding;
};

const bufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
};

const sanitizeFileName = (fileName: string): string =>
  fileName.replace(/[\\\/]/g, '').substring(0, 255);

const buildCategoryCorrections = async (supabaseAdmin: ReturnType<typeof createClient<unknown>>, userId?: string) => {
  if (!userId) return undefined;
  const { data: corrections } = await supabaseAdmin
    .from('category_corrections')
    .select('description_pattern, corrected_category, weight')
    .eq('user_id', userId)
    .order('weight', { ascending: false });

  if (!corrections || corrections.length === 0) return undefined;

  const map = new Map<string, string>();
  corrections.forEach((c: { description_pattern: string; corrected_category: string }) => {
    map.set(c.description_pattern.toLowerCase(), c.corrected_category);
  });
  return map;
};

type StatementPayload = {
  fileId?: string;
  fileName: string;
  fileData?: string;
  pdfPageImages?: string[];
  pdfPassword?: string;
};

type ProcessedStatement = {
  fileName: string;
  transactions: Transaction[];
  bankMetadata?: BankMetadata;
  excelBase64: string;
  totals: {
    totalCredits: number;
    totalDebits: number;
  };
};

// Aggregated analytics for batch mode
interface AggregatedAnalytics {
  totalTransactions: number;
  totalCredits: number;
  totalDebits: number;
  netFlow: number;
  duplicateCount: number;
  categoryBreakdown: Record<string, { count: number; totalDebit: number; totalCredit: number }>;
  riskAnalysis: {
    integrityScore: number;
    balanceMismatches: number;
    averageDailyBalance: number;
    maxDip: { amount: number; date: string | null };
    maxPeak: number;
    riskFlags: { type: string; count: number }[];
    fraudAlerts: any[];
  };
  underwriting: {
    salaryCredits: { date: string; amount: number; description: string }[];
    emiDebits: { date: string; amount: number; description: string; loanType: string }[];
    monthlyBreakdown: { month: string; salaryIncome: number; emiOutflow: number }[];
    summary: {
      avgMonthlyIncome: number;
      avgMonthlyEMI: number;
      foirScore: number;
      foirStatus: 'excellent' | 'good' | 'moderate' | 'high';
      emiByLoanType: Record<string, { count: number; totalAmount: number }>;
      totalSalaryDetected: number;
      totalEMIDetected: number;
    };
    eligibility: {
      status: 'excellent' | 'good' | 'moderate' | 'poor' | 'ineligible';
      message: string;
      factors: string[];
      maxNewEMI: number;
      estimatedLoanEligibility: number;
    };
  };
}

// Function to aggregate analytics from multiple statements
function aggregateBatchAnalytics(statements: ProcessedStatement[]): AggregatedAnalytics {
  // Combine all transactions from all statements
  const allTransactions: Transaction[] = [];
  statements.forEach(s => {
    allTransactions.push(...s.transactions);
  });

  // Sort by date
  allTransactions.sort((a, b) => a.date.localeCompare(b.date));

  // Run financial analysis on combined transactions
  const reconciliation = reconcileBalances(allTransactions);
  const duplicateCount = detectDuplicates(allTransactions);
  const riskTransactions = detectHighRiskTransactions(allTransactions);
  const circularResult = detectCircularTrading(allTransactions);
  if (circularResult) {
    riskTransactions.push(circularResult);
  }

  const underwritingResult = performUnderwritingAnalysis(allTransactions);
  const liquidityMetrics = analyzeLiquidity(allTransactions);
  const fraudAlerts = generateFraudAlerts(
    reconciliation,
    riskTransactions,
    liquidityMetrics,
    allTransactions.length,
  );
  const integrityScore = calculateIntegrityScore(reconciliation, riskTransactions, liquidityMetrics);

  // Calculate totals
  const totalCredits = allTransactions.reduce((sum, t) => sum + (t.credit || 0), 0);
  const totalDebits = allTransactions.reduce((sum, t) => sum + (t.debit || 0), 0);

  // Build category breakdown
  const categoryBreakdown: Record<string, { count: number; totalDebit: number; totalCredit: number }> = {};
  allTransactions.forEach(t => {
    if (!categoryBreakdown[t.category]) {
      categoryBreakdown[t.category] = { count: 0, totalDebit: 0, totalCredit: 0 };
    }
    categoryBreakdown[t.category].count++;
    categoryBreakdown[t.category].totalDebit += t.debit || 0;
    categoryBreakdown[t.category].totalCredit += t.credit || 0;
  });

  // Build risk flags summary
  const riskFlagCounts: Record<string, number> = {};
  riskTransactions.forEach(rt => {
    riskFlagCounts[rt.type] = (riskFlagCounts[rt.type] || 0) + rt.indices.length;
  });
  const riskFlags = Object.entries(riskFlagCounts).map(([type, count]) => ({ type, count }));

  return {
    totalTransactions: allTransactions.length,
    totalCredits,
    totalDebits,
    netFlow: totalCredits - totalDebits,
    duplicateCount,
    categoryBreakdown,
    riskAnalysis: {
      integrityScore,
      balanceMismatches: reconciliation.totalMismatches,
      averageDailyBalance: liquidityMetrics.avgBalance,
      maxDip: { amount: liquidityMetrics.minBalance, date: liquidityMetrics.maxDipDate },
      maxPeak: liquidityMetrics.maxBalance,
      riskFlags,
      fraudAlerts,
    },
    underwriting: {
      salaryCredits: underwritingResult.salaryCredits.map(s => ({
        date: s.date,
        amount: s.amount,
        description: s.description,
      })),
      emiDebits: underwritingResult.emiDebits.map(e => ({
        date: e.date,
        amount: e.amount,
        description: e.description,
        loanType: e.loanType,
      })),
      monthlyBreakdown: underwritingResult.monthlyBreakdown,
      summary: {
        avgMonthlyIncome: underwritingResult.foir.avgMonthlyIncome,
        avgMonthlyEMI: underwritingResult.foir.avgMonthlyEMI,
        foirScore: underwritingResult.foir.score,
        foirStatus: underwritingResult.foir.status,
        emiByLoanType: underwritingResult.emiByLoanType,
        totalSalaryDetected: underwritingResult.salaryCredits.reduce((sum, s) => sum + s.amount, 0),
        totalEMIDetected: underwritingResult.emiDebits.reduce((sum, e) => sum + e.amount, 0),
      },
      eligibility: {
        status: underwritingResult.eligibility.status,
        message: underwritingResult.eligibility.message,
        factors: underwritingResult.eligibility.factors,
        maxNewEMI: underwritingResult.foir.maxNewEMI,
        estimatedLoanEligibility: underwritingResult.foir.loanEligibility,
      },
    },
  };
}

const validatePdfPageImages = (images: string[], fileName: string): string | null => {
  if (images.length > MAX_PDF_PAGE_IMAGES) {
    return `Too many page images for ${fileName} (max ${MAX_PDF_PAGE_IMAGES})`;
  }

  let totalBytes = 0;
  for (const img of images) {
    if (typeof img !== 'string') continue;
    const match = img.match(/^data:([^;]+);base64,(.+)$/);
    const base64Payload = match ? match[2] : img;
    const sizeBytes = estimateBase64Bytes(base64Payload);
    totalBytes += sizeBytes;

    if (sizeBytes > MAX_PDF_PAGE_IMAGE_BYTES) {
      return `A page image in ${fileName} exceeds ${Math.round(MAX_PDF_PAGE_IMAGE_BYTES / (1024 * 1024))}MB`;
    }
  }

  if (totalBytes > MAX_PDF_PAGE_IMAGES_TOTAL_BYTES) {
    return `Total page images for ${fileName} exceed ${Math.round(MAX_PDF_PAGE_IMAGES_TOTAL_BYTES / (1024 * 1024))}MB`;
  }

  return null;
};

const bytesFromBase64 = (base64FileData?: string): Uint8Array => {
  if (!base64FileData) return new Uint8Array();
  const base64Content = base64FileData.split(',')?.[1] || base64FileData;
  if (!base64Content) return new Uint8Array();
  const binaryString = atob(base64Content);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const processStatement = async (params: {
  fileName: string;
  bytes: Uint8Array;
  pdfPageImages?: string[];
  categoryCorrections?: Map<string, string>;
}): Promise<{ transactions: Transaction[]; bankMetadata?: BankMetadata; excelBuffer: ArrayBuffer; totals: { totalCredits: number; totalDebits: number } }> => {
  const lowerFileName = params.fileName.toLowerCase();
  const isPdf = lowerFileName.endsWith('.pdf');
  const hasPdfPageImages = Array.isArray(params.pdfPageImages) && params.pdfPageImages.length > 0;

  let extractionResult: Awaited<ReturnType<typeof performExtraction>>;
  let collectedBankMetadata: BankMetadata | undefined;

  if (isPdf && hasPdfPageImages) {
    const status: AIProcessingStatus = {
      groqVision: { used: true, success: false },
      mistral: { used: false, success: false },
      groqText: { used: false, success: false },
      patternFallback: { used: false, success: false },
    };

    const errors: string[] = [];
    const start = Date.now();
    const collected: RawTransaction[] = [];
    let combinedText = '';

    for (const img of params.pdfPageImages as string[]) {
      if (typeof img !== 'string') continue;
      const match = img.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) continue;
      const pageMime = match[1];
      const pageBase64 = match[2];
      const res = await callGroqVisionOCR(pageBase64, pageMime);
      if (res.success && res.transactions && res.transactions.length > 0) {
        collected.push(...res.transactions);
        if (res.text) combinedText += (combinedText ? '\n' : '') + res.text;
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
    if (isPdf) {
      throw new Error('PDF requires page images for processing.');
    }
    const chunkSize = 8192;
    let base64Data = '';
    for (let i = 0; i < params.bytes.length; i += chunkSize) {
      const chunk = params.bytes.subarray(i, i + chunkSize);
      base64Data += String.fromCharCode(...chunk);
    }
    base64Data = btoa(base64Data);
    const mimeType = lowerFileName.endsWith('.png') ? 'image/png' : 'image/jpeg';
    extractionResult = await performExtraction(base64Data, mimeType, '');
  }

  const rawTransactions = extractionResult.transactions;
  console.log(generateStatusReport(extractionResult.status));

  if (!rawTransactions || rawTransactions.length === 0) {
    throw new Error('No transactions found in the document.');
  }

  const categorizationResult = await performCategorization(rawTransactions, extractionResult.status);
  console.log(generateStatusReport(categorizationResult.status));

  const transactions: Transaction[] = categorizationResult.transactions.map(t => ({
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

  const reconciliation = reconcileBalances(transactions);
  const duplicateCount = detectDuplicates(transactions);
  const riskTransactions = detectHighRiskTransactions(transactions);
  const circularResult = detectCircularTrading(transactions);
  if (circularResult) {
    riskTransactions.push(circularResult);
  }

  const underwritingResult = performUnderwritingAnalysis(transactions, params.categoryCorrections);
  const liquidityMetrics = analyzeLiquidity(transactions);
  const fraudAlerts = generateFraudAlerts(
    reconciliation,
    riskTransactions,
    liquidityMetrics,
    transactions.length,
  );
  const integrityScore = calculateIntegrityScore(reconciliation, riskTransactions, liquidityMetrics);
  console.log(`Analysis complete. Integrity score: ${integrityScore}, Fraud alerts: ${fraudAlerts.length}`);

  const totalCredits = transactions.reduce((sum, t) => sum + (t.credit || 0), 0);
  const totalDebits = transactions.reduce((sum, t) => sum + (t.debit || 0), 0);

  const categoryBreakdown: Record<string, { count: number; totalDebit: number; totalCredit: number }> = {};
  transactions.forEach(t => {
    if (!categoryBreakdown[t.category]) {
      categoryBreakdown[t.category] = { count: 0, totalDebit: 0, totalCredit: 0 };
    }
    categoryBreakdown[t.category].count++;
    categoryBreakdown[t.category].totalDebit += t.debit || 0;
    categoryBreakdown[t.category].totalCredit += t.credit || 0;
  });

  const excelResult = generateProfessionalExcel({
    transactions,
    analytics: {
      totalCredits,
      totalDebits,
      netFlow: totalCredits - totalDebits,
      duplicateCount,
      categoryBreakdown,
    },
    underwriting: underwritingResult,
    fraudAlerts,
    liquidity: liquidityMetrics,
    reconciliation,
    bankInfo: collectedBankMetadata || extractionResult.bankMetadata,
  });

  return {
    transactions,
    bankMetadata: collectedBankMetadata || extractionResult.bankMetadata,
    excelBuffer: excelResult.buffer,
    totals: {
      totalCredits,
      totalDebits,
    },
  };
};

// ============= MAIN HANDLER =============
Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { files, timezone, recaptchaToken } = await req.json();
    const userTimezone = (timezone && isValidTimezone(timezone)) ? timezone : 'UTC';
    const ipAddress = getClientIp(req);

    if (!Array.isArray(files) || files.length === 0) {
      return new Response(
        JSON.stringify({ error: 'At least one file is required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    let user = null;
    let supabase = supabaseAdmin;

    if (authHeader && authHeader.startsWith('Bearer ') && authHeader !== 'Bearer null') {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (!authError && authUser) {
        user = authUser;
        supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          { global: { headers: { Authorization: authHeader } } }
        );
      } else {
        console.log('Token validation failed:', authError?.message || 'Invalid token');
      }
    }

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
    }

    // Validate input and compute page counts
    const pageCounts: number[] = [];
    for (const file of files as StatementPayload[]) {
      if (!file || typeof file.fileName !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Invalid file payload.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const sanitizedName = sanitizeFileName(file.fileName);
      if (!sanitizedName || sanitizedName.includes('..')) {
        return new Response(
          JSON.stringify({ error: `Invalid file name: ${file.fileName}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const lowerName = sanitizedName.toLowerCase();
      if (!lowerName.endsWith('.pdf') && !lowerName.endsWith('.png') && !lowerName.endsWith('.jpg') && !lowerName.endsWith('.jpeg')) {
        return new Response(
          JSON.stringify({ error: `Unsupported file type: ${sanitizedName}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!user && !file.fileData && !(Array.isArray(file.pdfPageImages) && file.pdfPageImages.length > 0)) {
        return new Response(
          JSON.stringify({ error: `File data required for anonymous users (${sanitizedName})` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (user && !file.fileId) {
        return new Response(
          JSON.stringify({ error: `File ID required for authenticated users (${sanitizedName})` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (Array.isArray(file.pdfPageImages) && file.pdfPageImages.length > 0) {
        const error = validatePdfPageImages(file.pdfPageImages, sanitizedName);
        if (error) {
          return new Response(
            JSON.stringify({ error }),
            { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      const pageCount = Array.isArray(file.pdfPageImages) && file.pdfPageImages.length > 0
        ? file.pdfPageImages.length
        : 1;
      pageCounts.push(pageCount);
    }

    const totalPageCount = pageCounts.reduce((sum, count) => sum + count, 0);

    // Usage limit checks (count each statement as a conversion)
    const { data: limitResult, error: limitError } = await supabaseAdmin.rpc('check_and_reset_daily_limit', {
      p_ip_address: user ? null : ipAddress,
      p_user_id: user ? user.id : null,
      p_timezone: userTimezone,
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
    const conversionsLimit = usageInfo?.conversions_limit ?? (user ? 6 : 2);

    const isAdmin = user && ADMIN_EMAILS.includes(user.email?.toLowerCase() || '');
    if (!isAdmin && conversionsUsed + files.length > conversionsLimit) {
      return new Response(
        JSON.stringify({
          error: user
            ? `You have reached your daily limit of ${conversionsLimit} conversions.`
            : 'Free limit reached. Please sign up to continue.',
          status: 'anonymous_limit_reached',
          limitReached: true,
          isAuthenticated: !!user,
          signupRequired: !user,
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Page limit enforcement
    const planLimits: Record<string, number> = {
      'monthly_basic': 300,
      'monthly_pro': 1000,
      'monthly_enterprise': 4500,
      'yearly_lite': 5000,
      'yearly_full': 15000,
      'yearly_pro': 65000,
      'per_page': 1,
    };

    const isSpecialUser = user?.email === 'inspirexali@gmail.com';
    let userPlanLimit = MAX_PAGES_FREE;
    let userPlanType = 'free';
    let pagesUsedThisMonth = 0;
    let totalPagesAfterConversion = totalPageCount;

    if (!isSpecialUser && user) {
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

      totalPagesAfterConversion = pagesUsedThisMonth + totalPageCount;
      if (!isAdmin && totalPagesAfterConversion > userPlanLimit) {
        return new Response(
          JSON.stringify({
            error: `Your ${userPlanType} plan allows ${userPlanLimit} pages per month. You have ${pagesUsedThisMonth} pages used and these PDFs have ${totalPageCount} pages.`,
            status: 'page_limit_exceeded',
            pagesDetected: totalPageCount,
            pagesUsed: pagesUsedThisMonth,
            planLimit: userPlanLimit,
            planType: userPlanType,
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update page usage once per batch
    if (user && !isSpecialUser) {
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({ pages_used_this_month: totalPagesAfterConversion })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Failed to update pages used:', updateError);
      }
    }

const categoryCorrections = await buildCategoryCorrections(supabaseAdmin as ReturnType<typeof createClient<unknown>>, user?.id);
    const successes: ProcessedStatement[] = [];
    const failures: Array<{ fileName: string; error: string }> = [];
    const statementData: StatementData[] = [];

    for (const file of files as StatementPayload[]) {
      const sanitizedName = sanitizeFileName(file.fileName);
      let conversionRecord: { id: string } | null = null;
      const lowerName = sanitizedName.toLowerCase();
      const isPdf = lowerName.endsWith('.pdf');

      try {
        // Retrieve bytes (for validation and non-PDF extraction)
        let bytes = new Uint8Array();
        if (user && file.fileId) {
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('bank-statements')
            .download(`${user.id}/${file.fileId}`);

          if (downloadError || !fileData) {
            throw new Error('File not found');
          }
          const buffer = await fileData.arrayBuffer();
          bytes = new Uint8Array(buffer);
        } else {
          bytes = bytesFromBase64(file.fileData) as Uint8Array<ArrayBuffer>;
        }

        if (bytes.length > 0 && bytes.length > 10 * 1024 * 1024) {
          throw new Error('File exceeds 10MB limit');
        }

        if (bytes.length > 0) {
          if (isPdf) {
            if (bytes[0] !== 0x25 || bytes[1] !== 0x50 || bytes[2] !== 0x44 || bytes[3] !== 0x46) {
              throw new Error('Invalid PDF file format');
            }
          } else if (lowerName.endsWith('.png')) {
            if (bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4E || bytes[3] !== 0x47) {
              throw new Error('Invalid PNG file format');
            }
          } else if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) {
            if (bytes[0] !== 0xFF || bytes[1] !== 0xD8 || bytes[2] !== 0xFF) {
              throw new Error('Invalid JPEG file format');
            }
          }
        }

        // Create conversion record (authenticated only)
        if (user && file.fileId) {
          const { data: convData, error: convError } = await supabase
            .from('conversions')
            .insert({
              user_id: user.id,
              original_filename: sanitizedName,
              file_path: file.fileId,
              status: 'processing',
              pages_processed: Array.isArray(file.pdfPageImages) && file.pdfPageImages.length > 0 ? file.pdfPageImages.length : 1,
            })
            .select()
            .single();

          if (convError) {
            console.error('Failed to create conversion record:', convError);
          } else {
            conversionRecord = convData;
          }
        }

        const { transactions, bankMetadata, excelBuffer, totals } = await processStatement({
          fileName: sanitizedName,
          bytes,
          pdfPageImages: file.pdfPageImages,
          categoryCorrections,
        });

        const excelBase64 = bufferToBase64(excelBuffer);

        // Upload result for authenticated users
        let resultPath: string | null = null;
        if (user && conversionRecord) {
          resultPath = `${user.id}/results/${conversionRecord.id}.xlsx`;
          const { error: uploadResultError } = await supabase.storage
            .from('bank-statements')
            .upload(resultPath, excelBuffer, {
              contentType: 'application/octet-stream',
              upsert: false,
            });

          if (uploadResultError) {
            console.error('Failed to upload result:', uploadResultError);
            resultPath = null;
          }

          await supabase
            .from('conversions')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              result_path: resultPath,
              error_message: uploadResultError ? 'Result upload failed' : null,
            })
            .eq('id', conversionRecord.id);
        }

        successes.push({
          fileName: sanitizedName,
          transactions,
          bankMetadata,
          excelBase64,
          totals,
        });

        statementData.push({
          fileName: sanitizedName,
          transactions,
          bankMetadata,
        });
      } catch (error) {
        const message = sanitizeError(error);
        failures.push({ fileName: sanitizedName, error: message });
        if (conversionRecord) {
          await supabase
            .from('conversions')
            .update({
              status: 'failed',
              completed_at: new Date().toISOString(),
              error_message: message,
            })
            .eq('id', conversionRecord.id);
        }
      }
    }

    if (successes.length === 0) {
      return new Response(
        JSON.stringify({ error: 'All statements failed to process.', failures }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Merge validation
    const validation = validateStatementsForMerge(statementData);
    if (failures.length > 0) {
      validation.canMerge = false;
      validation.reasons.push('One or more statements failed to process');
    }
    let mergePayload: {
      available: boolean;
      reasons: string[];
      excelData?: string;
      statementPeriod?: string;
      duplicatesRemoved?: number;
      totals?: { totalDebit: number; totalCredit: number; finalBalance: number | null };
      fileName?: string;
    } = {
      available: validation.canMerge,
      reasons: validation.reasons,
    };

    if (validation.canMerge) {
      const merged = buildMergedStatement(statementData);
      const mergedExcel = generateMergedStatementsExcel({
        bankInfo: merged.bankInfo,
        statementPeriod: merged.statementPeriod,
        transactions: merged.mergedTransactions,
        totals: merged.totals,
      });
      mergePayload = {
        available: true,
        reasons: [],
        excelData: bufferToBase64(mergedExcel.buffer),
        statementPeriod: merged.statementPeriod,
        duplicatesRemoved: merged.duplicatesRemoved,
        totals: merged.totals,
        fileName: 'merged_statements.xlsx',
      };
    }

    // Increment usage count per successful statement
    let remaining = conversionsLimit - conversionsUsed;
    for (let i = 0; i < successes.length; i++) {
      const { error: incrementError } = await supabaseAdmin.rpc('increment_usage_count', {
        p_ip_address: user ? null : ipAddress,
        p_user_id: user ? user.id : null,
      });
      if (incrementError) {
        console.error('Error incrementing usage after success:', incrementError);
      }
    }
    remaining = Math.max(0, conversionsLimit - conversionsUsed - successes.length);

    return new Response(
      JSON.stringify({
        success: true,
        separate: {
          results: successes.map((s) => ({
            fileName: s.fileName,
            excelData: s.excelBase64,
            totals: s.totals,
          })),
          failures,
        },
        merge: mergePayload,
        remaining,
        isAuthenticated: !!user,
        // Include aggregated analytics for batch mode panels
        analytics: successes.length > 0 ? aggregateBatchAnalytics(successes) : null,
        // Include all transactions for export options
        transactions: successes.flatMap(s => s.transactions),
        planType: userPlanType,
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
