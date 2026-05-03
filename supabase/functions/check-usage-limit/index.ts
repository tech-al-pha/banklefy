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
    'https://www.banklefy.site',
    'https://banklefy.site',
    'https://banklefy.lovable.app',
    'https://www.banklefy.site',
    'https://banklefy.site',
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
  return allowedOrigins[0] || 'https://www.banklefy.site';
};

const getCorsHeaders = (req: Request) => ({
  'Access-Control-Allow-Origin': getAllowedOrigin(req.headers.get('origin')),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
});

import { getTrackingKey } from '../_shared/client-id.ts';
import { resolveEffectiveLimit } from '../_shared/limit-resolver.ts';

type SupabaseAdmin = Parameters<typeof resolveEffectiveLimit>[0]['supabaseAdmin'];

type SubscriptionRow = {
  conversions_used: number;
  conversions_limit: number;
  last_reset_date: string;
  timezone: string;
  plan_type?: string | null;
  tier?: string | null;
  free_daily_limit?: number | null;
  free_daily_used?: number | null;
  monthly_limit?: number | null;
  monthly_used?: number | null;
  yearly_limit?: number | null;
  yearly_used?: number | null;
  pack_limit?: number | null;
  pack_used?: number | null;
};

type AnonymousUsageRow = {
  conversions_count: number;
  last_reset_date: string;
  timezone: string;
  ip_address?: string;
  tracking_key?: string;
  conversions_used?: number | null;
};

type AnonymousUsageInsert = {
  ip_address?: string;
  tracking_key?: string;
  conversions_count?: number;
  last_reset_date?: string;
  timezone?: string;
};

type AnonymousUsageUpdate = Partial<AnonymousUsageInsert>;

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

const getCurrentPackFromLimit = (conversionsLimit: number): string | null => {
  if (conversionsLimit >= 11000) return 'per_page_pack_enterprise';
  if (conversionsLimit >= 5000) return 'per_page_pack_pro';
  if (conversionsLimit >= 1000) return 'per_page_pack_basic';
  if (conversionsLimit >= 500) return 'per_page_pack_starter';
  if (conversionsLimit >= 50) return 'per_page_power';
  if (conversionsLimit >= 25) return 'per_page_standard';
  if (conversionsLimit >= 10) return 'per_page_lite';
  return null;
};

const resolveCurrentPlanType = (planType: string, conversionsLimit: number): string => {
  const inferredPack = getCurrentPackFromLimit(conversionsLimit);
  if (planType === 'free') return inferredPack ?? 'free';
  if (planType === 'unlimited') return conversionsLimit >= 900000 ? 'unlimited' : (inferredPack ?? 'free');
  if (planType.startsWith('per_page')) return planType;
  return planType;
};

const resolvePlanType = (row: SubscriptionRow | null): string => {
  if (!row) return 'free';
  const conversionsLimit = toNumber(row.conversions_limit, 0);
  const planType = normalizePlan(row.plan_type);
  if (planType !== 'free') return resolveCurrentPlanType(planType, conversionsLimit);
  return resolveCurrentPlanType(normalizePlan(row.tier), conversionsLimit);
};

const toDateString = (value: unknown): string | null => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
};

const getResetBoundary = (planType: string, dateParts: { year: string; month: string; isoDate: string }): string | null => {
  const normalizedPlan = normalizePlan(planType);
  if (normalizedPlan === 'free') return dateParts.isoDate;
  if (normalizedPlan === 'unlimited' || normalizedPlan.startsWith('per_page')) return null;
  return null;
};

const updateAnonymousUsage = async (
  supabaseAdmin: SupabaseAdmin,
  keyColumn: 'ip_address' | 'tracking_key',
  trackingKey: string,
  payload: AnonymousUsageUpdate,
) => {
  const { error } = await supabaseAdmin
    .from('anonymous_usage')
    .update(payload)
    .eq(keyColumn, trackingKey);

  return { error };
};

const readAnonymousUsage = async (
  supabaseAdmin: SupabaseAdmin,
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
  supabaseAdmin: SupabaseAdmin;
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

      let row: SubscriptionRow | null = subscriptionResponse.data;

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
          })
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

        row = created.data ?? {
          conversions_used: 0,
          conversions_limit: 5,
          last_reset_date: today,
          timezone,
          plan_type: 'free',
        };
      }

      const currentRow: SubscriptionRow = row ?? {
        conversions_used: 0,
        conversions_limit: 5,
        last_reset_date: today,
        timezone,
        plan_type: 'free',
      };
      const planType = resolvePlanType(currentRow);
      const baseLimit = toNumber(currentRow.conversions_limit, 5);
      const baseUsed = toNumber(currentRow.conversions_used, 0);
      const freeLimit = toNumber(currentRow.free_daily_limit, 5);
      const freeUsed = toNumber(currentRow.free_daily_used, 0);
      const packLimit = toNumber(currentRow.pack_limit, 0);
      const packUsed = toNumber(currentRow.pack_used, 0);
      const conversionsLimit = baseLimit > 0 ? baseLimit : Math.max(freeLimit, packLimit);
      let conversionsUsed = Math.min(conversionsLimit, Math.max(baseUsed, freeUsed, packUsed));
      const lastResetDate = toDateString(currentRow.last_reset_date);
      const resetBoundary = getResetBoundary(planType, dateParts);
      const resolvedPlan =
        planType.startsWith('per_page')
          ? planType
          : packLimit > 0
            ? resolveCurrentPlanType('free', packLimit)
            : planType;

      if (resolvedPlan === 'free' && resetBoundary && (!lastResetDate || lastResetDate < resetBoundary)) {
        const { error: resetError } = await supabaseAdmin
          .from('subscriptions')
          .update({
            conversions_used: 0,
            last_reset_date: resetBoundary,
            timezone,
          })
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
        planType: resolvedPlan,
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

    let row: AnonymousUsageRow | null = anonRead.data;
    const keyColumn = anonRead.keyColumn;

    if (!row) {
      const insertPayload: AnonymousUsageInsert = {
        conversions_count: 0,
        last_reset_date: today,
        timezone,
      };
      insertPayload[keyColumn] = trackingKey;

      const created = await supabaseAdmin
        .from('anonymous_usage')
        .insert(insertPayload)
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

      row = created.data ?? {
        conversions_count: 0,
        last_reset_date: today,
        timezone,
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
    ) as SupabaseAdmin;

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
      effectiveLimit = {
        conversionsUsed: 0,
        conversionsLimit: user ? 5 : 2,
        remaining: user ? 5 : 2,
        limitReached: false,
        isAuthenticated: !!user,
        planType: 'free',
        isAdmin: false,
        isOwner: false,
        isUnlimited: false,
      };
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
