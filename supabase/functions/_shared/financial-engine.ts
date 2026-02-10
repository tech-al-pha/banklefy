// ============= PURE TYPESCRIPT FINANCIAL ENGINE =============
// 100% Mathematical Accuracy - No AI, Just Math

import { fromMinorUnits, toMinorUnits } from './money.ts';

const roundTo = (value: number, decimals = 2): number => {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

export interface Transaction {
  date: string;
  description: string;
  category: string;
  debit: number;
  credit: number;
  balance: number;
  isDuplicate?: boolean;
  duplicateGroup?: number | null;
  balanceMismatch?: boolean;
  expectedBalance?: number | null;
  riskFlag?: string | null;
  amount?: number;
  type?: string;
  refNumber?: string; // Reference number extracted from OCR
}

export interface BalanceMismatch {
  rowIndex: number;
  expected: number;
  actual: number;
  difference: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ReconciliationResult {
  isValid: boolean;
  mismatches: BalanceMismatch[];
  integrityScore: number;
  totalMismatches: number;
}

export interface FOIRResult {
  score: number;
  status: 'excellent' | 'good' | 'moderate' | 'high';
  avgMonthlyIncome: number;
  avgMonthlyEMI: number;
  maxNewEMI: number;
  loanEligibility: number;
  disposableIncome: number;
}

export interface SalaryCredit {
  date: string;
  amount: number;
  description: string;
  rowIndex: number;
}

export interface EMIDebit {
  date: string;
  amount: number;
  description: string;
  rowIndex: number;
  loanType: string;
}

export interface RiskTransaction {
  type: 'gambling' | 'paydayLoan' | 'bouncedPayment' | 'circularTrading';
  indices: number[];
  transactions: { date: string; description: string; amount: number }[];
}

export interface FraudAlert {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedRows: number[];
  metadata: Record<string, unknown>;
}

export interface UnderwritingResult {
  salaryCredits: SalaryCredit[];
  emiDebits: EMIDebit[];
  foir: FOIRResult;
  eligibility: {
    status: 'excellent' | 'good' | 'moderate' | 'poor' | 'ineligible';
    message: string;
    factors: string[];
  };
  monthlyBreakdown: { month: string; salaryIncome: number; emiOutflow: number }[];
  emiByLoanType: Record<string, { count: number; totalAmount: number }>;
}

export interface LiquidityAnalysis {
  minBalance: number;
  maxBalance: number;
  avgBalance: number;
  maxDipDate: string | null;
  zeroDays: number;
}

// ============= BALANCE RECONCILIATION ENGINE =============
export function reconcileBalances(transactions: Transaction[]): ReconciliationResult {
  const mismatches: BalanceMismatch[] = [];
  
  for (let i = 1; i < transactions.length; i++) {
    const prevBalance = transactions[i - 1].balance || 0;
    const currentCredit = transactions[i].credit || 0;
    const currentDebit = transactions[i].debit || 0;
    
    // Formula: Balance[n-1] + Credit[n] - Debit[n] = Balance[n]
    // Use minor-unit math for exact debit/credit + running balance reconciliation.
    const expectedMinor = toMinorUnits(prevBalance) + toMinorUnits(currentCredit) - toMinorUnits(currentDebit);
    const expectedBalance = fromMinorUnits(expectedMinor);
    const actualMinor = toMinorUnits(transactions[i].balance || 0);
    const actualBalance = fromMinorUnits(actualMinor);
    
    // Allow tolerance of 0.01 for floating point
    const differenceMinor = Math.abs(expectedMinor - actualMinor);
    const difference = fromMinorUnits(differenceMinor);
    
    if (differenceMinor > 1) {
      const severity: 'low' | 'medium' | 'high' | 'critical' = 
        difference > 10000 ? 'critical' :
        difference > 1000 ? 'high' :
        difference > 100 ? 'medium' : 'low';
      
      mismatches.push({
        rowIndex: i,
        expected: expectedBalance,
        actual: actualBalance,
        difference,
        severity,
      });
      
      // Mark transaction
      transactions[i].balanceMismatch = true;
      transactions[i].expectedBalance = expectedBalance;
    }
  }
  
  // Calculate integrity score (100 = perfect, 0 = highly suspicious)
  const mismatchPercentage = transactions.length > 0 ? (mismatches.length / transactions.length) * 100 : 0;
  let integrityScore = 100 - Math.min(100, mismatchPercentage * 3);
  integrityScore = Math.max(0, Math.round(integrityScore));
  
  return {
    isValid: mismatches.length === 0,
    mismatches,
    integrityScore,
    totalMismatches: mismatches.length,
  };
}

// ============= FOIR CALCULATOR ENGINE =============
export function calculateFOIR(
  avgMonthlyIncome: number, 
  avgMonthlyEMI: number
): FOIRResult {
  const safeIncome = roundTo(avgMonthlyIncome);
  const safeEmi = roundTo(avgMonthlyEMI);
  const score = safeIncome > 0
    ? roundTo((safeEmi / safeIncome) * 100, 2)
    : 0;
  
  const status: 'excellent' | 'good' | 'moderate' | 'high' = 
    score <= 30 ? 'excellent' :
    score <= 50 ? 'good' :
    score <= 65 ? 'moderate' : 'high';
  
  const disposableIncome = roundTo(Math.max(0, safeIncome - safeEmi));
  const maxNewEMI = roundTo(disposableIncome * 0.5);
  const loanEligibility = roundTo(maxNewEMI * 60); // 5-year tenure multiplier
  
  return {
    score,
    status,
    avgMonthlyIncome: safeIncome,
    avgMonthlyEMI: safeEmi,
    maxNewEMI,
    loanEligibility,
    disposableIncome,
  };
}

// ============= DUPLICATE DETECTION ENGINE =============
export function detectDuplicates(transactions: Transaction[]): number {
  const duplicateMap = new Map<string, { transaction: Transaction; groupId: number }>();
  let duplicateCount = 0;
  
  transactions.forEach((t, i) => {
    // Create a key based on Date + Reference No + Amount (per statement rules)
    const debitVal = Number(t.debit || 0);
    const creditVal = Number(t.credit || 0);
    const amount = Math.abs(debitVal > 0 ? debitVal : creditVal || 0);
    const refKey = (t.refNumber || '').toString();
    if (!refKey) return;
    const key = `${t.date}_${refKey}_${amount}`;
    
    if (duplicateMap.has(key)) {
      const existing = duplicateMap.get(key)!;
      const groupId = existing.groupId;
      
      t.isDuplicate = true;
      t.duplicateGroup = groupId;
      existing.transaction.isDuplicate = true;
      existing.transaction.duplicateGroup = groupId;
      duplicateCount++;
    } else {
      duplicateMap.set(key, { transaction: t, groupId: i + 1 });
    }
  });
  
  return duplicateCount;
}

// ============= HIGH-RISK TRANSACTION DETECTION =============
const HIGH_RISK_KEYWORDS = {
  gambling: [
    'bet365', 'betway', 'dream11', 'stake', 'casino', 'poker', 
    'gambling', 'lottery', 'rummy', 'betting', 'sportingbet', 
    '888', 'ladbrokes', 'william hill', 'paddy power', 'betfair'
  ],
  paydayLoan: [
    'payday', 'quickloan', 'fastcash', 'instantloan', 'moneynow', 
    'cashadvance', 'short term loan', 'quick money', 'emergency loan',
    'same day loan', 'instant cash'
  ],
  bouncedPayment: [
    'cheque return', 'ecs return', 'nach return', 'dishonor', 
    'bounce', 'returned unpaid', 'insufficient funds', 'payment failed',
    'rejection', 'return charges', 'dishonoured'
  ],
};

export function detectHighRiskTransactions(transactions: Transaction[]): RiskTransaction[] {
  const riskTransactions: RiskTransaction[] = [];
  
  transactions.forEach((t, index) => {
    const desc = t.description.toLowerCase();
    
    // Gambling detection
    if (HIGH_RISK_KEYWORDS.gambling.some(k => desc.includes(k))) {
      const existing = riskTransactions.find(r => r.type === 'gambling');
      if (existing) {
        existing.indices.push(index);
        existing.transactions.push({ 
          date: t.date, 
          description: t.description, 
          amount: t.debit || t.credit 
        });
      } else {
        riskTransactions.push({
          type: 'gambling',
          indices: [index],
          transactions: [{ 
            date: t.date, 
            description: t.description, 
            amount: t.debit || t.credit 
          }],
        });
      }
      transactions[index].riskFlag = 'gambling';
    }
    
    // Payday loan detection
    if (HIGH_RISK_KEYWORDS.paydayLoan.some(k => desc.includes(k))) {
      const existing = riskTransactions.find(r => r.type === 'paydayLoan');
      if (existing) {
        existing.indices.push(index);
        existing.transactions.push({ 
          date: t.date, 
          description: t.description, 
          amount: t.debit || t.credit 
        });
      } else {
        riskTransactions.push({
          type: 'paydayLoan',
          indices: [index],
          transactions: [{ 
            date: t.date, 
            description: t.description, 
            amount: t.debit || t.credit 
          }],
        });
      }
      transactions[index].riskFlag = 'paydayLoan';
    }
    
    // Bounced payment detection
    if (HIGH_RISK_KEYWORDS.bouncedPayment.some(k => desc.includes(k))) {
      const existing = riskTransactions.find(r => r.type === 'bouncedPayment');
      if (existing) {
        existing.indices.push(index);
        existing.transactions.push({ 
          date: t.date, 
          description: t.description, 
          amount: t.debit || t.credit 
        });
      } else {
        riskTransactions.push({
          type: 'bouncedPayment',
          indices: [index],
          transactions: [{ 
            date: t.date, 
            description: t.description, 
            amount: t.debit || t.credit 
          }],
        });
      }
      transactions[index].riskFlag = 'bouncedPayment';
    }
  });
  
  return riskTransactions;
}

// ============= CIRCULAR TRADING DETECTION =============
export function detectCircularTrading(transactions: Transaction[]): RiskTransaction | null {
  const transferPairs = new Map<string, { count: number; indices: number[]; totalAmount: number }>();
  
  transactions.forEach((t, index) => {
    if (t.category === 'Transfer In' || t.category === 'Transfer Out') {
      const desc = t.description.toLowerCase();
      // Extract potential account identifier
      const match = desc.match(/(?:to|from|upi|imps|neft|rtgs)\s*[:-]?\s*([a-z0-9@_.-]+)/);
      if (match) {
        const key = match[1].substring(0, 20);
        const existing = transferPairs.get(key);
        if (existing) {
          existing.count++;
          existing.indices.push(index);
          existing.totalAmount += (t.debit || t.credit);
        } else {
          transferPairs.set(key, { 
            count: 1, 
            indices: [index], 
            totalAmount: t.debit || t.credit 
          });
        }
      }
    }
  });
  
  // Flag if >5 transfers to same party
  let circularTrading: RiskTransaction | null = null;
  
  transferPairs.forEach((value, _key) => {
    if (value.count >= 5) {
      if (!circularTrading) {
        circularTrading = {
          type: 'circularTrading',
          indices: value.indices,
          transactions: value.indices.map(i => ({
            date: transactions[i].date,
            description: transactions[i].description,
            amount: transactions[i].debit || transactions[i].credit,
          })),
        };
      } else {
        circularTrading.indices.push(...value.indices);
        circularTrading.transactions.push(
          ...value.indices.map(i => ({
            date: transactions[i].date,
            description: transactions[i].description,
            amount: transactions[i].debit || transactions[i].credit,
          }))
        );
      }
      value.indices.forEach(i => {
        transactions[i].riskFlag = 'circularTrading';
      });
    }
  });
  
  return circularTrading;
}

// ============= SALARY & EMI DETECTION ENGINE =============
const SALARY_KEYWORDS = [
  'salary', 'sal cr', 'sal/', 'payroll', 'wages', 'income', 
  'stipend', 'pension', 'honorarium', 'commission', 'bonus',
  'pay credit', 'monthly pay'
];

const EMI_KEYWORDS = [
  'emi', 'loan', 'instalment', 'installment', 'repayment', 
  'housing loan', 'car loan', 'personal loan', 'credit card', 
  'nach', 'auto debit', 'mortgage', 'finance'
];

export function detectSalaryAndEMI(
  transactions: Transaction[],
  categoryCorrections?: Map<string, string>
): { salaryCredits: SalaryCredit[]; emiDebits: EMIDebit[] } {
  const salaryCredits: SalaryCredit[] = [];
  const emiDebits: EMIDebit[] = [];
  
  transactions.forEach((t, index) => {
    const desc = t.description.toLowerCase();
    
    // Apply category corrections if available
    if (categoryCorrections) {
      const correctedCategory = categoryCorrections.get(desc) || 
        [...categoryCorrections.entries()].find(([pattern]) => desc.includes(pattern))?.[1];
      if (correctedCategory) {
        t.category = correctedCategory;
      }
    }
    
    // Detect salary credits
    if (t.credit > 0 && (
      SALARY_KEYWORDS.some(k => desc.includes(k)) ||
      t.category === 'Salary/Income' ||
      // Large NEFT/RTGS credits likely salary
      (t.credit >= 30000 && (desc.includes('neft') || desc.includes('rtgs') || desc.includes('imps')))
    )) {
      salaryCredits.push({
        date: t.date,
        amount: t.credit,
        description: t.description,
        rowIndex: index,
      });
      if (t.category !== 'Salary/Income') {
        t.category = 'Salary/Income';
      }
    }
    
    // Detect EMI/Loan debits
    if (t.debit > 0 && (
      EMI_KEYWORDS.some(k => desc.includes(k)) ||
      t.category === 'Loan/EMI'
    )) {
      let loanType = 'Unknown';
      if (desc.includes('housing') || desc.includes('home loan') || desc.includes('mortgage')) {
        loanType = 'Housing';
      } else if (desc.includes('car') || desc.includes('vehicle') || desc.includes('auto loan')) {
        loanType = 'Vehicle';
      } else if (desc.includes('personal') || desc.includes('pl ')) {
        loanType = 'Personal';
      } else if (desc.includes('credit card') || desc.includes('cc ')) {
        loanType = 'Credit Card';
      } else if (desc.includes('education') || desc.includes('student')) {
        loanType = 'Education';
      } else if (desc.includes('gold')) {
        loanType = 'Gold';
      } else if (EMI_KEYWORDS.some(k => desc.includes(k))) {
        loanType = 'EMI';
      }
      
      emiDebits.push({
        date: t.date,
        amount: t.debit,
        description: t.description,
        rowIndex: index,
        loanType,
      });
      if (t.category !== 'Loan/EMI') {
        t.category = 'Loan/EMI';
      }
    }
  });
  
  return { salaryCredits, emiDebits };
}

// ============= COMPLETE UNDERWRITING ANALYSIS =============
export function performUnderwritingAnalysis(
  transactions: Transaction[],
  categoryCorrections?: Map<string, string>
): UnderwritingResult {
  const { salaryCredits, emiDebits } = detectSalaryAndEMI(transactions, categoryCorrections);
  
  // Build monthly breakdown
  const monthlyData = new Map<string, { salaries: number; emis: number }>();
  
  transactions.forEach(t => {
    const month = t.date.substring(0, 7);
    if (!monthlyData.has(month)) {
      monthlyData.set(month, { salaries: 0, emis: 0 });
    }
  });
  
  salaryCredits.forEach(s => {
    const month = s.date.substring(0, 7);
    const existing = monthlyData.get(month) || { salaries: 0, emis: 0 };
    existing.salaries += s.amount;
    monthlyData.set(month, existing);
  });
  
  emiDebits.forEach(e => {
    const month = e.date.substring(0, 7);
    const existing = monthlyData.get(month) || { salaries: 0, emis: 0 };
    existing.emis += e.amount;
    monthlyData.set(month, existing);
  });
  
  // Calculate averages
  const months = Array.from(monthlyData.values());
  const totalSalary = months.reduce((sum, m) => sum + m.salaries, 0);
  const totalEmi = months.reduce((sum, m) => sum + m.emis, 0);
  const avgMonthlyIncome = months.length > 0
    ? roundTo(totalSalary / months.length)
    : 0;
  const avgMonthlyEMI = months.length > 0
    ? roundTo(totalEmi / months.length)
    : 0;
  
  // Calculate FOIR
  const foir = calculateFOIR(avgMonthlyIncome, avgMonthlyEMI);
  
  // Group EMI by loan type
  const emiByLoanType: Record<string, { count: number; totalAmount: number }> = {};
  emiDebits.forEach(e => {
    if (!emiByLoanType[e.loanType]) {
      emiByLoanType[e.loanType] = { count: 0, totalAmount: 0 };
    }
    emiByLoanType[e.loanType].count++;
    emiByLoanType[e.loanType].totalAmount += e.amount;
  });
  
  // Determine eligibility
  let eligibilityStatus: 'excellent' | 'good' | 'moderate' | 'poor' | 'ineligible' = 'good';
  let eligibilityMessage = '';
  const eligibilityFactors: string[] = [];
  
  if (foir.score === 0 && salaryCredits.length === 0) {
    eligibilityStatus = 'moderate';
    eligibilityMessage = 'No salary income detected. Unable to calculate FOIR.';
    eligibilityFactors.push('No identifiable salary credits');
  } else if (foir.score <= 30) {
    eligibilityStatus = 'excellent';
    eligibilityMessage = 'Excellent debt-to-income ratio. High loan eligibility.';
    eligibilityFactors.push('FOIR below 30% - excellent');
  } else if (foir.score <= 50) {
    eligibilityStatus = 'good';
    eligibilityMessage = 'Good debt-to-income ratio. Eligible for most loans.';
    eligibilityFactors.push('FOIR between 30-50% - acceptable');
  } else if (foir.score <= 65) {
    eligibilityStatus = 'moderate';
    eligibilityMessage = 'Moderate debt burden. May face stricter approval criteria.';
    eligibilityFactors.push('FOIR above 50% - elevated');
  } else {
    eligibilityStatus = 'poor';
    eligibilityMessage = 'High debt burden. Loan approval may be difficult.';
    eligibilityFactors.push('FOIR above 65% - high risk');
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
      ])
    ),
  };
}

