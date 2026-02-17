import type {
  Transaction,
  FOIRResult,
  SalaryCredit,
  EMIDebit,
  UnderwritingResult,
} from './financial-engine.ts';

const roundTo = (value: number, decimals = 2): number => {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const SALARY_KEYWORDS = [
  'salary', 'sal cr', 'sal/', 'payroll', 'wages', 'income',
  'stipend', 'pension', 'honorarium', 'commission', 'bonus',
  'pay credit', 'monthly pay',
];

const EMI_KEYWORDS = [
  'emi', 'loan', 'instalment', 'installment', 'repayment',
  'housing loan', 'car loan', 'personal loan', 'credit card',
  'nach', 'auto debit', 'mortgage', 'finance',
];

const TRANSFER_CREDIT_KEYWORDS = ['neft', 'rtgs', 'imps', 'ach', 'ecs', 'upi'];

const normalizeNarrationKey = (description: string): string =>
  description
    .toLowerCase()
    .replace(/[0-9]/g, '')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 64);

const getMonthKey = (dateText: string): string => {
  const fallback = 'unknown';
  if (!dateText || typeof dateText !== 'string') return fallback;
  return dateText.length >= 7 ? dateText.substring(0, 7) : fallback;
};

const computeMedian = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
};

const coefficientOfVariation = (values: number[]): number => {
  if (values.length <= 1) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (mean === 0) return 0;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  const sd = Math.sqrt(variance);
  return sd / mean;
};

const getTargetFoirPercent = (monthlyIncome: number): number => {
  if (monthlyIncome < 40_000) return 45;
  if (monthlyIncome < 100_000) return 50;
  if (monthlyIncome < 250_000) return 55;
  return 60;
};

const estimateLoanPrincipalFromEmi = (
  emi: number,
  annualRate = 0.11,
  tenureMonths = 60,
): number => {
  if (emi <= 0) return 0;
  const monthlyRate = annualRate / 12;
  if (monthlyRate <= 0) return emi * tenureMonths;
  const factor = (Math.pow(1 + monthlyRate, tenureMonths) - 1) /
    (monthlyRate * Math.pow(1 + monthlyRate, tenureMonths));
  return emi * factor;
};

const inferLoanType = (descriptionLower: string): string => {
  if (descriptionLower.includes('housing') || descriptionLower.includes('home loan') || descriptionLower.includes('mortgage')) {
    return 'Housing';
  }
  if (descriptionLower.includes('car') || descriptionLower.includes('vehicle') || descriptionLower.includes('auto loan')) {
    return 'Vehicle';
  }
  if (descriptionLower.includes('personal') || descriptionLower.includes('pl ')) {
    return 'Personal';
  }
  if (descriptionLower.includes('credit card') || descriptionLower.includes('cc ')) {
    return 'Credit Card';
  }
  if (descriptionLower.includes('education') || descriptionLower.includes('student')) {
    return 'Education';
  }
  if (descriptionLower.includes('gold')) {
    return 'Gold';
  }
  if (EMI_KEYWORDS.some((keyword) => descriptionLower.includes(keyword))) {
    return 'EMI';
  }
  return 'Unknown';
};

export function calculateFOIR(
  avgMonthlyIncome: number,
  avgMonthlyEMI: number,
): FOIRResult {
  const safeIncome = roundTo(Math.max(0, avgMonthlyIncome));
  const safeEmi = roundTo(Math.max(0, avgMonthlyEMI));

  const score = safeIncome > 0
    ? roundTo((safeEmi / safeIncome) * 100, 2)
    : 0;

  const foirCapPercent = getTargetFoirPercent(safeIncome);
  const capUtilization = foirCapPercent > 0 ? (score / foirCapPercent) * 100 : 0;

  const status: 'excellent' | 'good' | 'moderate' | 'high' =
    capUtilization <= 70 ? 'excellent' :
    capUtilization <= 90 ? 'good' :
    capUtilization <= 110 ? 'moderate' :
    'high';

  const disposableIncome = roundTo(Math.max(0, safeIncome - safeEmi));
  const maxAllowedEmiAtCap = roundTo((safeIncome * foirCapPercent) / 100);
  const availableEMIHeadroom = roundTo(Math.max(0, maxAllowedEmiAtCap - safeEmi));
  const stressAdjustedHeadroom = roundTo(availableEMIHeadroom * 0.85);
  const maxNewEMI = roundTo(Math.max(0, Math.min(stressAdjustedHeadroom, disposableIncome * 0.55)));

  const assumedAnnualRate = 0.11;
  const assumedTenureMonths = 60;
  const loanEligibility = roundTo(
    estimateLoanPrincipalFromEmi(maxNewEMI, assumedAnnualRate, assumedTenureMonths),
  );

  return {
    score,
    status,
    avgMonthlyIncome: safeIncome,
    avgMonthlyEMI: safeEmi,
    maxNewEMI,
    loanEligibility,
    disposableIncome,
    foirCapPercent,
    availableEMIHeadroom,
    stressAdjustedHeadroom,
    assumedAnnualRate,
    assumedTenureMonths,
  };
}

