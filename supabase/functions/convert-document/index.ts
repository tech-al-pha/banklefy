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
  
  // For Lovable preview URLs - allow both .lovable.app and .lovableproject.com with this project ID
  const lovableAppPattern = /^https:\/\/[a-z0-9-]+\.lovable\.app$/;
  const projectIdPattern = /^https:\/\/[a-z0-9-]+-gzzsuvfqpvzvmlnbsqcf\.lovableproject\.com$/;
  if (requestOrigin && (lovableAppPattern.test(requestOrigin) || projectIdPattern.test(requestOrigin))) {
    return requestOrigin;
  }
  
  // Default to first allowed origin
  return allowedOrigins[0] || 'https://akromeda.lovable.app';
};

const getCorsHeaders = (req: Request) => ({
  'Access-Control-Allow-Origin': getAllowedOrigin(req.headers.get('origin')),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    if (msg.includes('ai') || msg.includes('gateway') || msg.includes('lovable')) {
      return 'Processing service unavailable';
    }
    if (msg.includes('api') || msg.includes('fetch')) {
      return 'External service error';
    }
    // For known safe error messages we explicitly return, pass them through
    const safeMessages = [
      'no transactions found in the document',
      'failed to extract transaction data from document',
    ];
    if (safeMessages.some(safe => msg.includes(safe))) {
      return error.message;
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
            content: 'You are a bank statement data extraction expert. Extract transaction data from bank statements and return it as structured JSON. Include: date, description, amount, balance, and transaction type (debit/credit).'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all transactions from this bank statement. Return a JSON array with fields: date (YYYY-MM-DD), description, amount (number), balance (number), type (debit/credit). Only return the JSON array, no other text.'
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
      throw new Error(`AI processing failed: ${aiResponse.status}`);
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
      resultPath = `results/${user.id}/${conversion.id}.xlsx`;
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
