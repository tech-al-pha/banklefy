import { describe, expect, it } from "vitest";

import { __pdfTextInternals } from "@/components/uploadDemo/pdfUtils";

describe("pdf text quality assessment", () => {
  it("keeps short text-based statements on the text pipeline", () => {
    expect(
      __pdfTextInternals.assessParsedPdfTextQuality({
        pageCount: 2,
        transactionCount: 4,
        totalTextChars: 1500,
        pagesWithText: 2,
        balanceMismatchRatio: 0,
      }),
    ).toEqual({
      pdfType: "text-based",
      useClientTransactions: true,
    });
  });

  it("blocks noisy client-side parses even when selectable text exists", () => {
    expect(
      __pdfTextInternals.assessParsedPdfTextQuality({
        pageCount: 3,
        transactionCount: 18,
        totalTextChars: 3000,
        pagesWithText: 3,
        balanceMismatchRatio: 0.5,
      }),
    ).toEqual({
      pdfType: "text-based",
      useClientTransactions: false,
    });
  });

  it("falls back when dates look heavily out of order even if text is present", () => {
    expect(
      __pdfTextInternals.assessParsedPdfTextQuality({
        pageCount: 2,
        transactionCount: 6,
        totalTextChars: 2100,
        pagesWithText: 2,
        balanceMismatchRatio: 0,
        dateOrderMismatchRatio: 0.8,
      }),
    ).toEqual({
      pdfType: "text-based",
      useClientTransactions: false,
    });
  });

  it("does not treat continuation lines with embedded dates as row starts", () => {
    expect(
      __pdfTextInternals.rowStartPattern.test("00274626 22-02-2026 876201 443912XXXXXX2888 - S90699054"),
    ).toBe(false);
  });
});
