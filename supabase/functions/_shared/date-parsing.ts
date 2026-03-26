const MONTH_LOOKUP: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const normalizeYearToken = (yearToken: string): number => {
  if (yearToken.length !== 2) return Number(yearToken);
  const parsed = Number(yearToken);
  if (!Number.isFinite(parsed)) return Number(`20${yearToken}`);
  return parsed < 50 ? Number(`20${yearToken}`) : Number(`19${yearToken}`);
};

const parseDateParts = (value: string): { year: number; month: number; day: number } | null => {
  const clean = value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return null;

  const iso = clean.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:[T\s].*)?$/);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return { year, month, day };
    }
  }

  const dmy = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const year = normalizeYearToken(dmy[3]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return { year, month, day };
    }
  }

  const dayMonthYear = clean.match(/^(\d{1,2})\s+([A-Za-z]{3,9}),?\s+(\d{2,4})$/);
  if (dayMonthYear) {
    const day = Number(dayMonthYear[1]);
    const month = MONTH_LOOKUP[dayMonthYear[2].toLowerCase()];
    const year = normalizeYearToken(dayMonthYear[3]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return { year, month, day };
    }
  }

  const monthDayYear = clean.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{2,4})$/);
  if (monthDayYear) {
    const month = MONTH_LOOKUP[monthDayYear[1].toLowerCase()];
    const day = Number(monthDayYear[2]);
    const year = normalizeYearToken(monthDayYear[3]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return { year, month, day };
    }
  }

  const monthYear = clean.match(/^([A-Za-z]{3,9})\s+(\d{2,4})$/);
  if (monthYear) {
    const month = MONTH_LOOKUP[monthYear[1].toLowerCase()];
    const year = normalizeYearToken(monthYear[2]);
    if (month >= 1 && month <= 12) {
      return { year, month, day: 1 };
    }
  }

  return null;
};

export const parseStatementDateToIso = (value: unknown): string | null => {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return [
      String(value.getUTCFullYear()).padStart(4, '0'),
      String(value.getUTCMonth() + 1).padStart(2, '0'),
      String(value.getUTCDate()).padStart(2, '0'),
    ].join('-');
  }

  if (typeof value !== 'string') return null;
  const parts = parseDateParts(value);
  if (!parts) return null;
  return `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
};

export const parseStatementDateToTimestamp = (value: unknown): number | null => {
  const iso = parseStatementDateToIso(value);
  if (!iso) return null;
  const [year, month, day] = iso.split('-').map(Number);
  const ts = Date.UTC(year, month - 1, day);
  return Number.isFinite(ts) ? ts : null;
};
