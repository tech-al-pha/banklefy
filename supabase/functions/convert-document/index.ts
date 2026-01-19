import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';

// Get allowed origin from environment or use default
const getAllowedOrigin = (requestOrigin: string | null): string => {
  const allowedOrigins = [
    Deno.env.get('ALLOWED_ORIGIN') || '',
    'https://akromeda.lovable.app',
    'http://localhost:8080',
    'http://localhost:5173',
  ].filter(Boolean);
  
  // Check if the request origin is in our allowed list
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }
  
  // For Lovable preview URLs - allow all .lovable.app and .lovableproject.com subdomains
  const lovableAppPattern = /^https:\/\/[a-z0-9-]+\.lovable\.app$/;
  const lovableProjectPattern = /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/;
  if (requestOrigin && (lovableAppPattern.test(requestOrigin) || lovableProjectPattern.test(requestOrigin))) {
    return requestOrigin;
  }
  
  // Default to first allowed origin
  return allowedOrigins[0] || 'https://akromeda.lovable.app';
};

const getCorsHeaders = (req: Request) => ({
  'Access-Control-Allow-Origin': getAllowedOrigin(req.headers.get('origin')),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
});

// Sanitize error messages to prevent information leakage
const sanitizeError = (error: unknown): string => {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    // Map known error patterns to safe messages
    if (msg.includes('relation') || msg.includes('table') || msg.includes('column')) {
      return 'Database configuration error';
    }
    if (msg.includes('auth') || msg.includes('jwt') || msg.includes('token')) {
      return 'Authentication failed';
    }
    if (msg.includes('storage') || msg.includes('bucket')) {
      return 'File storage error';
    }
    // For known safe error messages we explicitly return, pass them through
    const safeMessages = [
      'no transactions found in the document',
      'failed to extract transaction data from document',
      'the document has no pages',
      'document appears to be empty or corrupted',
      'unable to read document content',
      'invalid or unsupported document format',
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

// Get client IP address securely (use rightmost IP in chain as it's most trusted)
const getClientIp = (req: Request): string => {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    // Get the rightmost IP (most trusted, added by our edge infrastructure)
    const ips = forwarded.split(',').map(ip => ip.trim()).filter(Boolean);
    return ips[ips.length - 1] || 'unknown';
  }
  // Fallback to other headers
  return req.headers.get('cf-connecting-ip') || 
         req.headers.get('x-real-ip') || 
         'unknown';
};

// Verify reCAPTCHA token with Google
async function verifyRecaptcha(token: string): Promise<boolean> {
  const secretKey = Deno.env.get('RECAPTCHA_SECRET_KEY');
  if (!secretKey) {
    console.error('RECAPTCHA_SECRET_KEY not configured');
    return false;
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
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

// Validate timezone to prevent injection attacks (defense in depth)
const isValidTimezone = (tz: string): boolean => {
  if (!tz || typeof tz !== 'string' || tz.length > 50) return false;
  // Only allow alphanumeric, underscores, slashes, plus, minus (valid IANA timezone chars)
  const validPattern = /^[A-Za-z0-9_/+-]+$/;
  return validPattern.test(tz);
};

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get request data first
    const { fileId, fileName, fileData: base64FileData, timezone, recaptchaToken } = await req.json();
    const userTimezone = (timezone && isValidTimezone(timezone)) ? timezone : 'UTC';

    // Get client IP address securely for anonymous users
    const ipAddress = getClientIp(req);

    // Create service role client for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if user is authenticated
    const authHeader = req.headers.get('Authorization');
    let user = null;
    let supabase = supabaseAdmin;
    
    if (authHeader && authHeader !== 'Bearer null') {
      supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: { Authorization: authHeader },
          },
        }
      );
      
      const { data: { user: authUser } } = await supabase.auth.getUser();
      user = authUser;
    }

    // For anonymous users, require reCAPTCHA verification
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

    // For anonymous users, we need base64 file data since they can't use storage
    // For authenticated users, we use fileId to download from storage
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

    // Validate file name - allow common filename characters
    if (typeof fileName !== 'string' || fileName.length > 255 || fileName.includes('..') || fileName.includes('/')) {
      return new Response(
        JSON.stringify({ error: 'Invalid file name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let bytes: Uint8Array;

    if (user && fileId) {
      // Authenticated user - download from storage
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
      // Anonymous user - decode base64 file data
      try {
        const base64Content = base64FileData.split(',')[1] || base64FileData;
        const binaryString = atob(base64Content);
        bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
      } catch (e) {
        return new Response(
          JSON.stringify({ error: 'Invalid file data' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check file size (10MB limit)
    if (bytes.length > 10 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: 'File exceeds 10MB limit' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify magic bytes based on file extension
    const lowerFileName = fileName.toLowerCase();
    if (lowerFileName.endsWith('.pdf')) {
      // PDF magic bytes: %PDF (0x25 0x50 0x44 0x46)
      if (bytes[0] !== 0x25 || bytes[1] !== 0x50 || bytes[2] !== 0x44 || bytes[3] !== 0x46) {
        return new Response(
          JSON.stringify({ error: 'Invalid PDF file format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (lowerFileName.endsWith('.png')) {
      // PNG magic bytes: 0x89 0x50 0x4E 0x47
      if (bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4E || bytes[3] !== 0x47) {
        return new Response(
          JSON.stringify({ error: 'Invalid PNG file format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (lowerFileName.endsWith('.jpg') || lowerFileName.endsWith('.jpeg')) {
      // JPEG magic bytes: 0xFF 0xD8 0xFF
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

    // Check and reset daily limit based on user type
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
    const conversionsLimit = usageInfo?.conversions_limit ?? (user ? 6 : 2);

    console.log('Usage info:', { conversionsUsed, conversionsLimit, user: !!user });

    // Check if user would exceed limit
    if (conversionsUsed >= conversionsLimit) {
      return new Response(
        JSON.stringify({
          error: 'Conversion limit reached',
          limitReached: true,
          isAuthenticated: !!user,
          message: user 
            ? `You have reached your daily limit of ${conversionsLimit} conversions.`
            : `You have reached your daily limit of ${conversionsLimit} free conversions. Sign up for a free account to get ${6} conversions per day!`,
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

    // Create conversion record only for authenticated users
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
        // Don't fail the request, just log it
      } else {
        conversion = convData;
      }
    }

    // Convert file to base64 for AI processing (chunk to avoid stack overflow)
    const chunkSize = 8192;
    let base64Data = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      base64Data += String.fromCharCode(...chunk);
    }
    base64Data = btoa(base64Data);
    const mimeType = lowerFileName.endsWith('.pdf') ? 'application/pdf' : 
                     lowerFileName.endsWith('.png') ? 'image/png' : 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${base64Data}`;

    console.log('Starting AI conversion for file:', fileName);

    // Process with Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a professional bank statement data extraction and financial analysis expert. Your job is to extract transaction data from bank statements of ANY bank worldwide and normalize them into a standardized schema.

UNIVERSAL SCHEMA (all fields required):
- date: Normalized to YYYY-MM-DD format (handle DD/MM/YYYY, MM/DD/YYYY, DD-Mon-YY, etc.)
- description: Clean transaction description (remove excessive whitespace, normalize case)
- category: Classify into one of these categories:
  * "Salary/Income" - salary credits, wages, business income
  * "Transfer In" - incoming transfers, deposits
  * "Transfer Out" - outgoing transfers, sent money
  * "Bills & Utilities" - electricity, water, gas, internet, phone
  * "Shopping" - retail, e-commerce, Amazon, Flipkart, etc.
  * "Food & Dining" - restaurants, Swiggy, Zomato, groceries
  * "Transportation" - Uber, Ola, fuel, parking, tolls
  * "Entertainment" - movies, Netflix, Spotify, gaming
  * "Healthcare" - hospitals, pharmacies, medical
  * "Education" - school fees, courses, books
  * "Insurance" - premiums, policies
  * "Investments" - mutual funds, stocks, FD, RD
  * "Loan/EMI" - loan payments, EMI deductions
  * "Cash" - ATM withdrawals, cash deposits
  * "Bank Fees" - charges, penalties, service fees
  * "Other" - uncategorized transactions
- debit: Amount debited (as positive number, 0 if credit transaction)
- credit: Amount credited (as positive number, 0 if debit transaction)
- balance: Running balance after transaction (number)

SMART DATA CLEANING RULES:
1. Date Normalization: Convert all dates to YYYY-MM-DD regardless of input format
2. Amount Cleaning: Handle comma separators (1,234.56 → 1234.56), handle lakhs format (1,23,456.78 → 123456.78)
3. Description Cleaning: Remove multiple spaces, trim whitespace, capitalize first letter
4. Detect duplicates: If you see transactions with identical date, description, and amount - add isDuplicate: true

DUPLICATE DETECTION:
Mark transactions as potential duplicates if they have:
- Same date AND same amount AND similar description (>80% match)
- Add field: isDuplicate (boolean) and duplicateGroup (number - same group ID for suspected duplicates)

Return ONLY a valid JSON array, no markdown, no explanation.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract ALL transactions from this bank statement. Apply the universal schema with smart cleaning and duplicate detection. Return only the JSON array.'
              },
              {
                type: 'image_url',
                image_url: { url: dataUrl }
              }
            ]
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      // Parse specific error messages from the AI provider
      try {
        const errorData = JSON.parse(errorText);
        const rawError = errorData?.error?.metadata?.raw;
        if (rawError) {
          const parsedRaw = JSON.parse(rawError);
          const errorMessage = parsedRaw?.error?.message;
          if (errorMessage) {
            // Map known AI errors to user-friendly messages
            if (errorMessage.toLowerCase().includes('no pages')) {
              throw new Error('The document has no pages. Please upload a valid PDF with readable content.');
            }
            if (errorMessage.toLowerCase().includes('invalid')) {
              throw new Error('Invalid or unsupported document format. Please try a different file.');
            }
          }
        }
      } catch (parseErr) {
        // If parsing fails, continue with generic error
        if (parseErr instanceof Error && parseErr.message.includes('document')) {
          throw parseErr;
        }
      }
      
      throw new Error('Unable to read document content. Please ensure the file is not corrupted.');
    }

    const aiData = await aiResponse.json();
    const extractedText = aiData.choices?.[0]?.message?.content || '';
    
    console.log('AI response received, parsing data...');

    // Parse the JSON response
    let transactions = [];
    try {
      // Extract JSON from the response (handle markdown code blocks)
      const jsonMatch = extractedText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        transactions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON array found in AI response');
      }
    } catch (parseError: unknown) {
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
      console.error('Failed to parse AI response:', errorMessage);
      throw new Error('Failed to extract transaction data from document');
    }

    if (!Array.isArray(transactions) || transactions.length === 0) {
      throw new Error('No transactions found in the document');
    }

    // Post-processing: Additional validation and cleaning
    transactions = transactions.map((t, index) => {
      // Ensure all required fields exist with defaults
      const cleaned: Record<string, any> = {
        date: t.date || 'Unknown',
        description: (t.description || 'Unknown Transaction').trim(),
        category: t.category || 'Other',
        debit: typeof t.debit === 'number' ? Math.abs(t.debit) : (t.type?.toLowerCase() === 'debit' ? Math.abs(t.amount || 0) : 0),
        credit: typeof t.credit === 'number' ? Math.abs(t.credit) : (t.type?.toLowerCase() === 'credit' ? Math.abs(t.amount || 0) : 0),
        balance: typeof t.balance === 'number' ? t.balance : 0,
        isDuplicate: t.isDuplicate || false,
        duplicateGroup: t.duplicateGroup || null,
        // Keep legacy fields for backward compatibility
        amount: t.amount || (t.debit || 0) - (t.credit || 0),
        type: t.type || (t.debit > 0 ? 'debit' : 'credit'),
        // Fraud detection fields (will be populated later)
        balanceMismatch: false,
        expectedBalance: null,
        riskFlag: null,
      };
      return cleaned;
    });

    // Secondary duplicate detection (in case AI missed some)
    const duplicateMap = new Map();
    transactions.forEach((t, i) => {
      const key = `${t.date}_${Math.abs(t.debit || t.credit)}_${t.description.substring(0, 20).toLowerCase()}`;
      if (duplicateMap.has(key)) {
        const groupId = duplicateMap.get(key).groupId;
        t.isDuplicate = true;
        t.duplicateGroup = groupId;
        duplicateMap.get(key).transaction.isDuplicate = true;
        duplicateMap.get(key).transaction.duplicateGroup = groupId;
      } else {
        duplicateMap.set(key, { transaction: t, groupId: i + 1 });
      }
    });

    // ============= FRAUD DETECTION: BALANCE RECONCILIATION =============
    console.log('Starting balance reconciliation and fraud detection...');
    
    interface FraudAlert {
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      affectedRows: number[];
      metadata: Record<string, any>;
    }
    
    const fraudAlerts: FraudAlert[] = [];
    const balanceMismatches: { rowIndex: number; expected: number; actual: number; difference: number }[] = [];
    
    // Balance Reconciliation: Verify running balance for each transaction
    // Formula: Balance[n-1] + Credit[n] - Debit[n] = Balance[n]
    for (let i = 1; i < transactions.length; i++) {
      const prevBalance = transactions[i - 1].balance;
      const currentCredit = transactions[i].credit || 0;
      const currentDebit = transactions[i].debit || 0;
      const expectedBalance = prevBalance + currentCredit - currentDebit;
      const actualBalance = transactions[i].balance;
      
      // Allow small tolerance for rounding (0.01)
      const difference = Math.abs(expectedBalance - actualBalance);
      if (difference > 0.01) {
        balanceMismatches.push({
          rowIndex: i,
          expected: expectedBalance,
          actual: actualBalance,
          difference: difference,
        });
        // Mark the transaction with integrity issue
        transactions[i].balanceMismatch = true;
        transactions[i].expectedBalance = expectedBalance;
      }
    }
    
    // If balance mismatches found, create fraud alert
    if (balanceMismatches.length > 0) {
      const mismatchPercentage = (balanceMismatches.length / transactions.length) * 100;
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
      
      if (mismatchPercentage > 20) severity = 'critical';
      else if (mismatchPercentage > 10) severity = 'high';
      else if (mismatchPercentage > 5) severity = 'medium';
      
      fraudAlerts.push({
        type: 'BALANCE_INTEGRITY',
        severity,
        description: `${balanceMismatches.length} transaction(s) have balance discrepancies. Mathematical reconciliation failed.`,
        affectedRows: balanceMismatches.map(m => m.rowIndex),
        metadata: {
          totalMismatches: balanceMismatches.length,
          mismatchPercentage: mismatchPercentage.toFixed(2),
          details: balanceMismatches.slice(0, 10), // First 10 mismatches
        },
      });
    }

    // HIGH-RISK TRANSACTION DETECTION
    const highRiskKeywords = {
      gambling: ['bet365', 'betway', 'dream11', 'stake', 'casino', 'poker', 'gambling', 'lottery', 'rummy', 'betting'],
      paydayLoan: ['payday', 'quickloan', 'fastcash', 'instantloan', 'moneynow', 'cashadvance'],
      bouncedPayment: ['cheque return', 'ecs return', 'nach return', 'dishonor', 'bounce', 'returned unpaid', 'insufficient funds'],
    };
    
    const riskTransactions: { type: string; indices: number[]; transactions: any[] }[] = [];
    
    transactions.forEach((t, index) => {
      const desc = t.description.toLowerCase();
      
      // Gambling detection
      if (highRiskKeywords.gambling.some(k => desc.includes(k))) {
        const existing = riskTransactions.find(r => r.type === 'gambling');
        if (existing) {
          existing.indices.push(index);
          existing.transactions.push({ date: t.date, description: t.description, amount: t.debit || t.credit });
        } else {
          riskTransactions.push({
            type: 'gambling',
            indices: [index],
            transactions: [{ date: t.date, description: t.description, amount: t.debit || t.credit }],
          });
        }
        transactions[index].riskFlag = 'gambling';
      }
      
      // Payday loan detection
      if (highRiskKeywords.paydayLoan.some(k => desc.includes(k))) {
        const existing = riskTransactions.find(r => r.type === 'paydayLoan');
        if (existing) {
          existing.indices.push(index);
          existing.transactions.push({ date: t.date, description: t.description, amount: t.debit || t.credit });
        } else {
          riskTransactions.push({
            type: 'paydayLoan',
            indices: [index],
            transactions: [{ date: t.date, description: t.description, amount: t.debit || t.credit }],
          });
        }
        transactions[index].riskFlag = 'paydayLoan';
      }
      
      // Bounced payment detection
      if (highRiskKeywords.bouncedPayment.some(k => desc.includes(k))) {
        const existing = riskTransactions.find(r => r.type === 'bouncedPayment');
        if (existing) {
          existing.indices.push(index);
          existing.transactions.push({ date: t.date, description: t.description, amount: t.debit || t.credit });
        } else {
          riskTransactions.push({
            type: 'bouncedPayment',
            indices: [index],
            transactions: [{ date: t.date, description: t.description, amount: t.debit || t.credit }],
          });
        }
        transactions[index].riskFlag = 'bouncedPayment';
      }
    });
    
    // Create alerts for high-risk transactions
    riskTransactions.forEach(risk => {
      const riskLabels: Record<string, { label: string; severity: 'medium' | 'high' | 'critical' }> = {
        gambling: { label: 'Gambling/Betting Activity', severity: 'high' },
        paydayLoan: { label: 'Payday Loan Activity', severity: 'medium' },
        bouncedPayment: { label: 'Bounced/Returned Payments', severity: 'critical' },
      };
      
      const riskInfo = riskLabels[risk.type];
      fraudAlerts.push({
        type: `HIGH_RISK_${risk.type.toUpperCase()}`,
        severity: riskInfo.severity,
        description: `${risk.indices.length} ${riskInfo.label} detected. This may impact creditworthiness assessment.`,
        affectedRows: risk.indices,
        metadata: {
          count: risk.indices.length,
          transactions: risk.transactions,
        },
      });
    });

    // CIRCULAR TRADING DETECTION
    // Look for high-frequency transfers between same parties
    const transferPairs = new Map<string, { count: number; indices: number[]; totalAmount: number }>();
    transactions.forEach((t, index) => {
      if (t.category === 'Transfer In' || t.category === 'Transfer Out') {
        // Extract potential account identifier from description (simplified)
        const desc = t.description.toLowerCase();
        const match = desc.match(/(?:to|from|upi|imps|neft|rtgs)\s*[:\-]?\s*([a-z0-9@\-_.]+)/);
        if (match) {
          const key = match[1].substring(0, 20);
          const existing = transferPairs.get(key);
          if (existing) {
            existing.count++;
            existing.indices.push(index);
            existing.totalAmount += (t.debit || t.credit);
          } else {
            transferPairs.set(key, { count: 1, indices: [index], totalAmount: t.debit || t.credit });
          }
        }
      }
    });
    
    // Flag circular trading (>5 transfers to same party)
    transferPairs.forEach((value, key) => {
      if (value.count >= 5) {
        fraudAlerts.push({
          type: 'CIRCULAR_TRADING',
          severity: 'high',
          description: `High-frequency transfers detected: ${value.count} transactions to/from similar account. Possible circular trading.`,
          affectedRows: value.indices,
          metadata: {
            transferCount: value.count,
            totalAmount: value.totalAmount,
            pattern: key,
          },
        });
        value.indices.forEach(i => {
          transactions[i].riskFlag = 'circularTrading';
        });
      }
    });

    // ============= FOIR & SALARY ANALYSIS (UNDERWRITING ENGINE) =============
    console.log('Starting FOIR & Salary Analysis...');
    
    // Keywords for salary detection
    const salaryKeywords = ['salary', 'sal cr', 'sal/', 'payroll', 'wages', 'income', 'stipend', 'pension', 'honorarium'];
    const emiKeywords = ['emi', 'loan', 'instalment', 'installment', 'repayment', 'housing loan', 'car loan', 'personal loan', 'credit card', 'nach', 'auto debit'];
    
    // Fetch user's category corrections for behavioral learning (if authenticated)
    let categoryCorrections: Map<string, string> = new Map();
    if (user) {
      const { data: corrections } = await supabaseAdmin
        .from('category_corrections')
        .select('description_pattern, corrected_category, weight')
        .eq('user_id', user.id)
        .order('weight', { ascending: false });
      
      if (corrections) {
        corrections.forEach((c: any) => {
          categoryCorrections.set(c.description_pattern.toLowerCase(), c.corrected_category);
        });
        console.log(`Loaded ${corrections.length} category corrections for user`);
      }
    }
    
    // Identify salary credits
    interface SalaryCredit {
      date: string;
      amount: number;
      description: string;
      rowIndex: number;
    }
    const salaryCredits: SalaryCredit[] = [];
    
    // Identify EMI/Loan debits
    interface EMIDebit {
      date: string;
      amount: number;
      description: string;
      rowIndex: number;
      loanType: string;
    }
    const emiDebits: EMIDebit[] = [];
    
    transactions.forEach((t: any, index: number) => {
      const desc = t.description.toLowerCase();
      
      // Apply category corrections first (behavioral learning)
      const correctedCategory = categoryCorrections.get(desc) || 
                               [...categoryCorrections.entries()].find(([pattern]) => desc.includes(pattern))?.[1];
      if (correctedCategory) {
        t.category = correctedCategory;
      }
      
      // Detect salary credits
      if (t.credit > 0 && (
        salaryKeywords.some(k => desc.includes(k)) ||
        t.category === 'Salary/Income' ||
        (t.credit >= 30000 && (desc.includes('neft') || desc.includes('rtgs') || desc.includes('imps')))
      )) {
        salaryCredits.push({
          date: t.date,
          amount: t.credit,
          description: t.description,
          rowIndex: index,
        });
        if (t.category !== 'Salary/Income') {
          t.category = 'Salary/Income';
        }
      }
      
      // Detect EMI/Loan debits
      if (t.debit > 0 && (
        emiKeywords.some(k => desc.includes(k)) ||
        t.category === 'Loan/EMI'
      )) {
        let loanType = 'Unknown';
        if (desc.includes('housing') || desc.includes('home loan') || desc.includes('mortgage')) loanType = 'Housing';
        else if (desc.includes('car') || desc.includes('vehicle') || desc.includes('auto')) loanType = 'Vehicle';
        else if (desc.includes('personal') || desc.includes('pl')) loanType = 'Personal';
        else if (desc.includes('credit card') || desc.includes('cc')) loanType = 'Credit Card';
        else if (desc.includes('education') || desc.includes('student')) loanType = 'Education';
        else if (emiKeywords.some(k => desc.includes(k))) loanType = 'EMI';
        
        emiDebits.push({
          date: t.date,
          amount: t.debit,
          description: t.description,
          rowIndex: index,
          loanType,
        });
        if (t.category !== 'Loan/EMI') {
          t.category = 'Loan/EMI';
        }
      }
    });
    
    // Calculate monthly aggregates
    const monthlyData: Map<string, { salaries: number; emis: number }> = new Map();
    
    transactions.forEach((t: any) => {
      const month = t.date.substring(0, 7);
      if (!monthlyData.has(month)) {
        monthlyData.set(month, { salaries: 0, emis: 0 });
      }
    });
    
    salaryCredits.forEach(s => {
      const month = s.date.substring(0, 7);
      const existing = monthlyData.get(month) || { salaries: 0, emis: 0 };
      existing.salaries += s.amount;
      monthlyData.set(month, existing);
    });
    
    emiDebits.forEach(e => {
      const month = e.date.substring(0, 7);
      const existing = monthlyData.get(month) || { salaries: 0, emis: 0 };
      existing.emis += e.amount;
      monthlyData.set(month, existing);
    });
    
    // Calculate average monthly income and EMI
    const months = Array.from(monthlyData.values());
    const totalSalaryIncome = months.reduce((sum, m) => sum + m.salaries, 0);
    const totalEMIOutflow = months.reduce((sum, m) => sum + m.emis, 0);
    const avgMonthlyIncome = months.length > 0 ? totalSalaryIncome / months.length : 0;
    const avgMonthlyEMI = months.length > 0 ? totalEMIOutflow / months.length : 0;
    
    // Calculate FOIR (Fixed Obligation to Income Ratio)
    const foirScore = avgMonthlyIncome > 0 ? (avgMonthlyEMI / avgMonthlyIncome) * 100 : 0;
    
    // Group EMI debits by loan type
    const emiByType: Record<string, { count: number; totalAmount: number }> = {};
    emiDebits.forEach(e => {
      if (!emiByType[e.loanType]) {
        emiByType[e.loanType] = { count: 0, totalAmount: 0 };
      }
      emiByType[e.loanType].count++;
      emiByType[e.loanType].totalAmount += e.amount;
    });
    
    // Underwriting recommendation
    let eligibilityStatus: 'excellent' | 'good' | 'moderate' | 'poor' | 'ineligible' = 'good';
    let eligibilityMessage = '';
    const eligibilityFactors: string[] = [];
    
    if (foirScore === 0 && salaryCredits.length === 0) {
      eligibilityStatus = 'moderate';
      eligibilityMessage = 'No salary income detected. Unable to calculate FOIR.';
      eligibilityFactors.push('No identifiable salary credits');
    } else if (foirScore <= 30) {
      eligibilityStatus = 'excellent';
      eligibilityMessage = 'Excellent debt-to-income ratio. High loan eligibility.';
      eligibilityFactors.push('FOIR below 30% - excellent');
    } else if (foirScore <= 50) {
      eligibilityStatus = 'good';
      eligibilityMessage = 'Good debt-to-income ratio. Eligible for most loans.';
      eligibilityFactors.push('FOIR between 30-50% - acceptable');
    } else if (foirScore <= 65) {
      eligibilityStatus = 'moderate';
      eligibilityMessage = 'Moderate debt burden. May face stricter approval criteria.';
      eligibilityFactors.push('FOIR above 50% - elevated');
    } else {
      eligibilityStatus = 'poor';
      eligibilityMessage = 'High debt burden. Loan approval may be difficult.';
      eligibilityFactors.push('FOIR above 65% - high risk');
    }
    
    if (riskTransactions.some(r => r.type === 'gambling')) {
      if (eligibilityStatus === 'excellent') eligibilityStatus = 'good';
      else if (eligibilityStatus === 'good') eligibilityStatus = 'moderate';
      eligibilityFactors.push('Gambling activity detected');
    }
    
    if (riskTransactions.some(r => r.type === 'bouncedPayment')) {
      if (eligibilityStatus === 'excellent' || eligibilityStatus === 'good') eligibilityStatus = 'moderate';
      else if (eligibilityStatus === 'moderate') eligibilityStatus = 'poor';
      eligibilityFactors.push('Bounced payments on record');
    }
    
    // Track zero balance days for eligibility and integrity scoring
    const zeroDays = transactions.filter((t: any) => t.balance <= 0);
    
    if (zeroDays.length > 0) {
      eligibilityFactors.push('Zero/negative balance instances');
      // Add liquidity crisis alert
      fraudAlerts.push({
        type: 'LIQUIDITY_CRISIS',
        severity: zeroDays.length > 3 ? 'critical' : 'high',
        description: `Account reached zero or negative balance on ${zeroDays.length} occasion(s). Indicates liquidity stress.`,
        affectedRows: transactions.map((t: any, i: number) => t.balance <= 0 ? i : -1).filter((i: number) => i >= 0),
        metadata: {
          zeroDaysCount: zeroDays.length,
          lowestBalance: Math.min(...transactions.map((t: any) => t.balance)),
        },
      });
    }
    
    const disposableIncome = avgMonthlyIncome - avgMonthlyEMI;
    const maxNewEMI = disposableIncome * 0.5;
    const estimatedLoanEligibility = maxNewEMI > 0 ? maxNewEMI * 60 : 0;
    
    const underwritingAnalysis = {
      salaryCredits: salaryCredits.map(s => ({
        date: s.date,
        amount: s.amount,
        description: s.description,
      })),
      emiDebits: emiDebits.map(e => ({
        date: e.date,
        amount: e.amount,
        description: e.description,
        loanType: e.loanType,
      })),
      monthlyBreakdown: Array.from(monthlyData.entries()).map(([month, data]) => ({
        month,
        salaryIncome: data.salaries,
        emiOutflow: data.emis,
      })),
      summary: {
        avgMonthlyIncome,
        avgMonthlyEMI,
        foirScore: Math.round(foirScore * 100) / 100,
        foirStatus: foirScore <= 30 ? 'excellent' : foirScore <= 50 ? 'good' : foirScore <= 65 ? 'moderate' : 'high',
        emiByLoanType: emiByType,
        totalSalaryDetected: salaryCredits.length,
        totalEMIDetected: emiDebits.length,
      },
      eligibility: {
        status: eligibilityStatus,
        message: eligibilityMessage,
        factors: eligibilityFactors,
        maxNewEMI: Math.round(maxNewEMI),
        estimatedLoanEligibility: Math.round(estimatedLoanEligibility),
      },
    };
    
    console.log(`FOIR Analysis complete. Score: ${foirScore.toFixed(2)}%, Status: ${eligibilityStatus}`);

    // LIQUIDITY ANALYSIS
    const balances = transactions.map((t: any) => t.balance);
    const minBalance = Math.min(...balances);
    const maxBalance = Math.max(...balances);
    const avgBalance = balances.reduce((a: number, b: number) => a + b, 0) / balances.length;
    const minBalanceIndex = balances.indexOf(minBalance);
    const maxDipDate = transactions[minBalanceIndex]?.date || null;

    // Calculate integrity score (100 = perfect, 0 = highly suspicious)
    let integrityScore = 100;
    integrityScore -= Math.min(30, balanceMismatches.length * 3);
    integrityScore -= Math.min(20, riskTransactions.length * 5);
    integrityScore -= Math.min(20, zeroDays.length * 5);
    integrityScore = Math.max(0, integrityScore);

    console.log(`Fraud detection complete. Found ${fraudAlerts.length} alerts. Integrity score: ${integrityScore}`);

    // Calculate analytics summary
    const totalCredits = transactions.reduce((sum: number, t: any) => sum + (t.credit || 0), 0);
    const totalDebits = transactions.reduce((sum: number, t: any) => sum + (t.debit || 0), 0);
    const duplicateCount = transactions.filter((t: any) => t.isDuplicate).length;
    
    // Category breakdown
    const categoryBreakdown: Record<string, { count: number; totalDebit: number; totalCredit: number }> = {};
    transactions.forEach((t: any) => {
      if (!categoryBreakdown[t.category]) {
        categoryBreakdown[t.category] = { count: 0, totalDebit: 0, totalCredit: 0 };
      }
      categoryBreakdown[t.category].count++;
      categoryBreakdown[t.category].totalDebit += t.debit || 0;
      categoryBreakdown[t.category].totalCredit += t.credit || 0;
    });

    // Risk analysis summary (including FOIR)
    const riskAnalysis = {
      integrityScore,
      balanceMismatches: balanceMismatches.length,
      averageDailyBalance: avgBalance,
      maxDip: { amount: minBalance, date: maxDipDate },
      maxPeak: maxBalance,
      riskFlags: riskTransactions.map(r => ({ type: r.type, count: r.indices.length })),
      fraudAlerts,
      foirScore: Math.round(foirScore * 100) / 100,
      avgMonthlyIncome,
      avgMonthlyEMI,
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

    console.log(`Extracted ${transactions.length} transactions`);

    // Generate Excel file
    const worksheet = XLSX.utils.json_to_sheet(transactions);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
    
    // Write to buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    let resultPath = null;

    // Only upload to storage for authenticated users
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
        // Don't fail, just skip storage
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
      }
    }

    // Convert Excel buffer to base64 for anonymous users (chunk to avoid stack overflow)
    const excelBytes = new Uint8Array(excelBuffer);
    let excelBase64 = '';
    for (let i = 0; i < excelBytes.length; i += chunkSize) {
      const chunk = excelBytes.subarray(i, i + chunkSize);
      excelBase64 += String.fromCharCode(...chunk);
    }
    excelBase64 = btoa(excelBase64);

    return new Response(
      JSON.stringify({
        success: true,
        conversionId: conversion?.id || null,
        resultPath: resultPath,
        transactions: transactions,
        analytics: analytics,
        excelData: user ? null : excelBase64, // Only send base64 for anonymous users
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
