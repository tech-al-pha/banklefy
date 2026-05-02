import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2.39.3";

const getAllowedOrigin = (requestOrigin: string | null): string => {
  const envOrigin = Deno.env.get("ALLOWED_ORIGIN");

  const allowedOrigins = [
    envOrigin,
    "https://www.banklefy.site",
    "https://banklefy.site",
    "https://banklefy.lovable.app",
    "https://www.banklefy.site",
    "https://banklefy.site",
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

  return allowedOrigins[0] || 'https://www.banklefy.site';
};

const getCorsHeaders = (req: Request) => ({
  "Access-Control-Allow-Origin": getAllowedOrigin(req.headers.get("origin")),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
});

const removeUserFiles = async (
  supabaseAdmin: SupabaseClient,
  userId: string,
) => {
  const bucket = "bank-statements";

  const removeFromFolder = async (folder: string) => {
    const { data: files, error } = await supabaseAdmin.storage
      .from(bucket)
      .list(folder, { limit: 1000 });

    if (error) {
      console.error(`Failed to list storage folder ${folder}:`, error);
      return;
    }

    const filePaths =
      files
        ?.filter((file) => Boolean(file.id))
        .map((file) => `${folder}/${file.name}`) || [];

    if (filePaths.length > 0) {
      const { error: removeError } = await supabaseAdmin.storage
        .from(bucket)
        .remove(filePaths);

      if (removeError) {
        console.error(`Failed to remove files in ${folder}:`, removeError);
      }
    }
  };

  await removeFromFolder(userId);
  await removeFromFolder(`${userId}/results`);
};

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized - No token provided" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized - Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await removeUserFiles(supabaseAdmin, user.id);

    await supabaseAdmin.from("conversions").delete().eq("user_id", user.id);
    await supabaseAdmin.from("subscriptions").delete().eq("user_id", user.id);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", user.id);
    await supabaseAdmin.from("profiles").delete().eq("id", user.id);

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error("Failed to delete auth user:", deleteError);
      throw deleteError;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Delete account error:", error);
    return new Response(JSON.stringify({ error: "Failed to delete account" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
