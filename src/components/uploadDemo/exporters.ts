import { formatCurrencyValue } from "@/lib/currency";
import type { Transaction, Analytics } from "./types";

type ToastFn = (args: { title: string; description?: string; variant?: "destructive" }) => void;

type ErrorFormatter = (error: unknown, fallback: string) => string;

type ExportContext = {
  transactions: Transaction[];
  analytics: Analytics | null;
  currencyCode: string;
  toast: ToastFn;
  getErrorMessage: ErrorFormatter;
  sumMoney: (values: number[]) => number;
  truncateDecimals: (value: number, decimals?: number) => number;
};

export const exportAsCSV = ({ transactions, toast, sumMoney }: ExportContext) => {
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
  a.download = `transactions_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  toast({
    title: 'CSV Downloaded',
    description: 'Your transaction data has been exported to CSV.',
  });
};

export const exportAsPDF = async ({
  transactions,
  analytics,
  currencyCode,
  toast,
  getErrorMessage,
  truncateDecimals,
}: ExportContext) => {
  if (transactions.length === 0) return;

  try {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    type JsPdfWithExtras = InstanceType<typeof jsPDF> & {
      setCharSpace?: (value: number) => void;
      setWordSpacing?: (value: number) => void;
      lastAutoTable?: { finalY?: number };
    };
    const doc = new jsPDF({ unit: 'pt', format: 'a4' }) as JsPdfWithExtras;

    const marginX = 40;
    const pageHeight = doc.internal.pageSize.getHeight();
    let cursorY = 48;

    const formatAmount = (value: number, decimals = 2) =>
      formatCurrencyValue(value, currencyCode, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

    const addLine = (text: string) => {
      if (cursorY > pageHeight - 48) {
        doc.addPage();
        cursorY = 48;
      }
      doc.text(text, marginX, cursorY);
      cursorY += 14;
    };

    const addSection = (title: string) => {
      if (cursorY > pageHeight - 72) {
        doc.addPage();
        cursorY = 48;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(title, marginX, cursorY);
      cursorY += 16;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
    };

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Analyzed Statement Report', marginX, cursorY);
    cursorY += 18;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setCharSpace?.(0);
    doc.setWordSpacing?.(0);
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, marginX, cursorY);
    cursorY += 16;

    doc.setFontSize(11);
    addLine(`Total Transactions: ${transactions.length}`);
    addLine(`Total Credits: ${formatAmount(truncateDecimals(analytics?.totalCredits ?? 0))}`);
    addLine(`Total Debits: ${formatAmount(truncateDecimals(analytics?.totalDebits ?? 0))}`);
    addLine(`Net Flow: ${formatAmount(truncateDecimals(analytics?.netFlow ?? 0))}`);

    if (analytics?.underwriting) {
      addSection('Underwriting Summary');
      addLine(`FOIR Score: ${(analytics.underwriting.summary?.foirScore ?? 0).toFixed(1)}%`);
      addLine(`FOIR Status: ${(analytics.underwriting.summary?.foirStatus ?? 'N/A').toUpperCase()}`);
      addLine(`Salary Credits: ${analytics.underwriting.summary?.salaryCredits ?? 0}`);
      addLine(`Monthly Obligation: ${formatAmount(truncateDecimals(analytics.underwriting.summary?.monthlyObligation ?? 0))}`);
    }

    if (analytics?.liquidity) {
      addSection('Liquidity Summary');
      addLine(`Average Balance: ${formatAmount(truncateDecimals(analytics.liquidity.summary?.averageBalance ?? 0))}`);
      addLine(`Minimum Balance: ${formatAmount(truncateDecimals(analytics.liquidity.summary?.minimumBalance ?? 0))}`);
      addLine(`Peak Balance: ${formatAmount(truncateDecimals(analytics.liquidity.summary?.peakBalance ?? 0))}`);
    }

    if (analytics?.riskAnalysis) {
      addSection('Risk Summary');
      addLine(`Risk Score: ${truncateDecimals(analytics.riskAnalysis.score ?? 0, 1)}`);
      addLine(`Risk Category: ${(analytics.riskAnalysis.category ?? 'N/A').toUpperCase()}`);
    }

    addSection('Transaction Summary');
    const rows = transactions.slice(0, 250).map((t) => [
      t.date || '',
      t.description || '',
      t.debit ?? '',
      t.credit ?? '',
      t.balance ?? '',
      t.category || '',
    ]);

    autoTable(doc, {
      startY: cursorY,
      head: [['Date', 'Description', 'Debit', 'Credit', 'Balance', 'Category']],
      body: rows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [20, 20, 20] },
    });

    doc.save(`bank_statement_report_${Date.now()}.pdf`);

    toast({
      title: 'PDF Downloaded',
      description: 'Your transaction data has been exported to PDF.',
    });
  } catch (error: unknown) {
    console.error('PDF export error:', error);
    toast({
      variant: 'destructive',
      title: 'PDF export failed',
      description: getErrorMessage(error, 'Failed to export PDF.'),
    });
  }
};

export const exportAsODS = async ({ transactions, toast, getErrorMessage }: ExportContext) => {
  if (transactions.length === 0) return;

  try {
    const XLSX = await import('xlsx');

    const headers = [
      'Date',
      'Reference No / Transaction ID',
      'Description',
      'Debit',
      'Credit',
      'Balance',
      'Pricing Mismatch Flag',
      'Duplicate Flag',
    ];
    const rows = [
      headers,
      ...transactions.map(t => [
        t.date || '',
        t.refNumber || '',
        t.description || '',
        t.debit ?? 0,
        t.credit ?? 0,
        t.balance ?? 0,
        t.balanceMismatch ? 'YES' : '',
        t.isDuplicate ? 'YES' : '',
      ]),
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
    const wbout = XLSX.write(workbook, { bookType: 'ods', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.oasis.opendocument.spreadsheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${Date.now()}.ods`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'ODS Downloaded',
      description: 'Your transaction data has been exported to ODS.',
    });
  } catch (error: unknown) {
    console.error('ODS export error:', error);
    toast({
      variant: 'destructive',
      title: 'ODS export failed',
      description: getErrorMessage(error, 'Failed to export ODS.'),
    });
  }
};

