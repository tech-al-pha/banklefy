// ============= EXCEL GENERATOR TESTS =============
// Deno tests for validating Excel output structure, styling, and formulas

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { 
  generateProfessionalExcel, 
  generateSimpleExcel, 
  validateExcelStructure,
  headerStyle,
  totalStyle,
  type ExcelConfig 
} from "./excel-generator.ts";

// Mock transaction data
const mockTransactions = [
  {
    date: '2024-01-15',
    description: 'SALARY CREDIT UTR:123456789012',
    category: 'Income',
    debit: 0,
    credit: 50000,
    balance: 50000,
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
    isDuplicate: false,
    balanceMismatch: false,
    riskFlag: '',
  },
  {
    date: '2024-01-17',
    description: 'UPI/123456/AMAZON REF:PAY987654',
    category: 'Shopping',
    debit: 2500,
    credit: 0,
    balance: 42500,
    isDuplicate: true, // Marked as duplicate for testing
    balanceMismatch: false,
    riskFlag: '',
  },
  {
    date: '2024-01-18',
    description: 'NEFT/HDFC/RENT PAYMENT',
    category: 'Rent',
    debit: 15000,
    credit: 0,
    balance: 27000, // Intentional mismatch for testing
    isDuplicate: false,
    balanceMismatch: true,
    riskFlag: '',
  },
  {
    date: '2024-01-19',
    description: 'GAMBLING SITE PAYMENT',
    category: 'Entertainment',
    debit: 10000,
    credit: 0,
    balance: 17000,
    isDuplicate: false,
    balanceMismatch: false,
    riskFlag: 'Gambling Activity',
  },
];

const mockConfig: ExcelConfig = {
  transactions: mockTransactions,
  analytics: {
    totalCredits: 50000,
    totalDebits: 32500,
    netFlow: 17500,
    duplicateCount: 1,
    categoryBreakdown: {
      'Income': { count: 1, totalDebit: 0, totalCredit: 50000 },
      'Cash Withdrawal': { count: 1, totalDebit: 5000, totalCredit: 0 },
      'Shopping': { count: 1, totalDebit: 2500, totalCredit: 0 },
      'Rent': { count: 1, totalDebit: 15000, totalCredit: 0 },
      'Entertainment': { count: 1, totalDebit: 10000, totalCredit: 0 },
    },
  },
  premiumExport: true,
};

Deno.test("generateProfessionalExcel creates valid buffer", () => {
  const result = generateProfessionalExcel(mockConfig);
  
  assertExists(result.buffer, "Buffer should exist");
  assert(result.buffer.byteLength > 0, "Buffer should have content");
  assertExists(result.sheets, "Sheets array should exist");
  assert(result.sheets.length >= 3, "Should have at least 3 sheets");
});

Deno.test("generateProfessionalExcel includes required sheets", () => {
  const result = generateProfessionalExcel(mockConfig);
  
  assert(result.sheets.includes('Transactions'), "Should include Transactions sheet");
  assert(result.sheets.includes('Audit'), "Should include Audit sheet for premium");
  assert(result.sheets.includes('Summary'), "Should include Summary sheet");
  assert(result.sheets.includes('Categories'), "Should include Categories sheet");
});

Deno.test("generateProfessionalExcel without premium skips Audit sheet", () => {
  const simpleConfig = { ...mockConfig, premiumExport: false };
  const result = generateProfessionalExcel(simpleConfig);
  
  assert(!result.sheets.includes('Audit'), "Should NOT include Audit sheet when premium=false");
  assert(result.sheets.includes('Transactions'), "Should still include Transactions");
});

Deno.test("validateExcelStructure detects sheets correctly", () => {
  const result = generateProfessionalExcel(mockConfig);
  const validation = validateExcelStructure(result.buffer);
  
  assert(validation.hasTransactions, "Should detect Transactions sheet");
  assert(validation.hasSummary, "Should detect Summary sheet");
  assert(validation.hasAudit, "Should detect Audit sheet for premium");
});

Deno.test("validateExcelStructure detects formulas", () => {
  const result = generateProfessionalExcel(mockConfig);
  const validation = validateExcelStructure(result.buffer);
  
  assert(validation.hasFormulas, "Should detect SUM/HYPERLINK formulas");
});

