import { describe, expect, it } from "vitest";
import {
  extractBankMetadataFromOcrText,
  normalizeOcrRawTransactions,
  scoreRunningBalanceFlow,
} from "./ocr-processor.ts";

describe("ocr-processor numeric repair", () => {
  it("repairs a missing-zero debit using the running balance", () => {
    const rows = normalizeOcrRawTransactions([
      {
        date: "2024-01-01",
        description: "Opening balance",
        credit: 10000,
        balance: 10000,
      },
      {
        date: "2024-01-02",
        description: "Card payment",
        debit: 100,
        balance: 9000,
      },
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[1].debit).toBe(1000);
    expect(rows[1].credit).toBe(0);
    expect(scoreRunningBalanceFlow(rows).mismatchRatio).toBe(0);
  });

  it("prefers the amount that matches balance flow when Groq swaps the visible column amount", () => {
    const rows = normalizeOcrRawTransactions([
      {
        date: "2024-01-01",
        description: "Opening balance",
        credit: 5000,
        balance: 5000,
      },
      {
        date: "2024-01-02",
        description: "Merchant settlement",
        debit: 900,
        credit: 1200,
        balance: 4100,
      },
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[1].debit).toBe(900);
    expect(rows[1].credit).toBe(0);
    expect(scoreRunningBalanceFlow(rows).mismatchRatio).toBe(0);
  });

  it("preserves OCR rows that are missing the amount and reconstructs them from balance flow", () => {
    const rows = normalizeOcrRawTransactions([
      {
        date: "2024-01-01",
        description: "Opening balance",
        credit: 8015.67,
        balance: 8015.67,
      },
      {
        date: "2024-01-02",
        description: "Salary credit",
        credit: 39000,
        balance: 47015.67,
      },
      {
        date: "2024-01-03",
        description: "Transfer",
        debit: 47000,
        balance: 15.67,
      },
      {
        date: "2024-01-04",
        description: "CashDep Chgs",
        balance: 0.01,
      },
      {
        date: "2024-01-05",
        description: "IMPS credit",
        balance: 696967.01,
      },
    ]);

    expect(rows).toHaveLength(5);
    expect(rows[3].debit).toBe(15.66);
    expect(rows[3].credit).toBe(0);
    expect(rows[4].credit).toBe(696967.0);
    expect(rows[4].debit).toBe(0);
    expect(scoreRunningBalanceFlow(rows).mismatchRatio).toBe(0);
  });

  it("extracts the statement header period and ignores transaction-row date ranges", () => {
    const metadata = extractBankMetadataFromOcrText(
      [
        "Statement of Transactions in Savings Account Number: 055801621094 in INR for the period January 01, 2026 - March 20, 2026",
        "DATE MODE PARTICULARS DEPOSITS WITHDRAWALS BALANCE",
        "11-03-2026 - 14-03-2026 UPI/TEST/123 100.00 0.00 200.00",
      ].join("\n"),
    );

    expect(metadata?.statementPeriod).toBe("2026-01-01 - 2026-03-20");
  });

  it("prefers the statement header bank name over merchant noise", () => {
    const metadata = extractBankMetadataFromOcrText(
      [
        "Statement of Account",
        "State Bank of India",
        "Transaction note: payment made at HDFC merchant",
        "Another narration mentioning HDFC Bank as beneficiary",
      ].join("\n"),
    );

    expect(metadata?.bankName).toBe("State Bank of India");
  });
});
