import { useState, useEffect, useCallback, useRef } from 'react';
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
  const hasLoadedOnceRef = useRef(false);
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

  const readSubscriptionUsageSnapshot = useCallback(async () => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !data) return null;

    const row = data as Record<string, unknown>;
    const toNumber = (value: unknown, fallback = 0) => {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : fallback;
    };

    const explicitLimit = toNumber(row.conversions_limit, 0);
    const freeLimit = toNumber(row.free_daily_limit, 5);
    const packLimit = toNumber(row.pack_limit, 0);
    const conversionsLimit = explicitLimit > 0 ? explicitLimit : Math.max(freeLimit, packLimit);
    const conversionsUsed = Math.min(
      conversionsLimit,
      Math.max(
        toNumber(row.conversions_used, 0),
        toNumber(row.free_daily_used, 0),
        toNumber(row.pack_used, 0),
      ),
    );

    const rawPlan =
      typeof row.plan_type === 'string' && row.plan_type.trim()
        ? row.plan_type
        : typeof row.tier === 'string' && row.tier.trim()
          ? row.tier
          : 'free';

    return {
      conversionsUsed,
      conversionsLimit,
      remaining: Math.max(0, conversionsLimit - conversionsUsed),
      planType: resolveEffectivePlanType(rawPlan, conversionsLimit),
    };
  }, [user]);

  const checkUsageLimit = useCallback(async () => {
    const shouldShowLoading = !hasLoadedOnceRef.current;
    try {
      setUsageLimit(prev => ({ ...prev, loading: shouldShowLoading, error: null }));

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

      if (!data) {
        throw new Error('Usage limit response was empty');
      }

      let resolvedLimit = data.conversionsLimit ?? defaultLimit;
      let resolvedUsed = data.conversionsUsed ?? 0;
      let resolvedPlanType = resolveEffectivePlanType(data.planType ?? 'free', resolvedLimit);
      let resolvedRemaining = data.remaining ?? Math.max(0, resolvedLimit - resolvedUsed);

      const subscriptionSnapshot = await readSubscriptionUsageSnapshot();
      const likelyFallbackFreeValue =
        !!user && resolvedLimit <= 5 && !!subscriptionSnapshot && subscriptionSnapshot.conversionsLimit > 5;
      if (likelyFallbackFreeValue && subscriptionSnapshot) {
        resolvedLimit = subscriptionSnapshot.conversionsLimit;
        resolvedUsed = subscriptionSnapshot.conversionsUsed;
        resolvedPlanType = subscriptionSnapshot.planType;
        resolvedRemaining = subscriptionSnapshot.remaining;
      }

      setUsageLimit({
        conversionsUsed: resolvedUsed,
        conversionsLimit: resolvedLimit,
        remaining: resolvedRemaining,
        limitReached: resolvedRemaining <= 0 ? true : (data.limitReached ?? false),
        isAuthenticated: data.isAuthenticated ?? !!user,
        loading: false,
        error: null,
        planType: resolvedPlanType,
      });
      hasLoadedOnceRef.current = true;
    } catch (err: unknown) {
      const subscriptionSnapshot = await readSubscriptionUsageSnapshot();
      if (subscriptionSnapshot) {
        setUsageLimit(prev => ({
          ...prev,
          conversionsUsed: subscriptionSnapshot.conversionsUsed,
          conversionsLimit: subscriptionSnapshot.conversionsLimit,
          remaining: subscriptionSnapshot.remaining,
          limitReached: subscriptionSnapshot.remaining <= 0,
          isAuthenticated: !!user,
          loading: false,
          error: null,
          planType: subscriptionSnapshot.planType,
        }));
        hasLoadedOnceRef.current = true;
        return;
      }

      const message = err instanceof Error ? err.message : 'Failed to check usage limit';
      if (import.meta.env.DEV) { console.error('Error checking usage limit:', err); }
      setUsageLimit(prev => ({
        ...prev,
        loading: false,
        error: message,
      }));
      hasLoadedOnceRef.current = true;
    }
  }, [user, session?.access_token, defaultLimit, readSubscriptionUsageSnapshot]);

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
