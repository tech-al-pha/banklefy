import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts';

// ============= CORS =============
const getAllowedOrigin = (requestOrigin: string | null): string => {
  const envOrigin = Deno.env.get('ALLOWED_ORIGIN');
  const allowedOrigins = [
    envOrigin,
    'https://banklefy.lovable.app',
    'https://banklefy.vercel.app',
    'http://localhost:8080',
    'http://localhost:8081',
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

  return allowedOrigins[0] || 'https://banklefy.vercel.app';
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

const extractBearerToken = (authHeader: string | null): string | null => {
  if (!authHeader) return null;
  const segments = authHeader.split(',').map((part) => part.trim());
  for (const segment of segments) {
    const match = segment.match(/^Bearer\s+(.+)$/i);
    if (match && match[1]?.trim()) return match[1].trim();
  }
  return null;
};

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
  const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization');
  const tokenFromHeader = extractBearerToken(authHeader);
  const tokenFromBody = typeof body.accessToken === 'string' ? body.accessToken.trim() : '';
  const tokenCandidates = Array.from(
    new Set(
      [tokenFromHeader, tokenFromBody]
        .filter((value): value is string => typeof value === 'string' && value.length > 0),
    ),
  );

  if (tokenCandidates.length === 0) {
    return respond(req, 401, { error: 'Authentication required.' });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  let userId: string | null = null;

  for (const candidateToken of tokenCandidates) {
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(candidateToken);
    if (!authError && authData.user) {
      userId = authData.user.id;
      break;
    }
  }

  if (!userId) {
    return respond(req, 401, { error: 'Invalid or expired session.' });
  }

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

  if (order.status === 'paid') {
    return respond(req, 200, {
      success: true,
      alreadyProcessed: true,
      message: 'Order already marked as paid.',
      plan_id: order.plan_id,
      pages_added: 0,
    });
  }

  // Update user subscription based on plan
  const planId = order.plan_id as string;
  const pagesToAdd = PLAN_PAGES[planId] || 0;

  const { data: processResult, error: processError } = await supabaseAdmin.rpc('process_razorpay_payment', {
    p_user_id: userId,
    p_order_id: order.id,
    p_razorpay_payment_id: razorpay_payment_id,
    p_razorpay_order_id: razorpay_order_id,
    p_razorpay_signature: razorpay_signature,
    p_amount: order.amount,
    p_currency: order.currency,
    p_plan_id: planId,
    p_pages_to_add: pagesToAdd,
  });

  if (processError) {
    console.error('Failed to process payment', processError);
    return respond(req, 500, { error: 'Failed to finalize payment.' });
  }

  const result = Array.isArray(processResult) ? processResult[0] : processResult;
  const alreadyProcessed = Boolean(result?.already_processed ?? result?.alreadyProcessed);
  const pagesAdded = Number(result?.pages_added ?? result?.pagesAdded ?? 0);

  return respond(req, 200, {
    success: true,
    message: alreadyProcessed ? 'Payment already verified.' : 'Payment verified successfully.',
    alreadyProcessed,
    plan_id: planId,
    pages_added: pagesAdded,
  });
});