export function detectSalaryAndEMI(
  transactions: Transaction[],
  categoryCorrections?: Map<string, string>,
): { salaryCredits: SalaryCredit[]; emiDebits: EMIDebit[] } {
  const salaryCredits: SalaryCredit[] = [];
  const emiDebits: EMIDebit[] = [];

  const salaryBuckets = new Map<string, { indices: number[]; amounts: number[]; months: Set<string>; keywordHits: number }>();
  const emiBuckets = new Map<string, { indices: number[]; amounts: number[]; months: Set<string>; keywordHits: number }>();

  transactions.forEach((transaction, index) => {
    const descriptionLower = transaction.description.toLowerCase();

    if (categoryCorrections) {
      const correctedCategory = categoryCorrections.get(descriptionLower) ||
        [...categoryCorrections.entries()].find(([pattern]) => descriptionLower.includes(pattern))?.[1];
      if (correctedCategory) {
        transaction.category = correctedCategory;
      }
    }

    const month = getMonthKey(transaction.date);
    const salaryKey = normalizeNarrationKey(descriptionLower);

    if (transaction.credit > 0) {
      const salaryKeywordHit = SALARY_KEYWORDS.some((keyword) => descriptionLower.includes(keyword));
      const transferLike = TRANSFER_CREDIT_KEYWORDS.some((keyword) => descriptionLower.includes(keyword));
      const likelyAmount = transaction.credit >= 12_000;
      if (salaryKeywordHit || transferLike || likelyAmount || transaction.category === 'Salary/Income') {
        const existing = salaryBuckets.get(salaryKey) || {
          indices: [],
          amounts: [],
          months: new Set<string>(),
          keywordHits: 0,
        };
        existing.indices.push(index);
        existing.amounts.push(transaction.credit);
        existing.months.add(month);
        if (salaryKeywordHit || transaction.category === 'Salary/Income') {
          existing.keywordHits += 1;
        }
        salaryBuckets.set(salaryKey, existing);
      }
    }

    if (transaction.debit > 0) {
      const emiKeywordHit = EMI_KEYWORDS.some((keyword) => descriptionLower.includes(keyword));
      if (emiKeywordHit || transaction.category === 'Loan/EMI') {
        const existing = emiBuckets.get(salaryKey) || {
          indices: [],
          amounts: [],
          months: new Set<string>(),
          keywordHits: 0,
        };
        existing.indices.push(index);
        existing.amounts.push(transaction.debit);
        existing.months.add(month);
        if (emiKeywordHit || transaction.category === 'Loan/EMI') {
          existing.keywordHits += 1;
        }
        emiBuckets.set(salaryKey, existing);
      }
    }
  });

  const acceptedSalaryRows = new Set<number>();
  salaryBuckets.forEach((bucket) => {
    const monthsCount = bucket.months.size;
    const median = computeMedian(bucket.amounts);
    const cv = coefficientOfVariation(bucket.amounts);
    const recurringPattern = monthsCount >= 2 && median >= 12_000 && cv <= 0.45;
    const keywordDriven = bucket.keywordHits > 0;
    if (!recurringPattern && !keywordDriven) return;

    for (const rowIndex of bucket.indices) {
      if (acceptedSalaryRows.has(rowIndex)) continue;
      const transaction = transactions[rowIndex];
      salaryCredits.push({
        date: transaction.date,
        amount: transaction.credit,
        description: transaction.description,
        rowIndex,
      });
      transaction.category = 'Salary/Income';
      acceptedSalaryRows.add(rowIndex);
    }
  });

  const acceptedEmiRows = new Set<number>();
  emiBuckets.forEach((bucket) => {
    const monthsCount = bucket.months.size;
    const median = computeMedian(bucket.amounts);
    const cv = coefficientOfVariation(bucket.amounts);
    const recurringPattern = monthsCount >= 2 && median >= 500 && cv <= 0.35;
    const keywordDriven = bucket.keywordHits > 0;
    if (!recurringPattern && !keywordDriven) return;

    for (const rowIndex of bucket.indices) {
      if (acceptedEmiRows.has(rowIndex)) continue;
      const transaction = transactions[rowIndex];
      const descriptionLower = transaction.description.toLowerCase();
      emiDebits.push({
        date: transaction.date,
        amount: transaction.debit,
        description: transaction.description,
        rowIndex,
        loanType: inferLoanType(descriptionLower),
      });
      transaction.category = 'Loan/EMI';
      acceptedEmiRows.add(rowIndex);
    }
  });

  return { salaryCredits, emiDebits };
}

