import ExcelJS from 'https://esm.sh/exceljs@4.4.0';
import type {
  Transaction,
  FraudAlert,
  UnderwritingResult,
  LiquidityAnalysis,
  ReconciliationResult,
} from '../_shared/financial-engine.ts';
import { fromMinorUnits, toMinorUnits } from '../_shared/money.ts';
import { chooseStatementPeriodLabel } from './statement-period.ts';

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

type SheetValue = string | number | boolean | null | undefined;
type SheetRow = SheetValue[];
type SheetData = SheetRow[];

type ColumnLayout = {
  headers: string[];
  includeReferenceColumn: boolean;
  descriptionColumn: number;
  referenceColumn: number | null;
  debitColumn: number;
  creditColumn: number;
  balanceColumn: number;
  pricingMismatchColumn: number;
  duplicateFlagColumn: number;
};

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

const excelHeaderStyle = {
  font: { bold: true, color: { argb: `FF${THEME.headerFg}` } },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${THEME.headerBg}` } },
  alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
  border: {
    top: { style: 'thin', color: { argb: `FF${THEME.border}` } },
    bottom: { style: 'thin', color: { argb: `FF${THEME.border}` } },
    left: { style: 'thin', color: { argb: `FF${THEME.border}` } },
    right: { style: 'thin', color: { argb: `FF${THEME.border}` } },
  },
} as const;

const excelTotalLabelStyle = {
  font: { bold: true },
  alignment: { horizontal: 'right' },
  border: {
    top: { style: 'double', color: { argb: `FF${THEME.border}` } },
    bottom: { style: 'double', color: { argb: `FF${THEME.border}` } },
  },
} as const;

const excelTotalDebitStyle = {
  font: { bold: true, color: { argb: `FF${THEME.debitRed}` } },
  alignment: { horizontal: 'right' },
  border: {
    top: { style: 'double', color: { argb: `FF${THEME.border}` } },
    bottom: { style: 'double', color: { argb: `FF${THEME.border}` } },
  },
} as const;

const excelTotalCreditStyle = {
  font: { bold: true, color: { argb: `FF${THEME.creditGreen}` } },
  alignment: { horizontal: 'right' },
  border: {
    top: { style: 'double', color: { argb: `FF${THEME.border}` } },
    bottom: { style: 'double', color: { argb: `FF${THEME.border}` } },
  },
} as const;

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

const normalizeToken = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]/g, '');

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
    referenceColumn: includeReferenceColumn ? 1 : null,
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

function toMoneyCell(value: unknown): number | string {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return fromMinorUnits(toMinorUnits(value));
  }
  return value === 0 ? 0 : '';
}

function buildTransactionRows(transactions: Transaction[], layout: ColumnLayout): SheetData {
  return transactions.map((transaction) => {
    const row: SheetRow = [transaction.date || ''];

    if (layout.includeReferenceColumn) {
      row.push(transaction.refNumber || '');
    }

    row.push(
      transaction.description || '',
      toMoneyCell(transaction.debit),
      toMoneyCell(transaction.credit),
      toMoneyCell(transaction.balance),
      transaction.balanceMismatch ? 'YES' : '',
      transaction.isDuplicate ? 'YES' : '',
    );

    return row;
  });
}

function buildTotalsRow(transactions: Transaction[], layout: ColumnLayout): SheetRow {
  const row: SheetRow = Array(layout.headers.length).fill('');
  const totalDebit = transactions.reduce((sum, transaction) => sum + (Number(transaction.debit) || 0), 0);
  const totalCredit = transactions.reduce((sum, transaction) => sum + (Number(transaction.credit) || 0), 0);
  row[layout.descriptionColumn] = 'TOTAL';
  row[layout.debitColumn] = toMoneyCell(totalDebit);
  row[layout.creditColumn] = toMoneyCell(totalCredit);
  return row;
}

function measureColumnWidths(rows: SheetData, layout: ColumnLayout, headerRowIndex: number): Array<{ width: number }> {
  const maxColumns = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const widths: Array<{ width: number }> = [];
  const hasMetadataRows = headerRowIndex > 0;

  for (let column = 0; column < maxColumns; column += 1) {
    let maxLength = 8;
    for (const row of rows) {
      const cell = row[column];
      const value = cell === null || cell === undefined ? '' : String(cell);
      if (value.length > maxLength) {
        maxLength = value.length;
      }
    }
    let width = Math.min(Math.max(maxLength + 2, 8), 70);

    if (hasMetadataRows && column === 0) {
      width = Math.max(width, 22);
    }
    if (hasMetadataRows && column === 1) {
      width = Math.max(width, 34);
    }
    if (column === 0 && headerRowIndex >= 0) {
      width = Math.max(width, 14);
    }
    if (layout.referenceColumn === column) {
      width = Math.max(width, 28);
    }
    if (layout.descriptionColumn === column) {
      width = Math.max(width, 56);
    }
    if ([layout.debitColumn, layout.creditColumn, layout.balanceColumn].includes(column)) {
      width = Math.max(width, 14);
    }
    if ([layout.pricingMismatchColumn, layout.duplicateFlagColumn].includes(column)) {
      width = Math.max(width, 18);
    }

    widths.push({ width: Math.min(width, 80) });
  }

  return widths;
}

function applyWorksheetStyling(
  worksheet: ExcelJS.Worksheet,
  rows: SheetData,
  layout: ColumnLayout,
  headerRowIndex: number,
  totalRowIndex: number,
  dataStartRow: number,
  dataEndRow: number,
) {
  const headerRow = worksheet.getRow(headerRowIndex + 1);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: `FF${THEME.headerFg}` } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${THEME.headerBg}` } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: `FF${THEME.border}` } },
      bottom: { style: 'thin', color: { argb: `FF${THEME.border}` } },
      left: { style: 'thin', color: { argb: `FF${THEME.border}` } },
      right: { style: 'thin', color: { argb: `FF${THEME.border}` } },
    };
  });

  const totalRow = worksheet.getRow(totalRowIndex + 1);
  const totalLabelCell = totalRow.getCell(layout.descriptionColumn + 1);
  totalLabelCell.font = { bold: true };
  totalLabelCell.alignment = { horizontal: 'right' };
  totalLabelCell.border = {
    top: { style: 'double', color: { argb: `FF${THEME.border}` } },
    bottom: { style: 'double', color: { argb: `FF${THEME.border}` } },
  };

  const debitAddr = `${columnLetter(layout.debitColumn)}${totalRowIndex + 1}`;
  const creditAddr = `${columnLetter(layout.creditColumn)}${totalRowIndex + 1}`;
  const debitCell = worksheet.getCell(debitAddr);
  const creditCell = worksheet.getCell(creditAddr);
  debitCell.font = { bold: true, color: { argb: `FF${THEME.debitRed}` } };
  creditCell.font = { bold: true, color: { argb: `FF${THEME.creditGreen}` } };
  debitCell.alignment = { horizontal: 'right' };
  creditCell.alignment = { horizontal: 'right' };
  debitCell.border = {
    top: { style: 'double', color: { argb: `FF${THEME.border}` } },
    bottom: { style: 'double', color: { argb: `FF${THEME.border}` } },
  };
  creditCell.border = {
    top: { style: 'double', color: { argb: `FF${THEME.border}` } },
    bottom: { style: 'double', color: { argb: `FF${THEME.border}` } },
  };

  for (let rowIndex = dataStartRow; rowIndex <= dataEndRow; rowIndex += 1) {
    for (const columnIndex of [layout.debitColumn, layout.creditColumn, layout.balanceColumn]) {
      const cell = worksheet.getCell(rowIndex, columnIndex + 1);
      cell.numFmt = MONEY_FORMAT;
      cell.alignment = { horizontal: 'right' };

      if (columnIndex === layout.debitColumn && typeof cell.value === 'number' && cell.value > 0) {
        cell.font = { color: { argb: `FF${THEME.debitRed}` } };
      }
      if (columnIndex === layout.creditColumn && typeof cell.value === 'number' && cell.value > 0) {
        cell.font = { color: { argb: `FF${THEME.creditGreen}` } };
      }
    }

    const dateCell = worksheet.getCell(rowIndex, 1);
    dateCell.alignment = { horizontal: 'left' };

    if (layout.referenceColumn != null) {
      worksheet.getCell(rowIndex, layout.referenceColumn + 1).alignment = {
        horizontal: 'left',
        vertical: 'top',
        wrapText: true,
      };
    }

    worksheet.getCell(rowIndex, layout.descriptionColumn + 1).alignment = {
      horizontal: 'left',
      vertical: 'top',
      wrapText: true,
    };
  }

  debitCell.numFmt = MONEY_FORMAT;
  creditCell.numFmt = MONEY_FORMAT;

  for (let rowIndex = 1; rowIndex < headerRowIndex + 1; rowIndex += 1) {
    const labelCell = worksheet.getCell(rowIndex, 1);
    const valueCell = worksheet.getCell(rowIndex, 2);
    labelCell.font = { bold: true };
    labelCell.alignment = { horizontal: 'left' };
    valueCell.alignment = { horizontal: 'left', wrapText: true };
  }

  worksheet.columns = measureColumnWidths(rows, layout, headerRowIndex);
  worksheet.views = [{ state: 'frozen', ySplit: headerRowIndex + 1 }];
}

