import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// ============= DEPLOYMENT-AGNOSTIC CORS =============
// Allows requests from any origin. The edge function runs on Supabase infrastructure
// and the frontend can be hosted anywhere (Vercel, Netlify, Cloudflare, etc.)
const getAllowedOrigin = (requestOrigin: string | null): string => {
  // Read custom allowed origin from env (optional)
  const envOrigin = Deno.env.get('ALLOWED_ORIGIN');
  
  // Explicit allow-list for known production domains
  const allowedOrigins = [
    envOrigin,
    'https://banklefy.lovable.app',
    'https://banklefy.vercel.app',
    'http://localhost:8080',
    'http://localhost:5173',
    'http://localhost:3000',
  ].filter(Boolean) as string[];
  
  // If origin matches allow-list, return it
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }
  
  // Allow any *.lovable.app or *.lovableproject.com (Lovable previews)
  const lovableAppPattern = /^https:\/\/[a-z0-9-]+\.lovable\.app$/;
  const lovableProjectPattern = /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/;
  if (requestOrigin && (lovableAppPattern.test(requestOrigin) || lovableProjectPattern.test(requestOrigin))) {
    return requestOrigin;
  }
  
  // Allow any *.vercel.app (Vercel previews)
  const vercelPattern = /^https:\/\/[a-z0-9-]+\.vercel\.app$/;
  if (requestOrigin && vercelPattern.test(requestOrigin)) {
    return requestOrigin;
  }
  
  // Allow any origin if ALLOWED_ORIGIN is set to '*' (development/testing)
  if (envOrigin === '*' && requestOrigin) {
    return requestOrigin;
  }
  
  // Default fallback
  return allowedOrigins[0] || 'https://banklefy.vercel.app';
};

const getCorsHeaders = (req: Request) => ({
  'Access-Control-Allow-Origin': getAllowedOrigin(req.headers.get('origin')),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
});

import { getTrackingKey } from '../_shared/client-id.ts';
import { resolveEffectiveLimit } from '../_shared/limit-resolver.ts';

// Sanitize error messages to prevent information leakage
const sanitizeError = (error: unknown): string => {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('relation') || msg.includes('table') || msg.includes('column')) {
      return 'Database configuration error';
    }
    if (msg.includes('auth') || msg.includes('jwt') || msg.includes('token')) {
      return 'Authentication failed';
    }
    if (msg.includes('storage') || msg.includes('bucket')) {
      return 'File storage error';
    }
  }
  return 'An unexpected error occurred. Please try again later.';
};

const isMissingColumnError = (error: unknown, column: string): boolean => {
  if (!error || typeof error !== 'object') return false;
  const message = String((error as { message?: unknown }).message ?? '').toLowerCase();
  return message.includes('column') && message.includes(column.toLowerCase()) && message.includes('does not exist');
};

const getDatePartsInTimezone = (timezone: string) => {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());

    const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
    const month = parts.find((part) => part.type === 'month')?.value ?? '01';
    const day = parts.find((part) => part.type === 'day')?.value ?? '01';

    return {
      year,
      month,
      day,
      isoDate: `${year}-${month}-${day}`,
    };
  } catch {
    const now = new Date();
    const year = String(now.getUTCFullYear());
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    return {
      year,
      month,
      day,
      isoDate: `${year}-${month}-${day}`,
    };
  }
};

const normalizePlan = (value: unknown): string =>
  typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : 'free';

const DEFAULT_OWNER_EMAILS = ['inspirexali@gmail.com'];

const getOwnerEmailSet = (): Set<string> => {
  const envRaw =
    Deno.env.get('OWNER_EMAILS') ??
    Deno.env.get('VITE_OWNER_EMAILS') ??
    '';
  const configured = envRaw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...DEFAULT_OWNER_EMAILS, ...configured]);
};

const toNumber = (value: unknown, fallback: number): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const normalizeLegacyPlanType = (planType: string, conversionsLimit: number): string => {
  if (
    planType === 'free' ||
    planType === 'unlimited' ||
    planType.startsWith('monthly') ||
    planType.startsWith('yearly') ||
    planType.startsWith('per_page')
  ) {
    return planType;
  }

  if (planType === 'daily') {
    if (conversionsLimit >= 4500) return 'monthly_enterprise';
    if (conversionsLimit >= 1000) return 'monthly_pro';
    if (conversionsLimit >= 300) return 'monthly_basic';
    return 'daily';
  }

  if (planType === 'business') {
    if (conversionsLimit >= 65000) return 'yearly_pro';
    if (conversionsLimit >= 15000) return 'yearly_full';
    if (conversionsLimit >= 5000) return 'yearly_lite';
    if (conversionsLimit === 50) return 'per_page_power';
    if (conversionsLimit === 25) return 'per_page_standard';
    if (conversionsLimit === 10) return 'per_page_lite';
    return 'business';
  }

  return planType;
};

