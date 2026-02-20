import type {
  Transaction,
  FOIRResult,
  SalaryCredit,
  EMIDebit,
  UnderwritingResult,
} from './financial-engine.ts';

type FoirOptions = {
  foirCapPercent?: number;
  stressFactor?: number;
  annualRate?: number;
  tenureMonths?: number;
};

type EligibilityStatus = UnderwritingResult['eligibility']['status'];

const roundTo = (value: number, decimals = 2): number => {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const average = (values: number[]): number =>
  values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

const SALARY_KEYWORDS = [
  'salary', 'sal cr', 'sal/', 'payroll', 'wages', 'income',
  'stipend', 'pension', 'honorarium', 'pay credit', 'monthly pay',
  'wps', 'salary transfer', 'salary credit',
];
const SALARY_EXCLUSION_KEYWORDS = [
  'refund', 'reversal', 'cashback', 'interest',
  'invoice', 'rent', 'rental', 'security deposit',
  'loan disbursal', 'credit card payment',
];

const EMI_KEYWORDS = [
  'emi', 'loan', 'instalment', 'installment', 'repayment',
  'housing loan', 'home loan', 'car loan', 'personal loan',
  'credit card bill', 'mortgage', 'finance',
];
const EMI_MANDATE_KEYWORDS = [
  'nach', 'ecs', 'ach', 'auto debit', 'autodebit',
  'standing instruction', 'e mandate', 'emandate',
];
const EMI_LENDER_HINTS = [
  'hdfc', 'icici', 'axis', 'sbi', 'kotak', 'bajaj',
  'federal', 'nbfc', 'capital', 'finance', 'bank ltd',
];
const EMI_EXCLUSION_KEYWORDS = [
  'atm', 'cash withdrawal', 'cash wdl', 'cash withdraw',
  'pos', 'purchase', 'shopping', 'swipe', 'fuel',
  'restaurant', 'grocery', 'bill payment', 'utility',
];

const TRANSFER_CREDIT_KEYWORDS = ['neft', 'rtgs', 'imps', 'ach', 'ecs', 'upi'];
const CASH_WITHDRAWAL_KEYWORDS = [
  'atm', 'cash withdrawal', 'cash wdl', 'cash withdraw',
  'cash wd', 'cardless cash', 'self cash',
];

const normalizeNarrationKey = (description: string): string =>
  description
    .toLowerCase()
    .replace(/[a-z]*\d+[a-z\d]*/g, ' ')
    .replace(/\b(?:utr|ref|txn|id|no|trf|transfer|imps|neft|rtgs|upi)\b/g, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 72);

const hasKeyword = (text: string, keywords: string[]): boolean =>
  keywords.some((keyword) => text.includes(keyword));

const getMonthKey = (dateText: string): string => {
  const fallback = 'unknown';
  if (!dateText || typeof dateText !== 'string') return fallback;
  const normalized = dateText.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized.substring(0, 7);
  const ddmmyyyy = normalized.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (ddmmyyyy) {
    const [, dd, mm, yyyy] = ddmmyyyy;
    void dd;
    return `${yyyy}-${mm}`;
  }
  return normalized.length >= 7 ? normalized.substring(0, 7) : fallback;
};

const parseDayOfMonth = (dateText: string): number | null => {
  if (!dateText || typeof dateText !== 'string') return null;
  const normalized = dateText.trim();
  const iso = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const day = Number(iso[3]);
    return Number.isFinite(day) ? day : null;
  }
  const ddmmyyyy = normalized.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (ddmmyyyy) {
    const day = Number(ddmmyyyy[1]);
    return Number.isFinite(day) ? day : null;
  }
  return null;
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
  const mean = average(values);
  if (mean === 0) return 0;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  const sd = Math.sqrt(variance);
  return sd / mean;
};

const standardDeviation = (values: number[]): number => {
  if (values.length <= 1) return 0;
  const mean = average(values);
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(Math.max(0, variance));
};

