// ============= STATEMENT EXCEL GENERATOR =============
// Focused on strict data preservation and required schema only.

import * as XLSX from 'https://esm.sh/xlsx@0.18.5';
import type {
  Transaction,
  FraudAlert,
  UnderwritingResult,
  LiquidityAnalysis,
  ReconciliationResult,
} from '../_shared/financial-engine.ts';
import { fromMinorUnits, toMinorUnits } from '../_shared/money.ts';

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
  ifsc?: string;
  swift?: string;
  routingNumber?: string;
  sortCode?: string;
  bsb?: string;
  micr?: string;
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
  bankInfo?: BankInfo;
}

type SheetStyle = Record<string, unknown>;

type SheetCell = {
  v?: unknown;
  f?: string;
  t?: string;
  z?: string;
  s?: SheetStyle;
};

type Worksheet = Record<string, SheetCell> & {
  '!cols'?: Array<{ wch?: number }>;
  '!rows'?: Array<{ hpt?: number }>;
};

type SheetValue = string | number | boolean | null | undefined;

type SheetRow = SheetValue[];

type SheetData = SheetRow[];

const THEME = {
  headerBg: '1E3A5F',
  headerFg: 'FFFFFF',
  border: 'D0D0D0',
  debitRed: 'C0392B',
  creditGreen: '27AE60',
};

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

// Kept for backward compatibility in tests
export const totalStyle = {
  font: { bold: true },
} as const;

export const netStyle = {
  font: { bold: true },
} as const;

const debitTotalStyle = {
  font: { bold: true, color: { rgb: THEME.debitRed } },
  alignment: { horizontal: 'right' },
  border: {
    top: { style: 'double', color: { rgb: THEME.border } },
    bottom: { style: 'double', color: { rgb: THEME.border } },
  },
} as SheetStyle;

const creditTotalStyle = {
  font: { bold: true, color: { rgb: THEME.creditGreen } },
  alignment: { horizontal: 'right' },
  border: {
    top: { style: 'double', color: { rgb: THEME.border } },
    bottom: { style: 'double', color: { rgb: THEME.border } },
  },
} as SheetStyle;

const totalLabelStyle = {
  font: { bold: true },
  alignment: { horizontal: 'right' },
  border: {
    top: { style: 'double', color: { rgb: THEME.border } },
    bottom: { style: 'double', color: { rgb: THEME.border } },
  },
} as SheetStyle;

const TABLE_HEADERS_WITH_REF = [
  'Date',
  'Reference No / Transaction ID',
  'Description',
  'Debit',
  'Credit',
  'Balance',
  'Pricing Mismatch Flag',
  'Duplicate Flag',
];

const TABLE_HEADERS_NO_REF = [
  'Date',
  'Description',
  'Debit',
  'Credit',
  'Balance',
  'Pricing Mismatch Flag',
  'Duplicate Flag',
];

const TABLE_HEADER_VARIANTS = [TABLE_HEADERS_WITH_REF, TABLE_HEADERS_NO_REF] as const;

const MONEY_FORMAT = '#,##0.00';

interface ColumnLayout {
  headers: string[];
  includeReferenceColumn: boolean;
  descriptionColumn: number;
  debitColumn: number;
  creditColumn: number;
  balanceColumn: number;
  pricingMismatchColumn: number;
  duplicateFlagColumn: number;
}

function setCellStyle(ws: Worksheet, addr: string, style: SheetStyle) {
  if (!ws[addr]) return;
  ws[addr].s = { ...(ws[addr].s || {}), ...style };
}

function setCellFormat(ws: Worksheet, addr: string, format: string) {
  if (!ws[addr]) return;
  ws[addr].z = format;
}

function setRowStyle(ws: Worksheet, row: number, colCount: number, style: SheetStyle) {
  for (let c = 0; c < colCount; c++) {
    const addr = XLSX.utils.encode_cell({ r: row, c });
    setCellStyle(ws, addr, style);
  }
}

function autoFitCols(allData: SheetData, headers: string[]) {
  return headers.map((_, colIdx) => {
    let maxLen = headers[colIdx]?.length || 10;
    allData.forEach((row) => {
      const cell = row[colIdx];
      let len = 0;
      if (cell === null || cell === undefined) {
        len = 0;
      } else {
        len = String(cell).length;
      }
      if (len > maxLen) maxLen = len;
    });
    return { wch: Math.min(Math.max(maxLen + 2, 8), 70) };
  });
}

const normalizeToken = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]/g, '');

