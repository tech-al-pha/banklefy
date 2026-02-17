export type EntitlementInput = {
  planType?: string | null;
  tier?: string | null;
  conversionsLimit?: number | null;
  isAuthenticated?: boolean;
};

export const normalizePlanType = (planType?: string | null): string =>
  (planType ?? "free").toLowerCase().trim();

export const resolveEffectivePlanType = (
  planType?: string | null,
  conversionsLimit?: number | null,
): string => {
  const normalizedPlan = normalizePlanType(planType);
  const limit = typeof conversionsLimit === "number" && Number.isFinite(conversionsLimit)
    ? conversionsLimit
    : null;

  if (
    normalizedPlan === "free" ||
    normalizedPlan === "unlimited" ||
    normalizedPlan.startsWith("per_page") ||
    normalizedPlan.startsWith("monthly") ||
    normalizedPlan.startsWith("yearly")
  ) {
    if (normalizedPlan === "free" && limit !== null) {
      if (limit === 10) return "per_page_lite";
      if (limit === 25) return "per_page_standard";
      if (limit === 50) return "per_page_power";
      if (limit === 300) return "monthly_basic";
      if (limit === 1000) return "monthly_pro";
      if (limit === 4500) return "monthly_enterprise";
      if (limit === 5000) return "yearly_lite";
      if (limit === 15000) return "yearly_full";
      if (limit === 65000) return "yearly_pro";
    }
    return normalizedPlan;
  }

  if (normalizedPlan === "daily") {
    if (limit !== null) {
      if (limit >= 4500) return "monthly_enterprise";
      if (limit >= 1000) return "monthly_pro";
      if (limit >= 300) return "monthly_basic";
    }
    return "daily";
  }

  if (normalizedPlan === "business") {
    if (limit !== null) {
      if (limit >= 65000) return "yearly_pro";
      if (limit >= 15000) return "yearly_full";
      if (limit >= 5000) return "yearly_lite";
      if (limit === 50) return "per_page_power";
      if (limit === 25) return "per_page_standard";
      if (limit === 10) return "per_page_lite";
    }
    return "business";
  }

  return normalizedPlan;
};

export const isPaidPlan = ({ planType, tier, conversionsLimit, isAuthenticated }: EntitlementInput): boolean => {
  const normalizedPlan = resolveEffectivePlanType(planType, conversionsLimit);

  if (normalizedPlan && normalizedPlan !== "free") {
    return (
      normalizedPlan === "unlimited" ||
      normalizedPlan.startsWith("per_page") ||
      normalizedPlan.startsWith("monthly") ||
      normalizedPlan.startsWith("yearly") ||
      normalizedPlan === "daily" ||
      normalizedPlan === "business"
    );
  }

  if (tier && tier !== "free") {
    return true;
  }

  if (typeof conversionsLimit === "number") {
    return (isAuthenticated ?? true) && conversionsLimit > 5;
  }

  return false;
};
