// ============= PROFESSIONAL EXCEL GENERATOR =============
// Rich formatting with colors, borders, bold headers, and multiple sheets
// Uses ExcelJS for full styling support

import type { Transaction, FraudAlert, UnderwritingResult, LiquidityAnalysis, ReconciliationResult } from './financial-engine.ts';

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

// Color constants
const COLORS = {
  headerBg: 'FF1E3A5F',      // Dark blue header
  headerFont: 'FFFFFFFF',     // White text
  debitRed: 'FFDC3545',       // Red for debits
  debitBg: 'FFFFEAEA',        // Light red background
  creditGreen: 'FF28A745',    // Green for credits
  creditBg: 'FFE8F5E9',       // Light green background
  totalBg: 'FFF0F0F0',        // Gray for totals
  borderColor: 'FFD0D0D0',    // Light gray border
};

export async function generateProfessionalExcel(config: ExcelConfig): Promise<ExcelGenerationResult> {
  // Dynamic import ExcelJS
  const ExcelJS = await import('https://esm.sh/exceljs@4.4.0');
  
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Akromeda Financial Analysis';
  workbook.created = new Date();
  
  const sheets: string[] = [];
  
  // ============= SHEET 1: TRANSACTIONS =============
  const txSheet = workbook.addWorksheet('Transactions', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }] // Freeze header row
  });
  
  // Define columns with proper widths
  txSheet.columns = [
    { header: 'Sr No', key: 'srNo', width: 8 },
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Description', key: 'description', width: 45 },
    { header: 'Category', key: 'category', width: 18 },
    { header: 'Debit', key: 'debit', width: 15 },
    { header: 'Credit', key: 'credit', width: 15 },
    { header: 'Balance', key: 'balance', width: 15 },
    { header: 'Flags', key: 'flags', width: 25 },
  ];
  
  // Style header row - BOLD + Dark Background + White Text
  const headerRow = txSheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: COLORS.headerFont }, size: 11 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: COLORS.headerBg }
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 22;
  
  // Add borders to header
  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin', color: { argb: COLORS.borderColor } },
      bottom: { style: 'medium', color: { argb: COLORS.headerBg } },
      left: { style: 'thin', color: { argb: COLORS.borderColor } },
      right: { style: 'thin', color: { argb: COLORS.borderColor } },
    };
  });
  
  // Add transaction data rows
  const dataStartRow = 2;
  config.transactions.forEach((t, i) => {
    const debitVal = typeof t.debit === 'number' ? t.debit : (parseFloat(String(t.debit)) || 0);
    const creditVal = typeof t.credit === 'number' ? t.credit : (parseFloat(String(t.credit)) || 0);
    const balanceVal = typeof t.balance === 'number' ? t.balance : (parseFloat(String(t.balance)) || 0);
    
    const flags = [
      t.isDuplicate ? '🔄 Duplicate' : '',
      t.balanceMismatch ? '⚠️ Balance Mismatch' : '',
      t.riskFlag ? `🚨 ${t.riskFlag}` : '',
    ].filter(Boolean).join(', ') || '-';
    
    const row = txSheet.addRow({
      srNo: i + 1,
      date: t.date || '',
      description: t.description || '',
      category: t.category || 'Other',
      debit: debitVal > 0 ? -Math.abs(debitVal) : null,  // Negative debits
      credit: creditVal > 0 ? creditVal : null,           // Positive credits
      balance: balanceVal,
      flags: flags,
    });
    
    // Style debit cell - RED
    const debitCell = row.getCell('debit');
    if (debitVal > 0) {
      debitCell.font = { color: { argb: COLORS.debitRed }, bold: true };
      debitCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORS.debitBg }
      };
    }
    debitCell.numFmt = '#,##0.00;-#,##0.00;"-"';
    
    // Style credit cell - GREEN
    const creditCell = row.getCell('credit');
    if (creditVal > 0) {
      creditCell.font = { color: { argb: COLORS.creditGreen }, bold: true };
      creditCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORS.creditBg }
      };
    }
    creditCell.numFmt = '#,##0.00;-#,##0.00;"-"';
    
    // Balance formatting
    row.getCell('balance').numFmt = '#,##0.00';
    
    // Add light borders
    row.eachCell((cell) => {
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      };
    });
    
    // Alternate row colors
    if (i % 2 === 1) {
      row.eachCell((cell, colNumber) => {
        if (colNumber !== 5 && colNumber !== 6) { // Don't override debit/credit colors
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8F8F8' }
          };
        }
      });
    }
  });
  
  const dataEndRow = dataStartRow + config.transactions.length - 1;
  
  // ============= GRAND TOTAL ROW - BOLD with FORMULAS =============
  const grandTotalRow = txSheet.addRow({
    srNo: '',
    date: '',
    description: 'GRAND TOTAL',
    category: '',
    debit: null,
    credit: null,
    balance: config.transactions.length > 0 ? config.transactions[config.transactions.length - 1].balance : 0,
    flags: '',
  });
  
  // Add Excel SUM formulas for Debit and Credit columns
  const totalRowNum = grandTotalRow.number;
  grandTotalRow.getCell('debit').value = { formula: `SUM(E${dataStartRow}:E${dataEndRow})` };
  grandTotalRow.getCell('credit').value = { formula: `SUM(F${dataStartRow}:F${dataEndRow})` };
  
  // Style Grand Total row - BOLD + Gray Background
  grandTotalRow.font = { bold: true, size: 11 };
  grandTotalRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: COLORS.totalBg }
  };
  grandTotalRow.getCell('debit').numFmt = '#,##0.00;-#,##0.00;"-"';
  grandTotalRow.getCell('credit').numFmt = '#,##0.00;-#,##0.00;"-"';
  grandTotalRow.getCell('balance').numFmt = '#,##0.00';
  grandTotalRow.eachCell((cell) => {
    cell.border = {
      top: { style: 'medium', color: { argb: COLORS.headerBg } },
      bottom: { style: 'medium', color: { argb: COLORS.headerBg } },
    };
  });
  
  // ============= NET BALANCE ROW =============
  const netBalanceRow = txSheet.addRow({
    srNo: '',
    date: '',
    description: 'NET BALANCE (Credits + Debits)',
    category: '',
    debit: '',
    credit: null,
    balance: '',
    flags: '',
  });
  
  // Net Balance formula: Credit Total + Debit Total (debit is negative)
  netBalanceRow.getCell('credit').value = { formula: `F${totalRowNum}+E${totalRowNum}` };
  netBalanceRow.font = { bold: true, size: 11, color: { argb: COLORS.headerBg } };
  netBalanceRow.getCell('credit').numFmt = '#,##0.00;-#,##0.00;"-"';
  netBalanceRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFF3CD' } // Light yellow for net balance
  };
  
  sheets.push('Transactions');
  
  // ============= SHEET 2: SUMMARY =============
  const summarySheet = workbook.addWorksheet('Summary');
  
  // Title
  summarySheet.mergeCells('A1:B1');
  const titleCell = summarySheet.getCell('A1');
  titleCell.value = 'BANK STATEMENT ANALYSIS SUMMARY';
  titleCell.font = { bold: true, size: 16, color: { argb: COLORS.headerBg } };
  titleCell.alignment = { horizontal: 'center' };
  
  summarySheet.addRow([]);
  
  // Financial Overview Section
  const overviewHeader = summarySheet.addRow(['FINANCIAL OVERVIEW', '']);
  overviewHeader.font = { bold: true, size: 12 };
  overviewHeader.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: COLORS.headerBg }
  };
  overviewHeader.getCell(1).font = { bold: true, color: { argb: COLORS.headerFont } };
  
  summarySheet.addRow(['Total Transactions', config.transactions.length]);
  summarySheet.addRow(['Total Credits', formatCurrency(config.analytics.totalCredits)]);
  summarySheet.addRow(['Total Debits', formatCurrency(config.analytics.totalDebits)]);
  summarySheet.addRow(['Net Cash Flow', formatCurrency(config.analytics.netFlow)]);
  summarySheet.addRow(['Duplicate Transactions', config.analytics.duplicateCount]);
  summarySheet.addRow([]);
  
  // Add FOIR analysis if available
  if (config.underwriting) {
    const foirHeader = summarySheet.addRow(['FOIR ANALYSIS', '']);
    foirHeader.font = { bold: true, size: 12 };
    foirHeader.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.headerBg }
    };
    foirHeader.getCell(1).font = { bold: true, color: { argb: COLORS.headerFont } };
    
    summarySheet.addRow(['FOIR Score', `${config.underwriting.foir.score.toFixed(2)}%`]);
    summarySheet.addRow(['FOIR Status', config.underwriting.foir.status.toUpperCase()]);
    summarySheet.addRow(['Average Monthly Income', formatCurrency(config.underwriting.foir.avgMonthlyIncome)]);
    summarySheet.addRow(['Average Monthly EMI', formatCurrency(config.underwriting.foir.avgMonthlyEMI)]);
    summarySheet.addRow(['Disposable Income', formatCurrency(config.underwriting.foir.disposableIncome)]);
    summarySheet.addRow(['Max New EMI Capacity', formatCurrency(config.underwriting.foir.maxNewEMI)]);
    summarySheet.addRow(['Estimated Loan Eligibility', formatCurrency(config.underwriting.foir.loanEligibility)]);
    summarySheet.addRow([]);
    
    const eligHeader = summarySheet.addRow(['ELIGIBILITY', '']);
    eligHeader.font = { bold: true, size: 12 };
    eligHeader.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.headerBg }
    };
    eligHeader.getCell(1).font = { bold: true, color: { argb: COLORS.headerFont } };
    
    summarySheet.addRow(['Status', config.underwriting.eligibility.status.toUpperCase()]);
    summarySheet.addRow(['Assessment', config.underwriting.eligibility.message]);
    summarySheet.addRow([]);
  }
  
  // Add liquidity info if available
  if (config.liquidity) {
    const liqHeader = summarySheet.addRow(['LIQUIDITY ANALYSIS', '']);
    liqHeader.font = { bold: true, size: 12 };
    liqHeader.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.headerBg }
    };
    liqHeader.getCell(1).font = { bold: true, color: { argb: COLORS.headerFont } };
    
    summarySheet.addRow(['Minimum Balance', formatCurrency(config.liquidity.minBalance)]);
    summarySheet.addRow(['Maximum Balance', formatCurrency(config.liquidity.maxBalance)]);
    summarySheet.addRow(['Average Balance', formatCurrency(config.liquidity.avgBalance)]);
    summarySheet.addRow(['Zero Balance Days', config.liquidity.zeroDays]);
    summarySheet.addRow(['Max Dip Date', config.liquidity.maxDipDate || 'N/A']);
    summarySheet.addRow([]);
  }
  
  // Add integrity info if available
  if (config.reconciliation) {
    const intHeader = summarySheet.addRow(['DOCUMENT INTEGRITY', '']);
    intHeader.font = { bold: true, size: 12 };
    intHeader.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.headerBg }
    };
    intHeader.getCell(1).font = { bold: true, color: { argb: COLORS.headerFont } };
    
    summarySheet.addRow(['Integrity Score', `${config.reconciliation.integrityScore}/100`]);
    summarySheet.addRow(['Balance Mismatches', config.reconciliation.totalMismatches]);
    summarySheet.addRow(['Validation Status', config.reconciliation.isValid ? '✅ PASSED' : '⚠️ ISSUES FOUND']);
  }
  
  summarySheet.columns = [
    { width: 28 },
    { width: 40 }
  ];
  
  sheets.push('Summary');
  
  // ============= SHEET 3: CATEGORY BREAKDOWN =============
  const categorySheet = workbook.addWorksheet('Categories');
  
  categorySheet.columns = [
    { header: 'Category', key: 'category', width: 22 },
    { header: 'Count', key: 'count', width: 10 },
    { header: 'Total Debit', key: 'totalDebit', width: 16 },
    { header: 'Total Credit', key: 'totalCredit', width: 16 },
    { header: 'Net', key: 'net', width: 16 },
  ];
  
  // Style header
  const catHeaderRow = categorySheet.getRow(1);
  catHeaderRow.font = { bold: true, color: { argb: COLORS.headerFont } };
  catHeaderRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: COLORS.headerBg }
  };
  
  Object.entries(config.analytics.categoryBreakdown).forEach(([category, data]) => {
    const row = categorySheet.addRow({
      category,
      count: data.count,
      totalDebit: data.totalDebit,
      totalCredit: data.totalCredit,
      net: data.totalCredit - data.totalDebit,
    });
    row.getCell('totalDebit').numFmt = '#,##0.00';
    row.getCell('totalCredit').numFmt = '#,##0.00';
    row.getCell('net').numFmt = '#,##0.00';
  });
  
  sheets.push('Categories');
  
  // ============= SHEET 4: SALARY & EMI =============
  if (config.underwriting && (config.underwriting.salaryCredits.length > 0 || config.underwriting.emiDebits.length > 0)) {
    const salarySheet = workbook.addWorksheet('Salary & EMI');
    
    // Salary Credits Section
    salarySheet.addRow(['SALARY CREDITS']).font = { bold: true, size: 14 };
    const salaryHeaderRow = salarySheet.addRow(['Date', 'Amount', 'Description']);
    salaryHeaderRow.font = { bold: true, color: { argb: COLORS.headerFont } };
    salaryHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.creditGreen }
    };
    
    config.underwriting.salaryCredits.forEach(s => {
      const row = salarySheet.addRow([s.date, s.amount, s.description]);
      row.getCell(2).numFmt = '#,##0.00';
      row.getCell(2).font = { color: { argb: COLORS.creditGreen } };
    });
    
    salarySheet.addRow([]);
    salarySheet.addRow(['EMI/LOAN DEBITS']).font = { bold: true, size: 14 };
    const emiHeaderRow = salarySheet.addRow(['Date', 'Amount', 'Loan Type']);
    emiHeaderRow.font = { bold: true, color: { argb: COLORS.headerFont } };
    emiHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.debitRed }
    };
    
    config.underwriting.emiDebits.forEach(e => {
      const row = salarySheet.addRow([e.date, e.amount, e.loanType]);
      row.getCell(2).numFmt = '#,##0.00';
      row.getCell(2).font = { color: { argb: COLORS.debitRed } };
    });
    
    salarySheet.addRow([]);
    salarySheet.addRow(['MONTHLY BREAKDOWN']).font = { bold: true, size: 14 };
    const monthHeaderRow = salarySheet.addRow(['Month', 'Salary Income', 'EMI Outflow']);
    monthHeaderRow.font = { bold: true, color: { argb: COLORS.headerFont } };
    monthHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.headerBg }
    };
    
    config.underwriting.monthlyBreakdown.forEach(m => {
      const row = salarySheet.addRow([m.month, m.salaryIncome, m.emiOutflow]);
      row.getCell(2).numFmt = '#,##0.00';
      row.getCell(3).numFmt = '#,##0.00';
    });
    
    salarySheet.columns = [
      { width: 14 },
      { width: 16 },
      { width: 45 }
    ];
    
    sheets.push('Salary & EMI');
  }
  
  // ============= SHEET 5: RISK FLAGS =============
  if (config.fraudAlerts && config.fraudAlerts.length > 0) {
    const riskSheet = workbook.addWorksheet('Risk Analysis');
    
    riskSheet.addRow(['RISK ALERTS & FRAUD DETECTION']).font = { bold: true, size: 14 };
    const riskHeaderRow = riskSheet.addRow(['Type', 'Severity', 'Description', 'Affected Rows']);
    riskHeaderRow.font = { bold: true, color: { argb: COLORS.headerFont } };
    riskHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.debitRed }
    };
    
    config.fraudAlerts.forEach(alert => {
      const row = riskSheet.addRow([
        alert.type,
        alert.severity.toUpperCase(),
        alert.description,
        alert.affectedRows.length > 0 ? alert.affectedRows.slice(0, 10).join(', ') + (alert.affectedRows.length > 10 ? '...' : '') : 'N/A',
      ]);
      
      // Color code severity
      const severityCell = row.getCell(2);
      if (alert.severity === 'critical' || alert.severity === 'high') {
        severityCell.font = { color: { argb: COLORS.debitRed }, bold: true };
      } else if (alert.severity === 'medium') {
        severityCell.font = { color: { argb: 'FFFF9800' }, bold: true };
      }
    });
    
    riskSheet.columns = [
      { width: 22 },
      { width: 12 },
      { width: 55 },
      { width: 28 }
    ];
    
    sheets.push('Risk Analysis');
  }
  
  // ============= SHEET 6: BALANCE MISMATCHES =============
  if (config.reconciliation && config.reconciliation.mismatches.length > 0) {
    const mismatchSheet = workbook.addWorksheet('Balance Issues');
    
    mismatchSheet.addRow(['BALANCE RECONCILIATION ISSUES']).font = { bold: true, size: 14 };
    const mismatchHeaderRow = mismatchSheet.addRow(['Row #', 'Expected Balance', 'Actual Balance', 'Difference', 'Severity']);
    mismatchHeaderRow.font = { bold: true, color: { argb: COLORS.headerFont } };
    mismatchHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFF9800' } // Orange for warnings
    };
    
    config.reconciliation.mismatches.slice(0, 50).forEach(m => {
      const row = mismatchSheet.addRow([
        m.rowIndex + 1,
        m.expected,
        m.actual,
        m.difference,
        m.severity.toUpperCase(),
      ]);
      row.getCell(2).numFmt = '#,##0.00';
      row.getCell(3).numFmt = '#,##0.00';
      row.getCell(4).numFmt = '#,##0.00';
    });
    
    if (config.reconciliation.mismatches.length > 50) {
      mismatchSheet.addRow([`... and ${config.reconciliation.mismatches.length - 50} more`, '', '', '', '']);
    }
    
    mismatchSheet.columns = [
      { width: 10 },
      { width: 18 },
      { width: 18 },
      { width: 16 },
      { width: 12 }
    ];
    
    sheets.push('Balance Issues');
  }
  
  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  
  return { buffer, sheets };
}

function formatCurrency(amount: number | string): string {
  if (typeof amount === 'string') return amount;
  return new Intl.NumberFormat('en-IN', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ============= SIMPLE EXCEL EXPORT (Backward Compatible) =============
export async function generateSimpleExcel(transactions: Transaction[]): Promise<ArrayBuffer> {
  const ExcelJS = await import('https://esm.sh/exceljs@4.4.0');
  
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Transactions');
  
  worksheet.columns = [
    { header: 'Sr No', key: 'srNo', width: 8 },
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Description', key: 'description', width: 40 },
    { header: 'Category', key: 'category', width: 16 },
    { header: 'Debit', key: 'debit', width: 14 },
    { header: 'Credit', key: 'credit', width: 14 },
    { header: 'Balance', key: 'balance', width: 14 },
  ];
  
  // Bold header
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  
  transactions.forEach((t, i) => {
    worksheet.addRow({
      srNo: i + 1,
      date: t.date,
      description: t.description,
      category: t.category,
      debit: t.debit || 0,
      credit: t.credit || 0,
      balance: t.balance,
    });
  });
  
  return await workbook.xlsx.writeBuffer();
}
