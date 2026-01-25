import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};

  try {
    // Check Supabase connection
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      checks.supabase = { status: "error", error: "Missing environment variables" };
    } else {
      const dbStart = Date.now();
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Simple query to check database connectivity
      const { error } = await supabase.from("profiles").select("id").limit(1);
      
      if (error) {
        checks.supabase = { status: "error", error: error.message, latencyMs: Date.now() - dbStart };
      } else {
        checks.supabase = { status: "healthy", latencyMs: Date.now() - dbStart };
      }
    }

    // Check if required secrets are configured
    const requiredSecrets = ["GROQ_API_KEY", "MISTRAL_API_KEY"];
    const secretsStatus = requiredSecrets.map(name => ({
      name,
      configured: !!Deno.env.get(name)
    }));
    
    checks.secrets = {
      status: secretsStatus.every(s => s.configured) ? "healthy" : "warning",
    };

    const allHealthy = Object.values(checks).every(c => c.status === "healthy");
    const totalLatency = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        status: allHealthy ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
        totalLatencyMs: totalLatency,
        checks,
        version: "1.0.0",
      }),
      {
        status: allHealthy ? 200 : 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: "error",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
