import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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

    // Check subscription tier and usage
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

    // Check conversion limit
    if (subscription.conversions_used >= subscription.conversions_limit) {
      return new Response(
        JSON.stringify({
          error: 'Conversion limit reached',
          message: `You have reached your ${subscription.tier} plan limit of ${subscription.conversions_limit} conversions.`,
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

    // Placeholder for actual AI conversion logic
    // In production, this would:
    // 1. Download the file from storage
    // 2. Process with Lovable AI or external OCR/AI service
    // 3. Generate Excel file
    // 4. Upload result to storage
    // 5. Update conversion record with result_path

    // For now, simulate processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Update conversion status (placeholder)
    const { error: updateError } = await supabase
      .from('conversions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        result_path: `results/${user.id}/${conversion.id}.xlsx`,
      })
      .eq('id', conversion.id);

    if (updateError) {
      console.error('Failed to update conversion:', updateError);
    }

    // Increment usage counter
    await supabase
      .from('subscriptions')
      .update({ conversions_used: subscription.conversions_used + 1 })
      .eq('user_id', user.id);

    return new Response(
      JSON.stringify({
        success: true,
        conversionId: conversion.id,
        message: 'Conversion started successfully',
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
