import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { hasChatAuraAccess as resolveChatAuraAccess, resolveEffectivePlanType } from "@/lib/entitlements";

type SubscriptionTier = "free" | "business";

const deriveTierFromPlanType = (planType?: string | null): SubscriptionTier => {
  const normalized = (planType ?? "free").toLowerCase();
  if (normalized === "unlimited" || normalized.startsWith("per_page")) return "business";
  return "free";
};

export const useSubscriptionTier = () => {
  const { user } = useAuth();
  const [tier, setTier] = useState<SubscriptionTier | null>(null);
  const [planType, setPlanType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handler = () => setRefreshKey((prev) => prev + 1);
    window.addEventListener("banklefy:subscription-updated", handler);
    return () => window.removeEventListener("banklefy:subscription-updated", handler);
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!user) {
      setTier(null);
      setLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const loadTier = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("subscriptions")
        .select("plan_type, tier, conversions_limit")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (error) {
        if (import.meta.env.DEV) { console.error("Failed to load subscription tier:", error); }
        setTier("free");
        setPlanType(null);
      } else {
        const nextPlanType = resolveEffectivePlanType(
          typeof data?.plan_type === "string" && data.plan_type.trim()
            ? data.plan_type
            : typeof data?.tier === "string"
              ? data.tier
              : null,
          typeof data?.conversions_limit === "number" ? data.conversions_limit : null,
        );
        setPlanType(nextPlanType);
        setTier(deriveTierFromPlanType(nextPlanType));
      }

      setLoading(false);
    };

    loadTier();

    return () => {
      isMounted = false;
    };
  }, [user, refreshKey]);

  const hasChatAuraAccess =
    !!user && resolveChatAuraAccess({ planType, tier, isAuthenticated: true });

  return { tier, planType, loading, hasChatAuraAccess };
};
