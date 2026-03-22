import { describe, expect, it } from "vitest";
import { reconcileBalances } from "./financial-engine.ts";
import { sanitizeTransactions } from "./transaction-sanitizer.ts";

describe("transaction-sanitizer debit/credit repair", () => {
  it("sorts statement rows before balance correction and fixes swapped debit/credit sides", () => {
    const rows = [
      {
        date: "2024-01-03",
        description: "Card settlement",
        category: "Other",
        debit: 200,
        credit: 0,
        balance: 5700,
      },
      {
        date: "2024-01-01",
        description: "Salary credit",
        category: "Other",
        debit: 1000,
        credit: 0,
        balance: 6000,
      },
      {
        date: "2024-01-02",
        description: "ATM withdrawal",
        category: "Other",
        debit: 0,
        credit: 500,
        balance: 5500,
      },
    ];

    const sanitized = sanitizeTransactions(rows);

    expect(sanitized.map((row) => row.date)).toEqual([
      "2024-01-01",
      "2024-01-02",
      "2024-01-03",
    ]);
    expect(sanitized[0].debit).toBe(0);
    expect(sanitized[0].credit).toBe(1000);
    expect(sanitized[1].debit).toBe(500);
    expect(sanitized[1].credit).toBe(0);
    expect(sanitized[2].debit).toBe(0);
    expect(sanitized[2].credit).toBe(200);
    expect(reconcileBalances(sanitized).totalMismatches).toBe(0);
  });
});
