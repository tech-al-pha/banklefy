import {
  buildQuickBooksIif,
  buildQuickBooksCsv,
  buildMt940,
  buildStatementCsv,
  buildStatementJson,
  buildXeroCsv,
  buildZohoCsv,
  downloadTextFile,
  parseStatementArchive,
} from "@/lib/statement-export";
import type { Transaction, Analytics, BankInfo } from "./types";

type ToastFn = (args: { title: string; description?: string; variant?: "destructive" }) => void;

type ErrorFormatter = (error: unknown, fallback: string) => string;

type ExportContext = {
  transactions: Transaction[];
  analytics: Analytics | null;
  bankInfo?: BankInfo | null;
  currencyCode: string;
  jsonData?: string | null;
  mt940Data?: string | null;
  exportBaseName?: string;
  toast: ToastFn;
  getErrorMessage: ErrorFormatter;
  sumMoney: (values: number[]) => number;
  truncateDecimals: (value: number, decimals?: number) => number;
};

const getExportBaseName = (value?: string): string => {
  const source = (value ?? '').trim();
  const noExtension = source.replace(/\.[^/.\\]+$/, '');
  const safe = noExtension
    .replace(/[<>:"/\\|?*]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\.+$/, '')
    .trim();
  return safe || 'bank-statement';
};

const resolveCanonicalStatementData = ({
  transactions,
  bankInfo,
  currencyCode,
  jsonData,
}: Pick<ExportContext, "transactions" | "bankInfo" | "currencyCode" | "jsonData">) => {
  const archive = parseStatementArchive(jsonData);
  if (!archive) {
    return {
      transactions,
      bankInfo: bankInfo ?? undefined,
      currencyCode,
    };
  }

  return {
    transactions: archive.transactions && archive.transactions.length > 0 ? archive.transactions : transactions,
    bankInfo: archive.bankInfo ?? bankInfo ?? undefined,
    currencyCode: archive.currency ?? archive.bankInfo?.currency ?? currencyCode,
  };
};

export const exportAsCSV = ({ transactions, exportBaseName, toast }: ExportContext) => {
  if (transactions.length === 0) return;

  const csvContent = buildStatementCsv(transactions);
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${getExportBaseName(exportBaseName)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  toast({
    title: 'CSV Downloaded',
    description: 'Your transaction data has been exported to CSV.',
  });
};

export const exportAsQuickBooksCsv = async ({
  transactions,
  bankInfo,
  currencyCode,
  jsonData,
  exportBaseName,
  toast,
  getErrorMessage,
}: ExportContext) => {
  if (transactions.length === 0) return;

  try {
    const statementData = resolveCanonicalStatementData({ transactions, bankInfo, currencyCode, jsonData });

    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const isDesktop = /\b(Windows|Macintosh|Linux)\b/i.test(userAgent) && !/\b(Mobile|Android|iPhone|iPad)\b/i.test(userAgent);

    if (isDesktop) {
      const content = buildQuickBooksIif(statementData);
      downloadTextFile(
        content,
        `${getExportBaseName(exportBaseName)}.iif`,
        'text/plain;charset=utf-8',
      );
    } else {
      const content = buildQuickBooksCsv(statementData);
      downloadTextFile(
        content,
        `${getExportBaseName(exportBaseName)}-quickbooks.csv`,
        'text/csv;charset=utf-8',
      );
    }
    toast({
      title: 'QuickBooks Download Ready',
      description: 'QuickBooks Desktop users: Download IIF format. QuickBooks Online users: Download CSV format. After import, please review and assign correct account codes.',
    });
  } catch (error: unknown) {
    if (import.meta.env.DEV) { console.error('QuickBooks export error:', error); }
    toast({
      variant: 'destructive',
      title: 'QuickBooks export failed',
      description: getErrorMessage(error, 'Failed to export QuickBooks export.'),
    });
  }
};

export const exportAsXeroCsv = async ({
  transactions,
  bankInfo,
  currencyCode,
  jsonData,
  exportBaseName,
  toast,
  getErrorMessage,
}: ExportContext) => {
  if (transactions.length === 0) return;

  try {
    const statementData = resolveCanonicalStatementData({ transactions, bankInfo, currencyCode, jsonData });
    const content = buildXeroCsv(statementData);
    downloadTextFile(
      content,
      `${getExportBaseName(exportBaseName)}_xero_export.csv`,
      'text/csv;charset=utf-8',
    );
    toast({
      title: 'Xero CSV Downloaded',
      description: 'Your transactions have been exported in Xero-friendly CSV format.',
    });
  } catch (error: unknown) {
    if (import.meta.env.DEV) { console.error('Xero export error:', error); }
    toast({
      variant: 'destructive',
      title: 'Xero export failed',
      description: getErrorMessage(error, 'Failed to export Xero CSV.'),
    });
  }
};

export const exportAsZohoCsv = async ({
  transactions,
  bankInfo,
  currencyCode,
  jsonData,
  exportBaseName,
  toast,
  getErrorMessage,
}: ExportContext) => {
  if (transactions.length === 0) return;

  try {
    const statementData = resolveCanonicalStatementData({ transactions, bankInfo, currencyCode, jsonData });
    const content = buildZohoCsv(statementData);
    downloadTextFile(
      content,
      `${getExportBaseName(exportBaseName)}-zoho.csv`,
      'text/csv;charset=utf-8',
    );
    toast({
      title: 'Zoho CSV Downloaded',
      description: 'Your transactions have been exported in Zoho-friendly CSV format.',
    });
  } catch (error: unknown) {
    if (import.meta.env.DEV) { console.error('Zoho export error:', error); }
    toast({
      variant: 'destructive',
      title: 'Zoho export failed',
      description: getErrorMessage(error, 'Failed to export Zoho CSV.'),
    });
  }
};

export const exportAsJSON = async ({
  transactions,
  analytics,
  bankInfo,
  currencyCode,
  jsonData,
  exportBaseName,
  toast,
  getErrorMessage,
}: ExportContext) => {
  if (transactions.length === 0) return;

  try {
    const content = jsonData && jsonData.trim()
      ? jsonData
      : buildStatementJson({
          transactions,
          analytics,
          bankInfo,
          currencyCode,
        });

    downloadTextFile(
      content,
      `${getExportBaseName(exportBaseName)}.json`,
      'application/json;charset=utf-8',
    );

    toast({
      title: 'JSON Downloaded',
      description: 'Your transaction data has been exported to JSON.',
    });
  } catch (error: unknown) {
    if (import.meta.env.DEV) { console.error('JSON export error:', error); }
    toast({
      variant: 'destructive',
      title: 'JSON export failed',
      description: getErrorMessage(error, 'Failed to export JSON.'),
    });
  }
};

export const exportAsMT940 = async ({
  transactions,
  bankInfo,
  currencyCode,
  mt940Data,
  exportBaseName,
  toast,
  getErrorMessage,
}: ExportContext) => {
  if (transactions.length === 0) return;

  try {
    const content = mt940Data && mt940Data.trim()
      ? mt940Data
      : buildMt940({
          transactions,
          bankInfo,
          currencyCode,
        });

    downloadTextFile(
      content,
      `${getExportBaseName(exportBaseName)}.mt940`,
      'text/plain;charset=utf-8',
    );

    toast({
      title: 'MT940 Downloaded',
      description: 'Your transaction data has been exported to MT940.',
    });
  } catch (error: unknown) {
    if (import.meta.env.DEV) { console.error('MT940 export error:', error); }
    toast({
      variant: 'destructive',
      title: 'MT940 export failed',
      description: getErrorMessage(error, 'Failed to export MT940.'),
    });
  }
};

const sanitizeLedgerName = (name: string): string => {
  return name
    .replace(/[\n\r\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/[<>]/g, '')
    .trim() || 'Suspense';
};

const formatTallyDate = (value?: string): string => {
  if (!value) return '';
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[1]}${match[2]}${match[3]}`;
  const digits = trimmed.replace(/[^0-9]/g, '');
  if (digits.length === 8) return digits;
  return '';
};

const escapeXml = (value: string): string => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

export const exportAsTallyXml = ({ transactions, exportBaseName, toast, getErrorMessage }: ExportContext) => {
  if (transactions.length === 0) return;

  try {
    const bankLedger = 'Bank';
    const now = new Date();
    const fallbackStatementId = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const statementIdSource = transactions[0]?.date || '';
    const statementId = (formatTallyDate(statementIdSource) || fallbackStatementId).replace(/[^0-9]/g, '').slice(0, 8) || fallbackStatementId;

    const vouchers = transactions.map((t, index) => {
      const amount = (t.debit || t.credit || 0);
      if (!amount) return '';
      const isReceipt = (t.credit || 0) > 0;
      const voucherType = isReceipt ? 'Receipt' : 'Payment';
      const counterparty = sanitizeLedgerName(t.description || 'Suspense');
      const narrationParts = [t.description, t.refNumber ? `Ref: ${t.refNumber}` : null].filter(Boolean);
      const narration = escapeXml(narrationParts.join(' | '));
      const date = formatTallyDate(t.date) || formatTallyDate((t as unknown as Record<string, unknown>).postingDate as string) || '';
      const positiveAmount = Math.abs(amount).toFixed(2);
      const bankAmount = isReceipt ? positiveAmount : `-${positiveAmount}`;
      const counterpartyAmount = isReceipt ? `-${positiveAmount}` : positiveAmount;
      const rowNumber = String(index + 1).padStart(3, '0');
      const voucherNumber = `VCH-${statementId}-${rowNumber}`;

      return `
    <TALLYMESSAGE xmlns:UDF="TallyUDF">
      <VOUCHER VCHTYPE="${voucherType}" ACTION="Create">
        <DATE>${date}</DATE>
        <VOUCHERNUMBER>${escapeXml(voucherNumber)}</VOUCHERNUMBER>
        <NARRATION>${narration}</NARRATION>
        <REFERENCE>${escapeXml(t.refNumber || '')}</REFERENCE>
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${escapeXml(bankLedger)}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>${isReceipt ? 'No' : 'Yes'}</ISDEEMEDPOSITIVE>
          <AMOUNT>${bankAmount}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${escapeXml(counterparty)}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>${isReceipt ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>
          <AMOUNT>${counterpartyAmount}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>
      </VOUCHER>
    </TALLYMESSAGE>`;
    }).filter(Boolean).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>${vouchers}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>
`;

    const blob = new Blob([xml], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${getExportBaseName(exportBaseName)}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Tally XML Downloaded',
      description: 'Before importing, ensure these ledgers exist in Tally: Bank, and all party names in transactions',
    });
  } catch (error: unknown) {
    if (import.meta.env.DEV) { console.error('Tally export error:', error); }
    toast({
      variant: 'destructive',
      title: 'Tally export failed',
      description: getErrorMessage(error, 'Failed to export Tally XML.'),
    });
  }
};
