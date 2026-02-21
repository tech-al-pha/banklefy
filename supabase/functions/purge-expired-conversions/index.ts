import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const getAllowedOrigin = (requestOrigin: string | null): string => {
  const envOrigin = Deno.env.get("ALLOWED_ORIGIN");

  const allowedOrigins = [
    envOrigin,
    "https://banklefy.lovable.app",
    "https://banklefy.vercel.app",
    "http://localhost:8080",
    "http://localhost:5173",
    "http://localhost:3000",
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

  if (envOrigin === "*" && requestOrigin) {
    return requestOrigin;
  }

  return allowedOrigins[0] || "https://banklefy.vercel.app";
};

const getCorsHeaders = (req: Request) => ({
  "Access-Control-Allow-Origin": getAllowedOrigin(req.headers.get("origin")),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
});

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase configuration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - No token provided" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (roleError) {
      return new Response(
        JSON.stringify({ error: "Failed to verify admin access" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Forbidden - Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: cronEnsure, error: cronEnsureError } = await supabase.rpc("ensure_purge_expired_conversions_cron");

    if (cronEnsureError) {
      return new Response(
        JSON.stringify({ error: `Failed to ensure purge cron job: ${cronEnsureError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cronEnsureResult = (cronEnsure && typeof cronEnsure === "object")
      ? (cronEnsure as Record<string, unknown>)
      : null;

    if (cronEnsureResult && cronEnsureResult.ok === false) {
      return new Response(
        JSON.stringify({ error: "Retention cron health check failed", details: cronEnsureResult }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Storage objects cannot be deleted directly from SQL tables in modern Supabase.
    // Delete via Storage API first (age-based fallback), then purge DB rows.
    const cutoffIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    let storageDeleted = 0;
    let storageDeleteErrors = 0;
    const chunkSize = 100;

    for (let cycle = 0; cycle < 40; cycle += 1) {
      const { data: oldObjects, error: listError } = await supabase
        .schema("storage")
        .from("objects")
        .select("name")
        .eq("bucket_id", "bank-statements")
        .lte("created_at", cutoffIso)
        .order("created_at", { ascending: true })
        .limit(500);

      if (listError) {
        return new Response(
          JSON.stringify({ error: `Failed to list old storage objects: ${listError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!oldObjects || oldObjects.length === 0) {
        break;
      }

      const names = oldObjects
        .map((row) => (row && typeof row.name === "string" ? row.name : ""))
        .filter((name) => name.length > 0);

      if (names.length === 0) {
        break;
      }

      for (let i = 0; i < names.length; i += chunkSize) {
        const slice = names.slice(i, i + chunkSize);
        const { error: removeError } = await supabase.storage
          .from("bank-statements")
          .remove(slice);

        if (removeError) {
          storageDeleteErrors += slice.length;
        } else {
          storageDeleted += slice.length;
        }
      }

      if (oldObjects.length < 500) {
        break;
      }
    }

    const { error } = await supabase.rpc("purge_expired_conversions");

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: healthData, error: healthError } = await supabase.rpc("retention_health_check");

    if (healthError) {
      return new Response(
        JSON.stringify({
          status: "ok",
          warning: `Cleanup done, but health probe failed: ${healthError.message}`,
          cron: cronEnsureResult,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        status: "ok",
        cron: cronEnsureResult,
        health: healthData ?? null,
        storageDeleted,
        storageDeleteErrors,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
