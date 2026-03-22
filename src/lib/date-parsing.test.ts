import { describe, expect, it } from "vitest";
import { parseStatementDateToIso, parseStatementDateToTimestamp } from "./date-parsing";

describe("date parsing", () => {
  it("parses single-digit slash dates as DD/MM", () => {
    expect(parseStatementDateToIso("5/1/2026")).toBe("2026-01-05");
    expect(parseStatementDateToTimestamp("5/1/2026")).toBe(Date.UTC(2026, 0, 5));
  });

  it("parses month-name dates and ISO timestamps", () => {
    expect(parseStatementDateToIso("5 Jan 2026")).toBe("2026-01-05");
    expect(parseStatementDateToIso("April 2024")).toBe("2024-04-01");
    expect(parseStatementDateToIso("2026-03-21T00:00:00Z")).toBe("2026-03-21");
  });
});
