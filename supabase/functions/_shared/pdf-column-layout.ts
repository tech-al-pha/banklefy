export type PdfAmountToken = {
  x: number;
  text: string;
};

export type PdfAmountLineEntry<T extends PdfAmountToken = PdfAmountToken> = {
  text: string;
  tokens: T[];
};

export type PdfAmountColumnLayout = {
  debitCenter: number;
  creditCenter: number;
  balanceCenter: number;
  source: 'header' | 'fallback';
};

type ExtractAnchoredAmountsOptions<T extends PdfAmountToken> = {
  inferSide: (text: string, amount: number) => { debit: number; credit: number };
  isAmountToken: (text: string) => boolean;
  parseAmount: (text: string) => number;
};

const CREDIT_HEADER_PATTERN = /\b(?:credit|credits|deposit|deposits|cr)\b/i;
const DEBIT_HEADER_PATTERN = /\b(?:debit|debits|withdrawal|withdrawals|dr)\b/i;
const BALANCE_HEADER_PATTERN = /\b(?:balance|balances)\b/i;
const TRAILING_PUNCTUATION_PATTERN = /[,:;]+$/g;
const COLUMN_CAPTURE_RADIUS = 70;

const sanitizeTokenText = (value: string): string =>
  String(value || '').replace(TRAILING_PUNCTUATION_PATTERN, '').trim();

const clusterCenters = (xs: number[]): number[] => {
  if (xs.length < 3) return [];

  const sorted = [...xs].sort((left, right) => left - right);
  const clusters: Array<{ center: number; count: number }> = [];
  const threshold = 24;

  for (const x of sorted) {
    const last = clusters[clusters.length - 1];
    if (!last || Math.abs(x - last.center) > threshold) {
      clusters.push({ center: x, count: 1 });
      continue;
    }

    last.center = (last.center * last.count + x) / (last.count + 1);
    last.count += 1;
  }

  if (clusters.length < 3) return [];
  return clusters.map((cluster) => cluster.center).sort((left, right) => left - right).slice(-3);
};

const detectLayoutFromHeaders = <T extends PdfAmountToken>(
  lineEntries: PdfAmountLineEntry<T>[],
): PdfAmountColumnLayout | null => {
  for (const entry of lineEntries) {
    const creditLabel = entry.tokens.find((token) => CREDIT_HEADER_PATTERN.test(token.text));
    const debitLabel = entry.tokens.find((token) => DEBIT_HEADER_PATTERN.test(token.text));
    const balanceLabel = entry.tokens.find((token) => BALANCE_HEADER_PATTERN.test(token.text));

    if (!balanceLabel || (!creditLabel && !debitLabel)) continue;

    if (creditLabel && debitLabel) {
      return {
        debitCenter: debitLabel.x,
        creditCenter: creditLabel.x,
        balanceCenter: balanceLabel.x,
        source: 'header',
      };
    }
  }

  return null;
};

const pickNearestUnusedToken = <T extends PdfAmountToken>(
  tokens: T[],
  center: number,
  used: Set<T>,
  maxDistance: number,
): T | null => {
  let best: T | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const token of tokens) {
    if (used.has(token)) continue;
    const distance = Math.abs(token.x - center);
    if (distance < bestDistance) {
      best = token;
      bestDistance = distance;
    }
  }

  return best && bestDistance <= maxDistance ? best : null;
};

const pickNearestToken = <T extends PdfAmountToken>(
  tokens: T[],
  center: number,
): T | null => {
  let best: T | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const token of tokens) {
    const distance = Math.abs(token.x - center);
    if (distance < bestDistance) {
      best = token;
      bestDistance = distance;
    }
  }

  return best;
};

const isNearAnyAmountColumn = (x: number, layout: PdfAmountColumnLayout): boolean =>
  Math.min(Math.abs(x - layout.debitCenter), Math.abs(x - layout.creditCenter)) <= COLUMN_CAPTURE_RADIUS;

const isNearBalanceColumn = (x: number, layout: PdfAmountColumnLayout): boolean =>
  Math.abs(x - layout.balanceCenter) <= COLUMN_CAPTURE_RADIUS;

