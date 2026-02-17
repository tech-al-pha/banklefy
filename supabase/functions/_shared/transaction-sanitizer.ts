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

const toMinor = (value: number | undefined): number => Math.round((Number(value) || 0) * 100);

const transactionKey = (transaction: Transaction): string => [
  String(transaction.date || '').trim(),
  toMinor(transaction.debit),
  toMinor(transaction.credit),
  toMinor(transaction.balance),
].join('|');

const cleanText = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const scoreTransactionQuality = (transaction: Transaction): number => {
  const description = (transaction.description || '').trim();
  const ref = (transaction.refNumber || '').trim();

  let score = 0;
  score += Math.min(description.length, 80);
  if (ref) score += Math.min(ref.length, 24) + 6;
  if (/[A-Za-z]/.test(ref) && /\d/.test(ref)) score += 10;
  if ((ref.match(/\s/g) || []).length > 2) score -= 8;
  if (description.split(/\s+/).length <= 4) score -= 6;
  return score;
};

const chooseBetterTransaction = (first: Transaction, second: Transaction): Transaction => {
  const firstScore = scoreTransactionQuality(first);
  const secondScore = scoreTransactionQuality(second);
  if (secondScore > firstScore) return second;
  if (firstScore > secondScore) return first;

  const firstDesc = cleanText(first.description || '');
  const secondDesc = cleanText(second.description || '');
  if (secondDesc.length > firstDesc.length && secondDesc.includes(firstDesc)) return second;
  if (firstDesc.length > secondDesc.length && firstDesc.includes(secondDesc)) return first;

  // Stable fallback keeps the first-seen record.
  return first;
};

export const sanitizeTransactions = (transactions: Transaction[]): Transaction[] => {
  const filtered = transactions.filter((t) => {
    if (!isDateLike(t.date)) return false;
    if (isNonTransactionRow(t)) return false;
    const debit = Number(t.debit || 0);
    const credit = Number(t.credit || 0);
    if (debit === 0 && credit === 0) return false;
    return true;
  });

  // Remove OCR/AI duplicate rows that represent the same movement and balance.
  const deduped: Transaction[] = [];
  const indexByKey = new Map<string, number>();

  for (const transaction of filtered) {
    const key = transactionKey(transaction);
    const existingIndex = indexByKey.get(key);

    if (existingIndex === undefined) {
      indexByKey.set(key, deduped.length);
      deduped.push(transaction);
      continue;
    }

    const existing = deduped[existingIndex];
    deduped[existingIndex] = chooseBetterTransaction(existing, transaction);
  }

  return deduped;
};
