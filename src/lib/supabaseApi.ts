/**
 * Supabase Edge Function helper.
 * Uses supabase.functions.invoke() for auth-safe, consistent calls.
 */

import { supabase } from "@/integrations/supabase/client";

export interface InvokeOptions<TBody = unknown> {
  body?: TBody;
  headers?: Record<string, string>;
}

export interface InvokeResult<T = unknown> {
  data: T | null;
  error: Error | null;
  response: Response | null;
}

const extractErrorMessage = (payload: unknown, fallback: string) => {
  if (payload && typeof payload === 'object') {
    const maybe = payload as { error?: string; message?: string };
    if (typeof maybe.error === 'string' && maybe.error) return maybe.error;
    if (typeof maybe.message === 'string' && maybe.message) return maybe.message;
  }
  return fallback;
};

/**
 * Invoke a Supabase Edge Function via explicit REST call.
 * This is deployment-agnostic and does not rely on any internal proxy.
 */
export async function invokeEdgeFunction<TResponse = unknown, TBody = unknown>(
  functionName: string,
  options: InvokeOptions<TBody> = {}
): Promise<InvokeResult<TResponse>> {
  try {
    const { data, error } = await supabase.functions.invoke<TResponse>(functionName, {
      body: options.body,
      headers: options.headers,
    });

    if (error) {
      const message = extractErrorMessage(
        (error as unknown) ?? null,
        error.message || 'Edge function request failed'
      );
      return { data: data ?? null, error: new Error(message), response: null };
    }

    return { data: data ?? null, error: null, response: null };
  } catch (err) {
    return { data: null, error: err as Error, response: null };
  }
}
