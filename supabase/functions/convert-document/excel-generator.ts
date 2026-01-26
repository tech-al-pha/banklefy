// ============= PROFESSIONAL EXCEL GENERATOR =============
// Rich formatting with colors, borders, and multiple sheets
// Uses xlsx with conditional formatting for red debits / green credits

import * as XLSX from 'https://esm.sh/xlsx@0.18.5';
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

export function generateProfessionalExcel(config: ExcelConfig): ExcelGenerationResult {
  const workbook = XLSX.utils.book_new();
  const sheets: string[] = [];
  
  // ============= SHEET 1: TRANSACTIONS =============
  // Headers for the transaction sheet
  const headers = ['Sr No', 'Date', 'Description', 'Category', 'Debit', 'Credit', 'Balance', 'Flags'];
  
  // Build transaction rows - DEBITS ARE NEGATIVE
  const txRows = config.transactions.map((t, i) => {
    const debitVal = typeof t.debit === 'number' ? t.debit : (parseFloat(String(t.debit)) || 0);
    const creditVal = typeof t.credit === 'number' ? t.credit : (parseFloat(String(t.credit)) || 0);
    const balanceVal = typeof t.balance === 'number' ? t.balance : (parseFloat(String(t.balance)) || 0);
    
    return [
      i + 1,
      t.date || '',
      t.description || '',
      t.category || 'Other',
      debitVal > 0 ? -Math.abs(debitVal) : (debitVal < 0 ? debitVal : null), // Negative debits, null if 0
      creditVal > 0 ? creditVal : null, // Positive credits, null if 0
      balanceVal,
      [
        t.isDuplicate ? '🔄 Duplicate' : '',
        t.balanceMismatch ? '⚠️ Balance Mismatch' : '',
        t.riskFlag ? `🚨 ${t.riskFlag}` : '',
      ].filter(Boolean).join(', ') || '-',
    ];
  });
  
  const rowCount = txRows.length;
  const dataStartRow = 2; // Row 1 is header (1-indexed in Excel)
  const dataEndRow = dataStartRow + rowCount - 1;
  
  // Add Grand Total row with EXCEL FORMULAS (real math, not AI!)
  const grandTotalRow = [
    '', // Sr No
    '', // Date
    'GRAND TOTAL', // Description
    '', // Category
    { f: `SUM(E${dataStartRow}:E${dataEndRow})` }, // Debit Total Formula
    { f: `SUM(F${dataStartRow}:F${dataEndRow})` }, // Credit Total Formula
    txRows.length > 0 ? txRows[txRows.length - 1][6] : 0, // Last Balance (Running Balance)
    '', // Flags
  ];
  
  // Net Balance row
  const netBalanceRow = [
    '', // Sr No
    '', // Date
    'NET BALANCE (Credits + Debits)', // Description
    '', // Category
    '', // Debit
    { f: `F${dataEndRow + 1}+E${dataEndRow + 1}` }, // Net = Credit Total + Debit Total (debit is negative)
    '', // Balance
    '', // Flags
  ];
  
  // Combine all data: headers + transactions + totals
  const allData = [headers, ...txRows, grandTotalRow, netBalanceRow];
  
  const txSheet = XLSX.utils.aoa_to_sheet(allData);
  
  // ============= AUTO-FIT COLUMN WIDTHS =============
  // Calculate width based on longest string in each column (real calculation!)
  const colWidths = headers.map((_, colIdx) => {
    let maxLen = headers[colIdx].length; // Start with header length
    
    allData.forEach(row => {
      const cell = row[colIdx];
      let cellLen = 0;
      
      if (cell === null || cell === undefined) {
        cellLen = 0;
      } else if (typeof cell === 'object' && cell.f) {
        // Formula cell - estimate based on typical result
        cellLen = 15;
      } else if (typeof cell === 'number') {
        // Format number to get string length
        cellLen = formatCurrency(cell).length;
      } else {
        cellLen = String(cell).length;
      }
      
      if (cellLen > maxLen) maxLen = cellLen;
    });
    
    // Add padding and cap at reasonable max
    return { wch: Math.min(Math.max(maxLen + 2, 8), 60) };
  });
  
  txSheet['!cols'] = colWidths;
  
  // ============= CONDITIONAL FORMATTING: RED DEBITS, GREEN CREDITS =============
  // xlsx library supports conditional formatting via '!condfmt' property
  // Debit column (E) = index 4, Credit column (F) = index 5
  const debitCol = 'E';
  const creditCol = 'F';
  const lastDataRow = dataEndRow + 2; // Include total rows
  
  // Add conditional formatting rules
  // Format: Red for negative values (debits), Green for positive values (credits)
  txSheet['!condfmt'] = [
    {
      // Red for negative debits (column E)
      ref: `${debitCol}${dataStartRow}:${debitCol}${lastDataRow}`,
      rules: [{
        type: 'cellIs',
        operator: 'lessThan',
        formula: ['0'],
        style: {
          font: { color: { rgb: 'FF0000' } }, // Red text
          fill: { fgColor: { rgb: 'FFEEEE' } }, // Light red background
        },
      }],
    },
    {
      // Green for positive credits (column F)
      ref: `${creditCol}${dataStartRow}:${creditCol}${lastDataRow}`,
      rules: [{
        type: 'cellIs',
        operator: 'greaterThan',
        formula: ['0'],
        style: {
          font: { color: { rgb: '008000' } }, // Green text
          fill: { fgColor: { rgb: 'EEFFEE' } }, // Light green background
        },
      }],
    },
  ];
  
  // ============= NUMBER FORMATTING & CELL TYPES =============
  // Set number format for Debit, Credit, Balance columns (columns E, F, G = indices 4, 5, 6)
  const numCols = [4, 5, 6]; // 0-indexed: Debit, Credit, Balance
  for (let rowIdx = 1; rowIdx <= rowCount + 2; rowIdx++) { // +2 for total rows
    numCols.forEach(colIdx => {
      const cellRef = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
      if (txSheet[cellRef]) {
        // Ensure numeric cells are typed as numbers
        if (typeof txSheet[cellRef].v === 'number') {
          txSheet[cellRef].t = 'n';
          // Use accounting format: red for negatives, green for positives
          if (colIdx === 4) {
            // Debit column - show as negative red
            txSheet[cellRef].z = '[Red]-#,##0.00;[Red]-#,##0.00;-';
          } else if (colIdx === 5) {
            // Credit column - show as positive green  
            txSheet[cellRef].z = '[Green]#,##0.00;[Red]-#,##0.00;-';
          } else {
            txSheet[cellRef].z = '#,##0.00'; // Balance - standard format
          }
        }
      }
    });
  }
  
  XLSX.utils.book_append_sheet(workbook, txSheet, 'Transactions');
  sheets.push('Transactions');
  
  // ============= SHEET 2: SUMMARY =============
  const summaryData = [
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
  
  // Add FOIR analysis if available
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
  
  // Add liquidity info if available
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
  
  // Add integrity info if available
  if (config.reconciliation) {
    summaryData.push(
      ['DOCUMENT INTEGRITY', ''],
      ['Integrity Score', `${config.reconciliation.integrityScore}/100`],
      ['Balance Mismatches', config.reconciliation.totalMismatches],
      ['Validation Status', config.reconciliation.isValid ? '✅ PASSED' : '⚠️ ISSUES FOUND'],
    );
  }
  
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 25 }, { wch: 35 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
  sheets.push('Summary');
  
  // ============= SHEET 3: CATEGORY BREAKDOWN =============
  const categoryData = [
    ['Category', 'Count', 'Total Debit', 'Total Credit', 'Net'],
  ];
  
  Object.entries(config.analytics.categoryBreakdown).forEach(([category, data]) => {
    categoryData.push([
      category,
      String(data.count),
      formatCurrency(data.totalDebit),
      formatCurrency(data.totalCredit),
      formatCurrency(data.totalCredit - data.totalDebit),
    ]);
  });
  
  const categorySheet = XLSX.utils.aoa_to_sheet(categoryData);
  categorySheet['!cols'] = [
    { wch: 20 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
  ];
  XLSX.utils.book_append_sheet(workbook, categorySheet, 'Categories');
  sheets.push('Categories');
  
  // ============= SHEET 4: SALARY & EMI (if underwriting available) =============
  if (config.underwriting && (config.underwriting.salaryCredits.length > 0 || config.underwriting.emiDebits.length > 0)) {
    const salaryEmiData = [
      ['SALARY CREDITS', '', ''],
      ['Date', 'Amount', 'Description'],
    ];
    
    config.underwriting.salaryCredits.forEach(s => {
      salaryEmiData.push([s.date, formatCurrency(s.amount), s.description]);
    });
    
    salaryEmiData.push(['', '', '']);
    salaryEmiData.push(['EMI/LOAN DEBITS', '', '']);
    salaryEmiData.push(['Date', 'Amount', 'Loan Type']);
    
    config.underwriting.emiDebits.forEach(e => {
      salaryEmiData.push([e.date, formatCurrency(e.amount), e.loanType]);
    });
    
    salaryEmiData.push(['', '', '']);
    salaryEmiData.push(['MONTHLY BREAKDOWN', '', '']);
    salaryEmiData.push(['Month', 'Salary Income', 'EMI Outflow']);
    
    config.underwriting.monthlyBreakdown.forEach(m => {
      salaryEmiData.push([m.month, formatCurrency(m.salaryIncome), formatCurrency(m.emiOutflow)]);
    });
    
    const salaryEmiSheet = XLSX.utils.aoa_to_sheet(salaryEmiData);
    salaryEmiSheet['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(workbook, salaryEmiSheet, 'Salary & EMI');
    sheets.push('Salary & EMI');
  }
  
  // ============= SHEET 5: RISK FLAGS (if alerts available) =============
  if (config.fraudAlerts && config.fraudAlerts.length > 0) {
    const riskData = [
      ['RISK ALERTS & FRAUD DETECTION', '', '', ''],
      ['Type', 'Severity', 'Description', 'Affected Rows'],
    ];
    
    config.fraudAlerts.forEach(alert => {
      riskData.push([
        alert.type,
        alert.severity.toUpperCase(),
        alert.description,
        alert.affectedRows.length > 0 ? alert.affectedRows.slice(0, 10).join(', ') + (alert.affectedRows.length > 10 ? '...' : '') : 'N/A',
      ]);
    });
    
    const riskSheet = XLSX.utils.aoa_to_sheet(riskData);
    riskSheet['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 50 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(workbook, riskSheet, 'Risk Analysis');
    sheets.push('Risk Analysis');
  }
  
  // ============= SHEET 6: BALANCE MISMATCHES (if any) =============
  if (config.reconciliation && config.reconciliation.mismatches.length > 0) {
    const mismatchData = [
      ['BALANCE RECONCILIATION ISSUES', '', '', '', ''],
      ['Row #', 'Expected Balance', 'Actual Balance', 'Difference', 'Severity'],
    ];
    
    config.reconciliation.mismatches.slice(0, 50).forEach(m => {
      mismatchData.push([
        String(m.rowIndex + 1),
        formatCurrency(m.expected),
        formatCurrency(m.actual),
        formatCurrency(m.difference),
        m.severity.toUpperCase(),
      ]);
    });
    
    if (config.reconciliation.mismatches.length > 50) {
      mismatchData.push([`... and ${config.reconciliation.mismatches.length - 50} more`, '', '', '', '']);
    }
    
    const mismatchSheet = XLSX.utils.aoa_to_sheet(mismatchData);
    mismatchSheet['!cols'] = [{ wch: 10 }, { wch: 18 }, { wch: 18 }, { wch: 15 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(workbook, mismatchSheet, 'Balance Issues');
    sheets.push('Balance Issues');
  }
  
  // Generate buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  
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
export function generateSimpleExcel(transactions: Transaction[]): ArrayBuffer {
  const data = transactions.map((t, i) => ({
    'Sr No': i + 1,
    'Date': t.date,
    'Description': t.description,
    'Category': t.category,
    'Debit': t.debit || 0,
    'Credit': t.credit || 0,
    'Balance': t.balance,
  }));
  
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
  
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
