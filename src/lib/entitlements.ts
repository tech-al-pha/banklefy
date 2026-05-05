export type EntitlementInput = {
  planType?: string | null;
  tier?: string | null;
  conversionsLimit?: number | null;
  isAuthenticated?: boolean;
};

export const normalizePlanType = (planType?: string | null): string =>
  (planType ?? "free").toLowerCase().trim();

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

export const isPaidPlan = ({ planType, conversionsLimit }: EntitlementInput): boolean => {
  const normalizedPlan = resolveEffectivePlanType(planType, conversionsLimit);

  if (normalizedPlan === "unlimited" || normalizedPlan.startsWith("per_page")) return true;

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
  const normalizedPlan = resolvePlanForFeatures(input);
  return (
    normalizedPlan === "unlimited" ||
    normalizedPlan === "per_page_pack_enterprise"
  );
};

export const getEditPdfDetectorTier = (input: EntitlementInput): "none" | "basic" | "advanced" => {
  const normalizedPlan = resolvePlanForFeatures(input);
  if (normalizedPlan === "unlimited" || normalizedPlan === "per_page_pack_enterprise") return "advanced";
  if (normalizedPlan === "per_page_pack_pro") return "basic";
  if (normalizedPlan === "per_page_pack_basic") {
    return "basic";
  }
  return "none";
};