const inferAmountSideFromColumn = <T extends PdfAmountToken>(
  token: T,
  layout: PdfAmountColumnLayout,
  amount: number,
  inferSide: (text: string, amount: number) => { debit: number; credit: number },
  text: string,
): { debit: number; credit: number } => {
  const debitDistance = Math.abs(token.x - layout.debitCenter);
  const creditDistance = Math.abs(token.x - layout.creditCenter);

  if (debitDistance < creditDistance) return { debit: Math.abs(amount), credit: 0 };
  if (creditDistance < debitDistance) return { debit: 0, credit: Math.abs(amount) };
  return inferSide(text, amount);
};

export const detectPdfAmountColumnLayout = <T extends PdfAmountToken>(
  lineEntries: PdfAmountLineEntry<T>[],
  isAmountToken: (text: string) => boolean,
): PdfAmountColumnLayout | null => {
  const headerLayout = detectLayoutFromHeaders(lineEntries);
  if (headerLayout) return headerLayout;

  const numericXs: number[] = [];

  for (const entry of lineEntries) {
    for (const token of entry.tokens) {
      if (isAmountToken(sanitizeTokenText(token.text))) {
        numericXs.push(token.x);
      }
    }
  }

  const centers = clusterCenters(numericXs);
  if (centers.length < 3) return null;

  return {
    debitCenter: centers[0],
    creditCenter: centers[1],
    balanceCenter: centers[2],
    source: 'fallback',
  };
};

export const extractAnchoredAmountsFromLayout = <T extends PdfAmountToken>(
  entry: PdfAmountLineEntry<T>,
  layout: PdfAmountColumnLayout | null,
  options: ExtractAnchoredAmountsOptions<T>,
): { debit: number; credit: number; balance: number } | null => {
  if (!layout) return null;

  const numericTokens = entry.tokens.filter((token) => options.isAmountToken(sanitizeTokenText(token.text)));
  if (numericTokens.length === 0) return null;

  const amountTokens = numericTokens.filter((token) => isNearAnyAmountColumn(token.x, layout));
  const balanceTokens = numericTokens.filter((token) => isNearBalanceColumn(token.x, layout));
  const used = new Set<T>();
  const balanceToken = pickNearestUnusedToken(balanceTokens, layout.balanceCenter, used, COLUMN_CAPTURE_RADIUS);

  if (!balanceToken) {
    const amountToken = pickNearestToken(amountTokens, Math.min(layout.debitCenter, layout.creditCenter));
    if (!amountToken) return null;

    const amount = options.parseAmount(amountToken.text);
    if (!Number.isFinite(amount)) return null;

    const inferred = inferAmountSideFromColumn(amountToken, layout, amount, options.inferSide, entry.text);
    return {
      debit: inferred.debit,
      credit: inferred.credit,
      balance: 0,
    };
  }

  used.add(balanceToken);
  const balance = Math.abs(options.parseAmount(balanceToken.text));
  if (!Number.isFinite(balance)) return null;

  if (numericTokens.length === 2) {
    const amountToken = amountTokens.find((token) => token !== balanceToken) ?? null;
    if (!amountToken) return null;
    const amount = options.parseAmount(amountToken.text);
    const inferred = inferAmountSideFromColumn(amountToken, layout, amount, options.inferSide, entry.text);
    return {
      debit: inferred.debit,
      credit: inferred.credit,
      balance,
    };
  }

  const debitToken = pickNearestUnusedToken(amountTokens, layout.debitCenter, used, COLUMN_CAPTURE_RADIUS);
  if (debitToken) used.add(debitToken);

  const creditToken = pickNearestUnusedToken(amountTokens, layout.creditCenter, used, COLUMN_CAPTURE_RADIUS);
  if (creditToken) used.add(creditToken);

  let debit = debitToken ? Math.abs(options.parseAmount(debitToken.text)) : 0;
  let credit = creditToken ? Math.abs(options.parseAmount(creditToken.text)) : 0;

  if (debit === 0 && credit === 0) {
    const remainder = amountTokens.filter((token) => !used.has(token));
    const singleToken = remainder.length === 1 ? remainder[0] : null;
    const candidateToken = singleToken ?? amountTokens.find((token) => token !== balanceToken) ?? null;

    if (candidateToken) {
      const amount = options.parseAmount(candidateToken.text);
      const inferred = inferAmountSideFromColumn(candidateToken, layout, amount, options.inferSide, entry.text);
      debit = inferred.debit;
      credit = inferred.credit;
    }
  }

  return {
    debit,
    credit,
    balance,
  };
};