export function performUnderwritingAnalysis(
  transactions: Transaction[],
  categoryCorrections?: Map<string, string>,
): UnderwritingResult {
  const { salaryCredits, emiDebits } = detectSalaryAndEMI(transactions, categoryCorrections);

  const monthlyData = new Map<string, { salaries: number; emis: number }>();
  transactions.forEach((transaction) => {
    const month = getMonthKey(transaction.date);
    if (!monthlyData.has(month)) {
      monthlyData.set(month, { salaries: 0, emis: 0 });
    }
  });

  salaryCredits.forEach((salary) => {
    const month = getMonthKey(salary.date);
    const existing = monthlyData.get(month) || { salaries: 0, emis: 0 };
    existing.salaries += salary.amount;
    monthlyData.set(month, existing);
  });

  emiDebits.forEach((emi) => {
    const month = getMonthKey(emi.date);
    const existing = monthlyData.get(month) || { salaries: 0, emis: 0 };
    existing.emis += emi.amount;
    monthlyData.set(month, existing);
  });

  const monthlyValues = Array.from(monthlyData.values());
  const totalSalary = monthlyValues.reduce((sum, entry) => sum + entry.salaries, 0);
  const totalEmi = monthlyValues.reduce((sum, entry) => sum + entry.emis, 0);
  const avgMonthlyIncome = monthlyValues.length > 0 ? roundTo(totalSalary / monthlyValues.length) : 0;
  const avgMonthlyEMI = monthlyValues.length > 0 ? roundTo(totalEmi / monthlyValues.length) : 0;
  const foir = calculateFOIR(avgMonthlyIncome, avgMonthlyEMI);

  const emiByLoanType: Record<string, { count: number; totalAmount: number }> = {};
  emiDebits.forEach((emi) => {
    if (!emiByLoanType[emi.loanType]) {
      emiByLoanType[emi.loanType] = { count: 0, totalAmount: 0 };
    }
    emiByLoanType[emi.loanType].count += 1;
    emiByLoanType[emi.loanType].totalAmount += emi.amount;
  });

  let eligibilityStatus: 'excellent' | 'good' | 'moderate' | 'poor' | 'ineligible' = 'good';
  let eligibilityMessage = '';
  const eligibilityFactors: string[] = [];

  if (foir.avgMonthlyIncome <= 0 && salaryCredits.length === 0) {
    eligibilityStatus = 'moderate';
    eligibilityMessage = 'No stable salary stream detected. FOIR-based eligibility is limited.';
    eligibilityFactors.push('No recurring salary credits detected');
  } else if (foir.status === 'excellent') {
    eligibilityStatus = 'excellent';
    eligibilityMessage = 'Excellent FOIR and repayment headroom. High underwriting comfort.';
    eligibilityFactors.push(`FOIR ${foir.score}% within safe band`);
  } else if (foir.status === 'good') {
    eligibilityStatus = 'good';
    eligibilityMessage = 'Healthy FOIR. Eligible for most retail lending policies.';
    eligibilityFactors.push(`FOIR ${foir.score}% within acceptable policy limits`);
  } else if (foir.status === 'moderate') {
    eligibilityStatus = 'moderate';
    eligibilityMessage = 'Borderline FOIR. Additional checks or lower ticket size recommended.';
    eligibilityFactors.push(`FOIR ${foir.score}% near policy cap`);
  } else {
    eligibilityStatus = 'poor';
    eligibilityMessage = 'High FOIR. Fresh loan exposure may be risky without restructuring.';
    eligibilityFactors.push(`FOIR ${foir.score}% above policy comfort zone`);
  }

  if (foir.maxNewEMI <= 0) {
    eligibilityFactors.push('No incremental EMI capacity after stress adjustment');
    if (eligibilityStatus === 'poor') {
      eligibilityStatus = 'ineligible';
      eligibilityMessage = 'No safe EMI headroom available for new loan servicing.';
    }
  }

  return {
    salaryCredits,
    emiDebits,
    foir,
    eligibility: {
      status: eligibilityStatus,
      message: eligibilityMessage,
      factors: eligibilityFactors,
    },
    monthlyBreakdown: Array.from(monthlyData.entries()).map(([month, data]) => ({
      month,
      salaryIncome: roundTo(data.salaries),
      emiOutflow: roundTo(data.emis),
    })),
    emiByLoanType: Object.fromEntries(
      Object.entries(emiByLoanType).map(([loanType, data]) => [
        loanType,
        {
          count: data.count,
          totalAmount: roundTo(data.totalAmount),
        },
      ]),
    ),
  };
}
