import type { Transaction } from './financial-engine.ts';

const NON_TRANSACTION_KEYWORDS = [
  'opening balance',
  'closing balance',
  'balance brought forward',
  'balance b/f',
  'balance carried forward',
  'beginning balance',
  'ending balance',
  'statement total',
  'total',
  'summary',
  'page',
  'subtotal',
  'grand total',
];

const isDateLike = (value?: string): boolean => {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return true;
  if (/\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(trimmed)) return true;
  if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\b/i.test(trimmed)) return true;
  return false;
};

const isNonTransactionRow = (transaction: Transaction): boolean => {
  const desc = (transaction.description || '').toLowerCase().trim();
  const hasKeyword = NON_TRANSACTION_KEYWORDS.some((k) => desc.includes(k));
  const debit = Number(transaction.debit || 0);
  const credit = Number(transaction.credit || 0);
  return hasKeyword && debit === 0 && credit === 0;
};

export const sanitizeTransactions = (transactions: Transaction[]): Transaction[] => {
  return transactions.filter((t) => {
    if (!isDateLike(t.date)) return false;
    if (isNonTransactionRow(t)) return false;
    return true;
  });
};
