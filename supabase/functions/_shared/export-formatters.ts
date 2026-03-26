import type { Transaction } from './financial-engine.ts';
import type { BankMetadata } from './ocr-processor.ts';
import { fromMinorUnits, sumMinorUnits, toMinorUnits } from './money.ts';
import { parseStatementDateToIso } from './date-parsing.ts';

type ExportSummary = {
  totalCredits?: number;
  totalDebits?: number;
  netFlow?: number;
};

type JsonExportArgs = {
  transactions: Transaction[];
  bankMetadata?: BankMetadata;
  summary?: ExportSummary;
};

type Mt940ExportArgs = {
  transactions: Transaction[];
  bankMetadata?: BankMetadata;
  statementReference?: string;
};

const cleanText = (value: unknown, fallback = '', maxLength = 130): string => {
  const source = typeof value === 'string' ? value : '';
  const normalized = source
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const output = normalized || fallback;
  return output.length > maxLength ? output.slice(0, maxLength) : output;
};

const toFiniteNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[, ]/g, '').trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const money = (value: number): number => fromMinorUnits(toMinorUnits(value));

const normalizeCurrency = (value?: string): string => {
  const trimmed = (value || '').trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(trimmed)) return trimmed;
  return 'INR';
};

const parseDate = (value: unknown): Date | null => {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  const iso = parseStatementDateToIso(value);
  if (!iso) return null;
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

const formatYymmdd = (date: Date): string => {
  const year = String(date.getUTCFullYear()).slice(-2);
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

const formatMtAmount = (value: number): string => {
  return Math.abs(money(value)).toFixed(2).replace('.', ',');
};

const splitByLength = (value: string, length: number): string[] => {
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += length) {
    chunks.push(value.slice(i, i + length));
  }
  return chunks.length > 0 ? chunks : [''];
};

const sortChronologically = (transactions: Transaction[]) => {
  return transactions
    .map((transaction, index) => ({
      transaction,
      index,
      parsedDate: parseDate(transaction.date),
    }))
    .sort((a, b) => {
      if (a.parsedDate && b.parsedDate) {
        const diff = a.parsedDate.getTime() - b.parsedDate.getTime();
        if (diff !== 0) return diff;
      } else if (a.parsedDate) {
        return -1;
      } else if (b.parsedDate) {
        return 1;
      }
      return a.index - b.index;
    });
};

const inferOpeningBalance = (first: Transaction | undefined, bankMetadata?: BankMetadata): number => {
  if (typeof bankMetadata?.openingBalance === 'number' && Number.isFinite(bankMetadata.openingBalance)) {
    return money(bankMetadata.openingBalance);
  }
  if (!first) return 0;
  const balance = toFiniteNumber(first.balance);
  const credit = toFiniteNumber(first.credit);
  const debit = toFiniteNumber(first.debit);
  return money(balance - credit + debit);
};

const inferClosingBalance = (last: Transaction | undefined, bankMetadata?: BankMetadata): number => {
  if (typeof bankMetadata?.closingBalance === 'number' && Number.isFinite(bankMetadata.closingBalance)) {
    return money(bankMetadata.closingBalance);
  }
  return money(toFiniteNumber(last?.balance));
};

export const buildJsonExport = ({ transactions, bankMetadata, summary }: JsonExportArgs): string => {
  const totalCredits = summary?.totalCredits ?? fromMinorUnits(sumMinorUnits(transactions.map((t) => t.credit || 0)));
  const totalDebits = summary?.totalDebits ?? fromMinorUnits(sumMinorUnits(transactions.map((t) => t.debit || 0)));
  const netFlow = summary?.netFlow ?? money(totalCredits - totalDebits);

  const payload = {
    format: 'banklefy-json-v1',
    generatedAt: new Date().toISOString(),
    currency: normalizeCurrency(bankMetadata?.currency),
    bankInfo: {
      bankName: cleanText(bankMetadata?.bankName, '', 120),
      accountNumber: cleanText(bankMetadata?.accountNumber, '', 80),
      accountHolder: cleanText(bankMetadata?.accountHolder, '', 160),
      iban: cleanText(bankMetadata?.iban, '', 80),
      statementPeriod: cleanText(bankMetadata?.statementPeriod, '', 80),
      openingBalance: money(toFiniteNumber(bankMetadata?.openingBalance)),
      closingBalance: money(toFiniteNumber(bankMetadata?.closingBalance)),
    },
    summary: {
      totalTransactions: transactions.length,
      totalCredits: money(totalCredits),
      totalDebits: money(totalDebits),
      netFlow: money(netFlow),
    },
    transactions: transactions.map((transaction) => ({
      date: cleanText(transaction.date, '', 40),
      description: cleanText(transaction.description, '', 250),
      category: cleanText(transaction.category, 'Other', 80),
      debit: money(toFiniteNumber(transaction.debit)),
      credit: money(toFiniteNumber(transaction.credit)),
      balance: money(toFiniteNumber(transaction.balance)),
      refNumber: cleanText(transaction.refNumber, '', 80),
    })),
  };

  return JSON.stringify(payload, null, 2);
};

export const buildMt940Export = ({ transactions, bankMetadata, statementReference }: Mt940ExportArgs): string => {
  const ordered = sortChronologically(transactions);
  const orderedTransactions = ordered.map((item) => item.transaction);

  const first = orderedTransactions[0];
  const last = orderedTransactions[orderedTransactions.length - 1];

  const fallbackDate = new Date();
  const openingDate = ordered[0]?.parsedDate ?? fallbackDate;
  const closingDate = ordered[ordered.length - 1]?.parsedDate ?? openingDate;

  const openingBalance = inferOpeningBalance(first, bankMetadata);
  const closingBalance = inferClosingBalance(last, bankMetadata);
  const openingMark = openingBalance >= 0 ? 'C' : 'D';
  const closingMark = closingBalance >= 0 ? 'C' : 'D';

  const accountId = cleanText(bankMetadata?.iban || bankMetadata?.accountNumber, 'UNKNOWN', 35);
  const currency = normalizeCurrency(bankMetadata?.currency);
  const reference = cleanText(statementReference, `BKLF${Date.now()}`, 24)
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, 16) || 'BKLFREF00000001';

  const lines: string[] = [
    `:20:${reference}`,
    `:25:${accountId}`,
    ':28C:00001/001',
    `:60F:${openingMark}${formatYymmdd(openingDate)}${currency}${formatMtAmount(openingBalance)}`,
  ];

  for (const transaction of orderedTransactions) {
    const debit = toFiniteNumber(transaction.debit);
    const credit = toFiniteNumber(transaction.credit);
    const amount = credit > 0 ? credit : debit;
    if (amount <= 0) continue;

    const parsedDate = parseDate(transaction.date) ?? closingDate;
    const direction = credit > 0 ? 'C' : 'D';
    const refNumber = cleanText(transaction.refNumber, '', 30).replace(/[^A-Za-z0-9]/g, '').slice(0, 16);
    const referenceSuffix = refNumber ? `//${refNumber}` : '';

    lines.push(`:61:${formatYymmdd(parsedDate)}${direction}${formatMtAmount(amount)}NTRF${referenceSuffix}`);

    const narrative = cleanText(transaction.description, 'BANK TRANSACTION', 130);
    for (const chunk of splitByLength(narrative, 65)) {
      lines.push(`:86:${chunk}`);
    }
  }

  lines.push(
    `:62F:${closingMark}${formatYymmdd(closingDate)}${currency}${formatMtAmount(closingBalance)}`,
  );

  return `${lines.join('\r\n')}\r\n`;
};
