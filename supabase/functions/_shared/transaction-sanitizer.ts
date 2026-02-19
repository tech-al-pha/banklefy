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

const CREDIT_HINTS = [
  ' cr ',
  'credit',
  'deposit',
  'salary',
  'received',
  'inward',
  'refund',
  'reversal',
  'interest',
  'cashback',
  'transfer in',
];

const DEBIT_HINTS = [
  ' dr ',
  'debit',
  'withdraw',
  'atm',
  'charges',
  'fee',
  'commission',
  'purchase',
  'pos',
  'emi',
  'payment',
  'transfer out',
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

type BalanceDirection = 'forward' | 'reverse';

type SanitizerOptions = {
  openingBalance?: number;
  closingBalance?: number;
};

const hasFiniteBalance = (transaction: Transaction): boolean =>
  Number.isFinite(Number(transaction.balance));

const normalizeSignedAmounts = (transaction: Transaction): Transaction => {
  let debit = Number(transaction.debit || 0);
  let credit = Number(transaction.credit || 0);

  if (!Number.isFinite(debit)) debit = 0;
  if (!Number.isFinite(credit)) credit = 0;

  // OCR occasionally emits negative values on the wrong side.
  if (debit < 0 && credit <= 0) {
    credit = Math.abs(debit);
    debit = 0;
  } else if (credit < 0 && debit <= 0) {
    debit = Math.abs(credit);
    credit = 0;
  } else {
    debit = Math.abs(debit);
    credit = Math.abs(credit);
  }

  return {
    ...transaction,
    debit,
    credit,
  };
};

const getForwardDiffMinor = (
  transactions: Transaction[],
  index: number,
  debit: number,
  credit: number,
): number => {
  if (index <= 0) return Number.POSITIVE_INFINITY;
  const prev = transactions[index - 1];
  const current = transactions[index];
  if (!hasFiniteBalance(prev) || !hasFiniteBalance(current)) return Number.POSITIVE_INFINITY;
  const expectedMinor = toMinor(prev.balance) + toMinor(credit) - toMinor(debit);
  const actualMinor = toMinor(current.balance);
  return Math.abs(expectedMinor - actualMinor);
};

const getReverseDiffMinor = (
  transactions: Transaction[],
  index: number,
  debit: number,
  credit: number,
): number => {
  if (index >= transactions.length - 1) return Number.POSITIVE_INFINITY;
  const next = transactions[index + 1];
  const current = transactions[index];
  if (!hasFiniteBalance(next) || !hasFiniteBalance(current)) return Number.POSITIVE_INFINITY;
  // Reverse statements: current row balance should reconcile against next row.
  const expectedMinor = toMinor(next.balance) + toMinor(credit) - toMinor(debit);
  const actualMinor = toMinor(current.balance);
  return Math.abs(expectedMinor - actualMinor);
};

const scoreDirection = (transactions: Transaction[], direction: BalanceDirection): { score: number; samples: number } => {
  let score = 0;
  let samples = 0;

  const start = direction === 'forward' ? 1 : 0;
  const endExclusive = direction === 'forward' ? transactions.length : transactions.length - 1;

  for (let i = start; i < endExclusive; i++) {
    const diff =
      direction === 'forward'
        ? getForwardDiffMinor(transactions, i, transactions[i].debit || 0, transactions[i].credit || 0)
        : getReverseDiffMinor(transactions, i, transactions[i].debit || 0, transactions[i].credit || 0);
    if (!Number.isFinite(diff)) continue;
    score += diff;
    samples += 1;
  }

  return { score, samples };
};

const parseDateToTs = (value?: string): number | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const dt = new Date(`${trimmed}T00:00:00Z`);
    const ts = dt.getTime();
    return Number.isFinite(ts) ? ts : null;
  }

  const m = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m) {
    const [, dd, mm, yyRaw] = m;
    const yy = yyRaw.length === 2 ? `20${yyRaw}` : yyRaw;
    const dt = new Date(`${yy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T00:00:00Z`);
    const ts = dt.getTime();
    return Number.isFinite(ts) ? ts : null;
  }

  const ts = Date.parse(trimmed);
  return Number.isFinite(ts) ? ts : null;
};

const inferDirectionFromDates = (transactions: Transaction[]): BalanceDirection | null => {
  let asc = 0;
  let desc = 0;

  for (let i = 1; i < transactions.length; i++) {
    const prev = parseDateToTs(transactions[i - 1].date);
    const curr = parseDateToTs(transactions[i].date);
    if (prev == null || curr == null || prev === curr) continue;
    if (curr > prev) asc += 1;
    if (curr < prev) desc += 1;
  }

  if (asc >= 2 && asc >= desc * 2) return 'forward';
  if (desc >= 2 && desc >= asc * 2) return 'reverse';
  return null;
};

const inferBalanceDirection = (transactions: Transaction[]): BalanceDirection => {
  const dateDirection = inferDirectionFromDates(transactions);
  if (dateDirection) return dateDirection;

  const forward = scoreDirection(transactions, 'forward');
  const reverse = scoreDirection(transactions, 'reverse');

  if (forward.samples < 2 && reverse.samples < 2) return 'forward';
  if (forward.samples === 0) return 'reverse';
  if (reverse.samples === 0) return 'forward';
  return reverse.score < forward.score ? 'reverse' : 'forward';
};

