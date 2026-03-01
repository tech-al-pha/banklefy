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

const resolvePlanForFeatures = (input: EntitlementInput): string =>
  resolveEffectivePlanType(input.planType, input.conversionsLimit);

export const hasChatAuraAccess = (input: EntitlementInput): boolean =>
  isPaidPlan(input);

export const hasMt940Access = (input: EntitlementInput): boolean =>
  isPaidPlan(input);

export const hasTallyXmlAccess = (input: EntitlementInput): boolean => {
  const normalizedPlan = resolvePlanForFeatures(input);
  return (
    normalizedPlan === "monthly_pro" ||
    normalizedPlan === "monthly_enterprise" ||
    normalizedPlan === "yearly_full" ||
    normalizedPlan === "yearly_pro"
  );
};

export const hasFoirDashboardAccess = (input: EntitlementInput): boolean => {
  const normalizedPlan = resolvePlanForFeatures(input);
  if (normalizedPlan === "unlimited" || normalizedPlan === "business") return true;
  if (normalizedPlan.startsWith("monthly") || normalizedPlan.startsWith("yearly")) return true;
  return false;
};

export const hasFraudDetectorAccess = (input: EntitlementInput): boolean => {
  const normalizedPlan = resolvePlanForFeatures(input);
  return (
    normalizedPlan === "unlimited" ||
    normalizedPlan === "business" ||
    normalizedPlan === "monthly_pro" ||
    normalizedPlan === "monthly_enterprise" ||
    normalizedPlan === "yearly_full" ||
    normalizedPlan === "yearly_pro"
  );
};

export const getEditPdfDetectorTier = (input: EntitlementInput): "none" | "basic" | "advanced" => {
  const normalizedPlan = resolvePlanForFeatures(input);
  if (normalizedPlan === "unlimited" || normalizedPlan === "business") return "advanced";
  if (normalizedPlan === "monthly_enterprise" || normalizedPlan === "yearly_pro") return "advanced";
  if (normalizedPlan === "monthly_pro" || normalizedPlan === "yearly_full") return "basic";
  return "none";
};
