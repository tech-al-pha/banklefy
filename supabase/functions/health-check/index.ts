import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Missing Supabase configuration',
          timestamp: new Date().toISOString()
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Test database connectivity with a simple query
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    const dbLatency = Date.now() - startTime;

    if (error) {
      console.error('Database health check failed:', error);
      return new Response(
        JSON.stringify({
          status: 'degraded',
          message: 'Database connectivity issues',
          error: error.message,
          timestamp: new Date().toISOString(),
          latency: dbLatency
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check storage connectivity
    const { data: buckets, error: storageError } = await supabase
      .storage
      .listBuckets();

    const totalLatency = Date.now() - startTime;

    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: 'healthy',
          latency: dbLatency
        },
        storage: {
          status: storageError ? 'degraded' : 'healthy',
          bucketsAvailable: buckets?.length || 0
        },
        edgeFunctions: {
          status: 'healthy'
        }
      },
      totalLatency,
      version: '1.0.0',
      environment: Deno.env.get('DENO_DEPLOYMENT_ID') ? 'production' : 'development'
    };

    return new Response(
      JSON.stringify(healthStatus),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Health check error:', error);
    return new Response(
      JSON.stringify({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        latency: Date.now() - startTime
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
