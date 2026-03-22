import { describe, expect, it, vi } from "vitest";
import { buildMt940, buildStatementCsv, downloadTextFile } from "./statement-export";

describe("statement export helpers", () => {
  it("builds CSV output with escaped values and totals", () => {
    const csv = buildStatementCsv([
      {
        date: "2026-03-19",
        description: 'Coffee, "Beans"',
        category: "Food",
        debit: 12.5,
        credit: 0,
        balance: 987.5,
        refNumber: "REF-1",
      },
    ]);

    const rows = csv.split("\n");

    expect(rows[0]).toBe("Date,Description,Category,Debit,Credit,Balance,Reference");
    expect(rows[1]).toContain('"Coffee, ""Beans"""');
    expect(rows[2]).toBe(",TOTAL,,12.50,0.00,,");
  });

  it("builds MT940 output from transactions", () => {
    const mt940 = buildMt940({
      transactions: [
        {
          date: "2024-01-01",
          description: "Salary payment",
          credit: 100,
          debit: 0,
          balance: 1100,
          refNumber: "REF1",
        },
      ],
      bankInfo: {
        accountNumber: "1234567890",
        currency: "INR",
        openingBalance: 1000,
        closingBalance: 1100,
      },
      currencyCode: "INR",
      statementReference: "ABC123",
    });

    expect(mt940).toContain(":20:ABC123");
    expect(mt940).toContain(":25:1234567890");
    expect(mt940).toContain(":61:240101C100,00NTRF//REF1");
    expect(mt940).toContain(":86:Salary payment");
    expect(mt940).toContain(":62F:C240101INR1100,00");
  });

  it("treats single-digit slash dates as DD/MM", () => {
    const mt940 = buildMt940({
      transactions: [
        {
          date: "5/1/2026",
          description: "Salary payment",
          credit: 100,
          debit: 0,
          balance: 1100,
          refNumber: "REF1",
        },
      ],
      bankInfo: {
        accountNumber: "1234567890",
        currency: "INR",
        openingBalance: 1000,
        closingBalance: 1100,
      },
      currencyCode: "INR",
      statementReference: "ABC123",
    });

    expect(mt940).toContain(":61:260105C100,00NTRF//REF1");
    expect(mt940).toContain(":62F:C260105INR1100,00");
  });

  it("downloads text content through an anchor element", () => {
    const createObjectUrlSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock");
    const revokeObjectUrlSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    downloadTextFile("hello world", "statement.csv", "text/csv");

    expect(createObjectUrlSpy).toHaveBeenCalledWith(expect.any(Blob));
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith("blob:mock");
  });
});
