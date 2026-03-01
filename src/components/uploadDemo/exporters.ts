import { buildMt940, buildStatementJson, downloadTextFile } from "@/lib/statement-export";
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
    .replace(/\.+$/g, '')
    .trim();
  return safe || 'bank-statement';
};

export const exportAsCSV = ({ transactions, exportBaseName, toast, sumMoney }: ExportContext) => {
  if (transactions.length === 0) return;

  const headers = ['Date', 'Description', 'Debit', 'Credit', 'Balance'];
  const totalDebit = sumMoney(transactions.map((t) => t.debit || 0));
  const totalCredit = sumMoney(transactions.map((t) => t.credit || 0));

  const csvRows = [
    headers.join(','),
    ...transactions.map(t =>
      [
        t.date || '',
        `"${(t.description || '').replace(/"/g, '""')}"`,
        t.debit || '',
        t.credit || '',
        t.balance ?? '',
      ].join(',')
    ),
    ['', 'TOTAL', totalDebit.toFixed(2), totalCredit.toFixed(2), ''].join(','),
  ];

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
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
    console.error('JSON export error:', error);
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
    console.error('MT940 export error:', error);
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

    const vouchers = transactions.map((t) => {
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

      return `
    <TALLYMESSAGE xmlns:UDF="TallyUDF">
      <VOUCHER VCHTYPE="${voucherType}" ACTION="Create">
        <DATE>${date}</DATE>
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
      description: 'Import this XML into Tally Prime as Vouchers.',
    });
  } catch (error: unknown) {
    console.error('Tally export error:', error);
    toast({
      variant: 'destructive',
      title: 'Tally export failed',
      description: getErrorMessage(error, 'Failed to export Tally XML.'),
    });
  }
};
