import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts';

// ============= CORS =============
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

  return requestOrigin || allowedOrigins[0] || '*';
};

const getCorsHeaders = (req: Request) => ({
  'Access-Control-Allow-Origin': getAllowedOrigin(req.headers.get('origin')),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
});

const respond = (req: Request, status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', ...getCorsHeaders(req) },
  });

// Plan → pages mapping
const PLAN_PAGES: Record<string, number> = {
  // One-time
  per_page_lite: 10,
  per_page_standard: 25,
  per_page_power: 50,
  // Monthly
  monthly_basic: 300,
  monthly_pro: 1000,
  monthly_enterprise: 4500,
  // Yearly
  yearly_lite: 5000,
  yearly_full: 15000,
  yearly_pro: 65000,
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) });
  }

  const razorpaySecret =
    Deno.env.get('RAZERPAY_SECRET_KEY') ||
    Deno.env.get('RAZORPAY_SECRET_KEY') ||
    Deno.env.get('RAZORPAY_KEY_SECRET');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!razorpaySecret || !supabaseUrl || !supabaseServiceKey) {
    return respond(req, 500, { error: 'Server configuration incomplete.' });
  }

  if (req.method !== 'POST') {
    return respond(req, 405, { error: 'Only POST requests are supported.' });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return respond(req, 400, { error: 'Invalid JSON payload' });
  }

  const razorpay_order_id = typeof body.razorpay_order_id === 'string' ? body.razorpay_order_id.trim() : '';
  const razorpay_payment_id = typeof body.razorpay_payment_id === 'string' ? body.razorpay_payment_id.trim() : '';
  const razorpay_signature = typeof body.razorpay_signature === 'string' ? body.razorpay_signature.trim() : '';

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return respond(req, 400, { error: 'Missing required payment verification fields.' });
  }

  // Verify signature
  const generatedSignature = createHmac('sha256', razorpaySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (generatedSignature !== razorpay_signature) {
    console.error('Signature mismatch', { razorpay_order_id, razorpay_payment_id });
    return respond(req, 400, { error: 'Payment verification failed. Invalid signature.' });
  }

  // Auth check
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return respond(req, 401, { error: 'Authentication required.' });
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !authData?.user) {
    return respond(req, 401, { error: 'Unable to verify your session.' });
  }

  const userId = authData.user.id;

  // Get order from DB
  const { data: order, error: orderError } = await supabaseAdmin
    .from('razorpay_orders')
    .select('*')
    .eq('razorpay_order_id', razorpay_order_id)
    .single();

  if (orderError || !order) {
    console.error('Order not found', orderError);
    return respond(req, 404, { error: 'Order not found.' });
  }

  if (order.user_id !== userId) {
    return respond(req, 403, { error: 'Order does not belong to this user.' });
  }

  // Update order status
  await supabaseAdmin
    .from('razorpay_orders')
    .update({ status: 'paid' })
    .eq('id', order.id);

  // Insert payment record
  const { error: paymentError } = await supabaseAdmin.from('razorpay_payments').insert({
    user_id: userId,
    order_id: order.id,
    razorpay_payment_id,
    razorpay_order_id,
    razorpay_signature,
    amount: order.amount,
    currency: order.currency,
    status: 'captured',
    plan_id: order.plan_id,
    metadata: { verified_at: new Date().toISOString() },
  });

  if (paymentError) {
    console.error('Failed to insert payment', paymentError);
  }

  // Update user subscription based on plan
  const planId = order.plan_id as string;
  const pagesToAdd = PLAN_PAGES[planId] || 0;

  if (pagesToAdd > 0) {
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (subscription) {
      const newLimit = subscription.conversions_limit + pagesToAdd;
      await supabaseAdmin
        .from('subscriptions')
        .update({ 
          conversions_limit: newLimit,
          tier: planId.startsWith('yearly') ? 'business' : planId.startsWith('monthly') ? 'daily' : 'free',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
    }
  }

  return respond(req, 200, {
    success: true,
    message: 'Payment verified successfully.',
    plan_id: planId,
    pages_added: pagesToAdd,
  });
});
