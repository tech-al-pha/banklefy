const normalizePlanType = (planType?: string): string => {
  if (!planType) return 'free';
  return planType.toLowerCase().trim();
};

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  per_page_lite: 'One-time',
  per_page_standard: 'One-time',
  per_page_power: 'One-time',
  per_page_pack_basic: 'One-time',
  per_page_pack_pro: 'One-time',
  monthly_basic: 'Basic',
  yearly_lite: 'Basic',
  daily: 'Basic',
  monthly_pro: 'Pro',
  monthly_enterprise: 'Pro',
  yearly_full: 'Pro',
  yearly_pro: 'Pro',
  business: 'Pro',
  unlimited: 'Pro',
};

export const formatPlanLabel = (planType?: string): string => {
  const normalized = normalizePlanType(planType);
  return PLAN_LABELS[normalized] || 'Pro';
};

export const getPlanResetMessage = (planType?: string): string => {
  const normalized = normalizePlanType(planType);

  if (normalized === 'free') {
    return 'Your daily limit resets at midnight.';
  }
  if (normalized === 'unlimited') {
    return 'Your plan has no usage limits.';
  }
  if (normalized.startsWith('per_page')) {
    return 'This is a one-time page pack. Purchase another plan to continue.';
  }
  if (normalized.startsWith('monthly') || normalized === 'daily') {
    return 'Your plan usage resets at the start of the next month.';
  }
  if (normalized.startsWith('yearly') || normalized === 'business') {
    return 'Your plan usage resets at the start of the next year.';
  }

  return 'Your plan usage resets with your billing cycle.';
};
