import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getDefaultDailyLimit } from '@/lib/usageLimits';
import { resolveEffectivePlanType } from '@/lib/entitlements';

interface UsageLimit {
  conversionsUsed: number;
  conversionsLimit: number;
  remaining: number;
  limitReached: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  planType?: string;
}

export const useUsageLimit = () => {
  const { user, session } = useAuth();
  const defaultLimit = getDefaultDailyLimit(!!user);
  const [usageLimit, setUsageLimit] = useState<UsageLimit>({
    conversionsUsed: 0,
    conversionsLimit: defaultLimit,
    remaining: defaultLimit,
    limitReached: false,
    isAuthenticated: !!user,
    loading: true,
    error: null,
  });

  const getTimezone = () => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return 'UTC';
    }
  };

  const checkUsageLimit = useCallback(async () => {
    try {
      setUsageLimit(prev => ({ ...prev, loading: true, error: null }));

      const timezone = getTimezone();
      const accessToken = session?.access_token;

      // Use explicit REST call (deployment-agnostic)
      const { data, error } = await supabase.functions.invoke<{
        conversionsUsed?: number;
        conversionsLimit?: number;
        remaining?: number;
        limitReached?: boolean;
        isAuthenticated?: boolean;
        planType?: string;
      }>('check-usage-limit', {
        body: { timezone },
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });

      if (error) {
        throw new Error(error.message || 'Failed to check usage limit');
      }

      const resolvedLimit = data.conversionsLimit ?? defaultLimit;
      const resolvedUsed = data.conversionsUsed ?? 0;
      const resolvedPlanType = resolveEffectivePlanType(data.planType ?? 'free', resolvedLimit);
      setUsageLimit({
        conversionsUsed: resolvedUsed,
        conversionsLimit: resolvedLimit,
        remaining: data.remaining ?? Math.max(0, resolvedLimit - resolvedUsed),
        limitReached: data.limitReached ?? false,
        isAuthenticated: data.isAuthenticated ?? !!user,
        loading: false,
        error: null,
        planType: resolvedPlanType,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to check usage limit';
      console.error('Error checking usage limit:', err);
      setUsageLimit(prev => ({
        ...prev,
        loading: false,
        error: message,
      }));
    }
  }, [user, session?.access_token, defaultLimit]);

  useEffect(() => {
    checkUsageLimit();
  }, [checkUsageLimit]);

  useEffect(() => {
    const handler = () => {
      void checkUsageLimit();
    };
    window.addEventListener("banklefy:subscription-updated", handler);
    return () => window.removeEventListener("banklefy:subscription-updated", handler);
  }, [checkUsageLimit]);

  return {
    ...usageLimit,
    refresh: checkUsageLimit,
    getTimezone,
  };
};
