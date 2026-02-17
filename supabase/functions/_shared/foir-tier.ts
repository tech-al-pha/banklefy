import type { UnderwritingResult } from './financial-engine.ts';

export type UnderwritingTier = 'none' | 'basic' | 'pro' | 'advanced';

export interface UnderwritingPayload {
  tier: Exclude<UnderwritingTier, 'none'>;
  tierLabel: 'Basic' | 'Pro' | 'Advanced';
  salaryCredits: { date: string; amount: number; description: string }[];
  emiDebits: { date: string; amount: number; description: string; loanType: string }[];
  monthlyBreakdown: { month: string; salaryIncome: number; emiOutflow: number }[];
  summary: {
    avgMonthlyIncome: number;
    avgMonthlyEMI: number;
    foirScore: number;
    foirStatus: 'excellent' | 'good' | 'moderate' | 'high';
    emiByLoanType: Record<string, { count: number; totalAmount: number }>;
    totalSalaryDetected: number;
    totalEMIDetected: number;
  };
  eligibility: {
    status: 'excellent' | 'good' | 'moderate' | 'poor' | 'ineligible';
    message: string;
    factors: string[];
    maxNewEMI: number;
    estimatedLoanEligibility: number;
  };
  advancedSignals?: {
    disposableIncome: number;
    foirCapPercent: number;
    availableEMIHeadroom: number;
    stressAdjustedHeadroom: number;
    assumedAnnualRate: number;
    assumedTenureMonths: number;
  };
}

const normalizePlanType = (value: unknown): string =>
  typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : 'free';

export const resolveUnderwritingTier = (
  planType: string,
  isAdmin = false,
): UnderwritingTier => {
  if (isAdmin) return 'advanced';

  const normalizedPlan = normalizePlanType(planType);

  if (normalizedPlan === 'free') return 'none';

  if (
    normalizedPlan === 'monthly_enterprise' ||
    normalizedPlan === 'yearly_pro' ||
    normalizedPlan === 'per_page_power' ||
    normalizedPlan === 'unlimited' ||
    normalizedPlan === 'business'
  ) {
    return 'advanced';
  }

  if (
    normalizedPlan === 'monthly_pro' ||
    normalizedPlan === 'yearly_full' ||
    normalizedPlan === 'per_page_standard' ||
    normalizedPlan === 'daily'
  ) {
    return 'pro';
  }

  if (
    normalizedPlan === 'monthly_basic' ||
    normalizedPlan === 'yearly_lite' ||
    normalizedPlan === 'per_page_lite' ||
    normalizedPlan.startsWith('monthly') ||
    normalizedPlan.startsWith('yearly') ||
    normalizedPlan.startsWith('per_page')
  ) {
    return 'basic';
  }

  return 'none';
};

const getTierLabel = (tier: Exclude<UnderwritingTier, 'none'>): 'Basic' | 'Pro' | 'Advanced' =>
  tier === 'advanced' ? 'Advanced' : tier === 'pro' ? 'Pro' : 'Basic';

export const buildUnderwritingPayload = (
  underwriting: UnderwritingResult,
  tier: UnderwritingTier,
): UnderwritingPayload | null => {
  if (tier === 'none') return null;

  const isBasic = tier === 'basic';
  const isAdvanced = tier === 'advanced';

  return {
    tier,
    tierLabel: getTierLabel(tier),
    salaryCredits: isAdvanced
      ? underwriting.salaryCredits.map((salary) => ({
          date: salary.date,
          amount: salary.amount,
          description: salary.description,
        }))
      : [],
    emiDebits: isAdvanced
      ? underwriting.emiDebits.map((emi) => ({
          date: emi.date,
          amount: emi.amount,
          description: emi.description,
          loanType: emi.loanType,
        }))
      : [],
    monthlyBreakdown: isBasic
      ? []
      : underwriting.monthlyBreakdown,
    summary: {
      avgMonthlyIncome: underwriting.foir.avgMonthlyIncome,
      avgMonthlyEMI: underwriting.foir.avgMonthlyEMI,
      foirScore: underwriting.foir.score,
      foirStatus: underwriting.foir.status,
      emiByLoanType: isBasic ? {} : underwriting.emiByLoanType,
      totalSalaryDetected: underwriting.salaryCredits.length,
      totalEMIDetected: underwriting.emiDebits.length,
    },
    eligibility: {
      status: underwriting.eligibility.status,
      message: underwriting.eligibility.message,
      factors: isBasic ? [] : underwriting.eligibility.factors,
      maxNewEMI: underwriting.foir.maxNewEMI,
      estimatedLoanEligibility: underwriting.foir.loanEligibility,
    },
    advancedSignals: isAdvanced
      ? {
          disposableIncome: underwriting.foir.disposableIncome,
          foirCapPercent: underwriting.foir.foirCapPercent ?? 0,
          availableEMIHeadroom: underwriting.foir.availableEMIHeadroom ?? 0,
          stressAdjustedHeadroom: underwriting.foir.stressAdjustedHeadroom ?? 0,
          assumedAnnualRate: underwriting.foir.assumedAnnualRate ?? 0,
          assumedTenureMonths: underwriting.foir.assumedTenureMonths ?? 0,
        }
      : undefined,
  };
};

