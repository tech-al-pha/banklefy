import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// Get allowed origin from environment or use default
const getAllowedOrigin = (requestOrigin: string | null): string => {
  const allowedOrigins = [
    Deno.env.get('ALLOWED_ORIGIN') || '',
    'https://akromeda.lovable.app',
    'http://localhost:8080',
    'http://localhost:5173',
  ].filter(Boolean);
  
  // Check if the request origin is in our allowed list
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }
  
  // For Lovable preview URLs - allow both .lovable.app and .lovableproject.com with this project ID
  const lovableAppPattern = /^https:\/\/[a-z0-9-]+\.lovable\.app$/;
  const projectIdPattern = /^https:\/\/[a-z0-9-]+-gzzsuvfqpvzvmlnbsqcf\.lovableproject\.com$/;
  if (requestOrigin && (lovableAppPattern.test(requestOrigin) || projectIdPattern.test(requestOrigin))) {
    return requestOrigin;
  }
  
  // Default to first allowed origin
  return allowedOrigins[0] || 'https://akromeda.lovable.app';
};

const getCorsHeaders = (req: Request) => ({
  'Access-Control-Allow-Origin': getAllowedOrigin(req.headers.get('origin')),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
});

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

// Get client IP address securely (use rightmost IP in chain as it's most trusted)
const getClientIp = (req: Request): string => {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    // Get the rightmost IP (most trusted, added by our edge infrastructure)
    const ips = forwarded.split(',').map(ip => ip.trim()).filter(Boolean);
    return ips[ips.length - 1] || 'unknown';
  }
  // Fallback to other headers
  return req.headers.get('cf-connecting-ip') || 
         req.headers.get('x-real-ip') || 
         'unknown';
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
    const { timezone } = await req.json();
    const userTimezone = (timezone && isValidTimezone(timezone)) ? timezone : 'UTC';

    // Get client IP address securely
    const ipAddress = getClientIp(req);

    console.log('Checking usage limit for IP:', ipAddress, 'Timezone:', userTimezone);

    // Create service role client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if user is authenticated
    const authHeader = req.headers.get('Authorization');
    let user = null;
    
    if (authHeader) {
      const supabaseAuth = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: { Authorization: authHeader },
          },
        }
      );
      
      const { data: { user: authUser } } = await supabaseAuth.auth.getUser();
      user = authUser;
    }

    let conversionsUsed = 0;
    let conversionsLimit = 2; // Default for anonymous
    let isAuthenticated = false;

    if (user) {
      // Registered user - check subscription
      isAuthenticated = true;
      
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
    } else {
      // Anonymous user - check by IP
      const { data: result, error } = await supabaseAdmin.rpc('check_and_reset_daily_limit', {
        p_ip_address: ipAddress,
        p_user_id: null,
        p_timezone: userTimezone
      });

      if (error) {
        console.error('Error checking anonymous limit:', error);
        throw error;
      }

      if (result && result.length > 0) {
        conversionsUsed = result[0].conversions_used;
        conversionsLimit = result[0].conversions_limit;
      }
    }

    const remaining = Math.max(0, conversionsLimit - conversionsUsed);
    const limitReached = remaining === 0;

    console.log('Usage check result:', { conversionsUsed, conversionsLimit, remaining, limitReached, isAuthenticated });

    return new Response(
      JSON.stringify({
        conversionsUsed,
        conversionsLimit,
        remaining,
        limitReached,
        isAuthenticated,
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
