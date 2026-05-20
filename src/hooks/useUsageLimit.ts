import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { CENTENNIAL_BONUS_CREDITS, CENTENNIAL_BONUS_PLAN_TYPE, isCentennialBonusUser } from '@/lib/centennialBonus';
import { getDefaultDailyLimit } from '@/lib/usageLimits';
import { pickHigherValuePlan, resolveEffectivePlanType } from '@/lib/entitlements';

const PURCHASE_TOAST_STORAGE_KEY = "banklefy:last-plan-purchase";
const RECENT_PURCHASE_GRACE_MS = 1000 * 60 * 60 * 12;

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
  const isBonusUser = isCentennialBonusUser({ id: user?.id, email: user?.email });
  const shouldApplyBonusFreePlan = (planType?: string | null) =>
    isBonusUser && (!planType || planType === 'free' || planType === CENTENNIAL_BONUS_PLAN_TYPE);
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

  const readRecentPurchaseOverride = useCallback(() => {
    if (typeof window === 'undefined') return null;

    try {
      const raw = window.sessionStorage.getItem(PURCHASE_TOAST_STORAGE_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw) as {
        at?: unknown;
        planId?: unknown;
        pagesAdded?: unknown;
      };

      const purchasedAt = Number(parsed.at ?? 0);
      if (!Number.isFinite(purchasedAt) || purchasedAt <= 0) return null;
      if (Date.now() - purchasedAt > RECENT_PURCHASE_GRACE_MS) return null;

      const planId = typeof parsed.planId === 'string' ? parsed.planId.trim() : '';
      if (!planId) return null;

      const pagesAdded = Number(parsed.pagesAdded ?? 0);
      return {
        planId,
        pagesAdded: Number.isFinite(pagesAdded) ? Math.max(0, pagesAdded) : 0,
      };
    } catch {
      return null;
    }
  }, []);

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
      planType: shouldApplyBonusFreePlan(resolveEffectivePlanType(rawPlan, conversionsLimit))
        ? CENTENNIAL_BONUS_PLAN_TYPE
        : resolveEffectivePlanType(rawPlan, conversionsLimit),
    };
  }, [isBonusUser, user]);

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

      if (shouldApplyBonusFreePlan(resolvedPlanType)) {
        resolvedLimit = Math.max(resolvedLimit, CENTENNIAL_BONUS_CREDITS);
        resolvedPlanType = CENTENNIAL_BONUS_PLAN_TYPE;
        resolvedRemaining = Math.max(0, resolvedLimit - resolvedUsed);
      }

      const subscriptionSnapshot = await readSubscriptionUsageSnapshot();
      const likelyFallbackFreeValue =
        !!user && resolvedLimit <= 5 && !!subscriptionSnapshot && subscriptionSnapshot.conversionsLimit > 5;
      if (likelyFallbackFreeValue && subscriptionSnapshot) {
        resolvedLimit = subscriptionSnapshot.conversionsLimit;
        resolvedUsed = subscriptionSnapshot.conversionsUsed;
        resolvedPlanType = subscriptionSnapshot.planType;
        resolvedRemaining = subscriptionSnapshot.remaining;
      }

      const recentPurchase = readRecentPurchaseOverride();
      if (recentPurchase) {
        const upgradedPlan = pickHigherValuePlan(resolvedPlanType, recentPurchase.planId);
        if (upgradedPlan !== resolvedPlanType) {
          resolvedPlanType = upgradedPlan;
          if (recentPurchase.pagesAdded > 0) {
            resolvedLimit = Math.max(resolvedLimit, recentPurchase.pagesAdded);
            resolvedRemaining = Math.max(0, resolvedLimit - resolvedUsed);
          }
        }
      }

      setUsageLimit({
        conversionsUsed: resolvedUsed,
        conversionsLimit: resolvedLimit,
        remaining: resolvedRemaining,
        limitReached: resolvedRemaining <= 0 ? true : (data.limitReached ?? false),
        isAuthenticated: data.isAuthenticated ?? !!user,
        loading: false,
        error: null,
        planType: shouldApplyBonusFreePlan(resolvedPlanType) ? CENTENNIAL_BONUS_PLAN_TYPE : resolvedPlanType,
      });
      hasLoadedOnceRef.current = true;
    } catch (err: unknown) {
      const subscriptionSnapshot = await readSubscriptionUsageSnapshot();
      if (subscriptionSnapshot) {
        const recentPurchase = readRecentPurchaseOverride();
        const resolvedPlanType = recentPurchase
          ? pickHigherValuePlan(subscriptionSnapshot.planType, recentPurchase.planId)
          : subscriptionSnapshot.planType;
        const resolvedLimit = recentPurchase?.pagesAdded
          ? Math.max(subscriptionSnapshot.conversionsLimit, recentPurchase.pagesAdded)
          : subscriptionSnapshot.conversionsLimit;
        setUsageLimit(prev => ({
          ...prev,
          conversionsUsed: subscriptionSnapshot.conversionsUsed,
          conversionsLimit: shouldApplyBonusFreePlan(resolvedPlanType) ? Math.max(resolvedLimit, CENTENNIAL_BONUS_CREDITS) : resolvedLimit,
          remaining: Math.max(0, (shouldApplyBonusFreePlan(resolvedPlanType) ? Math.max(resolvedLimit, CENTENNIAL_BONUS_CREDITS) : resolvedLimit) - subscriptionSnapshot.conversionsUsed),
          limitReached: Math.max(0, (shouldApplyBonusFreePlan(resolvedPlanType) ? Math.max(resolvedLimit, CENTENNIAL_BONUS_CREDITS) : resolvedLimit) - subscriptionSnapshot.conversionsUsed) <= 0,
          isAuthenticated: !!user,
          loading: false,
          error: null,
          planType: shouldApplyBonusFreePlan(resolvedPlanType) ? CENTENNIAL_BONUS_PLAN_TYPE : resolvedPlanType,
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
  }, [user, session?.access_token, defaultLimit, isBonusUser, readSubscriptionUsageSnapshot, readRecentPurchaseOverride]);

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
