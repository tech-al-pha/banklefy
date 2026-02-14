import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isPaidPlan } from "@/lib/entitlements";

type SubscriptionTier = "free" | "daily" | "business";

export const useSubscriptionTier = () => {
  const { user } = useAuth();
  const [tier, setTier] = useState<SubscriptionTier | null>(null);
  const [planType, setPlanType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
        .select("tier, plan_type")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (error) {
        console.error("Failed to load subscription tier:", error);
        setTier("free");
        setPlanType(null);
      } else {
        setTier((data?.tier as SubscriptionTier) ?? "free");
        setPlanType(typeof data?.plan_type === "string" ? data.plan_type : null);
      }

      setLoading(false);
    };

    loadTier();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const hasChatAuraAccess =
    !!user && isPaidPlan({ planType, tier, isAuthenticated: true });

  return { tier, planType, loading, hasChatAuraAccess };
};
