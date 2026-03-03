import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// ============= DEPLOYMENT-AGNOSTIC CORS =============
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

  if (envOrigin === '*' && requestOrigin) {
    return requestOrigin;
  }

  return allowedOrigins[0] || 'https://banklefy.vercel.app';
};

const getCorsHeaders = (req: Request) => ({
  'Access-Control-Allow-Origin': getAllowedOrigin(req.headers.get('origin')),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
});

type PlanPricing = {
  amount: number;
  currency: string;
};

const PLAN_PRICING: Record<string, PlanPricing> = {
  per_page_lite: { amount: 89, currency: 'INR' },
  per_page_standard: { amount: 179, currency: 'INR' },
  per_page_power: { amount: 299, currency: 'INR' },
  monthly_basic: { amount: 899, currency: 'INR' },
  monthly_pro: { amount: 1899, currency: 'INR' },
  monthly_enterprise: { amount: 3899, currency: 'INR' },
  yearly_lite: { amount: 8999, currency: 'INR' },
  yearly_full: { amount: 18999, currency: 'INR' },
  yearly_pro: { amount: 37999, currency: 'INR' },
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

const extractBearerToken = (authHeader: string | null): string | null => {
  if (!authHeader) return null;
  const segments = authHeader.split(',').map((part) => part.trim());
  for (const segment of segments) {
    const match = segment.match(/^Bearer\s+(.+)$/i);
    if (match && match[1]?.trim()) return match[1].trim();
  }
  return null;
};

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
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
  const serverRazorpayKeyId =
    Deno.env.get('RAZERPAY_SITE_KEY') ||
    Deno.env.get('RAZORPAY_SITE_KEY') ||
    Deno.env.get('RAZORPAY_KEY_ID') ||
    Deno.env.get('VITE_RAZORPAY_SITE_KEY');
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
  const pricing = PLAN_PRICING[planId];
  const extraNotes = body.notes && typeof body.notes === 'object' ? (body.notes as Record<string, unknown>) : undefined;

  if (!planId) {
    return respond(req, 400, { error: 'Plan identifier (planId) is required.' });
  }

  if (!pricing) {
    return respond(req, 400, {
      error: 'Unknown plan selected.',
      code: 'INVALID_PLAN_ID',
      planId,
      supportedPlans: Object.keys(PLAN_PRICING),
    });
  }

  if (!serverRazorpayKeyId) {
    return respond(req, 500, { error: 'Razorpay site key is not configured on server.' });
  }

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

  // Receipt must be <= 40 chars for Razorpay
  const shortId = crypto.randomUUID().slice(0, 8);
  const receipt =
    typeof body.receipt === 'string' && body.receipt.trim() && body.receipt.trim().length <= 40
      ? body.receipt.trim()
      : `akro-${planId.slice(0, 12)}-${shortId}`;

  const clientAmountInRupee =
    toFiniteNumber(body.amountInRupee) ??
    toFiniteNumber(body.amount);

  if (clientAmountInRupee !== null && clientAmountInRupee > 0) {
    const drift = Math.abs(clientAmountInRupee - pricing.amount);
    if (drift > 0.01) {
      console.warn('Client amount differs from server pricing; server pricing will be enforced.', {
        planId,
        clientAmountInRupee,
        serverAmountInRupee: pricing.amount,
      });
    }
  }

  const amountInPaise = Math.round(pricing.amount * 100);
  const currency = pricing.currency;

  if (!Number.isFinite(amountInPaise) || amountInPaise <= 0) {
    console.error('Invalid computed amount for Razorpay order.', {
      planId,
      amountInPaise,
      pricingAmount: pricing.amount,
    });
    return respond(req, 400, {
      error: 'Amount must be a positive number.',
      code: 'INVALID_ORDER_AMOUNT',
      planId,
      amountInPaise,
      pricingAmount: pricing.amount,
    });
  }

  const orderPayload = {
    amount: amountInPaise,
    currency,
    receipt,
    payment_capture: 1,
    notes: buildNotes(planId, userId, extraNotes),
  };

  try {
    const authorization = `Basic ${btoa(`${serverRazorpayKeyId}:${razorpaySecret}`)}`;
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
      return respond(req, 500, {
        error: 'Failed to persist Razorpay order. Please retry.',
      });
    }

    return respond(req, 200, {
      order: responseBody,
      razorpayKeyId: serverRazorpayKeyId,
      planId,
    });
  } catch (error) {
    console.error('Razorpay order handler error:', error);
    return respond(req, 500, {
      error: 'Unable to create Razorpay order at the moment. Please try again later.',
    });
  }
});
