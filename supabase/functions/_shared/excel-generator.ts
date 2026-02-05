// ============= PROFESSIONAL EXCEL GENERATOR =============
// Premium formatting + formulas + auto-fit columns + Audit sheet + Reference IDs.
// Uses xlsx package via npm: specifier for Deno edge runtime compatibility.

import * as XLSX from 'https://esm.sh/xlsx@0.18.5';
import type {
  Transaction,
  FraudAlert,
  UnderwritingResult,
  LiquidityAnalysis,
  ReconciliationResult,
} from '../_shared/financial-engine.ts';

export interface ExcelGenerationResult {
  buffer: ArrayBuffer;
  sheets: string[];
}

export interface BankInfo {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  currency: string;
  iban?: string;
  statementPeriod?: string;
  openingBalance?: number;
  closingBalance?: number;
}

export interface ExcelConfig {
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
  premiumExport?: boolean;
  bankInfo?: BankInfo; // NEW: Bank metadata
}

const THEME = {
  headerBg: '1E3A5F',
  headerFg: 'FFFFFF',
  border: 'D0D0D0',
  totalBg: 'F2F2F2',
  netBg: 'FFF3CD',
  summaryBg: 'E8F4FD',
  alertHigh: 'FFCDD2',
  alertMedium: 'FFE0B2',
  alertLow: 'FFF9C4',
  creditGreen: '4CAF50',
  debitRed: 'F44336',
};

