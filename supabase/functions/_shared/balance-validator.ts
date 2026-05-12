// ============= RUNNING BALANCE VALIDATOR =============
// Pure-math reconciliation in minor units (no float drift).
// Used by BOTH the deterministic text path and the vision/OCR path
// so accuracy is enforced uniformly regardless of source.

import { toMinorUnits, fromMinorUnits } from './money.ts';

export type BalanceCheckRow = {
  date?: string;
  description?: string;
  debit?: number;
  credit?: number;
  balance?: number;
};

export type BalanceCheckIssue = {
  index: number;
  expected: number;
  actual: number;
  diff: number;
  severity: 'minor' | 'major';
};

export type BalanceCheckResult = {
  totalRows: number;
  checkedRows: number;
  matchedRows: number;
  minorMismatchRows: number;
  majorMismatchRows: number;
  matchRatio: number;          // 0..1
  issues: BalanceCheckIssue[];
  isReconciled: boolean;       // true if matchRatio >= 0.95 and no major mismatches >5%
};

const MINOR_TOLERANCE_UNITS = 5; // 0.05 in minor units (paise/cents)

/**
 * Validate the running-balance chain across an ordered transaction list.
 * Does NOT mutate the rows — returns a report. Use this report to:
 *  - flag rows in the Excel `Pricing Mismatch Flag` column
 *  - decide whether a vision-pass result should be retried with a stronger model
 *  - feed the Audit & Reconciliation sheet
 */
export function validateRunningBalance(rows: ReadonlyArray<BalanceCheckRow>): BalanceCheckResult {
  if (!rows || rows.length < 2) {
    return {
      totalRows: rows?.length ?? 0,
      checkedRows: 0,
      matchedRows: 0,
      minorMismatchRows: 0,
      majorMismatchRows: 0,
      matchRatio: 1,
      issues: [],
      isReconciled: true,
    };
  }

  let matched = 0;
  let minorMismatches = 0;
  let majorMismatches = 0;
  const issues: BalanceCheckIssue[] = [];
  let checked = 0;

  for (let i = 1; i < rows.length; i += 1) {
    const prev = rows[i - 1];
    const curr = rows[i];

    const prevBal = Number(prev.balance);
    const currBal = Number(curr.balance);
    const debit = Number(curr.debit) || 0;
    const credit = Number(curr.credit) || 0;

    if (!Number.isFinite(prevBal) || !Number.isFinite(currBal)) {
      continue;
    }
    checked += 1;

    const expectedMinor = toMinorUnits(prevBal) + toMinorUnits(credit) - toMinorUnits(debit);
    const actualMinor = toMinorUnits(currBal);
    const diffMinor = expectedMinor - actualMinor;
    const absDiff = Math.abs(diffMinor);

    if (absDiff === 0) {
      matched += 1;
      continue;
    }

    if (absDiff <= MINOR_TOLERANCE_UNITS) {
      minorMismatches += 1;
      issues.push({
        index: i,
        expected: fromMinorUnits(expectedMinor),
        actual: fromMinorUnits(actualMinor),
        diff: fromMinorUnits(diffMinor),
        severity: 'minor',
      });
    } else {
      majorMismatches += 1;
      issues.push({
        index: i,
        expected: fromMinorUnits(expectedMinor),
        actual: fromMinorUnits(actualMinor),
        diff: fromMinorUnits(diffMinor),
        severity: 'major',
      });
    }
  }

  const matchRatio = checked === 0 ? 1 : matched / checked;
  const majorRatio = checked === 0 ? 0 : majorMismatches / checked;
  const isReconciled = matchRatio >= 0.95 && majorRatio <= 0.05;

  return {
    totalRows: rows.length,
    checkedRows: checked,
    matchedRows: matched,
    minorMismatchRows: minorMismatches,
    majorMismatchRows: majorMismatches,
    matchRatio,
    issues,
    isReconciled,
  };
}

/**
 * Pure helper: total debits/credits/net using minor-units math (no float drift).
 */
export function summariseTotals(rows: ReadonlyArray<BalanceCheckRow>): {
  totalDebit: number;
  totalCredit: number;
  netFlow: number;
} {
  let debitMinor = 0;
  let creditMinor = 0;
  for (const row of rows) {
    debitMinor += toMinorUnits(Number(row.debit) || 0);
    creditMinor += toMinorUnits(Number(row.credit) || 0);
  }
  return {
    totalDebit: fromMinorUnits(debitMinor),
    totalCredit: fromMinorUnits(creditMinor),
    netFlow: fromMinorUnits(creditMinor - debitMinor),
  };
}
