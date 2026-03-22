import { describe, expect, it } from "vitest";
import { buildJsonExport, buildMt940Export } from "./export-formatters.ts";

describe("export-formatters", () => {
  it("builds a sanitized JSON export payload", () => {
    const json = buildJsonExport({
      transactions: [
        {
          date: "2024-01-01",
          description: "Salary\nPayment",
          category: "Income",
          debit: 0,
          credit: 100.005,
          balance: 100.005,
          refNumber: "REF-1",
        },
      ],
      bankMetadata: {
        bankName: "Demo\nBank",
        accountNumber: "123456",
        accountHolder: " Alice ",
        currency: "usd",
        iban: "GB123",
        statementPeriod: "Jan 2024",
        openingBalance: 99.995,
        closingBalance: 100.005,
      },
      summary: {
        totalCredits: 100.005,
        totalDebits: 0,
        netFlow: 100.005,
      },
    });

    const payload = JSON.parse(json) as {
      currency: string;
      bankInfo: { bankName: string; openingBalance: number; closingBalance: number };
      summary: { totalCredits: number; totalDebits: number; netFlow: number };
      transactions: Array<{ description: string; credit: number; balance: number }>;
    };

    expect(payload.currency).toBe("USD");
    expect(payload.bankInfo.bankName).toBe("Demo Bank");
    expect(payload.bankInfo.openingBalance).toBe(100);
    expect(payload.bankInfo.closingBalance).toBe(100.01);
    expect(payload.summary.totalCredits).toBe(100.01);
    expect(payload.summary.totalDebits).toBe(0);
    expect(payload.summary.netFlow).toBe(100.01);
    expect(payload.transactions[0].description).toBe("Salary Payment");
    expect(payload.transactions[0].credit).toBe(100.01);
  });

  it("builds MT940 text in chronological order with inferred balances", () => {
    const mt940 = buildMt940Export({
      transactions: [
        {
          date: "2024-01-02",
          description: "Salary payment",
          debit: 0,
          credit: 25,
          balance: 115,
          refNumber: "REF-2",
        },
        {
          date: "2024-01-01",
          description: "ATM withdrawal",
          debit: 10,
          credit: 0,
          balance: 90,
          refNumber: "REF-1",
        },
      ],
      bankMetadata: {
        accountNumber: "AE12",
        currency: "usd",
      },
      statementReference: "STATEMENT-01",
    });

    expect(mt940).toContain(":20:STATEMENT01");
    expect(mt940).toContain(":25:AE12");
    expect(mt940).toContain(":60F:C240101USD100,00");
    expect(mt940).toContain(":61:240101D10,00NTRF//REF1");
    expect(mt940).toContain(":61:240102C25,00NTRF//REF2");
    expect(mt940).toContain(":86:ATM withdrawal");
    expect(mt940).toContain(":86:Salary payment");
    expect(mt940).toContain(":62F:C240102USD115,00");
  });

  it("handles single-digit slash dates as DD/MM", () => {
    const mt940 = buildMt940Export({
      transactions: [
        {
          date: "5/1/2026",
          description: "Salary payment",
          debit: 0,
          credit: 25,
          balance: 115,
          refNumber: "REF-2",
        },
      ],
      bankMetadata: {
        accountNumber: "AE12",
        currency: "usd",
      },
      statementReference: "STATEMENT-01",
    });

    expect(mt940).toContain(":61:260105C25,00NTRF//REF2");
    expect(mt940).toContain(":62F:C260105USD115,00");
  });
});