const shouldSwapByHint = (transaction: Transaction): boolean => {
  const debit = Number(transaction.debit || 0);
  const credit = Number(transaction.credit || 0);
  if ((debit > 0 && credit > 0) || (debit === 0 && credit === 0)) return false;

  const desc = ` ${cleanText(transaction.description || '')} `;
  const hasCreditHint = CREDIT_HINTS.some((hint) => desc.includes(hint));
  const hasDebitHint = DEBIT_HINTS.some((hint) => desc.includes(hint));

  if (hasCreditHint && !hasDebitHint && debit > 0 && credit === 0) return true;
  if (hasDebitHint && !hasCreditHint && credit > 0 && debit === 0) return true;
  return false;
};

const trySwapByBalance = (
  transactions: Transaction[],
  index: number,
  direction: BalanceDirection,
): boolean => {
  const transaction = transactions[index];
  const debit = Number(transaction.debit || 0);
  const credit = Number(transaction.credit || 0);
  if ((debit > 0 && credit > 0) || (debit === 0 && credit === 0)) return false;

  const asIsDiff =
    direction === 'forward'
      ? getForwardDiffMinor(transactions, index, debit, credit)
      : getReverseDiffMinor(transactions, index, debit, credit);
  const swappedDiff =
    direction === 'forward'
      ? getForwardDiffMinor(transactions, index, credit, debit)
      : getReverseDiffMinor(transactions, index, credit, debit);

  if (!Number.isFinite(asIsDiff) || !Number.isFinite(swappedDiff)) return false;

  const improvement = asIsDiff - swappedDiff;
  const amountMinor = Math.max(toMinor(debit), toMinor(credit));
  const residualLimit = Math.max(2, Math.round(amountMinor * 0.002)); // <= 0.2% residual or 0.02 absolute.
  const clearlyBetter = improvement >= 2 && swappedDiff + 1 < asIsDiff;
  const residualAcceptable = swappedDiff <= residualLimit || swappedDiff <= Math.round(asIsDiff * 0.2);

  if (!clearlyBetter || !residualAcceptable) return false;

  transactions[index] = {
    ...transaction,
    debit: credit,
    credit: debit,
  };
  return true;
};

const correctAmountDirection = (transactions: Transaction[]): Transaction[] => {
  if (transactions.length <= 1) {
    return transactions.map((t) => normalizeSignedAmounts(t));
  }

  const corrected = transactions.map((transaction) => normalizeSignedAmounts(transaction));
  const direction = inferBalanceDirection(corrected);

  const start = direction === 'forward' ? 1 : 0;
  const endExclusive = direction === 'forward' ? corrected.length : corrected.length - 1;

  // Run twice so earlier swaps can improve neighboring rows.
  for (let pass = 0; pass < 2; pass++) {
    for (let index = start; index < endExclusive; index++) {
      trySwapByBalance(corrected, index, direction);
    }
  }

  // Edge row cannot always be balance-validated; use narration hints only there.
  const edgeIndex = direction === 'forward' ? 0 : corrected.length - 1;
  if (edgeIndex >= 0 && edgeIndex < corrected.length && shouldSwapByHint(corrected[edgeIndex])) {
    const edge = corrected[edgeIndex];
    corrected[edgeIndex] = { ...edge, debit: edge.credit || 0, credit: edge.debit || 0 };
  }

  return corrected;
};

const trySwapByOpeningBalance = (
  transactions: Transaction[],
  edgeIndex: number,
  openingBalance: number,
): boolean => {
  if (!Number.isFinite(openingBalance)) return false;
  if (edgeIndex < 0 || edgeIndex >= transactions.length) return false;

  const edge = transactions[edgeIndex];
  const debit = Number(edge.debit || 0);
  const credit = Number(edge.credit || 0);
  const actual = toMinor(edge.balance || 0);
  if ((debit > 0 && credit > 0) || (debit === 0 && credit === 0) || !Number.isFinite(actual)) return false;

  const asIsExpected = toMinor(openingBalance) + toMinor(credit) - toMinor(debit);
  const swappedExpected = toMinor(openingBalance) + toMinor(debit) - toMinor(credit);
  const asIsDiff = Math.abs(asIsExpected - actual);
  const swappedDiff = Math.abs(swappedExpected - actual);

  const improvement = asIsDiff - swappedDiff;
  const amountMinor = Math.max(toMinor(debit), toMinor(credit));
  const residualLimit = Math.max(2, Math.round(amountMinor * 0.002));
  const clearlyBetter = improvement >= 2 && swappedDiff + 1 < asIsDiff;
  const residualAcceptable = swappedDiff <= residualLimit || swappedDiff <= Math.round(asIsDiff * 0.2);

  if (!clearlyBetter || !residualAcceptable) return false;

  transactions[edgeIndex] = { ...edge, debit: credit, credit: debit };
  return true;
};

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

export const sanitizeTransactions = (transactions: Transaction[], options?: SanitizerOptions): Transaction[] => {
  const filtered = transactions.filter((t) => {
    if (!isDateLike(t.date)) return false;
    if (isNonTransactionRow(t)) return false;
    const debit = Number(t.debit || 0);
    const credit = Number(t.credit || 0);
    if (debit === 0 && credit === 0) return false;
    return true;
  });
  const directionCorrected = correctAmountDirection(filtered);
  const direction = inferBalanceDirection(directionCorrected);

  // Resolve edge-row ambiguity using opening balance when available.
  if (Number.isFinite(Number(options?.openingBalance))) {
    const edgeIndex = direction === 'forward' ? 0 : directionCorrected.length - 1;
    trySwapByOpeningBalance(directionCorrected, edgeIndex, Number(options?.openingBalance));
  }

  // Remove OCR/AI duplicate rows that represent the same movement and balance.
  const deduped: Transaction[] = [];
  const indexByKey = new Map<string, number>();

  for (const transaction of directionCorrected) {
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
