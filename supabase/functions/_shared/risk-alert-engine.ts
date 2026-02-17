import type {
  Transaction,
  RiskTransaction,
  ReconciliationResult,
  LiquidityAnalysis,
  FraudAlert,
} from './financial-engine.ts';

const HIGH_RISK_KEYWORDS = {
  gambling: [
    'bet365', 'betway', 'dream11', 'stake', 'casino', 'poker',
    'gambling', 'lottery', 'rummy', 'betting', 'sportingbet',
    '888', 'ladbrokes', 'william hill', 'paddy power', 'betfair',
  ],
  paydayLoan: [
    'payday', 'quickloan', 'fastcash', 'instantloan', 'moneynow',
    'cashadvance', 'short term loan', 'quick money', 'emergency loan',
    'same day loan', 'instant cash',
  ],
  bouncedPayment: [
    'cheque return', 'ecs return', 'nach return', 'dishonor',
    'bounce', 'returned unpaid', 'insufficient funds', 'payment failed',
    'rejection', 'return charges', 'dishonoured',
  ],
};

const buildRiskBucket = (
  riskTransactions: RiskTransaction[],
  type: RiskTransaction['type'],
): RiskTransaction => {
  let bucket = riskTransactions.find((item) => item.type === type);
  if (!bucket) {
    bucket = { type, indices: [], transactions: [] };
    riskTransactions.push(bucket);
  }
  return bucket;
};

export function detectHighRiskTransactions(transactions: Transaction[]): RiskTransaction[] {
  const riskTransactions: RiskTransaction[] = [];

  transactions.forEach((transaction, index) => {
    const description = transaction.description.toLowerCase();
    const amount = transaction.debit || transaction.credit;

    const detect = (
      type: RiskTransaction['type'],
      keywords: string[],
      flagName: string,
    ) => {
      if (!keywords.some((keyword) => description.includes(keyword))) return;
      const bucket = buildRiskBucket(riskTransactions, type);
      bucket.indices.push(index);
      bucket.transactions.push({
        date: transaction.date,
        description: transaction.description,
        amount,
      });
      transaction.riskFlag = flagName;
    };

    detect('gambling', HIGH_RISK_KEYWORDS.gambling, 'gambling');
    detect('paydayLoan', HIGH_RISK_KEYWORDS.paydayLoan, 'paydayLoan');
    detect('bouncedPayment', HIGH_RISK_KEYWORDS.bouncedPayment, 'bouncedPayment');
  });

  return riskTransactions;
}

export function detectCircularTrading(transactions: Transaction[]): RiskTransaction | null {
  const transferPairs = new Map<
    string,
    { inCount: number; outCount: number; indices: number[]; totalAmount: number }
  >();

  transactions.forEach((transaction, index) => {
    if (transaction.category !== 'Transfer In' && transaction.category !== 'Transfer Out') return;
    const description = transaction.description.toLowerCase();
    const match = description.match(/(?:to|from|upi|imps|neft|rtgs)\s*[:-]?\s*([a-z0-9@_.-]+)/);
    if (!match) return;

    const key = match[1].substring(0, 24);
    const amount = Math.abs(transaction.debit || transaction.credit || 0);
    const existing = transferPairs.get(key) || { inCount: 0, outCount: 0, indices: [], totalAmount: 0 };

    if (transaction.category === 'Transfer In') existing.inCount += 1;
    if (transaction.category === 'Transfer Out') existing.outCount += 1;
    existing.indices.push(index);
    existing.totalAmount += amount;
    transferPairs.set(key, existing);
  });

  let circularTrading: RiskTransaction | null = null;
  transferPairs.forEach((value) => {
    const appearsCircular = value.indices.length >= 5 && value.inCount > 0 && value.outCount > 0;
    if (!appearsCircular) return;

    if (!circularTrading) {
      circularTrading = {
        type: 'circularTrading',
        indices: [...value.indices],
        transactions: value.indices.map((i) => ({
          date: transactions[i].date,
          description: transactions[i].description,
          amount: transactions[i].debit || transactions[i].credit,
        })),
      };
    } else {
      circularTrading.indices.push(...value.indices);
      circularTrading.transactions.push(
        ...value.indices.map((i) => ({
          date: transactions[i].date,
          description: transactions[i].description,
          amount: transactions[i].debit || transactions[i].credit,
        })),
      );
    }

    value.indices.forEach((i) => {
      transactions[i].riskFlag = 'circularTrading';
    });
  });

  return circularTrading;
}

export function generateFraudAlerts(
  reconciliation: ReconciliationResult,
  riskTransactions: RiskTransaction[],
  liquidity: LiquidityAnalysis,
  transactionCount: number,
): FraudAlert[] {
  const alerts: FraudAlert[] = [];

  if (reconciliation.mismatches.length > 0) {
    const mismatchPercentage = transactionCount > 0
      ? (reconciliation.mismatches.length / transactionCount) * 100
      : 0;
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';

    if (mismatchPercentage > 20) severity = 'critical';
    else if (mismatchPercentage > 10) severity = 'high';
    else if (mismatchPercentage > 5) severity = 'medium';

    alerts.push({
      type: 'BALANCE_INTEGRITY',
      severity,
      description: `${reconciliation.mismatches.length} transaction(s) have balance discrepancies. Mathematical reconciliation failed.`,
      affectedRows: reconciliation.mismatches.map((mismatch) => mismatch.rowIndex),
      metadata: {
        totalMismatches: reconciliation.mismatches.length,
        mismatchPercentage: mismatchPercentage.toFixed(2),
        details: reconciliation.mismatches.slice(0, 10),
      },
    });
  }

  riskTransactions.forEach((risk) => {
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    let description = '';

    switch (risk.type) {
      case 'gambling':
        severity = risk.indices.length > 3 ? 'high' : 'medium';
        description = `${risk.indices.length} gambling-related transaction(s) detected.`;
        break;
      case 'paydayLoan':
        severity = 'high';
        description = `${risk.indices.length} payday-loan transaction(s) detected.`;
        break;
      case 'bouncedPayment':
        severity = risk.indices.length > 2 ? 'critical' : 'high';
        description = `${risk.indices.length} bounced payment(s) detected.`;
        break;
      case 'circularTrading':
        severity = risk.indices.length > 8 ? 'critical' : 'high';
        description = `Possible circular trading pattern detected across ${risk.indices.length} transfer transaction(s).`;
        break;
    }

    alerts.push({
      type: risk.type.toUpperCase(),
      severity,
      description,
      affectedRows: risk.indices,
      metadata: {
        count: risk.indices.length,
        transactions: risk.transactions.slice(0, 10),
      },
    });
  });

  if (liquidity.zeroDays > 0) {
    alerts.push({
      type: 'LIQUIDITY_CRISIS',
      severity: liquidity.zeroDays > 3 ? 'critical' : 'high',
      description: `Account reached zero or negative balance on ${liquidity.zeroDays} occasion(s).`,
      affectedRows: [],
      metadata: {
        zeroDaysCount: liquidity.zeroDays,
        lowestBalance: liquidity.minBalance,
      },
    });
  }

  return alerts;
}

export function calculateIntegrityScore(
  reconciliation: ReconciliationResult,
  riskTransactions: RiskTransaction[],
  liquidity: LiquidityAnalysis,
): number {
  let score = 100;

  score -= Math.min(35, reconciliation.mismatches.length * 3);
  score -= Math.min(25, riskTransactions.length * 5);
  score -= Math.min(20, liquidity.zeroDays * 5);

  return Math.max(0, Math.round(score));
}
