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
    const { timezone } = await req.json();
    const userTimezone = timezone || 'UTC';

    // Get client IP address
    const forwarded = req.headers.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

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
        ipAddress: user ? null : ipAddress, // Only return IP for anonymous
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