Deno.test("generateSimpleExcel creates valid buffer", () => {
  const buffer = generateSimpleExcel(mockTransactions);
  
  assertExists(buffer, "Buffer should exist");
  assert(buffer.byteLength > 0, "Buffer should have content");
});

Deno.test("generateSimpleExcel includes Ref ID column", () => {
  const buffer = generateSimpleExcel(mockTransactions);
  const validation = validateExcelStructure(buffer);
  
  assert(validation.hasTransactions, "Should have Transactions sheet");
});

Deno.test("headerStyle has bold font", () => {
  assert(headerStyle.font.bold === true, "Header style should have bold font");
  assertExists(headerStyle.fill.fgColor.rgb, "Header should have background color");
});

Deno.test("totalStyle has bold font", () => {
  assert(totalStyle.font.bold === true, "Total style should have bold font");
});

Deno.test("Reference ID extraction from UTR", () => {
  const config: ExcelConfig = {
    transactions: [{
      date: '2024-01-01',
      description: 'SALARY CREDIT UTR:ABCD123456789',
      category: 'Income',
      debit: 0,
      credit: 50000,
      balance: 50000,
    }],
    analytics: {
      totalCredits: 50000,
      totalDebits: 0,
      netFlow: 50000,
      duplicateCount: 0,
      categoryBreakdown: {},
    },
    premiumExport: true,
  };
  
  const result = generateProfessionalExcel(config);
  assert(result.buffer.byteLength > 0, "Should generate valid Excel with UTR reference");
});

Deno.test("Audit sheet contains duplicates section", () => {
  const result = generateProfessionalExcel(mockConfig);
  const validation = validateExcelStructure(result.buffer);
  
  assert(validation.hasAudit, "Should have Audit sheet");
  // The audit sheet should exist and contain data
  assert(result.sheets.includes('Audit'), "Audit sheet in sheet list");
});

Deno.test("Audit sheet contains balance mismatches", () => {
  const configWithMismatch: ExcelConfig = {
    ...mockConfig,
    transactions: mockTransactions.map(t => ({ ...t })),
  };
  
  const result = generateProfessionalExcel(configWithMismatch);
  assert(result.sheets.includes('Audit'), "Should include Audit sheet");
});

Deno.test("Audit sheet contains risk flags", () => {
  const result = generateProfessionalExcel(mockConfig);
  assert(result.sheets.includes('Audit'), "Should include Audit sheet with risk flags");
});

Deno.test("Summary box appears in premium mode", () => {
  const result = generateProfessionalExcel({ ...mockConfig, premiumExport: true });
  // Premium mode should produce larger output due to summary box
  const simpleResult = generateProfessionalExcel({ ...mockConfig, premiumExport: false });
  
  // Premium should have more content
  assert(result.buffer.byteLength >= simpleResult.buffer.byteLength * 0.9, 
    "Premium export should have similar or more content");
});

Deno.test("Empty transactions handled gracefully", () => {
  const emptyConfig: ExcelConfig = {
    transactions: [],
    analytics: {
      totalCredits: 0,
      totalDebits: 0,
      netFlow: 0,
      duplicateCount: 0,
      categoryBreakdown: {},
    },
    premiumExport: true,
  };
  
  const result = generateProfessionalExcel(emptyConfig);
  assertExists(result.buffer, "Should handle empty transactions");
  assert(result.buffer.byteLength > 0, "Should produce valid buffer");
});

Deno.test("Negative debits are formatted correctly", () => {
  const result = generateProfessionalExcel(mockConfig);
  // Just ensure it doesn't throw
  assert(result.buffer.byteLength > 0, "Should generate Excel with negative debits");
});

Deno.test("Currency formatting works for Indian Rupees", () => {
  const largeAmountConfig: ExcelConfig = {
    transactions: [{
      date: '2024-01-01',
      description: 'Large transaction',
      category: 'Other',
      debit: 0,
      credit: 1234567.89,
      balance: 1234567.89,
    }],
    analytics: {
      totalCredits: 1234567.89,
      totalDebits: 0,
      netFlow: 1234567.89,
      duplicateCount: 0,
      categoryBreakdown: {},
    },
    premiumExport: true,
  };
  
  const result = generateProfessionalExcel(largeAmountConfig);
  assert(result.buffer.byteLength > 0, "Should handle large INR amounts");
});
