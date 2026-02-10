import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type SubscriptionTier = "free" | "daily" | "business";

export const useSubscriptionTier = () => {
  const { user } = useAuth();
  const [tier, setTier] = useState<SubscriptionTier | null>(null);
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
        .select("tier")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (error) {
        console.error("Failed to load subscription tier:", error);
        setTier("free");
      } else {
        setTier((data?.tier as SubscriptionTier) ?? "free");
      }

      setLoading(false);
    };

    loadTier();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const hasChatAuraAccess =
    !!user && (user.email === "inspirexali@gmail.com" || (tier !== null && tier !== "free"));

  return { tier, loading, hasChatAuraAccess };
};
