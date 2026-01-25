/**
 * Deployment-agnostic Supabase Edge Function helper.
 * Uses explicit REST URLs instead of supabase.functions.invoke() so the app
 * works on any static host (Vercel, Netlify, Cloudflare Pages, etc.).
 */

// Read from Vite env vars (works both in dev and production builds)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    '[supabaseApi] Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Edge function calls will fail.'
  );
}

/**
 * Build the full REST URL for a Supabase Edge Function.
 */
export function getEdgeFunctionUrl(functionName: string): string {
  // Ensure no trailing slash on base URL
  const base = SUPABASE_URL?.replace(/\/$/, '') ?? '';
  return `${base}/functions/v1/${functionName}`;
}

export interface InvokeOptions {
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}

export interface InvokeResult<T = unknown> {
  data: T | null;
  error: Error | null;
  response: Response | null;
}

/**
 * Invoke a Supabase Edge Function via explicit REST call.
 * This is deployment-agnostic and does not rely on any internal proxy.
 */
export async function invokeEdgeFunction<T = unknown>(
  functionName: string,
  options: InvokeOptions = {}
): Promise<InvokeResult<T>> {
  const url = getEdgeFunctionUrl(functionName);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    // Try to parse JSON regardless of status
    let data: T | null = null;
    const text = await response.text();
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // Not JSON
    }

    if (!response.ok) {
      const message =
        (data as any)?.error || (data as any)?.message || `Request failed with status ${response.status}`;
      return { data, error: new Error(message), response };
    }

    return { data, error: null, response };
  } catch (err) {
    return { data: null, error: err as Error, response: null };
  }
}
