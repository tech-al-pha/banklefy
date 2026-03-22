import { describe, expect, it } from "vitest";
import {
  FULL_PAGE_OCR_COVERAGE_THRESHOLD,
  shouldUseFullPageOcrCoverage,
} from "./ocr-routing.ts";

describe("ocr-routing", () => {
  it("forces full coverage for 10-page PDFs", () => {
    expect(shouldUseFullPageOcrCoverage(FULL_PAGE_OCR_COVERAGE_THRESHOLD)).toBe(true);
    expect(shouldUseFullPageOcrCoverage(FULL_PAGE_OCR_COVERAGE_THRESHOLD - 1)).toBe(false);
  });

  it("forces full coverage when a password is provided", () => {
    expect(shouldUseFullPageOcrCoverage(1, "secret")).toBe(true);
  });
});
