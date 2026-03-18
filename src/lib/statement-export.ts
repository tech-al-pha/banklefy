import type { Analytics } from "@/components/uploadDemo/types";

export interface StatementExportTransaction {
  date: string;
  description: string;
  category?: string;
  debit?: number;
  credit?: number;
  balance?: number;
  refNumber?: string;
}

export interface StatementExportBankInfo {
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  currency?: string;
  iban?: string;
  statementPeriod?: string;
  openingBalance?: number;
  closingBalance?: number;
}

export interface StatementArchiveSummary {
  totalTransactions: number;
  totalCredits: number;
  totalDebits: number;
  netFlow: number;
}

export interface StatementArchive {
  format?: "banklefy-json-v1";
  generatedAt?: string;
  currency?: string;
  bankInfo?: StatementExportBankInfo;
  summary?: StatementArchiveSummary;
  transactions?: StatementExportTransaction[];
}

type JsonExportArgs = {
  transactions: StatementExportTransaction[];
  analytics?: Analytics | null;
  bankInfo?: StatementExportBankInfo | null;
  currencyCode?: string;
};

type Mt940ExportArgs = {
  transactions: StatementExportTransaction[];
  bankInfo?: StatementExportBankInfo | null;
  currencyCode?: string;
  statementReference?: string;
};

const toNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[, ]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const roundMoney = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

const sanitizeText = (value: unknown, fallback = "", maxLength = 120): string => {
  const text = typeof value === "string" ? value : "";
  const cleaned = text
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const normalized = cleaned || fallback;
  return normalized.length > maxLength ? normalized.slice(0, maxLength) : normalized;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const normalizeArchiveTransaction = (value: unknown): StatementExportTransaction | null => {
  if (!isRecord(value)) return null;
  const date = sanitizeText(value.date, "", 40);
  const description = sanitizeText(value.description, "", 250);
  if (!date || !description) return null;
  return {
    date,
    description,
    category: sanitizeText(value.category, "Other", 80),
    debit: roundMoney(toFiniteNumber(value.debit)),
    credit: roundMoney(toFiniteNumber(value.credit)),
    balance: roundMoney(toFiniteNumber(value.balance)),
    refNumber: sanitizeText(value.refNumber, "", 80),
  };
};

export const parseStatementArchive = (value: unknown): StatementArchive | null => {
  if (!value) return null;

  let source: unknown = value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      source = JSON.parse(trimmed);
    } catch {
      return null;
    }
  }

  if (!isRecord(source)) return null;

  const transactions = Array.isArray(source.transactions)
    ? source.transactions.map((item) => normalizeArchiveTransaction(item)).filter((item): item is StatementExportTransaction => Boolean(item))
    : [];

  const bankInfo = isRecord(source.bankInfo)
    ? {
        bankName: sanitizeText(source.bankInfo.bankName, "", 120) || undefined,
        accountNumber: sanitizeText(source.bankInfo.accountNumber, "", 80) || undefined,
        accountHolder: sanitizeText(source.bankInfo.accountHolder, "", 160) || undefined,
        currency: sanitizeText(source.bankInfo.currency, "", 12) || undefined,
        iban: sanitizeText(source.bankInfo.iban, "", 80) || undefined,
        statementPeriod: sanitizeText(source.bankInfo.statementPeriod, "", 80) || undefined,
        openingBalance: toFiniteNumber(source.bankInfo.openingBalance),
        closingBalance: toFiniteNumber(source.bankInfo.closingBalance),
      }
    : undefined;

  const summary = isRecord(source.summary)
    ? {
        totalTransactions: Math.max(0, Math.trunc(toFiniteNumber(source.summary.totalTransactions))),
        totalCredits: roundMoney(toFiniteNumber(source.summary.totalCredits)),
        totalDebits: roundMoney(toFiniteNumber(source.summary.totalDebits)),
        netFlow: roundMoney(toFiniteNumber(source.summary.netFlow)),
      }
    : undefined;

  if (transactions.length === 0 && !bankInfo && !summary) return null;

  return {
    format: source.format === "banklefy-json-v1" ? "banklefy-json-v1" : undefined,
    generatedAt: typeof source.generatedAt === "string" ? source.generatedAt : undefined,
    currency: sanitizeText(source.currency, "", 12) || undefined,
    bankInfo,
    summary,
    transactions,
  };
};

const parseDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;

  const raw = String(value).trim();
  if (!raw) return null;

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    return new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
  }

  const ymdSlash = raw.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (ymdSlash) {
    return new Date(Date.UTC(Number(ymdSlash[1]), Number(ymdSlash[2]) - 1, Number(ymdSlash[3])));
  }

  const dmy = raw.match(/^(\d{2})[./-](\d{2})[./-](\d{4})$/);
  if (dmy) {
    return new Date(Date.UTC(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1])));
  }

  const parsed = new Date(raw);
  if (!Number.isFinite(parsed.getTime())) return null;
  return parsed;
};

const formatYymmdd = (date: Date): string => {
  const year = String(date.getUTCFullYear()).slice(-2);
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
};

const formatMtAmount = (value: number): string => {
  return Math.abs(roundMoney(value)).toFixed(2).replace(".", ",");
};

const normalizeCurrency = (value?: string | null): string => {
  const cleaned = (value ?? "").trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(cleaned)) return cleaned;
  return "INR";
};

const splitByLength = (value: string, size: number): string[] => {
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += size) {
    chunks.push(value.slice(i, i + size));
  }
  return chunks.length > 0 ? chunks : [""];
};

const sortChronologically = (transactions: StatementExportTransaction[]) => {
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

const inferOpeningBalance = (
  firstTransaction: StatementExportTransaction | undefined,
  bankInfo?: StatementExportBankInfo | null,
): number => {
  if (typeof bankInfo?.openingBalance === "number" && Number.isFinite(bankInfo.openingBalance)) {
    return roundMoney(bankInfo.openingBalance);
  }
  if (!firstTransaction) return 0;
  const firstBalance = toNumber(firstTransaction.balance);
  return roundMoney(firstBalance - toNumber(firstTransaction.credit) + toNumber(firstTransaction.debit));
};

const inferClosingBalance = (
  lastTransaction: StatementExportTransaction | undefined,
  bankInfo?: StatementExportBankInfo | null,
): number => {
  if (typeof bankInfo?.closingBalance === "number" && Number.isFinite(bankInfo.closingBalance)) {
    return roundMoney(bankInfo.closingBalance);
  }
  return roundMoney(toNumber(lastTransaction?.balance));
};

const csvEscape = (value: unknown): string => {
  const str = String(value ?? "");
  if (str.includes('"') || str.includes(",") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const formatCsvAmount = (value: unknown): string => {
  const amount = roundMoney(toNumber(value));
  if (!Number.isFinite(amount) || amount === 0) return "";
  return amount.toFixed(2);
};

export const buildStatementCsv = (
  archiveOrTransactions: StatementArchive | StatementExportTransaction[],
): string => {
  const transactions = Array.isArray(archiveOrTransactions)
    ? archiveOrTransactions
    : archiveOrTransactions.transactions ?? [];
  const header = ["Date", "Description", "Category", "Debit", "Credit", "Balance", "Reference"];
  const rows = transactions.map((transaction) => ([
    transaction.date || "",
    transaction.description || "",
    transaction.category || "",
    formatCsvAmount(transaction.debit),
    formatCsvAmount(transaction.credit),
    formatCsvAmount(transaction.balance),
    transaction.refNumber || "",
  ]));

  const totalDebit = roundMoney(transactions.reduce((sum, transaction) => sum + toNumber(transaction.debit), 0));
  const totalCredit = roundMoney(transactions.reduce((sum, transaction) => sum + toNumber(transaction.credit), 0));
  const totalRow = ["", "TOTAL", "", totalDebit.toFixed(2), totalCredit.toFixed(2), "", ""];

  return [header, ...rows, totalRow].map((row) => row.map(csvEscape).join(",")).join("\n");
};

export const buildStatementJson = ({
  transactions,
  analytics,
  bankInfo,
  currencyCode,
}: JsonExportArgs): string => {
  const normalizedTransactions = transactions.map((transaction) => ({
    date: sanitizeText(transaction.date, "", 40),
    description: sanitizeText(transaction.description, "", 250),
    category: sanitizeText(transaction.category, "Other", 80),
    debit: roundMoney(toNumber(transaction.debit)),
    credit: roundMoney(toNumber(transaction.credit)),
    balance: roundMoney(toNumber(transaction.balance)),
    refNumber: sanitizeText(transaction.refNumber, "", 80),
  }));

  const totalCredits = analytics ? roundMoney(analytics.totalCredits) : roundMoney(
    normalizedTransactions.reduce((sum, transaction) => sum + transaction.credit, 0),
  );
  const totalDebits = analytics ? roundMoney(analytics.totalDebits) : roundMoney(
    normalizedTransactions.reduce((sum, transaction) => sum + transaction.debit, 0),
  );
  const netFlow = analytics ? roundMoney(analytics.netFlow) : roundMoney(totalCredits - totalDebits);

  const payload = {
    format: "banklefy-json-v1",
    generatedAt: new Date().toISOString(),
    currency: normalizeCurrency(bankInfo?.currency || currencyCode),
    bankInfo: {
      bankName: sanitizeText(bankInfo?.bankName, "", 120),
      accountNumber: sanitizeText(bankInfo?.accountNumber, "", 80),
      accountHolder: sanitizeText(bankInfo?.accountHolder, "", 160),
      iban: sanitizeText(bankInfo?.iban, "", 80),
      statementPeriod: sanitizeText(bankInfo?.statementPeriod, "", 80),
      openingBalance: roundMoney(toNumber(bankInfo?.openingBalance)),
      closingBalance: roundMoney(toNumber(bankInfo?.closingBalance)),
    },
    summary: {
      totalTransactions: normalizedTransactions.length,
      totalCredits,
      totalDebits,
      netFlow,
    },
    transactions: normalizedTransactions,
  };

  return JSON.stringify(payload, null, 2);
};

export const buildMt940 = ({
  transactions,
  bankInfo,
  currencyCode,
  statementReference,
}: Mt940ExportArgs): string => {
  const ordered = sortChronologically(transactions);
  const orderedTransactions = ordered.map((item) => item.transaction);
  const first = orderedTransactions[0];
  const last = orderedTransactions[orderedTransactions.length - 1];

  const fallbackDate = new Date();
  const openingDate = ordered[0]?.parsedDate ?? fallbackDate;
  const closingDate = ordered[ordered.length - 1]?.parsedDate ?? openingDate;

  const openingBalance = inferOpeningBalance(first, bankInfo);
  const closingBalance = inferClosingBalance(last, bankInfo);

  const openingMark = openingBalance >= 0 ? "C" : "D";
  const closingMark = closingBalance >= 0 ? "C" : "D";

  const accountId = sanitizeText(bankInfo?.iban || bankInfo?.accountNumber, "UNKNOWN", 35);
  const currency = normalizeCurrency(bankInfo?.currency || currencyCode);
  const reference = sanitizeText(statementReference, `BKLF${Date.now()}`, 24)
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, 16) || "BKLFREF00000001";

  const lines: string[] = [
    `:20:${reference}`,
    `:25:${accountId}`,
    ":28C:00001/001",
    `:60F:${openingMark}${formatYymmdd(openingDate)}${currency}${formatMtAmount(openingBalance)}`,
  ];

  for (const transaction of orderedTransactions) {
    const debit = toNumber(transaction.debit);
    const credit = toNumber(transaction.credit);
    const amount = credit > 0 ? credit : debit;
    if (amount <= 0) continue;

    const date = parseDate(transaction.date) ?? closingDate;
    const direction = credit > 0 ? "C" : "D";
    const refNumber = sanitizeText(transaction.refNumber, "", 30).replace(/[^A-Za-z0-9]/g, "").slice(0, 16);
    const entryRef = refNumber ? `//${refNumber}` : "";

    lines.push(`:61:${formatYymmdd(date)}${direction}${formatMtAmount(amount)}NTRF${entryRef}`);

    const description = sanitizeText(transaction.description, "BANK TRANSACTION", 130);
    for (const chunk of splitByLength(description, 65)) {
      lines.push(`:86:${chunk}`);
    }
  }

  lines.push(
    `:62F:${closingMark}${formatYymmdd(closingDate)}${currency}${formatMtAmount(closingBalance)}`,
  );

  return `${lines.join("\r\n")}\r\n`;
};

export const downloadTextFile = (content: string, fileName: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};
