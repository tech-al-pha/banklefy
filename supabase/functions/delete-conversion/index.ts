import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

type ConversionStorageMetadata = {
  sourcePath: string | null;
  resultPath: string | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const getConversionStorageMetadata = (value: unknown): ConversionStorageMetadata => {
  if (!isRecord(value)) {
    return { sourcePath: null, resultPath: null };
  }

  const storage = isRecord(value.storage) ? value.storage : null;
  return {
    sourcePath: typeof storage?.sourcePath === "string" ? storage.sourcePath : null,
    resultPath: typeof storage?.resultPath === "string" ? storage.resultPath : null,
  };
};

const getResultStoragePath = (userId: string, conversionId: string): string => {
  return `${userId}/${conversionId}/result.xlsx`;
};

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
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { conversionId } = await req.json();
    if (!conversionId || typeof conversionId !== "string") {
      return new Response(JSON.stringify({ error: "Missing conversionId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: conversion, error: conversionError } = await supabaseAdmin
      .from("conversions")
      .select("id, user_id, status, processing_timings")
      .eq("id", conversionId)
      .single();

    if (conversionError || !conversion) {
      return new Response(JSON.stringify({ error: "Conversion not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (conversion.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paths = new Set<string>();
    const storage = getConversionStorageMetadata(conversion.processing_timings);
    const userId = conversion.user_id ?? user.id;

    if (storage.sourcePath) {
      const normalizedSourcePath = storage.sourcePath.includes("/")
        ? storage.sourcePath
        : `${userId}/${storage.sourcePath}`;
      paths.add(normalizedSourcePath);
    }

    if (storage.resultPath) {
      paths.add(storage.resultPath);
    } else if (conversion.status === "completed") {
      paths.add(getResultStoragePath(userId, conversion.id));
    }

    if (paths.size > 0) {
      const { error: removeError } = await supabaseAdmin
        .storage
        .from("bank-statements")
        .remove(Array.from(paths));
      if (removeError) {
        console.error("Failed to remove storage files:", removeError);
      }
    }

    await supabaseAdmin.from("fraud_alerts").delete().eq("conversion_id", conversionId);
    await supabaseAdmin.from("risk_analysis").delete().eq("conversion_id", conversionId);
    await supabaseAdmin.from("conversions").delete().eq("id", conversionId);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Delete conversion error:", error);
    return new Response(JSON.stringify({ error: "Failed to delete conversion" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
