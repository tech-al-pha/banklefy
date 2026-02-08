// ============= EXCEL GENERATOR TESTS =============
// Deno tests for validating Excel output structure and required schema

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";
import { 
  generateProfessionalExcel, 
  generateSimpleExcel, 
  validateExcelStructure,
  headerStyle,
  totalStyle,
  type ExcelConfig 
} from "./excel-generator.ts";

const TABLE_HEADERS = [
  'Date',
  'Reference No / Transaction ID',
  'Description',
  'Debit',
  'Credit',
  'Balance',
  'Pricing Mismatch Flag',
  'Duplicate Flag',
];

// Mock transaction data
const mockTransactions = [
  {
    date: '2024-01-15',
    description: 'SALARY CREDIT UTR:123456789012',
    category: 'Income',
    debit: 0,
    credit: 50000,
    balance: 50000,
    refNumber: 'UTR123456789012',
    isDuplicate: false,
    balanceMismatch: false,
    riskFlag: '',
  },
  {
    date: '2024-01-16',
    description: 'ATM WITHDRAWAL CHQ#456789',
    category: 'Cash Withdrawal',
    debit: 5000,
    credit: 0,
    balance: 45000,
    refNumber: 'CHQ456789',
    isDuplicate: false,
    balanceMismatch: false,
    riskFlag: '',
  },
];

const mockConfig: ExcelConfig = {
  transactions: mockTransactions,
  analytics: {
    totalCredits: 50000,
    totalDebits: 5000,
    netFlow: 45000,
    duplicateCount: 0,
    categoryBreakdown: {
      'Income': { count: 1, totalDebit: 0, totalCredit: 50000 },
      'Cash Withdrawal': { count: 1, totalDebit: 5000, totalCredit: 0 },
    },
  },
  bankInfo: {
    bankName: 'Test Bank',
    currency: 'USD',
    accountNumber: '1234567890',
    accountHolder: 'John Doe',
  },
  premiumExport: true,
};

Deno.test("generateProfessionalExcel creates valid buffer", () => {
  const result = generateProfessionalExcel(mockConfig);
  
  assertExists(result.buffer, "Buffer should exist");
  assert(result.buffer.byteLength > 0, "Buffer should have content");
  assertEquals(result.sheets, ['Transactions']);
});

Deno.test("generateProfessionalExcel includes account details and headers", () => {
  const result = generateProfessionalExcel(mockConfig);
  const workbook = XLSX.read(result.buffer, { type: 'buffer' });
  const ws = workbook.Sheets['Transactions'];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as Array<Array<string | number>>;

  assertEquals(rows[0][0], 'Bank Name');
  assertEquals(rows[0][1], 'Test Bank');
  assertEquals(rows[1][0], 'Currency Type');
  assertEquals(rows[1][1], 'USD');
  assertEquals(rows[2][0], 'Account Number');
  assertEquals(rows[2][1], '1234567890');
  assertEquals(rows[3][0], 'Account Holder Name');
  assertEquals(rows[3][1], 'John Doe');

  const headerRow = rows.find((row) => row[0] === 'Date' && row[1] === 'Reference No / Transaction ID');
  assertExists(headerRow, 'Header row should be present');
  assertEquals(headerRow?.slice(0, TABLE_HEADERS.length), TABLE_HEADERS);
});

Deno.test("validateExcelStructure detects transactions sheet", () => {
  const result = generateProfessionalExcel(mockConfig);
  const validation = validateExcelStructure(result.buffer);
  
  assert(validation.hasTransactions, "Should detect Transactions sheet");
  assert(!validation.hasSummary, "Should not include Summary sheet");
  assert(!validation.hasAudit, "Should not include Audit sheet");
});

Deno.test("generateSimpleExcel creates valid buffer", () => {
  const buffer = generateSimpleExcel(mockTransactions);
  
  assertExists(buffer, "Buffer should exist");
  assert(buffer.byteLength > 0, "Buffer should have content");
});

Deno.test("headerStyle has bold font", () => {
  assert(headerStyle.font.bold === true, "Header style should have bold font");
  assertExists(headerStyle.fill.fgColor.rgb, "Header should have background color");
});

Deno.test("totalStyle has bold font", () => {
  assert(totalStyle.font.bold === true, "Total style should have bold font");
});
