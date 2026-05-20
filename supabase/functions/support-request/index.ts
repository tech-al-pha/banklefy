import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";

type SupportRequestBody = {
  name?: string | null;
  email?: string | null;
  subject?: string | null;
  message: string;
  source?: string | null;
  kind?: "support" | "refund" | "privacy" | "terms" | "billing" | "other" | null;
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    },
  });

const getEnv = (key: string): string | null => {
  const v = Deno.env.get(key);
  if (!v) return null;
  const trimmed = v.trim();
  return trimmed ? trimmed : null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return json(200, { ok: true });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const supabaseUrl = getEnv("SUPABASE_URL");
    const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return json(500, { error: "Server not configured" });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    let body: Partial<SupportRequestBody> | null = null;
    try {
      body = (await req.json()) as Partial<SupportRequestBody> | null;
    } catch (e) {
      console.error("Invalid JSON body", e);
      return json(400, { error: "Invalid JSON body" });
    }
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    if (!message) return json(400, { error: "Message is required" });

    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const subject = typeof body?.subject === "string" ? body.subject.trim() : "";
    const source = typeof body?.source === "string" ? body.source.trim() : "";
    const kind = typeof body?.kind === "string" ? body.kind : null;

    const authHeader = req.headers.get("Authorization") ?? "";
    const bearer =
      authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice("bearer ".length).trim() : "";
    const { data: authData } = bearer ? await supabaseAdmin.auth.getUser(bearer) : { data: { user: null } };
    const user = authData?.user ?? null;

    const insertPayload = {
      user_id: user?.id ?? null,
      name: name || null,
      email: email || user?.email || null,
      subject: subject || null,
      message,
      source: source || req.headers.get("referer") || null,
    };

    const { error: insertError } = await supabaseAdmin
      .from("support_requests")
      .insert(insertPayload);
    if (insertError) {
      console.error("support_requests insert failed", insertError);
      // Do not fail the request: email is the user-visible path.
    }

    const inboxTo = getEnv("SUPPORT_INBOX_EMAIL") ?? "banklefy@gmail.com";
    const resendApiKey = getEnv("RESEND_API_KEY");
    const fromEmail = getEnv("SUPPORT_FROM_EMAIL") ?? "Banklefy Support <onboarding@resend.dev>";

    // Email is optional; the DB insert is the source of truth.
    if (resendApiKey) {
      const safeSubject = `[${kind ?? "support"}] ${subject || "New support request"}`.slice(0, 200);
      const lines = [
        `Source: ${insertPayload.source ?? "unknown"}`,
        `User ID: ${insertPayload.user_id ?? "anon"}`,
        `Name: ${insertPayload.name ?? "n/a"}`,
        `Email: ${insertPayload.email ?? "n/a"}`,
        "",
        insertPayload.message,
      ];

      const emailPayload = {
        from: fromEmail,
        to: [inboxTo],
        subject: safeSubject,
        text: lines.join("\n"),
        reply_to: insertPayload.email ?? undefined,
      };

      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(emailPayload),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          const domainNotVerified = res.status === 403 && /domain not verified/i.test(errText);

          if (domainNotVerified && !/onboarding@resend\.dev/i.test(fromEmail)) {
            const fallbackPayload = {
              ...emailPayload,
              from: "Banklefy Support <onboarding@resend.dev>",
            };
            const retryRes = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${resendApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(fallbackPayload),
            });

            if (!retryRes.ok) {
              const retryErrText = await retryRes.text().catch(() => "");
              console.error("Resend fallback send failed", retryRes.status, retryErrText);
            } else {
              console.warn("Resend primary sender rejected; fallback sender used");
            }
          } else {
            console.error("Resend send failed", res.status, errText);
          }
        }
      } catch (e) {
        console.error("Resend request failed", e);
      }
    } else {
      console.warn("RESEND_API_KEY not configured; skipping email send");
    }

    return json(200, { ok: true, emailed: Boolean(resendApiKey) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("support-request failed", err);
    return json(500, { error: message });
  }
});