const resolvePlanType = (row: Record<string, unknown> | null): string => {
  if (!row) return 'free';
  const conversionsLimit = toNumber(row.conversions_limit, 0);
  const planType = normalizePlan(row.plan_type);
  if (planType !== 'free') return normalizeLegacyPlanType(planType, conversionsLimit);
  return normalizeLegacyPlanType(normalizePlan(row.tier), conversionsLimit);
};

const toDateString = (value: unknown): string | null => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
};

const isKnownPaidPlan = (normalizedPlan: string): boolean =>
  normalizedPlan === 'unlimited' ||
  normalizedPlan.startsWith('per_page') ||
  normalizedPlan.startsWith('monthly') ||
  normalizedPlan.startsWith('yearly') ||
  normalizedPlan === 'daily' ||
  normalizedPlan === 'business';

const getResetBoundary = (planType: string, dateParts: { year: string; month: string; isoDate: string }): string | null => {
  const normalizedPlan = normalizePlan(planType);
  const isMonthly = normalizedPlan.startsWith('monthly') || normalizedPlan === 'daily';
  const isYearly = normalizedPlan.startsWith('yearly') || normalizedPlan === 'business';
  if (isMonthly) return `${dateParts.year}-${dateParts.month}-01`;
  if (isYearly) return `${dateParts.year}-01-01`;
  if (!isKnownPaidPlan(normalizedPlan)) return dateParts.isoDate;
  return null;
};

const updateAnonymousUsage = async (
  supabaseAdmin: any,
  keyColumn: 'ip_address' | 'tracking_key',
  trackingKey: string,
  payload: Record<string, unknown>,
) => {
  const { error } = await supabaseAdmin
    .from('anonymous_usage')
    .update(payload as any)
    .eq(keyColumn, trackingKey);

  return { error };
};

const readAnonymousUsage = async (
  supabaseAdmin: any,
  trackingKey: string,
) => {
  const firstTry = await supabaseAdmin
    .from('anonymous_usage')
    .select('*')
    .eq('ip_address', trackingKey)
    .maybeSingle();

  if (!firstTry.error || !isMissingColumnError(firstTry.error, 'ip_address')) {
    return { keyColumn: 'ip_address' as const, ...firstTry };
  }

  const secondTry = await supabaseAdmin
    .from('anonymous_usage')
    .select('*')
    .eq('tracking_key', trackingKey)
    .maybeSingle();

  return { keyColumn: 'tracking_key' as const, ...secondTry };
};

