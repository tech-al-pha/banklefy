import { describe, expect, it } from "vitest";

import {
  extractAnchoredAmountsFromLayout,
  type PdfAmountColumnLayout,
  type PdfAmountLineEntry,
  type PdfAmountToken,
} from "../../supabase/functions/_shared/pdf-column-layout";

const layout: PdfAmountColumnLayout = {
  debitCenter: 335,
  creditCenter: 415,
  balanceCenter: 501,
  source: "header",
};

const options = {
  inferSide: (text: string, amount: number) => {
    const normalized = text.toLowerCase();
    if (normalized.includes("purchase") || normalized.includes("fee") || normalized.includes("withdrawal")) {
      return { debit: Math.abs(amount), credit: 0 };
    }
    return { debit: 0, credit: Math.abs(amount) };
  },
  isAmountToken: (text: string) => /^[0-9][0-9,]*(?:\.\d+)?$/.test(text),
  parseAmount: (text: string) => Number(text.replace(/,/g, "")),
};

type TestEntry = PdfAmountLineEntry<PdfAmountToken>;

describe("extractAnchoredAmountsFromLayout", () => {
  it("ignores left-side reference numbers and keeps amount-only rows open for a later balance line", () => {
    const entry: TestEntry = {
      text: "2026-04-01 Visa Purchase 903389 030POSB26091066q 70",
      tokens: [
        { x: 100, text: "903389" },
        { x: 227, text: "030POSB26091066q" },
        { x: 333, text: "70" },
      ],
    };

    expect(extractAnchoredAmountsFromLayout(entry, layout, options)).toEqual({
      debit: 70,
      credit: 0,
      balance: 0,
    });
  });

  it("extracts a standard amount-plus-balance row without treating reference fragments as money", () => {
    const entry: TestEntry = {
      text: "2026-03-31 099REFEAED 00002 10 95,054.39",
      tokens: [
        { x: 100, text: "099REFEAED" },
        { x: 170, text: "00002" },
        { x: 413, text: "10" },
        { x: 501, text: "95,054.39" },
      ],
    };

    expect(extractAnchoredAmountsFromLayout(entry, layout, options)).toEqual({
      debit: 0,
      credit: 10,
      balance: 95054.39,
    });
  });
});
