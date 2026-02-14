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
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
});

import { getTrackingKey } from '../_shared/client-id.ts';

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
    const { timezone } = await req.json();
    const userTimezone = (timezone && isValidTimezone(timezone)) ? timezone : 'UTC';

    // Robust client tracking to prevent bypasses
    const trackingKey = await getTrackingKey(req);

    console.log('Checking usage limit', { timezone: userTimezone, trackingKey: trackingKey.substring(0, 8) + '...' });

    // Create service role client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ============= AUTHENTICATION CHECK =============
    // Use supabaseAdmin.auth.getUser(token) for secure server-side validation
    const authHeader = req.headers.get('Authorization');
    let user = null;
    
    if (authHeader && authHeader.startsWith('Bearer ') && authHeader !== 'Bearer null') {
      const token = authHeader.replace('Bearer ', '');
      
      // Validate token using admin client for secure server-side verification
      const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
      
      if (!authError && authUser) {
        user = authUser;
        console.log('Authenticated user detected');
      } else {
        console.log('Token validation failed:', authError?.message || 'Invalid token');
      }
    }

    let conversionsUsed = 0;
    let conversionsLimit = 2; // Default for anonymous (2 free conversions per IP)
    let isAuthenticated = false;
    let planType = 'free';

    if (user) {
      // Registered user - check subscription
      isAuthenticated = true;
      
    // Check if user has an admin role (no limits). No email-based bypass allowed.
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (roleError) {
      console.error('Failed to fetch user roles:', roleError);
    }

    const isAdmin = Array.isArray(roleData) && roleData.some((role) => role.role === 'admin');
    if (isAdmin) {
      console.log('Admin role detected - unlimited access');
      return new Response(
        JSON.stringify({
          conversionsUsed: 0,
          conversionsLimit: 999999, // Unlimited
          remaining: 999999,
          limitReached: false,
          isAuthenticated: true,
          planType: 'unlimited',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
      
      const { data: result, error } = await supabaseAdmin.rpc('check_and_reset_daily_limit', {
        p_ip_address: null,
        p_user_id: user.id,
        p_timezone: userTimezone
      });

      if (error) {
        console.error('Error checking user limit:', error);
        throw error;
      }

      if (result && result.length > 0) {
        conversionsUsed = result[0].conversions_used;
        conversionsLimit = result[0].conversions_limit;
      }

      // Get user's plan type
      const { data: subData } = await supabaseAdmin
        .from('subscriptions')
        .select('plan_type')
        .eq('user_id', user.id)
        .single();

      if (subData?.plan_type) {
        planType = subData.plan_type;
      }
    } else {
      // Anonymous user - STRICT IP-based tracking
      // This prevents abuse via multiple emails/browsers on same IP
      const { data: result, error } = await supabaseAdmin.rpc('check_and_reset_daily_limit', {
        p_ip_address: trackingKey,
        p_user_id: null,
        p_timezone: userTimezone
      });

      if (error) {
        console.error('Error checking anonymous limit:', error);
        throw error;
      }

      if (result && result.length > 0) {
        conversionsUsed = result[0].conversions_used;
        conversionsLimit = result[0].conversions_limit; // Should be 2 for anonymous
      }
    }

    const remaining = Math.max(0, conversionsLimit - conversionsUsed);
    const limitReached = remaining === 0;

    console.log('Usage check result:', { conversionsUsed, conversionsLimit, remaining, limitReached, isAuthenticated, planType });

    return new Response(
      JSON.stringify({
        conversionsUsed,
        conversionsLimit,
        remaining,
        limitReached,
        isAuthenticated,
        planType,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Internal error:', error);
    const errorMessage = sanitizeError(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
