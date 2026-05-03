const normalizePlanType = (planType?: string): string => {
  if (!planType) return 'free';
  return planType.toLowerCase().trim();
};

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  per_page_lite: 'Lite',
  per_page_standard: 'Standard',
  per_page_power: 'Power',
  per_page_pack_starter: 'Starter Pack',
  per_page_pack_basic: 'Basic Pack',
  per_page_pack_pro: 'Pro Pack',
  per_page_pack_enterprise: 'Enterprise Pack',
  unlimited: 'Unlimited',
};

export const formatPlanLabel = (planType?: string): string => {
  const normalized = normalizePlanType(planType);
  return PLAN_LABELS[normalized] || 'Plan';
};

export const getPlanResetMessage = (planType?: string): string => {
  const normalized = normalizePlanType(planType);

  if (normalized === 'free') {
    return 'Your daily limit resets at midnight.';
  }
  if (normalized.startsWith('per_page')) {
    return 'This is a one-time page pack. Purchase another plan to continue.';
  }
  if (normalized === 'unlimited') {
    return 'Your plan has no usage limits.';
  }
  return 'Your plan usage resets based on your account settings.';
};