export const exportAsDOCX = async ({ transactions, toast, getErrorMessage }: ExportContext) => {
  if (transactions.length === 0) return;

  try {
    const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, WidthType, BorderStyle, AlignmentType } = await import('docx');

    const headerRow = new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Date', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Description', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Category', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Debit', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Credit', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Balance', bold: true })] })] }),
      ],
    });

    const dataRows = transactions.slice(0, 100).map(t => new TableRow({
      children: [
        new TableCell({ children: [new Paragraph(t.date || '')] }),
        new TableCell({ children: [new Paragraph((t.description || '').substring(0, 50))] }),
        new TableCell({ children: [new Paragraph(t.category || 'Other')] }),
        new TableCell({ children: [new Paragraph(`${t.debit || 0}`)] }),
        new TableCell({ children: [new Paragraph(`${t.credit || 0}`)] }),
        new TableCell({ children: [new Paragraph(`${t.balance || 0}`)] }),
      ],
    }));

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: 'Bank Statement Report',
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({ text: '' }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [headerRow, ...dataRows],
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
                left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
                right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
                insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
              },
            }),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bank_statement_report_${Date.now()}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'DOCX Downloaded',
      description: 'Your transaction data has been exported to DOCX.',
    });
  } catch (error: unknown) {
    console.error('DOCX export error:', error);
    toast({
      variant: 'destructive',
      title: 'DOCX export failed',
      description: getErrorMessage(error, 'Failed to export DOCX.'),
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

export const exportAsTallyXml = ({ transactions, toast, getErrorMessage }: ExportContext) => {
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
      const date = formatTallyDate(t.date) || formatTallyDate(t.postingDate) || '';
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
    a.download = `tally_vouchers_${Date.now()}.xml`;
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