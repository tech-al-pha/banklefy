const normalizePlanType = (planType?: string): string => {
  if (!planType) return 'free';
  return planType.toLowerCase().trim();
};

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  admin: 'Admin',
  unlimited: 'Unlimited',
  per_page_lite: 'Lite (One-time)',
  per_page_standard: 'Standard (One-time)',
  per_page_power: 'Power (One-time)',
  monthly_basic: 'Monthly Basic',
  monthly_pro: 'Monthly Pro',
  monthly_enterprise: 'Monthly Enterprise',
  yearly_lite: 'Yearly Lite',
  yearly_full: 'Yearly Full',
  yearly_pro: 'Yearly Pro',
  daily: 'Monthly Plan',
  business: 'Yearly Plan',
};

export const formatPlanLabel = (planType?: string): string => {
  const normalized = normalizePlanType(planType);
  return PLAN_LABELS[normalized] || 'Paid Plan';
};

export const getPlanResetMessage = (planType?: string): string => {
  const normalized = normalizePlanType(planType);

  if (normalized === 'free') {
    return 'Your daily limit resets at midnight.';
  }
  if (normalized === 'admin') {
    return 'There is no limit for admin.';
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
