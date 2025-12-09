import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get request data first
    const { fileId, fileName, fileData: base64FileData, timezone } = await req.json();
    const userTimezone = timezone || 'UTC';

    // Get client IP address for anonymous users
    const forwarded = req.headers.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

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

    // Validate file name
    if (typeof fileName !== 'string' || fileName.length > 255 || !/^[a-zA-Z0-9._\s-]+$/.test(fileName)) {
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

    // Convert file to base64 for AI processing
    const base64Data = btoa(String.fromCharCode(...bytes));
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
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError, extractedText);
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

    // Convert Excel buffer to base64 for anonymous users
    const excelBase64 = btoa(String.fromCharCode(...new Uint8Array(excelBuffer)));

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
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
