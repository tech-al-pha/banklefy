export type EntitlementInput = {
  planType?: string | null;
  tier?: string | null;
  conversionsLimit?: number | null;
  isAuthenticated?: boolean;
};

export const normalizePlanType = (planType?: string | null): string =>
  (planType ?? "free").toLowerCase().trim();

const PLAN_RANK: Record<string, number> = {
  free: 0,
  bonus_free_basic: 0,
  per_page_lite: 1,
  per_page_standard: 2,
  per_page_power: 3,
  per_page_pack_starter: 4,
  per_page_pack_basic: 5,
  per_page_pack_pro: 6,
  per_page_pack_enterprise: 7,
  unlimited: 8,
};

const getCurrentPackFromLimit = (limit: number | null): string | null => {
  if (limit === null) return null;
  if (limit >= 11000) return "per_page_pack_enterprise";
  if (limit >= 5000) return "per_page_pack_pro";
  if (limit >= 1000) return "per_page_pack_basic";
  if (limit >= 500) return "per_page_pack_starter";
  if (limit >= 50) return "per_page_power";
  if (limit >= 25) return "per_page_standard";
  if (limit >= 10) return "per_page_lite";
  return null;
};

export const resolveEffectivePlanType = (
  planType?: string | null,
  conversionsLimit?: number | null,
): string => {
  const normalizedPlan = normalizePlanType(planType);
  const limit = typeof conversionsLimit === "number" && Number.isFinite(conversionsLimit)
    ? conversionsLimit
    : null;
  const isTrueUnlimitedLimit = limit !== null && limit >= 900000;
  const currentPackFromLimit = getCurrentPackFromLimit(limit);

  if (normalizedPlan === "free") {
    return currentPackFromLimit ?? "free";
  }

  if (normalizedPlan === "bonus_free_basic") {
    return "bonus_free_basic";
  }

  if (normalizedPlan === "unlimited") {
    if (isTrueUnlimitedLimit) return "unlimited";
    return currentPackFromLimit ?? "free";
  }

  if (normalizedPlan.startsWith("per_page")) return normalizedPlan;

  if (normalizedPlan === "business" || normalizedPlan === "paid") {
    return currentPackFromLimit ?? "free";
  }

  if (normalizedPlan === "pro") {
    return currentPackFromLimit ?? "per_page_pack_pro";
  }

  if (normalizedPlan === "basic") {
    return currentPackFromLimit ?? "per_page_pack_basic";
  }

  return normalizedPlan;
};

export const getPlanRank = (planType?: string | null): number =>
  PLAN_RANK[resolveEffectivePlanType(planType, null)] ?? 0;

export const pickHigherValuePlan = (
  currentPlanType?: string | null,
  nextPlanType?: string | null,
): string => {
  const current = resolveEffectivePlanType(currentPlanType, null);
  const next = resolveEffectivePlanType(nextPlanType, null);
  return (PLAN_RANK[next] ?? 0) > (PLAN_RANK[current] ?? 0) ? next : current;
};

export const isPaidPlan = ({ planType, conversionsLimit }: EntitlementInput): boolean => {
  const normalizedPlan = resolveEffectivePlanType(planType, conversionsLimit);

  if (normalizedPlan === "unlimited") return true;

  // One-time conversions should not unlock premium exports (JSON/MT940/etc.).
  if (
    normalizedPlan === "per_page_lite" ||
    normalizedPlan === "per_page_standard" ||
    normalizedPlan === "per_page_power"
  ) {
    return false;
  }

  if (normalizedPlan.startsWith("per_page_pack_")) return true;

  return false;
};

const resolvePlanForFeatures = (input: EntitlementInput): string =>
  resolveEffectivePlanType(input.planType, input.conversionsLimit);

export const hasMt940Access = (input: EntitlementInput): boolean =>
  {
    const normalizedPlan = resolvePlanForFeatures(input);
    return (
      normalizedPlan === "unlimited" ||
      normalizedPlan === "per_page_pack_starter" ||
      normalizedPlan === "per_page_pack_basic" ||
      normalizedPlan === "per_page_pack_pro" ||
      normalizedPlan === "per_page_pack_enterprise"
    );
  };

export const hasTallyXmlAccess = (input: EntitlementInput): boolean => {
  const normalizedPlan = resolvePlanForFeatures(input);
  return (
    normalizedPlan === "per_page_pack_basic" ||
    normalizedPlan === "per_page_pack_pro" ||
    normalizedPlan === "per_page_pack_enterprise" ||
    normalizedPlan === "unlimited"
  );
};

export const hasAccountingIntegrationsAccess = (input: EntitlementInput): boolean => {
  const normalizedPlan = resolvePlanForFeatures(input);
  return (
    normalizedPlan === "unlimited" ||
    normalizedPlan === "per_page_pack_pro" ||
    normalizedPlan === "per_page_pack_enterprise"
  );
};

export const hasFoirDashboardAccess = (input: EntitlementInput): boolean => {
  const normalizedPlan = resolvePlanForFeatures(input);
  return (
    normalizedPlan === "unlimited" ||
    normalizedPlan === "per_page_pack_basic" ||
    normalizedPlan === "per_page_pack_pro" ||
    normalizedPlan === "per_page_pack_enterprise"
  );
};

export const hasFraudDetectorAccess = (input: EntitlementInput): boolean => {
  // Risk signals (circular trading, balance/pricing mismatches, etc.) are shown for all plans.
  // Edit-detector (PDF tamper) signals remain gated separately by getEditPdfDetectorTier().
  return true;
};

export const getEditPdfDetectorTier = (input: EntitlementInput): "none" | "basic" | "advanced" => {
  const normalizedPlan = resolvePlanForFeatures(input);
  if (normalizedPlan === "unlimited" || normalizedPlan === "per_page_pack_enterprise") return "advanced";
  if (normalizedPlan === "per_page_pack_pro") return "basic";
  return "none";
};