function columnLetter(index: number): string {
  let n = index + 1;
  let result = '';
  while (n > 0) {
    const remainder = (n - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    n = Math.floor((n - remainder) / 26);
  }
  return result;
}

async function buildWorkbook(
  sheetName: string,
  rows: SheetData,
  layout: ColumnLayout,
): Promise<ExcelGenerationResult> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Banklefy';
  workbook.created = new Date();
  const worksheet = workbook.addWorksheet(sheetName);
  worksheet.addRows(rows);

  const headerRowIndex = rows.findIndex((row) =>
    TABLE_HEADER_VARIANTS.some((expectedHeaders) =>
      expectedHeaders.every((header, idx) => (row[idx] ?? '') === header)
    )
  );
  const totalRowIndex = rows.length - 1;
  const dataStartRow = headerRowIndex + 2;
  const dataEndRow = totalRowIndex + 1;

  applyWorksheetStyling(worksheet, rows, layout, headerRowIndex, totalRowIndex, dataStartRow, dataEndRow);

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer: toArrayBuffer(buffer),
    sheets: [sheetName],
  };
}

function toArrayBuffer(value: unknown): ArrayBuffer {
  if (value instanceof ArrayBuffer) return value;
  if (ArrayBuffer.isView(value)) {
    return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer;
  }
  throw new Error('Unexpected Excel buffer type');
}