const isReferenceEmbeddedInDescription = (reference: string, description: string): boolean => {
  const ref = normalizeToken(reference);
  const desc = normalizeToken(description);
  if (!ref || !desc) return false;
  if (ref.length < 6) return false;
  return desc.includes(ref);
};

const shouldIncludeReferenceColumn = (transactions: Transaction[]): boolean => {
  const withReference = transactions.filter((transaction) => (transaction.refNumber || '').trim());
  if (withReference.length === 0) return false;

  const embeddedCount = withReference.filter((transaction) =>
    isReferenceEmbeddedInDescription(transaction.refNumber || '', transaction.description || '')
  ).length;

  // If references are already embedded in narration for almost all rows, skip dedicated reference column.
  const embeddedRatio = embeddedCount / withReference.length;
  if (embeddedRatio >= 0.8) return false;

  return true;
};

function buildColumnLayout(transactions: Transaction[]): ColumnLayout {
  const includeReferenceColumn = shouldIncludeReferenceColumn(transactions);
  const headers = includeReferenceColumn ? [...TABLE_HEADERS_WITH_REF] : [...TABLE_HEADERS_NO_REF];
  const descriptionColumn = includeReferenceColumn ? 2 : 1;
  const debitColumn = descriptionColumn + 1;
  const creditColumn = descriptionColumn + 2;
  const balanceColumn = descriptionColumn + 3;
  const pricingMismatchColumn = descriptionColumn + 4;
  const duplicateFlagColumn = descriptionColumn + 5;

  return {
    headers,
    includeReferenceColumn,
    descriptionColumn,
    debitColumn,
    creditColumn,
    balanceColumn,
    pricingMismatchColumn,
    duplicateFlagColumn,
  };
}

function buildAccountRows(bankInfo?: BankInfo, statementPeriod?: string): SheetData {
  const rows: SheetData = [];
  const pushIf = (label: string, value?: string) => {
    if (value && value.toString().trim()) {
      rows.push([label, value]);
    }
  };

  pushIf('Bank Name', bankInfo?.bankName);
  pushIf('Currency Type', bankInfo?.currency);
  pushIf('Account Number', bankInfo?.accountNumber);
  pushIf('Account Holder Name', bankInfo?.accountHolder);

  const period = statementPeriod ?? bankInfo?.statementPeriod;
  pushIf('Statement Period', period);

  const identifierCandidates = [
    { label: 'IBAN', value: bankInfo?.iban },
    { label: 'IFSC', value: bankInfo?.ifsc },
    { label: 'SWIFT', value: bankInfo?.swift },
    { label: 'Routing Number', value: bankInfo?.routingNumber },
    { label: 'Sort Code', value: bankInfo?.sortCode },
    { label: 'BSB', value: bankInfo?.bsb },
    { label: 'MICR', value: bankInfo?.micr },
  ];
  const identifier = identifierCandidates.find((item) => item.value && item.value.toString().trim());
  if (identifier) {
    rows.push([identifier.label, identifier.value as string]);
  }

  if (rows.length > 0) {
    rows.push([]);
  }
  return rows;
}

function numberOrBlank(value: unknown): number | string {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    // Normalize to minor units to avoid floating-point drift in Excel totals.
    return fromMinorUnits(toMinorUnits(value));
  }
  return value === 0 ? 0 : '';
}

function buildTransactionRows(transactions: Transaction[], layout: ColumnLayout): SheetData {
  return transactions.map((transaction) => {
    const row: SheetRow = [
      transaction.date || '',
    ];

    if (layout.includeReferenceColumn) {
      row.push(transaction.refNumber || '');
    }

    row.push(
      transaction.description || '',
      numberOrBlank(transaction.debit),
      numberOrBlank(transaction.credit),
      numberOrBlank(transaction.balance),
      transaction.balanceMismatch ? 'YES' : '',
      transaction.isDuplicate ? 'YES' : '',
    );

    return row;
  });
}

function buildTotalsRow(layout: ColumnLayout): SheetRow {
  const row: SheetRow = Array(layout.headers.length).fill('');
  row[layout.descriptionColumn] = 'TOTAL';
  row[layout.debitColumn] = null;
  row[layout.creditColumn] = null;
  return row;
}