// Style constants for testing/validation
export const headerStyle = {
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

export const totalStyle = {
  font: { bold: true },
  fill: { fgColor: { rgb: THEME.totalBg } },
  border: {
    top: { style: 'medium', color: { rgb: THEME.headerBg } },
    bottom: { style: 'medium', color: { rgb: THEME.headerBg } },
  },
} as const;

export const netStyle = {
  font: { bold: true, color: { rgb: THEME.headerBg } },
  fill: { fgColor: { rgb: THEME.netBg } },
} as const;

const summaryCardStyle = {
  font: { bold: true, sz: 12 },
  fill: { fgColor: { rgb: THEME.summaryBg } },
  border: {
    top: { style: 'medium', color: { rgb: THEME.headerBg } },
    bottom: { style: 'medium', color: { rgb: THEME.headerBg } },
    left: { style: 'medium', color: { rgb: THEME.headerBg } },
    right: { style: 'medium', color: { rgb: THEME.headerBg } },
  },
} as const;

// Currency symbols map
const CURRENCY_SYMBOLS: Record<string, string> = {
  'INR': '₹', 'USD': '$', 'EUR': '€', 'GBP': '£', 'AED': 'د.إ',
  'SAR': '﷼', 'SGD': 'S$', 'AUD': 'A$', 'CAD': 'C$', 'JPY': '¥',
  'CNY': '¥', 'CHF': 'CHF', 'HKD': 'HK$', 'NZD': 'NZ$', 'MYR': 'RM',
  'THB': '฿', 'PHP': '₱', 'KRW': '₩', 'ZAR': 'R', 'BRL': 'R$',
  'MXN': '$', 'QAR': '﷼', 'KWD': 'د.ك', 'BHD': '.د.ب', 'OMR': '﷼',
};

function getCurrencySymbol(currency?: string): string {
  if (!currency) return '';
  return CURRENCY_SYMBOLS[currency.toUpperCase()] || currency + ' ';
}

function formatCurrency(amount: number | string, currency?: string): string {
  if (typeof amount === 'string') return amount;
  const symbol = getCurrencySymbol(currency);
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return symbol ? `${symbol}${formatted}` : formatted;
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
    let maxLen = headers[colIdx]?.length || 10;
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

// Extract Reference ID from description or use provided refNumber
// Enhanced to support global bank patterns including GCC banks
function extractReferenceId(description: string, rowIndex: number, refNumber?: string): string {
  // If OCR extracted a refNumber, use it directly
  if (refNumber && refNumber.trim()) {
    return refNumber.trim().substring(0, 20);
  }
  
  if (!description) return '';
  
  const desc = description.toUpperCase();
  
  // ========= GLOBAL BANK PATTERNS =========
  
  // 1. UAE/GCC Banks (Wio, Emirates NBD, ADCB, FAB, Mashreq, RAKBANK, CBD, NBF)
  // Wio Bank format: P049462226
  const wioRef = desc.match(/\bP([0-9]{6,12})\b/);
  if (wioRef) return `WIO:${wioRef[0]}`;
  
  // Emirates NBD specific patterns
  const enbdRef = desc.match(/ENBD[:\s\-\/]*([A-Z0-9]{8,16})/i) ||
                  desc.match(/\b(MB[0-9]{10,14})\b/) ||  // Mobile banking: MB12345678901
                  desc.match(/\b(IB[0-9]{10,14})\b/) ||  // Internet banking: IB12345678901
                  desc.match(/\b(AT[0-9]{10,14})\b/);    // ATM: AT12345678901
  if (enbdRef) return `ENBD:${enbdRef[1]}`;
  
  // ADCB (Abu Dhabi Commercial Bank) patterns
  const adcbRef = desc.match(/ADCB[:\s\-\/]*([A-Z0-9]{8,16})/i) ||
                  desc.match(/\b(ADC[0-9]{10,14})\b/) ||
                  desc.match(/\b(CR[0-9]{10,14})\b/);    // Credit reference
  if (adcbRef) return `ADCB:${adcbRef[1]}`;
  
  // FAB (First Abu Dhabi Bank) patterns
  const fabRef = desc.match(/FAB[:\s\-\/]*([A-Z0-9]{8,16})/i) ||
                 desc.match(/NBAD[:\s\-\/]*([A-Z0-9]{8,16})/i) ||  // Old NBAD
                 desc.match(/FGB[:\s\-\/]*([A-Z0-9]{8,16})/i) ||   // Old FGB
                 desc.match(/\b(FAB[0-9]{10,14})\b/);
  if (fabRef) return `FAB:${fabRef[1]}`;
  
  // Mashreq Bank patterns
  const mashreqRef = desc.match(/MASHREQ[:\s\-\/]*([A-Z0-9]{8,16})/i) ||
                     desc.match(/\b(MSQ[0-9]{10,14})\b/) ||
                     desc.match(/\b(MBK[0-9]{10,14})\b/);
  if (mashreqRef) return `MSHQ:${mashreqRef[1]}`;
  
  // RAKBANK patterns
  const rakRef = desc.match(/RAKBANK[:\s\-\/]*([A-Z0-9]{8,16})/i) ||
                 desc.match(/\b(RAK[0-9]{10,14})\b/);
  if (rakRef) return `RAK:${rakRef[1]}`;
  
  // Generic UAE patterns (FT = Fund Transfer, TXN = Transaction)
  const uaeRef = desc.match(/\bFT([0-9]{10,16})\b/) ||
                 desc.match(/\bTXN([0-9]{8,16})\b/) ||
                 desc.match(/\bIPT([0-9]{8,14})\b/);   // Internal Payment Transfer
  if (uaeRef) return `UAE:${uaeRef[0]}`;
  
  // Saudi Banks (NCB/SNB, Rajhi, Riyad, SABB, ANB)
  const saudiRef = desc.match(/\b(NCB[0-9]{10,16})\b/) ||
                   desc.match(/\b(SNB[0-9]{10,16})\b/) ||
                   desc.match(/\b(RAJ[0-9]{10,16})\b/) ||
                   desc.match(/\b(SABB[0-9]{8,14})\b/) ||
                   desc.match(/\b(RIY[0-9]{10,16})\b/);
  if (saudiRef) return `KSA:${saudiRef[1]}`;
  
  // Qatar Banks (QNB, CBQ, Doha Bank)
  const qatarRef = desc.match(/\b(QNB[0-9]{10,16})\b/) ||
                   desc.match(/\b(CBQ[0-9]{10,16})\b/) ||
                   desc.match(/\b(DB[0-9]{12,16})\b/);
  if (qatarRef) return `QAT:${qatarRef[1]}`;
  
  // Kuwait Banks (NBK, KFH, Burgan)
  const kuwaitRef = desc.match(/\b(NBK[0-9]{10,16})\b/) ||
                    desc.match(/\b(KFH[0-9]{10,16})\b/) ||
                    desc.match(/\b(BRG[0-9]{10,16})\b/);
  if (kuwaitRef) return `KWT:${kuwaitRef[1]}`;
  
  // Bahrain & Oman Banks
  const gccRef = desc.match(/\b(BBK[0-9]{10,16})\b/) ||   // BBK Bahrain
                 desc.match(/\b(BNM[0-9]{10,16})\b/) ||   // Bank Muscat
                 desc.match(/\b(OAB[0-9]{10,16})\b/);     // Oman Arab Bank
  if (gccRef) return `GCC:${gccRef[1]}`;
  
  // 2. India - UTR patterns (16-22 digit alphanumeric)
  const utrMatch = desc.match(/UTR[:\s\-\/]*([A-Z0-9]{12,22})/i) ||
                   desc.match(/\b([A-Z]{4}[0-9]{10,16})\b/);
  if (utrMatch) return `UTR:${utrMatch[1].substring(0, 16)}`;
  
  // 3. NEFT/RTGS patterns (India, UAE, etc.)
  const neftMatch = desc.match(/NEFT[:\s\-\/]*([A-Z0-9]{8,20})/i) ||
                    desc.match(/RTGS[:\s\-\/]*([A-Z0-9]{8,20})/i) ||
                    desc.match(/\bN([0-9]{10,16})\b/);
  if (neftMatch) return `NEFT:${neftMatch[1].substring(0, 14)}`;
  
  // 4. IMPS patterns (typically 12-digit)
  const impsMatch = desc.match(/IMPS[:\s\-\/]*([A-Z0-9]{8,16})/i);
  if (impsMatch) return `IMPS:${impsMatch[1].substring(0, 12)}`;
  
  // 5. UPI patterns (upi@bank or UPI/XXXXXX)
  const upiMatch = desc.match(/UPI[:\s\-\/]*([A-Z0-9@.]{6,30})/i) ||
                   desc.match(/([A-Z0-9.]+@[A-Z]+)/i);
  if (upiMatch) return `UPI:${upiMatch[1].substring(0, 20)}`;
  
  // 6. Cheque/Check patterns (global)
  const chequeMatch = desc.match(/CHQ[:\s#\-]*([0-9]{5,8})/i) || 
                      desc.match(/CHEQUE[:\s#\-]*([0-9]{5,8})/i) ||
                      desc.match(/CHECK[:\s#\-]*([0-9]{5,8})/i) ||
                      desc.match(/CQ[:\s#\-]*([0-9]{5,8})/i) ||
                      desc.match(/CLG[:\s#\-]*([0-9]{5,8})/i);
  if (chequeMatch) return `CHQ:${chequeMatch[1]}`;
  
  // 7. US/UK/EU Banks - ACH, BACS, SEPA
  const achMatch = desc.match(/ACH[:\s\-\/]*([A-Z0-9]{6,16})/i);
  if (achMatch) return `ACH:${achMatch[1].substring(0, 12)}`;
  
  const bacsMatch = desc.match(/BACS[:\s\-\/]*([A-Z0-9]{6,16})/i);
  if (bacsMatch) return `BACS:${bacsMatch[1].substring(0, 12)}`;
  
  const sepaMatch = desc.match(/SEPA[:\s\-\/]*([A-Z0-9]{6,20})/i);
  if (sepaMatch) return `SEPA:${sepaMatch[1].substring(0, 14)}`;
  
  // 8. Wire Transfer patterns
  const wireMatch = desc.match(/WIRE[:\s\-\/]*([A-Z0-9]{6,16})/i) ||
                    desc.match(/SWIFT[:\s\-\/]*([A-Z0-9]{6,16})/i);
  if (wireMatch) return `WIRE:${wireMatch[1].substring(0, 12)}`;
  
  // 9. Reference/Transaction number patterns
  const refMatch = desc.match(/REF[:\s#\-]*([A-Z0-9]{6,20})/i) ||
                   desc.match(/REFNO[:\s#\-]*([A-Z0-9]{6,20})/i) ||
                   desc.match(/TXN[:\s#\-]*([A-Z0-9]{6,20})/i) ||
                   desc.match(/TRANS[:\s#\-]*([A-Z0-9]{6,20})/i) ||
                   desc.match(/ID[:\s#\-]*([A-Z0-9]{8,20})/i);
  if (refMatch) return `REF:${refMatch[1].substring(0, 14)}`;
  
  // 10. ATM/Card transaction patterns
  const atmMatch = desc.match(/ATM[:\s\-\/]*([A-Z0-9]{6,16})/i) ||
                   desc.match(/CARD[:\s\-\/]*([A-Z0-9]{6,16})/i) ||
                   desc.match(/POS[:\s\-\/]*([A-Z0-9]{6,16})/i);
  if (atmMatch) return `ATM:${atmMatch[1].substring(0, 12)}`;
  
  // 11. Generic alphanumeric patterns (P123456, N789012 format)
  const genericPrefix = desc.match(/\b([A-Z][0-9]{6,12})\b/);
  if (genericPrefix) return genericPrefix[1];
  
  // 12. Long alphanumeric sequence (likely a transaction ID)
  const genericIdMatch = desc.match(/\b([A-Z]{2,4}[0-9]{8,16})\b/) ||
                         desc.match(/\b([0-9]{2,4}[A-Z]{2,4}[0-9]{6,12})\b/) ||
                         desc.match(/\b([A-Z0-9]{14,22})\b/);
  if (genericIdMatch) {
    const id = genericIdMatch[1];
    if (!['TRANSACTION', 'DESCRIPTION', 'BALANCE', 'TRANSFER', 'STATEMENT'].includes(id)) {
      return `ID:${id.substring(0, 14)}`;
    }
  }
  
  // 13. Fallback: Extract any number sequence of 8+ digits
  const numericMatch = desc.match(/\b([0-9]{8,16})\b/);
  if (numericMatch) {
    return `REF:${numericMatch[1]}`;
  }
  
  // Return empty string instead of row number - cleaner exports
  return '';
}

export function generateProfessionalExcel(config: ExcelConfig): ExcelGenerationResult {
  const workbook = XLSX.utils.book_new();
  const sheets: string[] = [];
  const isPremium = config.premiumExport !== false; // Default to premium
  const currency = config.bankInfo?.currency || 'USD';
  const currencySymbol = getCurrencySymbol(currency);

  // ============= SHEET 1: TRANSACTIONS =============
  // Removed Sr No column - cleaner export without row numbers
  const headers = ['Ref ID', 'Date', 'Description', 'Category', 'Debit', 'Credit', 'Balance', 'Flags'];
  
  // Calculate totals for Summary Box
  const totalCredits = config.analytics.totalCredits || 0;
  const totalDebits = config.analytics.totalDebits || 0;
  const netBalance = totalCredits - Math.abs(totalDebits);
  const closingBalance = config.transactions.length > 0 
    ? (typeof config.transactions[config.transactions.length - 1].balance === 'number' 
        ? config.transactions[config.transactions.length - 1].balance 
        : parseFloat(String(config.transactions[config.transactions.length - 1].balance)) || 0)
    : 0;

  // Build Bank Info + Summary Box rows (premium mode)
  const bankInfoRows: any[][] = isPremium && config.bankInfo ? [
    ['🏦 BANK STATEMENT ANALYSIS', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['Bank:', config.bankInfo.bankName || 'Unknown Bank', '', 'Account Holder:', config.bankInfo.accountHolder || 'N/A', '', '', ''],
    ['Account No:', config.bankInfo.accountNumber || 'N/A', '', 'IBAN:', config.bankInfo.iban || 'N/A', '', '', ''],
    ['Currency:', currency, '', 'Statement Period:', config.bankInfo.statementPeriod || 'N/A', '', '', ''],
    ['', '', '', '', '', '', '', ''],
  ] : [];

  const summaryBox: any[][] = isPremium ? [
    ['📊 FINANCIAL SUMMARY', '', '', '', '', '', '', ''],
    ['', 'Total Credits:', formatCurrency(totalCredits, currency), '', 'Total Debits:', formatCurrency(Math.abs(totalDebits), currency), '', ''],
    ['', 'Net Balance:', formatCurrency(netBalance, currency), '', 'Closing Balance:', formatCurrency(closingBalance, currency), '', ''],
    ['', '', '', '', '', '', '', ''],
  ] : [];

  const headerSection = [...bankInfoRows, ...summaryBox];
  const summaryRowCount = headerSection.length;
  const headerRowIndex = summaryRowCount; // 0-indexed row for headers
  const dataStartRow = headerRowIndex + 2; // 1-indexed Excel row (after summary + header)

  const txRows = config.transactions.map((t, i) => {
    const debitVal = typeof t.debit === 'number' ? t.debit : (parseFloat(String(t.debit)) || 0);
    const creditVal = typeof t.credit === 'number' ? t.credit : (parseFloat(String(t.credit)) || 0);
    const balanceVal = typeof t.balance === 'number' ? t.balance : (parseFloat(String(t.balance)) || 0);
    // Pass the refNumber from transaction if available (from OCR)
    const refId = extractReferenceId(t.description || '', i, (t as any).refNumber);

    return [
      refId || '-', // Use dash if no ref ID found
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
  const dataEndRow = dataStartRow + rowCount - 1;

  const grandTotalExcelRow = rowCount > 0 ? dataEndRow + 1 : dataStartRow;
  const netBalanceExcelRow = grandTotalExcelRow + 1;

  const lastBalance = rowCount > 0 ? Number(txRows[txRows.length - 1][6] || 0) : 0; // Balance is now col index 6

  // Updated formulas: Debit=E, Credit=F, Balance=G (after removing Sr No)
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

  const allData: any[][] = [...headerSection, headers, ...txRows, grandTotalRow, netBalanceRow];
  const ws = XLSX.utils.aoa_to_sheet(allData);

  // Row heights
  ws['!rows'] = [];
  if (isPremium) {
    ws['!rows'][0] = { hpt: 24 }; // Summary title
    ws['!rows'][1] = { hpt: 20 };
    ws['!rows'][2] = { hpt: 20 };
  }
  ws['!rows'][headerRowIndex] = { hpt: 22 };

  // Auto-fit widths
  ws['!cols'] = autoFitCols(allData, headers);

  // Style Summary Box (premium only)
  if (isPremium && summaryRowCount > 0) {
    // Title row
    setCellStyle(ws, 'A1', { font: { bold: true, sz: 14, color: { rgb: THEME.headerBg } } });
    // Summary data rows
    for (let r = 1; r < summaryRowCount - 1; r++) {
      for (let c = 0; c < headers.length; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        setCellStyle(ws, addr, summaryCardStyle);
      }
    }
  }

  // Bold + premium header styling
  setRowStyle(ws, headerRowIndex, headers.length, headerStyle);

  // Style Grand Total + Net Balance rows
  const grandTotalRowIdx0 = grandTotalExcelRow - 1 + summaryRowCount;
  const netRowIdx0 = netBalanceExcelRow - 1 + summaryRowCount;
  setRowStyle(ws, grandTotalRowIdx0, headers.length, totalStyle);
  setRowStyle(ws, netRowIdx0, headers.length, netStyle);

  // Number typing + formats for Debit/Credit/Balance (E/F/G = cols 4/5/6 after removing Sr No)
  const numCols = [4, 5, 6];
  for (let r = headerRowIndex + 1; r <= headerRowIndex + rowCount + 2; r++) {
    for (const c of numCols) {
      const ref = XLSX.utils.encode_cell({ r, c });
      const cell = ws[ref];
      if (!cell) continue;

      if (typeof cell.v === 'number' || (cell as any).f) {
        cell.t = 'n';
        if (c === 4) cell.z = '[Red]-#,##0.00;[Red]-#,##0.00;"-"';      // Debit
        else if (c === 5) cell.z = '[Green]#,##0.00;[Red]-#,##0.00;"-"'; // Credit
        else cell.z = '#,##0.00';                                        // Balance
      }
    }
  }

  XLSX.utils.book_append_sheet(workbook, ws, 'Transactions');
  sheets.push('Transactions');

  // ============= SHEET 2: AUDIT (Premium Only) =============
  if (isPremium) {
    const auditData: any[][] = [
      ['🔍 AUDIT REPORT', '', '', '', ''],
      [''],
      ['Type', 'Row #', 'Ref ID', 'Description', 'Details'],
    ];

    // Collect audit items
    const duplicates = config.transactions
      .map((t, i) => ({ ...t, rowNum: i + 1, refId: extractReferenceId(t.description || '', i) }))
      .filter(t => t.isDuplicate);
    
    const mismatches = config.transactions
      .map((t, i) => ({ ...t, rowNum: i + 1, refId: extractReferenceId(t.description || '', i) }))
      .filter(t => t.balanceMismatch);
    
    const highRisk = config.transactions
      .map((t, i) => ({ ...t, rowNum: i + 1, refId: extractReferenceId(t.description || '', i) }))
      .filter(t => t.riskFlag);

    // Add duplicates
    if (duplicates.length > 0) {
      auditData.push(['', '', '', '', '']);
      auditData.push(['📋 DUPLICATE TRANSACTIONS', '', '', '', `Total: ${duplicates.length}`]);
      duplicates.forEach(d => {
        // Create clickable reference to Transactions sheet
        const cellRef = `Transactions!A${d.rowNum + (isPremium ? summaryRowCount : 0) + 1}`;
        auditData.push([
          '🔄 Duplicate',
          { f: `HYPERLINK("#${cellRef}","Row ${d.rowNum}")` },
          d.refId,
          (d.description || '').substring(0, 50),
          `Amount: ${formatCurrency(d.debit || d.credit || 0)}`,
        ]);
      });
    }

    // Add balance mismatches
    if (mismatches.length > 0) {
      auditData.push(['', '', '', '', '']);
      auditData.push(['⚠️ BALANCE MISMATCHES', '', '', '', `Total: ${mismatches.length}`]);
      mismatches.forEach(m => {
        const cellRef = `Transactions!A${m.rowNum + (isPremium ? summaryRowCount : 0) + 1}`;
        auditData.push([
          '⚠️ Mismatch',
          { f: `HYPERLINK("#${cellRef}","Row ${m.rowNum}")` },
          m.refId,
          (m.description || '').substring(0, 50),
          `Balance: ${formatCurrency(m.balance || 0)}`,
        ]);
      });
    }

    // Add high-risk flags
    if (highRisk.length > 0) {
      auditData.push(['', '', '', '', '']);
      auditData.push(['🚨 HIGH-RISK FLAGS', '', '', '', `Total: ${highRisk.length}`]);
      highRisk.forEach(r => {
        const cellRef = `Transactions!A${r.rowNum + (isPremium ? summaryRowCount : 0) + 1}`;
        auditData.push([
          '🚨 Risk',
          { f: `HYPERLINK("#${cellRef}","Row ${r.rowNum}")` },
          r.refId,
          (r.description || '').substring(0, 50),
          r.riskFlag || 'Flagged',
        ]);
      });
    }

    // Add fraud alerts if present
    if (config.fraudAlerts && config.fraudAlerts.length > 0) {
      auditData.push(['', '', '', '', '']);
      auditData.push(['🛡️ FRAUD ALERTS', '', '', '', `Total: ${config.fraudAlerts.length}`]);
      config.fraudAlerts.forEach((alert, i) => {
        auditData.push([
          `🛡️ ${alert.severity?.toUpperCase() || 'MEDIUM'}`,
          i + 1,
          alert.type || 'Alert',
          (alert.description || '').substring(0, 50),
          `Rows: ${alert.affectedRows?.join(', ') || 'N/A'}`,
        ]);
      });
    }

    // Summary row
    auditData.push(['', '', '', '', '']);
    auditData.push([
      '📊 AUDIT SUMMARY',
      '',
      '',
      '',
      `Duplicates: ${duplicates.length} | Mismatches: ${mismatches.length} | Risk Flags: ${highRisk.length}`,
    ]);

    const auditSheet = XLSX.utils.aoa_to_sheet(auditData);
    auditSheet['!cols'] = autoFitCols(auditData, ['Type', 'Row #', 'Ref ID', 'Description', 'Details']);
    
    // Style header
    setCellStyle(auditSheet, 'A1', { font: { bold: true, sz: 14, color: { rgb: THEME.headerBg } } });
    setRowStyle(auditSheet, 2, 5, headerStyle);
    
    XLSX.utils.book_append_sheet(workbook, auditSheet, 'Audit');
    sheets.push('Audit');
  }

  // ============= SHEET 3: SUMMARY =============
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
  setCellStyle(summarySheet, 'A1', { font: { bold: true, sz: 14, color: { rgb: THEME.headerBg } } });
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
  sheets.push('Summary');

  // ============= SHEET 4: CATEGORY BREAKDOWN =============
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
    'Ref ID': extractReferenceId(t.description || '', i),
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

// ============= MERGED STATEMENTS EXPORT (Multi-PDF) =============
export interface MergedExcelConfig {
  bankInfo: BankInfo;
  statementPeriod?: string;
  transactions: Transaction[];
  totals: {
    totalDebit: number;
    totalCredit: number;
    finalBalance: number | null;
  };
}

function formatMonthLabel(dateValue: string): string {
  if (!dateValue) return '';
  const parsed = new Date(dateValue);
  if (!Number.isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(parsed);
  }

  const match = dateValue.match(/^(\d{1,4})[\/\-](\d{1,2})[\/\-](\d{1,4})/);
  if (!match) return '';
  const part1 = Number(match[1]);
  const part2 = Number(match[2]);
  const part3 = Number(match[3]);

  if (match[1].length === 4) {
    const date = new Date(Date.UTC(part1, part2 - 1, part3));
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
    }
  } else if (match[3].length === 4) {
    let day = part1;
    let month = part2;
    if (part1 <= 12 && part2 > 12) {
      month = part1;
      day = part2;
    }
    const date = new Date(Date.UTC(part3, month - 1, day));
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
    }
  }

  return '';
}

export function generateMergedStatementsExcel(config: MergedExcelConfig): ExcelGenerationResult {
  const workbook = XLSX.utils.book_new();
  const rows: any[][] = [];

  rows.push(['Bank Name', config.bankInfo.bankName || '']);
  rows.push(['Account Number', config.bankInfo.accountNumber || '']);
  rows.push(['Currency', config.bankInfo.currency || '']);
  if (config.bankInfo.accountHolder) {
    rows.push(['Account Holder Name', config.bankInfo.accountHolder]);
  }
  rows.push(['Statement Period', config.statementPeriod || config.bankInfo.statementPeriod || 'N/A']);
  rows.push([]);

  const tableHeaders = ['Date', 'Month', 'Description', 'Debit', 'Credit', 'Balance'];
  const headerRowIndex = rows.length;
  rows.push(tableHeaders);

  const txRows = config.transactions.map((t) => ([
    t.date || '',
    formatMonthLabel(t.date || ''),
    t.description || '',
    typeof t.debit === 'number' ? t.debit : (parseFloat(String(t.debit)) || 0),
    typeof t.credit === 'number' ? t.credit : (parseFloat(String(t.credit)) || 0),
    typeof t.balance === 'number' ? t.balance : (parseFloat(String(t.balance)) || 0),
  ]));

  rows.push(...txRows);
  rows.push([]);

  const totalsStartRow = rows.length;
  rows.push(['Total Debit', '', '', config.totals.totalDebit, '', '']);
  rows.push(['Total Credit', '', '', '', config.totals.totalCredit, '']);
  rows.push(['Final Balance (Last Statement)', '', '', '', '', config.totals.finalBalance ?? '']);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet['!cols'] = autoFitCols(rows, tableHeaders);

  // Style table header
  setRowStyle(worksheet, headerRowIndex, tableHeaders.length, headerStyle);

  // Style totals section
  setRowStyle(worksheet, totalsStartRow, tableHeaders.length, totalStyle);
  setRowStyle(worksheet, totalsStartRow + 1, tableHeaders.length, totalStyle);
  setRowStyle(worksheet, totalsStartRow + 2, tableHeaders.length, totalStyle);

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Merged Statement');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return { buffer, sheets: ['Merged Statement'] };
}

// ============= VALIDATION HELPERS FOR TESTING =============
export function validateExcelStructure(buffer: ArrayBuffer): {
  valid: boolean;
  hasTransactions: boolean;
  hasAudit: boolean;
  hasSummary: boolean;
  headersBold: boolean;
  hasFormulas: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  let hasTransactions = false;
  let hasAudit = false;
  let hasSummary = false;
  let headersBold = false;
  let hasFormulas = false;

  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    hasTransactions = workbook.SheetNames.includes('Transactions');
    hasAudit = workbook.SheetNames.includes('Audit');
    hasSummary = workbook.SheetNames.includes('Summary');
    
    if (hasTransactions) {
      const ws = workbook.Sheets['Transactions'];
      
      // Check for bold headers (look for style on header row)
      // Note: xlsx-js-style preserves styles on read
      const headerCells = ['A5', 'B5', 'C5', 'D5', 'E5', 'F5', 'G5', 'H5', 'I5'];
      headersBold = headerCells.some(addr => {
        const cell = ws[addr];
        return cell?.s?.font?.bold === true;
      });
      
      // Check for SUM formulas
      for (const addr in ws) {
        const cell = ws[addr];
        if (cell?.f && (cell.f.includes('SUM') || cell.f.includes('HYPERLINK'))) {
          hasFormulas = true;
          break;
        }
      }
    }
    
    if (!hasTransactions) errors.push('Missing Transactions sheet');
    if (!hasSummary) errors.push('Missing Summary sheet');
    
  } catch (e) {
    errors.push(`Parse error: ${e instanceof Error ? e.message : 'Unknown'}`);
  }

  return {
    valid: errors.length === 0,
    hasTransactions,
    hasAudit,
    hasSummary,
    headersBold,
    hasFormulas,
    errors,
  };
}
