import { describe, expect, it } from "vitest";
import { validateFile, sanitizeFilename } from "./fileValidation";
import { formatProcessingDuration, getConversionResultStoragePath } from "./conversion-history";

describe("conversion flow helpers", () => {
  it("validates uploaded files and normalizes names", () => {
    const file = {
      name: "Bank Statement 01.pdf",
      size: 1024,
      type: "application/octet-stream",
    } as File;

    const result = validateFile(file);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      name: "Bank_Statement_01.pdf",
      size: 1024,
      type: "application/pdf",
    });
    expect(sanitizeFilename("bad/name\\here?.pdf")).toBe("badnamehere_.pdf");
  });

  it("rejects oversized files", () => {
    const file = {
      name: "too-big.pdf",
      size: 10 * 1024 * 1024 + 1,
      type: "application/pdf",
    } as File;

    const result = validateFile(file);

    expect(result.success).toBe(false);
    expect(result.error).toContain("10MB");
  });

  it("builds the result storage path and formats durations", () => {
    expect(getConversionResultStoragePath("user_123", "conv_456")).toBe("user_123/conv_456/result.xlsx");
    expect(formatProcessingDuration(null)).toBe("-");
    expect(formatProcessingDuration(42)).toBe("42 ms");
    expect(formatProcessingDuration(1550)).toBe("1.6s");
    expect(formatProcessingDuration(65_000)).toBe("1m 05s");
  });
});
