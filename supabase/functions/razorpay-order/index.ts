import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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

const normalizeNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const buildNotes = (planId: string, userId: string, extra?: Record<string, unknown>) => {
  const notes: Record<string, string> = {
    plan_id: planId,
    user_id: userId,
  };

  if (extra && typeof extra === 'object') {
    Object.entries(extra).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      notes[key] = typeof value === 'string' ? value : JSON.stringify(value);
    });
  }

  return notes;
};

const respond = (req: Request, status: number, payload: unknown) => {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders(req),
    },
  });
};

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const razorpaySecret =
    Deno.env.get('RAZERPAY_SECRET_KEY') ||
    Deno.env.get('RAZORPAY_SECRET_KEY') ||
    Deno.env.get('RAZORPAY_KEY_SECRET');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!razorpaySecret) {
    return respond(req, 500, { error: 'Razorpay secret key is not configured.' });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return respond(req, 500, { error: 'Supabase configuration incomplete.' });
  }

  if (req.method !== 'POST') {
    return respond(req, 405, { error: 'Only POST requests are supported.' });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch (error) {
    return respond(req, 400, { error: 'Invalid JSON payload' });
  }

  const planId = typeof body.planId === 'string' ? body.planId.trim() : '';
  const razorpayKeyIdFromBody =
    typeof body.razorpayKeyId === 'string' ? body.razorpayKeyId.trim() : '';
  const razorpayKeyId =
    razorpayKeyIdFromBody ||
    Deno.env.get('RAZERPAY_SITE_KEY') ||
    Deno.env.get('RAZORPAY_SITE_KEY') ||
    Deno.env.get('RAZORPAY_KEY_ID');
  const amountValue = normalizeNumber(body.amount);
  const currency = typeof body.currency === 'string' && body.currency.trim() ? body.currency.trim().toUpperCase() : 'INR';
  const extraNotes = body.notes && typeof body.notes === 'object' ? (body.notes as Record<string, unknown>) : undefined;

  if (!planId) {
    return respond(req, 400, { error: 'Plan identifier (planId) is required.' });
  }

  if (amountValue === null || amountValue <= 0) {
    return respond(req, 400, { error: 'Amount must be a positive number.' });
  }

  if (!razorpayKeyId) {
    return respond(req, 400, { error: 'Razorpay site key is required.' });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return respond(req, 401, { error: 'Authentication required.' });
  }

  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    return respond(req, 401, { error: 'Invalid authorization token.' });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !authData?.user) {
    console.error('Razorpay order request rejected:', authError?.message);
    return respond(req, 401, { error: 'Unable to verify your session.' });
  }

  const userId = authData.user.id;
  
  // Receipt must be <= 40 chars for Razorpay
  const shortId = crypto.randomUUID().slice(0, 8);
  const receipt =
    typeof body.receipt === 'string' && body.receipt.trim() && body.receipt.trim().length <= 40
      ? body.receipt.trim()
      : `akro-${planId.slice(0, 12)}-${shortId}`;

  const amountInPaise = Math.round(amountValue * 100);

  const orderPayload = {
    amount: amountInPaise,
    currency,
    receipt,
    payment_capture: 1,
    notes: buildNotes(planId, userId, extraNotes),
  };

  try {
    const authorization = `Basic ${btoa(`${razorpayKeyId}:${razorpaySecret}`)}`;
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderPayload),
    });

    const responseBody = await response.json();

    if (!response.ok) {
      console.error('Razorpay order creation failed', responseBody);
      return respond(req, response.status || 500, {
        error: 'Failed to create Razorpay order',
        details: responseBody,
      });
    }

    const insertPayload = {
      user_id: userId,
      plan_id: planId,
      razorpay_order_id: responseBody.id,
      receipt: responseBody.receipt,
      amount: responseBody.amount,
      currency: responseBody.currency,
      status: responseBody.status,
      payment_capture: responseBody.payment_capture === 1 || responseBody.payment_capture === true,
      notes: responseBody.notes ?? null,
      metadata: responseBody,
    };

    const { error: insertError } = await supabaseAdmin.from('razorpay_orders').insert(insertPayload);
    if (insertError) {
      console.error('Failed to persist Razorpay order', insertError);
    }

    return respond(req, 200, {
      order: responseBody,
      razorpayKeyId,
      planId,
    });
  } catch (error) {
    console.error('Razorpay order handler error:', error);
    return respond(req, 500, {
      error: 'Unable to create Razorpay order at the moment. Please try again later.',
    });
  }
});