export function generateProfessionalExcel(config: ExcelConfig): ExcelGenerationResult {
  const workbook = XLSX.utils.book_new();
  const rows: SheetData = [];
  const layout = buildColumnLayout(config.transactions);

  rows.push(...buildAccountRows(config.bankInfo));
  const headerRowIndex = rows.length;
  rows.push(layout.headers);
  const txnRows = buildTransactionRows(config.transactions, layout);
  rows.push(...txnRows);

  // Add totals row with formulas
  const dataStartRow = headerRowIndex + 2; // 1-indexed, after header
  const dataEndRow = headerRowIndex + 1 + txnRows.length;
  const totalRowIndex = rows.length;
  rows.push(buildTotalsRow(layout));

  const ws = XLSX.utils.aoa_to_sheet(rows) as Worksheet;

  // Add SUM formulas for Debit and Credit
  const debitCol = XLSX.utils.encode_col(layout.debitColumn);
  const creditCol = XLSX.utils.encode_col(layout.creditColumn);
  const balanceCol = XLSX.utils.encode_col(layout.balanceColumn);
  const debitAddr = `${debitCol}${totalRowIndex + 1}`;
  const creditAddr = `${creditCol}${totalRowIndex + 1}`;

  ws[debitAddr] = { f: `SUM(${debitCol}${dataStartRow}:${debitCol}${dataEndRow})`, t: 'n', v: 0 };
  ws[creditAddr] = { f: `SUM(${creditCol}${dataStartRow}:${creditCol}${dataEndRow})`, t: 'n', v: 0 };

  // Ensure debit/credit/balance columns keep decimal precision in Excel.
  for (let r = dataStartRow; r <= dataEndRow; r++) {
    setCellFormat(ws, `${debitCol}${r}`, MONEY_FORMAT);
    setCellFormat(ws, `${creditCol}${r}`, MONEY_FORMAT);
    setCellFormat(ws, `${balanceCol}${r}`, MONEY_FORMAT);
  }
  setCellFormat(ws, debitAddr, MONEY_FORMAT);
  setCellFormat(ws, creditAddr, MONEY_FORMAT);

  ws['!cols'] = autoFitCols(rows, layout.headers);
  setRowStyle(ws, headerRowIndex, layout.headers.length, headerStyle);

  // Style the totals row
  const totalLabelAddr = `${XLSX.utils.encode_col(layout.descriptionColumn)}${totalRowIndex + 1}`;
  setCellStyle(ws, totalLabelAddr, totalLabelStyle);
  setCellStyle(ws, debitAddr, debitTotalStyle);
  setCellStyle(ws, creditAddr, creditTotalStyle);

  XLSX.utils.book_append_sheet(workbook, ws, 'Transactions');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return { buffer, sheets: ['Transactions'] };
}

export function generateSimpleExcel(transactions: Transaction[]): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  const layout = buildColumnLayout(transactions);
  const txnRows = buildTransactionRows(transactions, layout);
  const rows: SheetData = [layout.headers, ...txnRows];
  
  // Add totals row
  const dataStartRow = 2; // 1-indexed, after header
  const dataEndRow = 1 + txnRows.length;
  const totalRowIndex = rows.length;
  rows.push(buildTotalsRow(layout));

  const ws = XLSX.utils.aoa_to_sheet(rows) as Worksheet;
  
  // Add SUM formulas for Debit and Credit
  const debitCol = XLSX.utils.encode_col(layout.debitColumn);
  const creditCol = XLSX.utils.encode_col(layout.creditColumn);
  const balanceCol = XLSX.utils.encode_col(layout.balanceColumn);
  const debitAddr = `${debitCol}${totalRowIndex + 1}`;
  const creditAddr = `${creditCol}${totalRowIndex + 1}`;

  ws[debitAddr] = { f: `SUM(${debitCol}${dataStartRow}:${debitCol}${dataEndRow})`, t: 'n', v: 0 };
  ws[creditAddr] = { f: `SUM(${creditCol}${dataStartRow}:${creditCol}${dataEndRow})`, t: 'n', v: 0 };

  for (let r = dataStartRow; r <= dataEndRow; r++) {
    setCellFormat(ws, `${debitCol}${r}`, MONEY_FORMAT);
    setCellFormat(ws, `${creditCol}${r}`, MONEY_FORMAT);
    setCellFormat(ws, `${balanceCol}${r}`, MONEY_FORMAT);
  }
  setCellFormat(ws, debitAddr, MONEY_FORMAT);
  setCellFormat(ws, creditAddr, MONEY_FORMAT);

  ws['!cols'] = autoFitCols(rows, layout.headers);
  setRowStyle(ws, 0, layout.headers.length, headerStyle);
  
  // Style the totals row
  const totalLabelAddr = `${XLSX.utils.encode_col(layout.descriptionColumn)}${totalRowIndex + 1}`;
  setCellStyle(ws, totalLabelAddr, totalLabelStyle);
  setCellStyle(ws, debitAddr, debitTotalStyle);
  setCellStyle(ws, creditAddr, creditTotalStyle);

  XLSX.utils.book_append_sheet(workbook, ws, 'Transactions');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

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

