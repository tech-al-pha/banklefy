// ============= MULTI-STATEMENT MERGE UTILITIES =============
// Validation + normalization + merge helpers for combining multiple statements.

import type { Transaction } from '../_shared/financial-engine.ts';
import type { BankMetadata } from '../_shared/ocr-processor.ts';
import type { BankInfo } from '../_shared/excel-generator.ts';

export interface StatementData {
  fileName: string;
  transactions: Transaction[];
  bankMetadata?: BankMetadata;
}

export interface MergeValidationResult {
  canMerge: boolean;
  reasons: string[];
  normalized: {
    bankName?: string;
    accountNumber?: string;
    currency?: string;
  };
  display: {
    bankName?: string;
    accountNumber?: string;
    currency?: string;
    accountHolder?: string;
  };
}

export interface MergeComputationResult {
  mergedTransactions: Transaction[];
  duplicatesRemoved: number;
  totals: {
    totalDebit: number;
    totalCredit: number;
    finalBalance: number | null;
  };
  statementPeriod?: string;
  bankInfo: BankInfo;
}

const normalizeText = (value?: string): string =>
  (value ?? '').toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, '');

const normalizeAccountNumber = (value?: string): string =>
  (value ?? '').toString().trim().toUpperCase().replace(/[^A-Z0-9]+/g, '');

const normalizeCurrency = (value?: string): string =>
  (value ?? '').toString().trim().toUpperCase().replace(/[^A-Z]+/g, '');

const pickFirstNonEmpty = (values: Array<string | undefined | null>): string => {
  for (const value of values) {
    if (value && value.toString().trim()) return value.toString().trim();
  }
  return '';
};