// ============= LIQUIDITY ANALYSIS =============
export function analyzeLiquidity(transactions: Transaction[]): LiquidityAnalysis {
  const balances = transactions.map(t => t.balance || 0);
  
  if (balances.length === 0) {
    return {
      minBalance: 0,
      maxBalance: 0,
      avgBalance: 0,
      maxDipDate: null,
      zeroDays: 0,
    };
  }
  
  const minBalance = Math.min(...balances);
  const maxBalance = Math.max(...balances);
  const avgBalance = roundTo(balances.reduce((a, b) => a + b, 0) / balances.length);
  const minBalanceIndex = balances.indexOf(minBalance);
  const maxDipDate = transactions[minBalanceIndex]?.date || null;
  const zeroDays = transactions.filter(t => (t.balance || 0) <= 0).length;
  
  return {
    minBalance: roundTo(minBalance),
    maxBalance: roundTo(maxBalance),
    avgBalance,
    maxDipDate,
    zeroDays,
  };
}

// ============= GENERATE FRAUD ALERTS =============
export function generateFraudAlerts(
  reconciliation: ReconciliationResult,
  riskTransactions: RiskTransaction[],
  liquidity: LiquidityAnalysis,
  transactionCount: number
): FraudAlert[] {
  const alerts: FraudAlert[] = [];
  
  // Balance mismatch alert
  if (reconciliation.mismatches.length > 0) {
    const mismatchPercentage = (reconciliation.mismatches.length / transactionCount) * 100;
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    
    if (mismatchPercentage > 20) severity = 'critical';
    else if (mismatchPercentage > 10) severity = 'high';
    else if (mismatchPercentage > 5) severity = 'medium';
    
    alerts.push({
      type: 'BALANCE_INTEGRITY',
      severity,
      description: `${reconciliation.mismatches.length} transaction(s) have balance discrepancies. Mathematical reconciliation failed.`,
      affectedRows: reconciliation.mismatches.map(m => m.rowIndex),
      metadata: {
        totalMismatches: reconciliation.mismatches.length,
        mismatchPercentage: mismatchPercentage.toFixed(2),
        details: reconciliation.mismatches.slice(0, 10),
      },
    });
  }
  
  // Risk transaction alerts
  riskTransactions.forEach(risk => {
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    let description = '';
    
    switch (risk.type) {
      case 'gambling':
        severity = risk.indices.length > 3 ? 'high' : 'medium';
        description = `${risk.indices.length} gambling-related transaction(s) detected. May indicate risky financial behavior.`;
        break;
      case 'paydayLoan':
        severity = 'high';
        description = `${risk.indices.length} payday loan transaction(s) detected. Indicates potential financial stress.`;
        break;
      case 'bouncedPayment':
        severity = risk.indices.length > 2 ? 'critical' : 'high';
        description = `${risk.indices.length} bounced payment(s) detected. Indicates payment failures.`;
        break;
      case 'circularTrading':
        severity = 'high';
        description = `High-frequency transfers detected: ${risk.indices.length} transactions. Possible circular trading.`;
        break;
    }
    
    alerts.push({
      type: risk.type.toUpperCase(),
      severity,
      description,
      affectedRows: risk.indices,
      metadata: {
        count: risk.indices.length,
        transactions: risk.transactions.slice(0, 5),
      },
    });
  });
  
  // Liquidity crisis alert
  if (liquidity.zeroDays > 0) {
    alerts.push({
      type: 'LIQUIDITY_CRISIS',
      severity: liquidity.zeroDays > 3 ? 'critical' : 'high',
      description: `Account reached zero or negative balance on ${liquidity.zeroDays} occasion(s). Indicates liquidity stress.`,
      affectedRows: [],
      metadata: {
        zeroDaysCount: liquidity.zeroDays,
        lowestBalance: liquidity.minBalance,
      },
    });
  }
  
  return alerts;
}

// ============= CALCULATE FINAL INTEGRITY SCORE =============
export function calculateIntegrityScore(
  reconciliation: ReconciliationResult,
  riskTransactions: RiskTransaction[],
  liquidity: LiquidityAnalysis
): number {
  let score = 100;
  
  // Deduct for balance mismatches (up to 30 points)
  score -= Math.min(30, reconciliation.mismatches.length * 3);
  
  // Deduct for risk transactions (up to 20 points)
  score -= Math.min(20, riskTransactions.length * 5);
  
  // Deduct for zero balance days (up to 20 points)
  score -= Math.min(20, liquidity.zeroDays * 5);
  
  return Math.max(0, Math.round(score));
}
