export type CurrencySignDisplay = 'auto' | 'always' | 'never';

export type CurrencyFormatOptions = {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  useGrouping?: boolean;
  signDisplay?: CurrencySignDisplay;
  locale?: string;
};

const CURRENCY_ALIASES: Record<string, string> = {
  DHS: 'AED',
  DIRHAM: 'AED',
};

const CURRENCY_SYMBOL_OVERRIDES: Record<string, string> = {
  AED: 'AED',
};

export const normalizeCurrencyCode = (currencyCode?: string): string => {
  if (!currencyCode) return '';
  const cleaned = currencyCode.trim().toUpperCase().replace(/[^A-Z]/g, '');
  if (!cleaned) return '';
  return CURRENCY_ALIASES[cleaned] ?? cleaned;
};

const defaultLocaleForCurrency = (currencyCode?: string): string => {
  const code = normalizeCurrencyCode(currencyCode);
  if (code === 'INR') return 'en-IN';
  return 'en-US';
};

export const getCurrencySymbol = (currencyCode?: string, locale?: string): string => {
  const code = normalizeCurrencyCode(currencyCode);
  if (!code) return '';
  if (CURRENCY_SYMBOL_OVERRIDES[code]) return CURRENCY_SYMBOL_OVERRIDES[code];
  try {
    const resolvedLocale = locale ?? defaultLocaleForCurrency(code);
    const parts = new Intl.NumberFormat(resolvedLocale, {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).formatToParts(0);
    const symbol = parts.find((part) => part.type === 'currency')?.value;
    return symbol ?? code;
  } catch {
    return code;
  }
};

export const formatCurrencyValue = (
  value: number,
  currencyCode?: string,
  options: CurrencyFormatOptions = {},
): string => {
  const amount = Number.isFinite(value) ? value : 0;
  const code = normalizeCurrencyCode(currencyCode);
  const locale = options.locale ?? defaultLocaleForCurrency(code);
  const signDisplay = options.signDisplay ?? 'auto';
  const sign =
    signDisplay === 'never'
      ? ''
      : amount < 0
        ? '-'
        : signDisplay === 'always' && amount > 0
          ? '+'
          : '';
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: options.minimumFractionDigits,
    maximumFractionDigits: options.maximumFractionDigits,
    useGrouping: options.useGrouping ?? true,
  }).format(Math.abs(amount));
  if (!code) return `${sign}${formatted}`;
  const symbol = getCurrencySymbol(code, locale);
  const spacer = symbol && symbol.length > 1 ? ' ' : '';
  return `${sign}${symbol}${spacer}${formatted}`;
};

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

export const sumMoney = (values: number[], scale = DEFAULT_SCALE): number => {
  const totalMinor = values.reduce((sum, value) => sum + toMinorUnits(value, scale), 0);
  return fromMinorUnits(totalMinor, scale);
};

export const roundMoney = (value: number, scale = DEFAULT_SCALE): number => {
  return fromMinorUnits(toMinorUnits(value, scale), scale);
};