const parseNumericDate = (value: string): Date | null => {
  const match = value.match(/^(\d{1,4})[\/\-](\d{1,2})[\/\-](\d{1,4})/);
  if (!match) return null;
  const part1 = Number(match[1]);
  const part2 = Number(match[2]);
  const part3 = Number(match[3]);

  // YYYY-MM-DD
  if (match[1].length === 4) {
    const date = new Date(Date.UTC(part1, part2 - 1, part3));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  // DD/MM/YYYY or MM/DD/YYYY
  let day = part1;
  let month = part2;
  if (part1 <= 12 && part2 > 12) {
    month = part1;
    day = part2;
  } else if (part1 <= 12 && part2 <= 12) {
    // Ambiguous: default to DD/MM for global bank statements
    day = part1;
    month = part2;
  }
  const date = new Date(Date.UTC(part3, month - 1, day));
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseFlexibleDate = (value?: string): Date | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const numeric = parseNumericDate(trimmed);
  if (numeric) return numeric;

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatMonthYear = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
};

const parseStatementPeriod = (period?: string): { start?: Date; end?: Date } => {
  if (!period) return {};
  const matches = period.match(/\d{1,4}[\/\-]\d{1,2}[\/\-]\d{1,4}/g);
  if (!matches || matches.length < 2) {
    // Attempt to parse a month-based period like "April 2024 - December 2024"
    const split = period.split(/\s*[-–—]\s*/);
    if (split.length >= 2) {
      const start = parseFlexibleDate(split[0]);
      const end = parseFlexibleDate(split[1]);
      return { start: start ?? undefined, end: end ?? undefined };
    }
    return {};
  }
  const start = parseFlexibleDate(matches[0]);
  const end = parseFlexibleDate(matches[1]);
  return { start: start ?? undefined, end: end ?? undefined };
};

const getTransactionDateRange = (transactions: Transaction[]): { start?: Date; end?: Date } => {
  const dates = transactions
    .map((t) => parseFlexibleDate(t.date))
    .filter((d): d is Date => !!d);
  if (dates.length === 0) return {};
  dates.sort((a, b) => a.getTime() - b.getTime());
  return { start: dates[0], end: dates[dates.length - 1] };
};

const getStatementDateRange = (statement: StatementData): { start?: Date; end?: Date } => {
  const period = parseStatementPeriod(statement.bankMetadata?.statementPeriod);
  if (period.start && period.end) return period;
  return getTransactionDateRange(statement.transactions);
};

export function validateStatementsForMerge(statements: StatementData[]): MergeValidationResult {
  const reasons: string[] = [];

  if (statements.length < 2) {
    reasons.push('Only one statement uploaded');
  }

  const bankNames = statements.map((s) => s.bankMetadata?.bankName);
  const accountNumbers = statements.map((s) => s.bankMetadata?.accountNumber);
  const currencies = statements.map((s) => s.bankMetadata?.currency);
  const accountHolders = statements.map((s) => s.bankMetadata?.accountHolder);

  const normalizedBank = normalizeText(pickFirstNonEmpty(bankNames));
  const normalizedAccount = normalizeAccountNumber(pickFirstNonEmpty(accountNumbers));
  const normalizedCurrency = normalizeCurrency(pickFirstNonEmpty(currencies));

  statements.forEach((statement) => {
    const meta = statement.bankMetadata;
    if (!meta?.bankName) {
      reasons.push(`Missing bank name in ${statement.fileName}`);
    } else if (normalizeText(meta.bankName) !== normalizedBank) {
      reasons.push(`Bank name mismatch in ${statement.fileName}`);
    }

    if (!meta?.accountNumber) {
      reasons.push(`Missing account number in ${statement.fileName}`);
    } else if (normalizeAccountNumber(meta.accountNumber) !== normalizedAccount) {
      reasons.push(`Account number mismatch in ${statement.fileName}`);
    }

    if (!meta?.currency) {
      reasons.push(`Missing currency in ${statement.fileName}`);
    } else if (normalizeCurrency(meta.currency) !== normalizedCurrency) {
      reasons.push(`Currency mismatch in ${statement.fileName}`);
    }
  });

  return {
    canMerge: reasons.length === 0,
    reasons,
    normalized: {
      bankName: normalizedBank || undefined,
      accountNumber: normalizedAccount || undefined,
      currency: normalizedCurrency || undefined,
    },
    display: {
      bankName: pickFirstNonEmpty(bankNames) || undefined,
      accountNumber: pickFirstNonEmpty(accountNumbers) || undefined,
      currency: pickFirstNonEmpty(currencies) || undefined,
      accountHolder: pickFirstNonEmpty(accountHolders) || undefined,
    },
  };
}

const normalizeDescription = (value?: string): string =>
  (value ?? '').toString().trim().toLowerCase().replace(/\s+/g, ' ');

const transactionAmount = (transaction: Transaction): number => {
  const debit = Number(transaction.debit || 0);
  const credit = Number(transaction.credit || 0);
  const amount = debit > 0 ? debit : credit;
  return Math.abs(amount || 0);
};

const transactionSortKey = (transaction: Transaction): number => {
  const date = parseFlexibleDate(transaction.date);
  return date ? date.getTime() : Number.POSITIVE_INFINITY;
};

export function mergeTransactions(statements: StatementData[]): { merged: Transaction[]; duplicatesRemoved: number } {
  const withIndex = statements.flatMap((statement, statementIndex) =>
    statement.transactions.map((transaction, rowIndex) => ({
      transaction,
      statementIndex,
      rowIndex,
    }))
  );

  withIndex.sort((a, b) => {
    const dateDiff = transactionSortKey(a.transaction) - transactionSortKey(b.transaction);
    if (dateDiff !== 0) return dateDiff;
    if (a.statementIndex !== b.statementIndex) return a.statementIndex - b.statementIndex;
    return a.rowIndex - b.rowIndex;
  });

  const seen = new Set<string>();
  const merged: Transaction[] = [];
  let duplicatesRemoved = 0;

  for (const item of withIndex) {
    const key = [
      item.transaction.date?.trim() ?? '',
      transactionAmount(item.transaction).toFixed(2),
      normalizeDescription(item.transaction.description),
    ].join('|');

    if (seen.has(key)) {
      duplicatesRemoved += 1;
      continue;
    }

    seen.add(key);
    merged.push(item.transaction);
  }

  return { merged, duplicatesRemoved };
}

const computeStatementPeriod = (statements: StatementData[]): string | undefined => {
  const ranges = statements.map(getStatementDateRange);
  const starts = ranges.map((r) => r.start).filter((d): d is Date => !!d);
  const ends = ranges.map((r) => r.end).filter((d): d is Date => !!d);
  if (starts.length === 0 || ends.length === 0) return undefined;
  starts.sort((a, b) => a.getTime() - b.getTime());
  ends.sort((a, b) => a.getTime() - b.getTime());
  const start = starts[0];
  const end = ends[ends.length - 1];
  return `${formatMonthYear(start)} \u2013 ${formatMonthYear(end)}`;
};

const computeFinalBalance = (statements: StatementData[]): number | null => {
  const statementWithEnd = statements
    .map((statement, index) => {
      const range = getStatementDateRange(statement);
      return {
        statement,
        index,
        end: range.end ?? range.start ?? null,
      };
    })
    .sort((a, b) => {
      const aTime = a.end ? a.end.getTime() : -Infinity;
      const bTime = b.end ? b.end.getTime() : -Infinity;
      if (aTime !== bTime) return aTime - bTime;
      return a.index - b.index;
    });

  const last = statementWithEnd[statementWithEnd.length - 1]?.statement;
  if (!last) return null;

  const closing = last.bankMetadata?.closingBalance;
  if (typeof closing === 'number' && !Number.isNaN(closing)) return closing;

  const dates = last.transactions
    .map((t) => ({ t, date: parseFlexibleDate(t.date) }))
    .filter((d) => d.date)
    .sort((a, b) => (a.date!.getTime() - b.date!.getTime()));
  const lastBalance = dates[dates.length - 1]?.t.balance;
  if (typeof lastBalance === 'number' && !Number.isNaN(lastBalance)) return lastBalance;

  return null;
};

export function buildMergedStatement(statements: StatementData[]): MergeComputationResult {
  const { merged, duplicatesRemoved } = mergeTransactions(statements);
  const totalDebit = merged.reduce((sum, t) => sum + Math.abs(Number(t.debit) || 0), 0);
  const totalCredit = merged.reduce((sum, t) => sum + Math.abs(Number(t.credit) || 0), 0);
  const finalBalance = computeFinalBalance(statements);
  const statementPeriod = computeStatementPeriod(statements);

  const bankName = pickFirstNonEmpty(statements.map((s) => s.bankMetadata?.bankName));
  const accountNumber = pickFirstNonEmpty(statements.map((s) => s.bankMetadata?.accountNumber));
  const currency = pickFirstNonEmpty(statements.map((s) => s.bankMetadata?.currency));
  const accountHolder = pickFirstNonEmpty(statements.map((s) => s.bankMetadata?.accountHolder));
  const iban = pickFirstNonEmpty(statements.map((s) => s.bankMetadata?.iban));

  const bankInfo: BankInfo = {
    bankName,
    accountNumber,
    currency,
    accountHolder,
    iban: iban || undefined,
    statementPeriod,
    closingBalance: finalBalance ?? undefined,
  };

  return {
    mergedTransactions: merged,
    duplicatesRemoved,
    totals: {
      totalDebit,
      totalCredit,
      finalBalance,
    },
    statementPeriod,
    bankInfo,
  };
}