export async function generateProfessionalExcel(config: ExcelConfig): Promise<ExcelGenerationResult> {
  const layout = buildColumnLayout(config.transactions);
  const rows: SheetData = [];
  const statementPeriod = chooseStatementPeriodLabel(config.bankInfo?.statementPeriod, config.transactions);

  rows.push(...buildAccountRows(config.bankInfo, statementPeriod));
  rows.push(layout.headers);
  const txnRows = buildTransactionRows(config.transactions, layout);
  rows.push(...txnRows);
  rows.push(buildTotalsRow(config.transactions, layout));

  const workbook = await buildWorkbook('Transactions', rows, layout);
  return workbook;
}

export async function generateSimpleExcel(transactions: Transaction[]): Promise<ArrayBuffer> {
  const layout = buildColumnLayout(transactions);
  const rows: SheetData = [layout.headers, ...buildTransactionRows(transactions, layout), buildTotalsRow(transactions, layout)];
  const workbook = await buildWorkbook('Transactions', rows, layout);
  return workbook.buffer;
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

export async function generateMergedStatementsExcel(config: MergedExcelConfig): Promise<ExcelGenerationResult> {
  const layout = buildColumnLayout(config.transactions);
  const rows: SheetData = [];
  const statementPeriod = chooseStatementPeriodLabel(
    config.statementPeriod || config.bankInfo.statementPeriod,
    config.transactions,
  );

  rows.push(...buildAccountRows(config.bankInfo, statementPeriod));
  rows.push(layout.headers);
  const txnRows = buildTransactionRows(config.transactions, layout);
  rows.push(...txnRows);
  rows.push(buildTotalsRow(config.transactions, layout));

  const workbook = await buildWorkbook('Merged Statement', rows, layout);
  return workbook;
}

export async function validateExcelStructure(buffer: ArrayBuffer): Promise<{
  valid: boolean;
  hasTransactions: boolean;
  hasAudit: boolean;
  hasSummary: boolean;
  headersBold: boolean;
  hasFormulas: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  let hasTransactions = false;
  let headersBold = false;
  let hasFormulas = false;

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheetName = workbook.worksheets.find((worksheet) => worksheet.name === 'Transactions')?.name
      ?? workbook.worksheets[0]?.name;

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

    const worksheet = workbook.getWorksheet(sheetName);
    if (!worksheet) {
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
    const rows: SheetData = [];
    worksheet.eachRow({ includeEmpty: true }, (row) => {
      const values = row.values as unknown[];
      rows.push(
        values.slice(1).map((cell) => (cell === null || cell === undefined ? '' : (cell as SheetValue))) as SheetRow,
      );
    });

    let headerRowIndex = -1;
    for (let r = 0; r < rows.length; r += 1) {
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
      const headerCell = worksheet.getRow(headerRowIndex + 1).getCell(1);
      headersBold = headerCell.font?.bold === true;
    }

    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        if (cell?.value && typeof cell.value === 'object' && !Array.isArray(cell.value) && 'formula' in cell.value) {
          hasFormulas = true;
        }
      });
    });
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