const robustAverage = (values: number[]): number => {
  if (values.length === 0) return 0;
  if (values.length <= 2) return average(values);
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length >= 5) {
    const trimmed = sorted.slice(1, -1);
    return average(trimmed);
  }
  return average(sorted);
};

const sortMonthKeys = (months: Iterable<string>): string[] =>
  [...months].sort((a, b) => {
    const aIso = /^\d{4}-\d{2}$/.test(a);
    const bIso = /^\d{4}-\d{2}$/.test(b);
    if (aIso && bIso) return a.localeCompare(b);
    if (aIso) return -1;
    if (bIso) return 1;
    return a.localeCompare(b);
  });

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

const normalizeCategory = (value: unknown): string =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

const resolveCategoryCorrection = (
  descriptionLower: string,
  categoryCorrections?: Map<string, string>,
): string | null => {
  if (!categoryCorrections || categoryCorrections.size === 0) return null;
  const direct = categoryCorrections.get(descriptionLower);
  if (direct) return direct;

  for (const [pattern, category] of categoryCorrections.entries()) {
    if (descriptionLower.includes(pattern)) return category;
  }
  return null;
};

const downgradeEligibility = (status: EligibilityStatus, steps = 1): EligibilityStatus => {
  const order: EligibilityStatus[] = ['excellent', 'good', 'moderate', 'poor', 'ineligible'];
  const index = order.indexOf(status);
  if (index < 0) return status;
  return order[Math.min(order.length - 1, index + steps)];
};

