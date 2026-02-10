// ============= MONEY HELPERS TESTS =============
// Verifies exact decimal totals for debit/credit math.

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { fromMinorUnits, sumMoney, toMinorUnits } from "./money.ts";

Deno.test("sumMoney preserves decimal precision (0.05 + 0.05 + 82.85 = 82.95)", () => {
  const total = sumMoney([0.05, 0.05, 82.85]);
  assertEquals(total, 82.95);
});

Deno.test("sumMoney avoids floating point drift (0.1 + 0.2 = 0.3)", () => {
  const total = sumMoney([0.1, 0.2]);
  assertEquals(total, 0.3);
});

Deno.test("toMinorUnits/fromMinorUnits are reversible at 2 decimals", () => {
  const value = 1234.56;
  assertEquals(fromMinorUnits(toMinorUnits(value)), value);
});
