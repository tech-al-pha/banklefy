import { describe, expect, it } from "vitest";
import { chooseStatementPeriodLabel } from "./statement-period.ts";

describe("statement-period", () => {
  it("keeps a valid header period that covers the transaction span", () => {
    const transactions = [
      { date: "2026-01-01" },
      { date: "2026-03-20" },
    ];

    expect(
      chooseStatementPeriodLabel("January 01, 2026 - March 20, 2026", transactions),
    ).toBe("January 01, 2026 - March 20, 2026");
  });

  it("falls back to the transaction span when the header period is too narrow", () => {
    const transactions = [
      { date: "2026-01-01" },
      { date: "2026-03-20" },
    ];

    expect(
      chooseStatementPeriodLabel("11-03-2026 - 14-03-2026", transactions),
    ).toBe("01-01-2026 - 20-03-2026");
  });
});