export function generateMergedStatementsExcel(config: MergedExcelConfig): ExcelGenerationResult {
  const workbook = XLSX.utils.book_new();
  const rows: SheetData = [];
  const layout = buildColumnLayout(config.transactions);

  const statementPeriod = config.statementPeriod || config.bankInfo.statementPeriod || '';
  rows.push(...buildAccountRows(config.bankInfo, statementPeriod));

  const headerRowIndex = rows.length;
  rows.push(layout.headers);
  const txnRows = buildTransactionRows(config.transactions, layout);
  rows.push(...txnRows);

  // Add totals row with formulas
  const dataStartRow = headerRowIndex + 2; // 1-indexed, after header
  const dataEndRow = headerRowIndex + 1 + txnRows.length;
  const totalRowIndex = rows.length;
  rows.push(buildTotalsRow(layout));

  const ws = XLSX.utils.aoa_to_sheet(rows) as Worksheet;
  
  // Add SUM formulas for Debit and Credit
  const debitCol = XLSX.utils.encode_col(layout.debitColumn);
  const creditCol = XLSX.utils.encode_col(layout.creditColumn);
  const balanceCol = XLSX.utils.encode_col(layout.balanceColumn);
  const debitAddr = `${debitCol}${totalRowIndex + 1}`;
  const creditAddr = `${creditCol}${totalRowIndex + 1}`;

  ws[debitAddr] = { f: `SUM(${debitCol}${dataStartRow}:${debitCol}${dataEndRow})`, t: 'n', v: 0 };
  ws[creditAddr] = { f: `SUM(${creditCol}${dataStartRow}:${creditCol}${dataEndRow})`, t: 'n', v: 0 };

  for (let r = dataStartRow; r <= dataEndRow; r++) {
    setCellFormat(ws, `${debitCol}${r}`, MONEY_FORMAT);
    setCellFormat(ws, `${creditCol}${r}`, MONEY_FORMAT);
    setCellFormat(ws, `${balanceCol}${r}`, MONEY_FORMAT);
  }
  setCellFormat(ws, debitAddr, MONEY_FORMAT);
  setCellFormat(ws, creditAddr, MONEY_FORMAT);

  ws['!cols'] = autoFitCols(rows, layout.headers);
  setRowStyle(ws, headerRowIndex, layout.headers.length, headerStyle);
  
  // Style the totals row
  const totalLabelAddr = `${XLSX.utils.encode_col(layout.descriptionColumn)}${totalRowIndex + 1}`;
  setCellStyle(ws, totalLabelAddr, totalLabelStyle);
  setCellStyle(ws, debitAddr, debitTotalStyle);
  setCellStyle(ws, creditAddr, creditTotalStyle);

  XLSX.utils.book_append_sheet(workbook, ws, 'Merged Statement');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return { buffer, sheets: ['Merged Statement'] };
}

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
  let headersBold = false;
  let hasFormulas = false;

  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames.includes('Transactions')
      ? 'Transactions'
      : workbook.SheetNames[0];

    if (!sheetName) {
      errors.push('Missing Transactions sheet');
      return {
        valid: false,
        hasTransactions: false,
        hasAudit: false,
        hasSummary: false,
        headersBold,
        hasFormulas,
        errors,
      };
    }

    hasTransactions = true;
    const ws = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as SheetData;

    let headerRowIndex = -1;
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r] || [];
      const matches = TABLE_HEADER_VARIANTS.some((expectedHeaders) =>
        expectedHeaders.every((header, idx) => (row[idx] ?? '') === header)
      );
      if (matches) {
        headerRowIndex = r;
        break;
      }
    }

    if (headerRowIndex === -1) {
      errors.push('Missing transaction header row');
    } else {
      const headerCell = ws[XLSX.utils.encode_cell({ r: headerRowIndex, c: 0 })];
      headersBold = headerCell?.s?.font?.bold === true;
    }

    for (const addr in ws) {
      const cell = ws[addr];
      if (cell?.f) {
        hasFormulas = true;
        break;
      }
    }
  } catch (e) {
    errors.push(`Parse error: ${e instanceof Error ? e.message : 'Unknown'}`);
  }

  return {
    valid: errors.length === 0,
    hasTransactions,
    hasAudit: false,
    hasSummary: false,
    headersBold,
    hasFormulas,
    errors,
  };
}
