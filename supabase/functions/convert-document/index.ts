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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get request data
    const { fileId, fileName } = await req.json();

    if (!fileId || !fileName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: fileId, fileName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file name
    if (typeof fileName !== 'string' || fileName.length > 255 || !/^[a-zA-Z0-9._-]+$/.test(fileName)) {
      return new Response(
        JSON.stringify({ error: 'Invalid file name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Download and validate file content (magic bytes verification)
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('bank-statements')
      .download(`${user.id}/${fileId}`);

    if (downloadError || !fileData) {
      return new Response(
        JSON.stringify({ error: 'File not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify file content matches expected type
    const buffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(buffer);

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

    // Atomically increment conversion usage and check limit
    // This prevents race conditions by doing both operations in a single query
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('tier, conversions_used, conversions_limit')
      .eq('user_id', user.id)
      .single();

    if (subError || !subscription) {
      return new Response(
        JSON.stringify({ error: 'Subscription not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user would exceed limit
    if (subscription.conversions_used >= subscription.conversions_limit) {
      return new Response(
        JSON.stringify({
          error: 'Conversion limit reached',
          message: `You have reached your ${subscription.tier} plan limit of ${subscription.conversions_limit} conversions.`,
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Atomically increment the counter - this prevents race conditions
    const { data: updatedSub, error: incrementError } = await supabase
      .from('subscriptions')
      .update({ conversions_used: subscription.conversions_used + 1 })
      .eq('user_id', user.id)
      .eq('conversions_used', subscription.conversions_used) // Only update if value hasn't changed
      .select()
      .single();

    if (incrementError || !updatedSub) {
      // If update failed, another request beat us to it - reject this request
      return new Response(
        JSON.stringify({
          error: 'Conversion limit reached',
          message: 'Please try again.',
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create conversion record
    const { data: conversion, error: convError } = await supabase
      .from('conversions')
      .insert({
        user_id: user.id,
        original_filename: fileName,
        file_path: fileId,
        status: 'processing',
      })
      .select()
      .single();

    if (convError || !conversion) {
      return new Response(
        JSON.stringify({ error: 'Failed to create conversion record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
    
    // Upload Excel file to storage
    const resultPath = `results/${user.id}/${conversion.id}.xlsx`;
    const { error: uploadResultError } = await supabase.storage
      .from('bank-statements')
      .upload(resultPath, excelBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: false,
      });

    if (uploadResultError) {
      console.error('Failed to upload result:', uploadResultError);
      throw uploadResultError;
    }

    console.log('Excel file uploaded successfully');

    // Update conversion status
    const { error: updateError } = await supabase
      .from('conversions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        result_path: resultPath,
      })
      .eq('id', conversion.id);

    if (updateError) {
      console.error('Failed to update conversion:', updateError);
      // If conversion failed, rollback the counter
      await supabase
        .from('subscriptions')
        .update({ conversions_used: updatedSub.conversions_used - 1 })
        .eq('user_id', user.id);
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        conversionId: conversion.id,
        transactions: transactions,
        message: 'Conversion completed successfully',
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
