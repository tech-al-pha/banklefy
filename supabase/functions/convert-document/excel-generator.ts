// ============= PROFESSIONAL EXCEL GENERATOR =============
// Rich formatting with colors, borders, and multiple sheets

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
  // FIX: Ensure debit/credit are numbers, not empty strings (fixes 0 values issue)
  const txData = config.transactions.map((t, i) => ({
    'Sr No': i + 1,
    'Date': t.date || '',
    'Description': t.description || '',
    'Category': t.category || 'Other',
    'Debit': typeof t.debit === 'number' ? t.debit : (parseFloat(String(t.debit)) || 0),
    'Credit': typeof t.credit === 'number' ? t.credit : (parseFloat(String(t.credit)) || 0),
    'Balance': typeof t.balance === 'number' ? t.balance : (parseFloat(String(t.balance)) || 0),
    'Flags': [
      t.isDuplicate ? '🔄 Duplicate' : '',
      t.balanceMismatch ? '⚠️ Balance Mismatch' : '',
      t.riskFlag ? `🚨 ${t.riskFlag}` : '',
    ].filter(Boolean).join(', ') || '-',
  }));
  
  const txSheet = XLSX.utils.json_to_sheet(txData);
  
  // Set column widths
  txSheet['!cols'] = [
    { wch: 6 },   // Sr No
    { wch: 12 },  // Date
    { wch: 45 },  // Description
    { wch: 18 },  // Category
    { wch: 14 },  // Debit
    { wch: 14 },  // Credit
    { wch: 14 },  // Balance
    { wch: 25 },  // Flags
  ];
  
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
