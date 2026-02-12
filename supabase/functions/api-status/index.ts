import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const getAllowedOrigin = (requestOrigin: string | null): string => {
  const envOrigin = Deno.env.get('ALLOWED_ORIGIN');

  const allowedOrigins = [
    envOrigin,
    'https://banklefy.lovable.app',
    'https://banklefy.vercel.app',
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

  return allowedOrigins[0] || 'https://banklefy.vercel.app';
};

const getCorsHeaders = (req: Request) => ({
  'Access-Control-Allow-Origin': getAllowedOrigin(req.headers.get('origin')),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
});

const parseRateLimits = (headers: Headers) => {
  const lookup = (keys: string[]) => {
    for (const key of keys) {
      const value = headers.get(key);
      if (value) {
        const parsed = Number.parseInt(value, 10);
        if (!Number.isNaN(parsed)) return parsed;
      }
    }
    return null;
  };

  const remaining = lookup([
    'x-ratelimit-remaining-requests',
    'x-ratelimit-remaining',
    'ratelimit-remaining',
    'x-rate-limit-remaining',
  ]);
  const limit = lookup([
    'x-ratelimit-limit-requests',
    'x-ratelimit-limit',
    'ratelimit-limit',
    'x-rate-limit-limit',
  ]);
  const reset = lookup([
    'x-ratelimit-reset-requests',
    'x-ratelimit-reset',
    'ratelimit-reset',
    'x-rate-limit-reset',
  ]);

  const raw: Record<string, string> = {};
  for (const [key, value] of headers.entries()) {
    const lower = key.toLowerCase();
    if (lower.includes('ratelimit') || lower.includes('rate-limit') || lower.includes('x-ratelimit')) {
      raw[key] = value;
    }
  }

  if (remaining === null && limit === null && reset === null && Object.keys(raw).length === 0) {
    return null;
  }

  return { remaining, limit, reset, raw };
};

const classifyHttp = (status: number, remaining: number | null) => {
  if (status === 401 || status === 403) return 'Auth Error';
  if (status === 429 || remaining === 0) return 'Rate Limited';
  if (status >= 500) return 'Down';
  if (status >= 400) return 'Degraded';
  return 'Healthy';
};

const checkHttpService = async (
  name: string,
  url: string,
  apiKey: string | undefined,
  headers: Record<string, string> = {},
) => {
  if (!apiKey) {
    return { name, status: 'Not Configured', message: 'API key not configured', rateLimit: null };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...headers,
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const rateLimit = parseRateLimits(response.headers);
    const status = classifyHttp(response.status, rateLimit?.remaining ?? null);
    const message = response.ok ? 'OK' : `HTTP ${response.status}`;

    return { name, status, message, rateLimit };
  } catch (error) {
    clearTimeout(timeout);
    const message = error instanceof Error ? error.message : 'Network error';
    return { name, status: 'Down', message, rateLimit: null };
  }
};

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No token provided' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: isAdmin, error: roleError } = await supabaseAdmin.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin',
    });

    if (roleError) {
      return new Response(
        JSON.stringify({ error: 'Failed to verify admin access' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const groqKey = Deno.env.get('GROQ_API_KEY');
    const mistralKey = Deno.env.get('MISTRAL_API_KEY');
    const groqOpenAIKey = Deno.env.get('GROQ_OPENAI_API_KEY');

    const services = await Promise.all([
      checkHttpService('Groq API (Vision/Text)', 'https://api.groq.com/openai/v1/models', groqKey),
      checkHttpService('Groq Chat API', 'https://api.groq.com/openai/v1/models', groqOpenAIKey || groqKey),
      checkHttpService('Mistral API', 'https://api.mistral.ai/v1/models', mistralKey),
    ]);

    let supabaseDbStatus = { name: 'Supabase Database', status: 'Not Configured', message: 'Missing Supabase env', rateLimit: null };
    let supabaseStorageStatus = { name: 'Supabase Storage', status: 'Not Configured', message: 'Missing Supabase env', rateLimit: null };

    if (Deno.env.get('SUPABASE_URL') && Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
      const { error: dbError } = await supabaseAdmin
        .from('conversions')
        .select('id')
        .limit(1);

      supabaseDbStatus = dbError
        ? { name: 'Supabase Database', status: 'Down', message: dbError.message, rateLimit: null }
        : { name: 'Supabase Database', status: 'Healthy', message: 'OK', rateLimit: null };

      const { data: buckets, error: storageError } = await supabaseAdmin.storage.listBuckets();
      supabaseStorageStatus = storageError
        ? { name: 'Supabase Storage', status: 'Down', message: storageError.message, rateLimit: null }
        : { name: 'Supabase Storage', status: 'Healthy', message: `${buckets?.length ?? 0} buckets`, rateLimit: null };
    }

    const apiErrorRegex = /(limit|quota|rate limit|too many requests|429|groq|vision|ocr|mistral|supabase|storage|edge function|timeout|gateway|auth|token|session)/i;
    const { data: failedConversions } = await supabaseAdmin
      .from('conversions')
      .select('id, created_at, error_message, status')
      .eq('status', 'failed')
      .not('error_message', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50);

    const recentErrors = (failedConversions || [])
      .filter((c) => c.error_message && apiErrorRegex.test(c.error_message))
      .slice(0, 10)
      .map((c) => ({
        id: c.id,
        created_at: c.created_at,
        message: c.error_message,
      }));

    return new Response(
      JSON.stringify({
        success: true,
        checkedAt: new Date().toISOString(),
        services: [...services, supabaseDbStatus, supabaseStorageStatus],
        recentErrors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});


