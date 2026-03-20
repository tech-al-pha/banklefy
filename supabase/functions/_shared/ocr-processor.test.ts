import { describe, expect, it } from "vitest";
import { normalizeOcrRawTransactions, scoreRunningBalanceFlow } from "./ocr-processor.ts";

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
});