export function calculateFOIR(
  avgMonthlyIncome: number,
  avgMonthlyEMI: number,
  options?: FoirOptions,
): FOIRResult {
  const safeIncome = roundTo(Math.max(0, avgMonthlyIncome));
  const safeEmi = roundTo(Math.max(0, avgMonthlyEMI));

  const score = safeIncome > 0
    ? roundTo((safeEmi / safeIncome) * 100, 2)
    : 0;

  const foirCapPercent = roundTo(
    clamp(options?.foirCapPercent ?? getTargetFoirPercent(safeIncome), 30, 65),
    2,
  );
  const capUtilization = foirCapPercent > 0 ? (score / foirCapPercent) * 100 : 0;

  const status: 'excellent' | 'good' | 'moderate' | 'high' =
    capUtilization <= 70 ? 'excellent' :
    capUtilization <= 90 ? 'good' :
    capUtilization <= 110 ? 'moderate' :
    'high';

  const disposableIncome = roundTo(Math.max(0, safeIncome - safeEmi));
  const maxAllowedEmiAtCap = roundTo((safeIncome * foirCapPercent) / 100);
  const availableEMIHeadroom = roundTo(Math.max(0, maxAllowedEmiAtCap - safeEmi));
  const stressFactor = clamp(options?.stressFactor ?? 0.85, 0.55, 1);
  const stressAdjustedHeadroom = roundTo(availableEMIHeadroom * stressFactor);
  const affordabilityHeadroom = roundTo(disposableIncome * 0.6);
  const maxNewEMI = roundTo(Math.max(0, Math.min(stressAdjustedHeadroom, affordabilityHeadroom)));

  const assumedAnnualRate = roundTo(clamp(options?.annualRate ?? 0.11, 0.06, 0.24), 4);
  const assumedTenureMonths = Math.round(clamp(options?.tenureMonths ?? 60, 24, 96));
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
  type SalaryCandidate = {
    index: number;
    month: string;
    day: number | null;
    key: string;
    amount: number;
    salaryKeywordHit: boolean;
    categorySalary: boolean;
    transferLike: boolean;
    salaryExcluded: boolean;
  };

  type EmiCandidate = {
    index: number;
    month: string;
    key: string;
    amount: number;
    descriptionLower: string;
    emiKeywordHit: boolean;
    mandateKeywordHit: boolean;
    lenderHintHit: boolean;
    categoryLoan: boolean;
    expenseLike: boolean;
  };

  type BucketStats = {
    months: Set<string>;
    amounts: number[];
    days: number[];
    keywordHits: number;
    categoryHits: number;
    transferHits: number;
    exclusionHits: number;
    mandateHits: number;
    lenderHits: number;
  };

  const salaryCredits: SalaryCredit[] = [];
  const emiDebits: EMIDebit[] = [];

  const salaryCandidates: SalaryCandidate[] = [];
  const emiCandidates: EmiCandidate[] = [];
  const creditAmounts = transactions
    .map((transaction) => Number(transaction.credit || 0))
    .filter((amount) => Number.isFinite(amount) && amount > 0);
  const medianCredit = computeMedian(creditAmounts);
  const salaryFloor = Math.max(3_000, Math.min(18_000, roundTo(medianCredit * 0.55 || 6_000)));
  const emiFloor = 350;

  transactions.forEach((transaction, index) => {
    const descriptionLower = transaction.description.toLowerCase();

    const correctedCategory = resolveCategoryCorrection(descriptionLower, categoryCorrections);
    if (correctedCategory) {
      transaction.category = correctedCategory;
    }
    const normalizedCategory = normalizeCategory(transaction.category);

    const month = getMonthKey(transaction.date);
    const narrationKey = normalizeNarrationKey(descriptionLower);
    const day = parseDayOfMonth(transaction.date);

    if (transaction.credit > 0) {
      const salaryKeywordHit = hasKeyword(descriptionLower, SALARY_KEYWORDS);
      const transferLike = hasKeyword(descriptionLower, TRANSFER_CREDIT_KEYWORDS);
      const salaryExcluded = hasKeyword(descriptionLower, SALARY_EXCLUSION_KEYWORDS);
      const categorySalary = normalizedCategory === 'salary/income';
      const likelySalaryAmount = transaction.credit >= salaryFloor;
      if (salaryKeywordHit || categorySalary || likelySalaryAmount || transferLike) {
        salaryCandidates.push({
          index,
          month,
          day,
          key: narrationKey,
          amount: Number(transaction.credit || 0),
          salaryKeywordHit,
          categorySalary,
          transferLike,
          salaryExcluded,
        });
      }
    }

    if (transaction.debit > 0) {
      const emiKeywordHit = hasKeyword(descriptionLower, EMI_KEYWORDS);
      const mandateKeywordHit = hasKeyword(descriptionLower, EMI_MANDATE_KEYWORDS);
      const lenderHintHit = hasKeyword(descriptionLower, EMI_LENDER_HINTS);
      const expenseLike = hasKeyword(descriptionLower, EMI_EXCLUSION_KEYWORDS);
      const categoryLoan = normalizedCategory === 'loan/emi';
      const likelyRecurringDebit = transaction.debit >= emiFloor && !expenseLike;
      if (emiKeywordHit || mandateKeywordHit || lenderHintHit || categoryLoan || likelyRecurringDebit) {
        emiCandidates.push({
          index,
          month,
          key: narrationKey,
          amount: Number(transaction.debit || 0),
          descriptionLower,
          emiKeywordHit,
          mandateKeywordHit,
          lenderHintHit,
          categoryLoan,
          expenseLike,
        });
      }
    }
  });

  const salaryBuckets = new Map<string, BucketStats>();
  salaryCandidates.forEach((candidate) => {
    const bucket = salaryBuckets.get(candidate.key) || {
      months: new Set<string>(),
      amounts: [],
      days: [],
      keywordHits: 0,
      categoryHits: 0,
      transferHits: 0,
      exclusionHits: 0,
      mandateHits: 0,
      lenderHits: 0,
    };
    if (candidate.month !== 'unknown') {
      bucket.months.add(candidate.month);
    }
    bucket.amounts.push(candidate.amount);
    if (candidate.day !== null) bucket.days.push(candidate.day);
    if (candidate.salaryKeywordHit) bucket.keywordHits += 1;
    if (candidate.categorySalary) bucket.categoryHits += 1;
    if (candidate.transferLike) bucket.transferHits += 1;
    if (candidate.salaryExcluded) bucket.exclusionHits += 1;
    salaryBuckets.set(candidate.key, bucket);
  });

  const emiBuckets = new Map<string, BucketStats>();
  emiCandidates.forEach((candidate) => {
    const bucket = emiBuckets.get(candidate.key) || {
      months: new Set<string>(),
      amounts: [],
      days: [],
      keywordHits: 0,
      categoryHits: 0,
      transferHits: 0,
      exclusionHits: 0,
      mandateHits: 0,
      lenderHits: 0,
    };
    if (candidate.month !== 'unknown') {
      bucket.months.add(candidate.month);
    }
    bucket.amounts.push(candidate.amount);
    if (candidate.emiKeywordHit) bucket.keywordHits += 1;
    if (candidate.categoryLoan) bucket.categoryHits += 1;
    if (candidate.mandateKeywordHit) bucket.mandateHits += 1;
    if (candidate.lenderHintHit) bucket.lenderHits += 1;
    if (candidate.expenseLike) bucket.exclusionHits += 1;
    emiBuckets.set(candidate.key, bucket);
  });

  const acceptedSalaryRows = new Set<number>();
  salaryCandidates.forEach((candidate) => {
    const bucket = salaryBuckets.get(candidate.key);
    if (!bucket) return;
    const monthsCount = bucket.months.size || 1;
    const median = computeMedian(bucket.amounts);
    const cv = coefficientOfVariation(bucket.amounts);
    const exclusionRatio = bucket.exclusionHits / Math.max(1, bucket.amounts.length);

    let score = 0;
    if (candidate.salaryKeywordHit) score += 3;
    if (candidate.categorySalary) score += 3;
    if (candidate.amount >= salaryFloor) score += 1;
    if (monthsCount >= 2) score += 2;
    if (cv <= 0.42) score += 1;
    if (monthsCount >= 3) score += 1;
    if (candidate.transferLike && !candidate.salaryKeywordHit && !candidate.categorySalary) score -= 1;
    if (candidate.salaryExcluded) score -= 3;
    if (exclusionRatio > 0.45) score -= 1;

    const recurringStrong = monthsCount >= 2 && cv <= 0.35 && median >= salaryFloor * 0.8;
    const accepted =
      (score >= 4 && candidate.amount >= salaryFloor * 0.55) ||
      (score >= 3 && recurringStrong) ||
      (candidate.categorySalary && score >= 2);
    if (!accepted) return;
    if (acceptedSalaryRows.has(candidate.index)) return;

    const transaction = transactions[candidate.index];
    salaryCredits.push({
      date: transaction.date,
      amount: transaction.credit,
      description: transaction.description,
      rowIndex: candidate.index,
    });
    transaction.category = 'Salary/Income';
    acceptedSalaryRows.add(candidate.index);
  });
  salaryCredits.sort((a, b) => a.rowIndex - b.rowIndex);

  const acceptedEmiRows = new Set<number>();
  emiCandidates.forEach((candidate) => {
    const bucket = emiBuckets.get(candidate.key);
    if (!bucket) return;
    const monthsCount = bucket.months.size || 1;
    const median = computeMedian(bucket.amounts);
    const cv = coefficientOfVariation(bucket.amounts);
    const exclusionRatio = bucket.exclusionHits / Math.max(1, bucket.amounts.length);

    let score = 0;
    if (candidate.emiKeywordHit) score += 3;
    if (candidate.categoryLoan) score += 3;
    if (candidate.mandateKeywordHit) score += 2;
    if (candidate.lenderHintHit) score += 1;
    if (monthsCount >= 2) score += 2;
    if (cv <= 0.3) score += 1;
    if (candidate.amount >= 1000) score += 1;
    if (candidate.expenseLike) score -= 3;
    if (exclusionRatio > 0.45 && !candidate.emiKeywordHit && !candidate.categoryLoan) score -= 1;

    const recurringStrong = monthsCount >= 3 && cv <= 0.22 && median >= emiFloor && exclusionRatio < 0.35;
    const accepted =
      (score >= 4 && candidate.amount >= emiFloor) ||
      (score >= 3 && recurringStrong) ||
      (candidate.categoryLoan && score >= 2);
    if (!accepted) return;
    if (acceptedEmiRows.has(candidate.index)) return;

    const transaction = transactions[candidate.index];
    emiDebits.push({
      date: transaction.date,
      amount: transaction.debit,
      description: transaction.description,
      rowIndex: candidate.index,
      loanType: inferLoanType(candidate.descriptionLower),
    });
    transaction.category = 'Loan/EMI';
    acceptedEmiRows.add(candidate.index);
  });
  emiDebits.sort((a, b) => a.rowIndex - b.rowIndex);

  return { salaryCredits, emiDebits };
}

