// Minor-unit helpers for exact debit/credit math (avoid floating-point drift).
// Use these ONLY where precise money totals / running balance are required.
const DEFAULT_SCALE = 2;

export const toMinorUnits = (value: number, scale = DEFAULT_SCALE): number => {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** scale;
  return Math.round((value + Number.EPSILON) * factor);
};

export const fromMinorUnits = (minor: number, scale = DEFAULT_SCALE): number => {
  const factor = 10 ** scale;
  return minor / factor;
};

export const sumMinorUnits = (values: number[], scale = DEFAULT_SCALE): number => {
  return values.reduce((sum, value) => sum + toMinorUnits(value, scale), 0);
};

export const sumMoney = (values: number[], scale = DEFAULT_SCALE): number => {
  return fromMinorUnits(sumMinorUnits(values, scale), scale);
};

export const roundMoney = (value: number, scale = DEFAULT_SCALE): number => {
  return fromMinorUnits(toMinorUnits(value, scale), scale);
};

export const roundPercent = (value: number, decimals = 2): number => {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};
