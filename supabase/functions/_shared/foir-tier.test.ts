import { describe, expect, it } from "vitest";
import { buildUnderwritingPayload, resolveUnderwritingTier } from "./foir-tier.ts";
import type { UnderwritingResult } from "./financial-engine.ts";

const underwriting: UnderwritingResult = {
  salaryCredits: [
    {
      date: "2024-01-05",
      amount: 5000,
      description: "Salary credit",
      rowIndex: 0,
    },
  ],
  emiDebits: [
    {
      date: "2024-01-10",
      amount: 1200,
      description: "Home loan EMI",
      rowIndex: 1,
      loanType: "home",
    },
  ],
  foir: {
    score: 42,
    status: "good",
    avgMonthlyIncome: 5000,
    avgMonthlyEMI: 1200,
    maxNewEMI: 800,
    loanEligibility: 250000,
    disposableIncome: 3800,
    foirCapPercent: 60,
    availableEMIHeadroom: 900,
    stressAdjustedHeadroom: 700,
    assumedAnnualRate: 18,
    assumedTenureMonths: 60,
  },
  eligibility: {
    status: "good",
    message: "Eligible",
    factors: ["stable income"],
  },
  monthlyBreakdown: [
    {
      month: "2024-01",
      salaryIncome: 5000,
      emiOutflow: 1200,
    },
  ],
  emiByLoanType: {
    home: { count: 1, totalAmount: 1200 },
  },
};

describe("foir-tier", () => {
  it("resolves underwriting tiers from plan types", () => {
    expect(resolveUnderwritingTier("free")).toBe("none");
    expect(resolveUnderwritingTier("per_page_pack_basic")).toBe("pro");
    expect(resolveUnderwritingTier("per_page_power")).toBe("advanced");
    expect(resolveUnderwritingTier("custom", true)).toBe("advanced");
  });

  it("strips lower-tier payloads and preserves advanced details for advanced users", () => {
    const basic = buildUnderwritingPayload(underwriting, "basic");
    const advanced = buildUnderwritingPayload(underwriting, "advanced");

    expect(buildUnderwritingPayload(underwriting, "none")).toBeNull();

    expect(basic).toMatchObject({
      tier: "basic",
      tierLabel: "Basic",
      summary: {
        totalSalaryDetected: 1,
        totalEMIDetected: 1,
      },
      eligibility: {
        factors: [],
      },
    });
    expect(basic?.salaryCredits).toEqual([]);
    expect(basic?.emiDebits).toEqual([]);
    expect(basic?.monthlyBreakdown).toEqual([]);
    expect(basic?.summary.emiByLoanType).toEqual({});
    expect(basic?.advancedSignals).toBeUndefined();

    expect(advanced).toMatchObject({
      tier: "advanced",
      tierLabel: "Advanced",
      advancedSignals: {
        disposableIncome: 3800,
        foirCapPercent: 60,
        availableEMIHeadroom: 900,
        stressAdjustedHeadroom: 700,
        assumedAnnualRate: 18,
        assumedTenureMonths: 60,
      },
    });
    expect(advanced?.salaryCredits).toEqual([
      {
        date: "2024-01-05",
        amount: 5000,
        description: "Salary credit",
      },
    ]);
    expect(advanced?.emiDebits).toEqual([
      {
        date: "2024-01-10",
        amount: 1200,
        description: "Home loan EMI",
        loanType: "home",
      },
    ]);
    expect(advanced?.monthlyBreakdown).toEqual(underwriting.monthlyBreakdown);
  });
});
