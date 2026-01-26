// ============= PROFESSIONAL EXCEL GENERATOR =============
// Premium formatting + formulas + auto-fit columns.
// Uses xlsx-js-style (SheetJS fork) for header/totals styling in Deno runtime.

import * as XLSX from 'https://esm.sh/xlsx-js-style@1.2.0?bundle&target=deno';
import type {
  Transaction,
  FraudAlert,
  UnderwritingResult,
  LiquidityAnalysis,
  ReconciliationResult,
} from './financial-engine.ts';

export interface ExcelGenerationResult {
  buffer: ArrayBuffer;
  sheets: string[];
}

interface ExcelConfig {
  transactions: Transaction[];
  analytics: {
    totalCredits: number;
    totalDebits: number;
    netFlow: number;
    duplicateCount: number;
    categoryBreakdown: Record<string, { count: number; totalDebit: number; totalCredit: number }>;
  };
  underwriting?: UnderwritingResult;
  fraudAlerts?: FraudAlert[];
  liquidity?: LiquidityAnalysis;
  reconciliation?: ReconciliationResult;
  fileName?: string;
}

const THEME = {
  headerBg: '1E3A5F',
  headerFg: 'FFFFFF',
  border: 'D0D0D0',
  totalBg: 'F2F2F2',
  netBg: 'FFF3CD',
};

