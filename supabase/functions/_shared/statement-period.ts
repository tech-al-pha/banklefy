import type { Transaction } from './financial-engine.ts';
import { parseStatementDateToTimestamp } from '../../../src/lib/date-parsing.ts';

const MONTH_LOOKUP: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const normalizeText = (value: string): string =>
  value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

const parseYearToken = (value: string): number => {
  if (value.length !== 2) return Number(value);
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return Number(`20${value}`);
  return parsed < 50 ? Number(`20${value}`) : Number(`19${value}`);
};

const parseStatementDate = (value: string): Date | null => {
  const clean = normalizeText(value);
  if (!clean) return null;

  const iso = clean.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (iso) {
    const dt = new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  const dmy = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dmy) {
    const year = parseYearToken(dmy[3]);
    const dt = new Date(Date.UTC(year, Number(dmy[2]) - 1, Number(dmy[1])));
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  const dayMonthYear = clean.match(/^(\d{1,2})\s+([A-Za-z]{3,9}),?\s+(\d{2,4})$/);
  if (dayMonthYear) {
    const month = MONTH_LOOKUP[dayMonthYear[2].toLowerCase()];
    if (month) {
      const year = parseYearToken(dayMonthYear[3]);
      const dt = new Date(Date.UTC(year, month - 1, Number(dayMonthYear[1])));
      return Number.isNaN(dt.getTime()) ? null : dt;
    }
  }

  const monthDayYear = clean.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{2,4})$/);
  if (monthDayYear) {
    const month = MONTH_LOOKUP[monthDayYear[1].toLowerCase()];
    if (month) {
      const year = parseYearToken(monthDayYear[3]);
      const dt = new Date(Date.UTC(year, month - 1, Number(monthDayYear[2])));
      return Number.isNaN(dt.getTime()) ? null : dt;
    }
  }

  const timestamp = parseStatementDateToTimestamp(clean);
  return timestamp == null ? null : new Date(timestamp);
};

const formatTransactionDate = (value: string): string => {
  const clean = normalizeText(value);
  const iso = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    return `${iso[3]}-${iso[2]}-${iso[1]}`;
  }
  return clean;
};

const getTransactionBounds = (transactions: ReadonlyArray<Pick<Transaction, 'date'>>): {
  start?: Date;
  end?: Date;
  startLabel?: string;
  endLabel?: string;
} => {
  const dated = transactions
    .map((transaction) => {
      const label = normalizeText(String(transaction.date ?? ''));
      return {
        label,
        date: parseStatementDate(label),
      };
    })
    .filter((entry): entry is { label: string; date: Date } => !!entry.date && !!entry.label);

  if (dated.length === 0) return {};

  dated.sort((a, b) => a.date.getTime() - b.date.getTime());
  return {
    start: dated[0].date,
    end: dated[dated.length - 1].date,
    startLabel: formatTransactionDate(dated[0].label),
    endLabel: formatTransactionDate(dated[dated.length - 1].label),
  };
};

const parseStatementPeriodRange = (period?: string): { start?: Date; end?: Date } => {
  const clean = normalizeText(period ?? '');
  if (!clean) return {};

  const range = clean.match(/^(.+?)\s+(?:to|-)\s+(.+)$/i);
  if (!range) return {};

  const start = parseStatementDate(range[1]);
  const end = parseStatementDate(range[2]);
  return {
    start: start ?? undefined,
    end: end ?? undefined,
  };
};

export const chooseStatementPeriodLabel = (
  statementPeriod: string | undefined,
  transactions: ReadonlyArray<Pick<Transaction, 'date'>>,
): string | undefined => {
  const current = normalizeText(statementPeriod ?? '');
  const { start, end, startLabel, endLabel } = getTransactionBounds(transactions);
  if (!start || !end || !startLabel || !endLabel) {
    return current || undefined;
  }

  const derived = `${startLabel} - ${endLabel}`;
  if (!current) return derived;

  const currentRange = parseStatementPeriodRange(current);
  if (!currentRange.start || !currentRange.end) {
    return derived;
  }

  if (currentRange.start.getTime() <= start.getTime() && currentRange.end.getTime() >= end.getTime()) {
    return current;
  }

  return derived;
};
