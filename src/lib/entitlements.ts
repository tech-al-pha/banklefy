export type EntitlementInput = {
  planType?: string | null;
  tier?: string | null;
  conversionsLimit?: number | null;
  isAuthenticated?: boolean;
};

export const normalizePlanType = (planType?: string | null): string =>
  (planType ?? 'free').toLowerCase().trim();

export const isPaidPlan = ({ planType, tier, conversionsLimit, isAuthenticated }: EntitlementInput): boolean => {
  const normalizedPlan = normalizePlanType(planType);

  if (normalizedPlan && normalizedPlan !== 'free') {
    if (
      normalizedPlan === 'unlimited' ||
      normalizedPlan.startsWith('per_page') ||
      normalizedPlan.startsWith('monthly') ||
      normalizedPlan.startsWith('yearly') ||
      normalizedPlan === 'daily' ||
      normalizedPlan === 'business'
    ) {
      return true;
    }
  }

  if (tier && tier !== 'free') return true;

  if (typeof conversionsLimit === 'number') {
    return (isAuthenticated ?? true) && conversionsLimit > 5;
  }

  return false;
};