export function performUnderwritingAnalysis(
  transactions: Transaction[],
  categoryCorrections?: Map<string, string>,
): UnderwritingResult {
  const { salaryCredits, emiDebits } = detectSalaryAndEMI(transactions, categoryCorrections);

  const monthKeysSet = new Set<string>();
  transactions.forEach((transaction) => {
    const month = getMonthKey(transaction.date);
    if (month !== 'unknown') {
      monthKeysSet.add(month);
    }
  });
  if (monthKeysSet.size === 0) {
    monthKeysSet.add('unknown');
  }
  const monthKeys = sortMonthKeys(monthKeysSet);

  const monthlyData = new Map<string, { salaries: number; emis: number }>();
  monthKeys.forEach((month) => monthlyData.set(month, { salaries: 0, emis: 0 }));

  salaryCredits.forEach((salary) => {
    const month = getMonthKey(salary.date);
    const key = monthlyData.has(month) ? month : monthKeys[0];
    const existing = monthlyData.get(key) || { salaries: 0, emis: 0 };
    existing.salaries += salary.amount;
    monthlyData.set(key, existing);
  });

  emiDebits.forEach((emi) => {
    const month = getMonthKey(emi.date);
    const key = monthlyData.has(month) ? month : monthKeys[0];
    const existing = monthlyData.get(key) || { salaries: 0, emis: 0 };
    existing.emis += emi.amount;
    monthlyData.set(key, existing);
  });

  const monthlyRows = monthKeys.map((month) => {
    const data = monthlyData.get(month) || { salaries: 0, emis: 0 };
    return {
      month,
      salaryIncome: roundTo(data.salaries),
      emiOutflow: roundTo(data.emis),
    };
  });

  const monthCount = Math.max(1, monthlyRows.length);
  const salaryMonthAmounts = monthlyRows.map((row) => row.salaryIncome).filter((amount) => amount > 0);
  const emiMonthAmounts = monthlyRows.map((row) => row.emiOutflow).filter((amount) => amount > 0);
  const totalSalary = monthlyRows.reduce((sum, row) => sum + row.salaryIncome, 0);
  const totalEmi = monthlyRows.reduce((sum, row) => sum + row.emiOutflow, 0);

  const avgIncomeTimeline = totalSalary / monthCount;
  const avgIncomeActive = robustAverage(salaryMonthAmounts);
  const salaryCv = salaryMonthAmounts.length > 1
    ? coefficientOfVariation(salaryMonthAmounts)
    : salaryMonthAmounts.length === 1
      ? 0.62
      : 1;
  const coverageRatio = salaryMonthAmounts.length / monthCount;
  const salaryDays = salaryCredits
    .map((salary) => parseDayOfMonth(salary.date))
    .filter((day): day is number => day !== null);
  const dayStd = salaryDays.length > 1 ? standardDeviation(salaryDays) : salaryDays.length === 1 ? 6 : 12;
  const volatilityScore = clamp(100 - (salaryCv * 140), 0, 100);
  const coverageScore = clamp(coverageRatio * 100, 0, 100);
  const dayScore = salaryCredits.length === 0 ? 0 : clamp(100 - (dayStd * 11), 30, 100);
  const incomeConsistencyScore = salaryCredits.length === 0
    ? 0
    : roundTo((volatilityScore * 0.5) + (coverageScore * 0.3) + (dayScore * 0.2), 0);
  const stabilityMultiplier = salaryCredits.length === 0 ? 0 : clamp(0.55 + (incomeConsistencyScore / 200), 0.55, 1);

  const avgMonthlyIncome = roundTo(
    Math.max(avgIncomeTimeline, avgIncomeActive * 0.75) * stabilityMultiplier,
  );

  const avgEmiTimeline = totalEmi / monthCount;
  const avgEmiActive = robustAverage(emiMonthAmounts);
  const avgMonthlyEMI = roundTo(
    Math.max(avgEmiTimeline, avgEmiActive * (emiMonthAmounts.length >= 2 ? 0.9 : 0.75)),
  );

  const balances = transactions
    .map((transaction) => Number(transaction.balance))
    .filter((balance) => Number.isFinite(balance));
  const positiveBalances = balances.filter((balance) => balance > 0);
  const medianBalance = computeMedian(positiveBalances);
  const lowBalanceThreshold = medianBalance > 0
    ? Math.max(1_000, medianBalance * 0.12)
    : 1_000;
  const lowBalanceFrequency = balances.length > 0
    ? balances.filter((balance) => balance <= lowBalanceThreshold).length / balances.length
    : 0;

  const totalDebitVolume = transactions.reduce((sum, transaction) => sum + Math.max(0, Number(transaction.debit || 0)), 0);
  const cashWithdrawalVolume = transactions.reduce((sum, transaction) => {
    const debit = Math.max(0, Number(transaction.debit || 0));
    if (debit <= 0) return sum;
    const description = transaction.description.toLowerCase();
    const category = normalizeCategory(transaction.category);
    const isCashLike = hasKeyword(description, CASH_WITHDRAWAL_KEYWORDS) || category === 'cash';
    return isCashLike ? sum + debit : sum;
  }, 0);
  const cashWithdrawalShare = totalDebitVolume > 0 ? cashWithdrawalVolume / totalDebitVolume : 0;

  const baseFoirCap = getTargetFoirPercent(Math.max(avgMonthlyIncome, avgIncomeActive));
  const consistencyPenalty = incomeConsistencyScore >= 70
    ? 0
    : (70 - incomeConsistencyScore) * 0.12;
  const lowBalancePenalty = lowBalanceFrequency * 14;
  const cashPenalty = cashWithdrawalShare * 10;
  const adjustedFoirCap = roundTo(
    clamp(baseFoirCap - consistencyPenalty - lowBalancePenalty - cashPenalty, 32, baseFoirCap),
    2,
  );

  const stressFactor = clamp(
    0.92 -
      (lowBalanceFrequency * 0.22) -
      (cashWithdrawalShare * 0.16) -
      Math.max(0, (65 - incomeConsistencyScore) / 250),
    0.62,
    0.92,
  );

  const assumedAnnualRate = roundTo(
    0.11 +
      (lowBalanceFrequency * 0.03) +
      (cashWithdrawalShare * 0.02) +
      Math.max(0, (58 - incomeConsistencyScore) / 600),
    4,
  );
  const assumedTenureMonths = incomeConsistencyScore >= 80
    ? 72
    : incomeConsistencyScore >= 60
      ? 60
      : 48;

  const foir = calculateFOIR(avgMonthlyIncome, avgMonthlyEMI, {
    foirCapPercent: adjustedFoirCap,
    stressFactor,
    annualRate: assumedAnnualRate,
    tenureMonths: assumedTenureMonths,
  });

  const emiByLoanType: Record<string, { count: number; totalAmount: number }> = {};
  emiDebits.forEach((emi) => {
    if (!emiByLoanType[emi.loanType]) {
      emiByLoanType[emi.loanType] = { count: 0, totalAmount: 0 };
    }
    emiByLoanType[emi.loanType].count += 1;
    emiByLoanType[emi.loanType].totalAmount += emi.amount;
  });

  let eligibilityStatus: EligibilityStatus;
  let eligibilityMessage = '';
  const eligibilityFactors: string[] = [];
  const capUtilization = (foir.foirCapPercent ?? 45) > 0
    ? foir.score / (foir.foirCapPercent ?? 45)
    : 0;

  if (avgMonthlyIncome <= 0 && salaryCredits.length === 0) {
    eligibilityStatus = 'moderate';
    eligibilityMessage = 'No stable salary stream detected. FOIR-based eligibility is limited.';
    eligibilityFactors.push('No recurring salary credits detected');
  } else if (capUtilization <= 0.65 && incomeConsistencyScore >= 75) {
    eligibilityStatus = 'excellent';
    eligibilityMessage = 'Strong FOIR, stable income flow, and healthy repayment headroom.';
  } else if (capUtilization <= 0.85 && incomeConsistencyScore >= 60) {
    eligibilityStatus = 'good';
    eligibilityMessage = 'Healthy FOIR and acceptable income stability for standard lending profiles.';
  } else if (capUtilization <= 1.0) {
    eligibilityStatus = 'moderate';
    eligibilityMessage = 'FOIR is near policy cap. Conservative ticket sizing is recommended.';
  } else if (capUtilization <= 1.15) {
    eligibilityStatus = 'poor';
    eligibilityMessage = 'FOIR is above comfort zone. Additional risk mitigation is required.';
  } else {
    eligibilityStatus = 'ineligible';
    eligibilityMessage = 'FOIR is materially above policy cap for fresh loan servicing.';
  }

  if (incomeConsistencyScore < 45) {
    eligibilityStatus = downgradeEligibility(eligibilityStatus, 1);
    eligibilityFactors.push(`Income consistency is weak (${incomeConsistencyScore.toFixed(0)}%)`);
  } else {
    eligibilityFactors.push(`Income consistency score: ${incomeConsistencyScore.toFixed(0)}%`);
  }

  if (lowBalanceFrequency >= 0.35) {
    eligibilityStatus = downgradeEligibility(eligibilityStatus, 1);
    eligibilityFactors.push(`Low-balance frequency is elevated (${(lowBalanceFrequency * 100).toFixed(1)}%)`);
  } else {
    eligibilityFactors.push(`Low-balance frequency: ${(lowBalanceFrequency * 100).toFixed(1)}%`);
  }

  if (cashWithdrawalShare >= 0.4) {
    eligibilityStatus = downgradeEligibility(eligibilityStatus, 1);
    eligibilityFactors.push(`High cash withdrawal reliance (${(cashWithdrawalShare * 100).toFixed(1)}% of debits)`);
  } else if (cashWithdrawalShare >= 0.2) {
    eligibilityFactors.push(`Cash withdrawals are moderate (${(cashWithdrawalShare * 100).toFixed(1)}% of debits)`);
  }

  eligibilityFactors.push(`FOIR ${foir.score.toFixed(1)}% vs cap ${(foir.foirCapPercent ?? 0).toFixed(1)}%`);
  eligibilityFactors.push(`Recurring salary months: ${salaryMonthAmounts.length}/${monthCount}`);

  if (foir.maxNewEMI <= 0) {
    eligibilityFactors.push('No incremental EMI capacity after stress adjustment');
    if (capUtilization > 1 || avgMonthlyIncome <= 0) {
      eligibilityStatus = 'ineligible';
      eligibilityMessage = 'No safe EMI headroom available for new loan servicing.';
    } else if (eligibilityStatus !== 'ineligible') {
      eligibilityStatus = downgradeEligibility(eligibilityStatus, 1);
      eligibilityMessage = 'Headroom is tight after stress adjustment; lend conservatively.';
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
    monthlyBreakdown: monthlyRows,
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