const checkLimitFallback = async ({
  supabaseAdmin,
  userId,
  trackingKey,
  timezone,
}: {
  supabaseAdmin: any;
  userId: string | null;
  trackingKey: string;
  timezone: string;
}) => {
  try {
    const dateParts = getDatePartsInTimezone(timezone);
    const today = dateParts.isoDate;

    if (userId) {
      const subscriptionResponse = await supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      let row = (subscriptionResponse.data as Record<string, unknown> | null) ?? null;

      if (subscriptionResponse.error) {
        console.error('Fallback subscription read failed:', subscriptionResponse.error);
        return {
          conversionsUsed: 0,
          conversionsLimit: 5,
          planType: 'free',
        };
      }

      if (!row) {
        const created = await supabaseAdmin
          .from('subscriptions')
          .insert({
            user_id: userId,
            conversions_used: 0,
            conversions_limit: 5,
            last_reset_date: today,
            timezone,
            plan_type: 'free',
          } as any)
          .select('*')
          .maybeSingle();

        if (created.error) {
          console.error('Fallback subscription create failed:', created.error);
          return {
            conversionsUsed: 0,
            conversionsLimit: 5,
            planType: 'free',
          };
        }

        row = (created.data as Record<string, unknown> | null) ?? {
          conversions_used: 0,
          conversions_limit: 5,
          last_reset_date: today,
          plan_type: 'free',
        };
      }

      const planType = resolvePlanType(row);
      const baseLimit = toNumber(row.conversions_limit, 5);
      const baseUsed = toNumber(row.conversions_used, 0);
      const stackedLimit =
        toNumber(row.free_daily_limit, 5) +
        toNumber(row.monthly_limit, 0) +
        toNumber(row.yearly_limit, 0) +
        toNumber(row.pack_limit, 0);
      const stackedUsed =
        toNumber(row.free_daily_used, 0) +
        toNumber(row.monthly_used, 0) +
        toNumber(row.yearly_used, 0) +
        toNumber(row.pack_used, 0);
      const conversionsLimit = Math.max(baseLimit, stackedLimit);
      let conversionsUsed = Math.min(conversionsLimit, Math.max(baseUsed, stackedUsed));
      const lastResetDate = toDateString(row.last_reset_date);
      const resetBoundary = getResetBoundary(planType, dateParts);

      if (resetBoundary && (!lastResetDate || lastResetDate < resetBoundary)) {
        const { error: resetError } = await supabaseAdmin
          .from('subscriptions')
          .update({
            conversions_used: 0,
            last_reset_date: resetBoundary,
            timezone,
          } as any)
          .eq('user_id', userId);

        if (resetError) {
          console.error('Fallback subscription reset failed:', resetError);
        } else {
          conversionsUsed = 0;
        }
      }

      return {
        conversionsUsed,
        conversionsLimit,
        planType,
      };
    }

    const anonRead = await readAnonymousUsage(supabaseAdmin, trackingKey);
    if (anonRead.error) {
      console.error('Fallback anonymous usage read failed:', anonRead.error);
      return {
        conversionsUsed: 0,
        conversionsLimit: 2,
        planType: 'free',
      };
    }

    let row = (anonRead.data as Record<string, unknown> | null) ?? null;
    const keyColumn = anonRead.keyColumn;

    if (!row) {
      const insertPayload: Record<string, unknown> = {
        conversions_count: 0,
        last_reset_date: today,
        timezone,
      };
      insertPayload[keyColumn] = trackingKey;

      const created = await supabaseAdmin
        .from('anonymous_usage')
        .insert(insertPayload as any)
        .select('*')
        .maybeSingle();

      if (created.error) {
        console.error('Fallback anonymous usage create failed:', created.error);
        return {
          conversionsUsed: 0,
          conversionsLimit: 2,
          planType: 'free',
        };
      }

      row = (created.data as Record<string, unknown> | null) ?? {
        conversions_count: 0,
        last_reset_date: today,
      };
    }

    let conversionsUsed = toNumber(row.conversions_count ?? row.conversions_used, 0);
    const lastResetDate = toDateString(row.last_reset_date);

    if (!lastResetDate || lastResetDate < today) {
      const { error: resetError } = await updateAnonymousUsage(supabaseAdmin, keyColumn, trackingKey, {
        conversions_count: 0,
        last_reset_date: today,
        timezone,
      });
      if (resetError) {
        console.error('Fallback anonymous reset failed:', resetError);
      } else {
        conversionsUsed = 0;
      }
    }

    return {
      conversionsUsed,
      conversionsLimit: 2,
      planType: 'free',
    };
  } catch (error) {
    console.error('Fallback limit check crashed:', error);
    return {
      conversionsUsed: 0,
      conversionsLimit: userId ? 5 : 2,
      planType: 'free',
    };
  }
};

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
    const bypassHeader = req.headers.get('x-admin-email') || req.headers.get('x-privileged-email');
    if (bypassHeader) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    let timezone: string | undefined;
    try {
      const parsed = await req.json();
      if (parsed && typeof parsed === 'object' && 'timezone' in parsed) {
        const value = (parsed as { timezone?: unknown }).timezone;
        timezone = typeof value === 'string' ? value : undefined;
      }
    } catch {
      // Gracefully fallback when body is empty or malformed JSON.
      timezone = undefined;
    }
    const userTimezone = (timezone && isValidTimezone(timezone)) ? timezone : 'UTC';

    // Robust client tracking to prevent bypasses
    const trackingKey = await getTrackingKey(req);

    console.log('Checking usage limit', { timezone: userTimezone, trackingKey: trackingKey.substring(0, 8) + '...' });

    // Public edge client (anon key). Keep this function least-privileged.
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceRoleKey || supabaseAnonKey,
    );

    // ============= AUTHENTICATION CHECK =============
    // Use token validation without elevating to service-role.
    const authHeader = req.headers.get('Authorization');
    let user = null;
    
    if (authHeader && authHeader.startsWith('Bearer ') && authHeader !== 'Bearer null') {
      const token = authHeader.replace('Bearer ', '');
      
      const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser(token);
      
      if (!authError && authUser) {
        user = authUser;
        console.log('Authenticated user detected');
      } else {
        console.log('Token validation failed:', authError?.message || 'Invalid token');
      }
    }

    let effectiveLimit;
    try {
      effectiveLimit = await resolveEffectiveLimit({
        supabaseAdmin,
        user,
        trackingKey,
        timezone: userTimezone,
      });
    } catch (limitError) {
      console.error('Failed to resolve effective limit:', limitError);
      return new Response(
        JSON.stringify({
          error: 'Failed to resolve effective limit',
          code: 'LIMIT_RESOLUTION_FAILED',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Usage check result:', {
      conversionsUsed: effectiveLimit.conversionsUsed,
      conversionsLimit: effectiveLimit.conversionsLimit,
      remaining: effectiveLimit.remaining,
      limitReached: effectiveLimit.limitReached,
      isAuthenticated: effectiveLimit.isAuthenticated,
      planType: effectiveLimit.planType,
    });

    return new Response(
      JSON.stringify({
        conversionsUsed: effectiveLimit.conversionsUsed,
        conversionsLimit: effectiveLimit.conversionsLimit,
        remaining: effectiveLimit.remaining,
        limitReached: effectiveLimit.limitReached,
        isAuthenticated: effectiveLimit.isAuthenticated,
        planType: effectiveLimit.planType,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Internal error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        code: 'USAGE_LIMIT_CHECK_FAILED',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