const headerStyle = {
  font: { bold: true, color: { rgb: THEME.headerFg } },
  fill: { fgColor: { rgb: THEME.headerBg } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: {
    top: { style: 'thin', color: { rgb: THEME.border } },
    bottom: { style: 'thin', color: { rgb: THEME.border } },
    left: { style: 'thin', color: { rgb: THEME.border } },
    right: { style: 'thin', color: { rgb: THEME.border } },
  },
} as const;

const totalStyle = {
  font: { bold: true },
  fill: { fgColor: { rgb: THEME.totalBg } },
  border: {
    top: { style: 'medium', color: { rgb: THEME.headerBg } },
    bottom: { style: 'medium', color: { rgb: THEME.headerBg } },
  },
} as const;

const netStyle = {
  font: { bold: true, color: { rgb: THEME.headerBg } },
  fill: { fgColor: { rgb: THEME.netBg } },
} as const;

function formatCurrency(amount: number | string): string {
  if (typeof amount === 'string') return amount;
  return new Intl.NumberFormat('en-IN', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function setCellStyle(ws: any, addr: string, style: any) {
  if (!ws[addr]) return;
  ws[addr].s = { ...(ws[addr].s || {}), ...style };
}

function setRowStyle(ws: any, row: number, colCount: number, style: any) {
  for (let c = 0; c < colCount; c++) {
    const addr = XLSX.utils.encode_cell({ r: row, c });
    setCellStyle(ws, addr, style);
  }
}

function autoFitCols(allData: any[][], headers: string[]) {
  return headers.map((_, colIdx) => {
    let maxLen = headers[colIdx].length;
    allData.forEach((row) => {
      const cell = row[colIdx];
      let len = 0;
      if (cell === null || cell === undefined) {
        len = 0;
      } else if (typeof cell === 'object' && (cell as any).f) {
        len = 14;
      } else {
        len = String(cell).length;
      }
      if (len > maxLen) maxLen = len;
    });
    return { wch: Math.min(Math.max(maxLen + 2, 8), 70) };
  });
}

export function generateProfessionalExcel(config: ExcelConfig): ExcelGenerationResult {
  const workbook = XLSX.utils.book_new();
  const sheets: string[] = [];

  // ============= SHEET 1: TRANSACTIONS =============
  const headers = ['Sr No', 'Date', 'Description', 'Category', 'Debit', 'Credit', 'Balance', 'Flags'];

  const txRows = config.transactions.map((t, i) => {
    const debitVal = typeof t.debit === 'number' ? t.debit : (parseFloat(String(t.debit)) || 0);
    const creditVal = typeof t.credit === 'number' ? t.credit : (parseFloat(String(t.credit)) || 0);
    const balanceVal = typeof t.balance === 'number' ? t.balance : (parseFloat(String(t.balance)) || 0);

    return [
      i + 1,
      t.date || '',
      t.description || '',
      t.category || 'Other',
      debitVal > 0 ? -Math.abs(debitVal) : (debitVal < 0 ? debitVal : null),
      creditVal > 0 ? creditVal : null,
      balanceVal,
      [
        t.isDuplicate ? '🔄 Duplicate' : '',
        t.balanceMismatch ? '⚠️ Balance Mismatch' : '',
        t.riskFlag ? `🚨 ${t.riskFlag}` : '',
      ].filter(Boolean).join(', ') || '-',
    ];
  });

  const rowCount = txRows.length;
  const dataStartRow = 2; // 1-indexed in Excel
  const dataEndRow = dataStartRow + rowCount - 1;

  const grandTotalExcelRow = rowCount > 0 ? dataEndRow + 1 : 2;
  const netBalanceExcelRow = grandTotalExcelRow + 1;

  const lastBalance = rowCount > 0 ? Number(txRows[txRows.length - 1][6] || 0) : 0;

  const grandTotalRow: any[] = [
    '',
    '',
    'GRAND TOTAL',
    '',
    rowCount > 0 ? { f: `SUM(E${dataStartRow}:E${dataEndRow})` } : 0,
    rowCount > 0 ? { f: `SUM(F${dataStartRow}:F${dataEndRow})` } : 0,
    lastBalance,
    '',
  ];

  const netBalanceRow: any[] = [
    '',
    '',
    'NET BALANCE (Credits + Debits)',
    '',
    '',
    { f: `F${grandTotalExcelRow}+E${grandTotalExcelRow}` },
    '',
    '',
  ];

  const allData: any[][] = [headers, ...txRows, grandTotalRow, netBalanceRow];
  const ws = XLSX.utils.aoa_to_sheet(allData);

  // Row height for header (points)
  ws['!rows'] = [{ hpt: 20 }];

  // Auto-fit widths
  ws['!cols'] = autoFitCols(allData, headers);

  // Bold + premium header styling
  setRowStyle(ws, 0, headers.length, headerStyle);

  // Style Grand Total + Net Balance rows
  const grandTotalRowIdx0 = grandTotalExcelRow - 1; // 0-indexed
  const netRowIdx0 = netBalanceExcelRow - 1;
  setRowStyle(ws, grandTotalRowIdx0, headers.length, totalStyle);
  setRowStyle(ws, netRowIdx0, headers.length, netStyle);

  // Conditional formatting (if supported by library build)
  const debitCol = 'E';
  const creditCol = 'F';
  const lastDataRow = netBalanceExcelRow;
  (ws as any)['!condfmt'] = [
    {
      ref: `${debitCol}${dataStartRow}:${debitCol}${lastDataRow}`,
      rules: [
        {
          type: 'cellIs',
          operator: 'lessThan',
          formula: ['0'],
          style: {
            font: { color: { rgb: 'FF0000' } },
            fill: { fgColor: { rgb: 'FFEEEE' } },
          },
        },
      ],
    },
    {
      ref: `${creditCol}${dataStartRow}:${creditCol}${lastDataRow}`,
      rules: [
        {
          type: 'cellIs',
          operator: 'greaterThan',
          formula: ['0'],
          style: {
            font: { color: { rgb: '008000' } },
            fill: { fgColor: { rgb: 'EEFFEE' } },
          },
        },
      ],
    },
  ];

  // Number typing + formats for Debit/Credit/Balance (E/F/G)
  const numCols = [4, 5, 6];
  for (let r = 1; r <= rowCount + 2; r++) {
    for (const c of numCols) {
      const ref = XLSX.utils.encode_cell({ r, c });
      const cell = ws[ref];
      if (!cell) continue;

      // Mark formula totals as numeric too
      if (typeof cell.v === 'number' || (cell as any).f) {
        cell.t = 'n';
        if (c === 4) cell.z = '[Red]-#,##0.00;[Red]-#,##0.00;"-"';
        else if (c === 5) cell.z = '[Green]#,##0.00;[Red]-#,##0.00;"-"';
        else cell.z = '#,##0.00';
      }
    }
  }

  XLSX.utils.book_append_sheet(workbook, ws, 'Transactions');
  sheets.push('Transactions');

  // ============= SHEET 2: SUMMARY =============
  const summaryData: any[][] = [
    ['BANK STATEMENT ANALYSIS SUMMARY', ''],
    ['', ''],
    ['FINANCIAL OVERVIEW', ''],
    ['Total Transactions', config.transactions.length],
    ['Total Credits', formatCurrency(config.analytics.totalCredits)],
    ['Total Debits', formatCurrency(config.analytics.totalDebits)],
    ['Net Cash Flow', formatCurrency(config.analytics.netFlow)],
    ['Duplicate Transactions', config.analytics.duplicateCount],
    ['', ''],
  ];

  if (config.underwriting) {
    summaryData.push(
      ['FOIR ANALYSIS', ''],
      ['FOIR Score', `${config.underwriting.foir.score.toFixed(2)}%`],
      ['FOIR Status', config.underwriting.foir.status.toUpperCase()],
      ['Average Monthly Income', formatCurrency(config.underwriting.foir.avgMonthlyIncome)],
      ['Average Monthly EMI', formatCurrency(config.underwriting.foir.avgMonthlyEMI)],
      ['Disposable Income', formatCurrency(config.underwriting.foir.disposableIncome)],
      ['Max New EMI Capacity', formatCurrency(config.underwriting.foir.maxNewEMI)],
      ['Estimated Loan Eligibility', formatCurrency(config.underwriting.foir.loanEligibility)],
      ['', ''],
      ['ELIGIBILITY', ''],
      ['Status', config.underwriting.eligibility.status.toUpperCase()],
      ['Assessment', config.underwriting.eligibility.message],
      ['', ''],
    );
  }

  if (config.liquidity) {
    summaryData.push(
      ['LIQUIDITY ANALYSIS', ''],
      ['Minimum Balance', formatCurrency(config.liquidity.minBalance)],
      ['Maximum Balance', formatCurrency(config.liquidity.maxBalance)],
      ['Average Balance', formatCurrency(config.liquidity.avgBalance)],
      ['Zero Balance Days', config.liquidity.zeroDays],
      ['Max Dip Date', config.liquidity.maxDipDate || 'N/A'],
      ['', ''],
    );
  }

  if (config.reconciliation) {
    summaryData.push(
      ['DOCUMENT INTEGRITY', ''],
      ['Integrity Score', `${config.reconciliation.integrityScore}/100`],
      ['Balance Mismatches', config.reconciliation.totalMismatches],
      ['Validation Status', config.reconciliation.isValid ? '✅ PASSED' : '⚠️ ISSUES FOUND'],
    );
  }

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = autoFitCols(summaryData, ['Field', 'Value']);
  // Style first row like title
  setCellStyle(summarySheet, 'A1', { font: { bold: true, sz: 14, color: { rgb: THEME.headerBg } } });
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
  sheets.push('Summary');

  // ============= SHEET 3: CATEGORY BREAKDOWN =============
  const categoryData: any[][] = [['Category', 'Count', 'Total Debit', 'Total Credit', 'Net']];
  Object.entries(config.analytics.categoryBreakdown).forEach(([category, data]) => {
    categoryData.push([
      category,
      data.count,
      data.totalDebit,
      data.totalCredit,
      data.totalCredit - data.totalDebit,
    ]);
  });
  const categorySheet = XLSX.utils.aoa_to_sheet(categoryData);
  categorySheet['!cols'] = autoFitCols(categoryData, categoryData[0] as string[]);
  setRowStyle(categorySheet, 0, 5, headerStyle);
  XLSX.utils.book_append_sheet(workbook, categorySheet, 'Categories');
  sheets.push('Categories');

  // Generate buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return { buffer, sheets };
}

// ============= SIMPLE EXCEL EXPORT (Backward Compatible) =============
export function generateSimpleExcel(transactions: Transaction[]): ArrayBuffer {
  const data = transactions.map((t, i) => ({
    'Sr No': i + 1,
    Date: t.date,
    Description: t.description,
    Category: t.category,
    Debit: t.debit || 0,
    Credit: t.credit || 0,
    Balance: t.balance,
  }));
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
