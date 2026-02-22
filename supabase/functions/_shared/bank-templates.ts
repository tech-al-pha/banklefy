export type HeaderAliasMap = {
  date: string[];
  valueDate: string[];
  description: string[];
  reference: string[];
  debit: string[];
  credit: string[];
  balance: string[];
};

export type BankTemplateId =
  | 'enbd'
  | 'adcb'
  | 'emirates_islamic'
  | 'mashreq'
  | 'hdfc';

export type BankTemplate = {
  id: BankTemplateId;
  label: string;
  detectPatterns: RegExp[];
  complexLayout: boolean;
  denseTable: boolean;
  dualPassPreferred: boolean;
  headerAliases: Partial<HeaderAliasMap>;
};

const normalizeAlias = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const dedupeAliases = (aliases: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const alias of aliases) {
    const normalized = normalizeAlias(alias);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
};

const BASE_HEADER_ALIASES: HeaderAliasMap = {
  date: ['transaction date', 'txn date', 'date'],
  valueDate: ['value date', 'posting date', 'value dt'],
  description: ['narration', 'description', 'particular', 'transaction details', 'details'],
  reference: ['reference', 'txn id', 'transaction id', 'ref no', 'chq ref no', 'chq no', 'utr'],
  debit: ['debit amount', 'withdrawal amount', 'withdrawal amt', 'dr amount', 'debit'],
  credit: ['credit amount', 'deposit amount', 'deposit amt', 'cr amount', 'credit'],
  balance: ['running balance', 'closing balance', 'ledger balance', 'available balance', 'balance'],
};

const TOP_BANK_TEMPLATES: BankTemplate[] = [
  {
    id: 'enbd',
    label: 'Emirates NBD',
    detectPatterns: [
      /\benbd\b/i,
      /emirates\s+nbd/i,
      /emirates nbd bank pjsc/i,
    ],
    complexLayout: true,
    denseTable: true,
    dualPassPreferred: true,
    headerAliases: {
      reference: ['reference no transaction id', 'reference no / transaction id'],
      description: ['narration'],
      balance: ['running balance'],
    },
  },
  {
    id: 'adcb',
    label: 'ADCB',
    detectPatterns: [
      /\badcb\b/i,
      /abu\s+dhabi\s+commercial\s+bank/i,
      /\bprocash\b/i,
      /statement of accounts/i,
    ],
    complexLayout: true,
    denseTable: true,
    dualPassPreferred: true,
    headerAliases: {
      reference: ['customer reference', 'swift reference no'],
      debit: ['debit amount'],
      credit: ['credit amount'],
      balance: ['running balance'],
    },
  },
  {
    id: 'emirates_islamic',
    label: 'Emirates Islamic',
    detectPatterns: [
      /emirates\s+islamic/i,
      /emirates\s+islamic\s+bank/i,
    ],
    complexLayout: true,
    denseTable: true,
    dualPassPreferred: true,
    headerAliases: {
      reference: ['reference no', 'transaction id'],
      description: ['description', 'narration'],
      balance: ['running balance'],
    },
  },
  {
    id: 'mashreq',
    label: 'Mashreq',
    detectPatterns: [
      /\bmashreq\b/i,
      /mashreqbank/i,
      /mashreq neo/i,
    ],
    complexLayout: true,
    denseTable: true,
    dualPassPreferred: true,
    headerAliases: {
      description: ['transaction details', 'details'],
      balance: ['ledger balance', 'balance'],
    },
  },
  {
    id: 'hdfc',
    label: 'HDFC',
    detectPatterns: [
      /\bhdfc\b/i,
      /\bhdfc bank\b/i,
      /\bifsc\s*hdfc/i,
    ],
    complexLayout: false,
    denseTable: false,
    dualPassPreferred: false,
    headerAliases: {
      reference: ['chq ref no', 'chq / ref no', 'chq./ref.no.'],
      debit: ['withdrawal amt', 'withdrawal amount'],
      credit: ['deposit amt', 'deposit amount'],
      balance: ['closing balance'],
    },
  },
];

const GENERIC_COMPLEX_LAYOUT_REGEX =
  /(statement of accounts|beneficiary|remitter|swift|debit amount|credit amount|running balance|value date)/i;
const GENERIC_DENSE_LAYOUT_REGEX =
  /(statement of accounts|running balance|beneficiary|remitter|swift)/i;
const GENERIC_DUAL_PASS_REGEX =
  /(value date|running balance|debit amount|credit amount|statement of accounts)/i;

const mergeHeaderAliases = (templateAliases?: Partial<HeaderAliasMap>): HeaderAliasMap => ({
  date: dedupeAliases([...BASE_HEADER_ALIASES.date, ...(templateAliases?.date ?? [])]),
  valueDate: dedupeAliases([...BASE_HEADER_ALIASES.valueDate, ...(templateAliases?.valueDate ?? [])]),
  description: dedupeAliases([...BASE_HEADER_ALIASES.description, ...(templateAliases?.description ?? [])]),
  reference: dedupeAliases([...BASE_HEADER_ALIASES.reference, ...(templateAliases?.reference ?? [])]),
  debit: dedupeAliases([...BASE_HEADER_ALIASES.debit, ...(templateAliases?.debit ?? [])]),
  credit: dedupeAliases([...BASE_HEADER_ALIASES.credit, ...(templateAliases?.credit ?? [])]),
  balance: dedupeAliases([...BASE_HEADER_ALIASES.balance, ...(templateAliases?.balance ?? [])]),
});

export const detectBankTemplate = (hintBlob: string | undefined): BankTemplate | null => {
  if (!hintBlob || !hintBlob.trim()) return null;
  const normalizedHint = hintBlob.toLowerCase();
  for (const template of TOP_BANK_TEMPLATES) {
    if (template.detectPatterns.some((pattern) => pattern.test(normalizedHint))) {
      return template;
    }
  }
  return null;
};

export const getHeaderAliasesForHint = (hintBlob: string | undefined): HeaderAliasMap => {
  const template = detectBankTemplate(hintBlob);
  return mergeHeaderAliases(template?.headerAliases);
};

export const isComplexBankLayoutHint = (hintBlob: string | undefined): boolean => {
  const template = detectBankTemplate(hintBlob);
  if (template) return template.complexLayout;
  return !!hintBlob && GENERIC_COMPLEX_LAYOUT_REGEX.test(hintBlob);
};

export const isDenseTableBankHint = (hintBlob: string | undefined): boolean => {
  const template = detectBankTemplate(hintBlob);
  if (template) return template.denseTable;
  return !!hintBlob && GENERIC_DENSE_LAYOUT_REGEX.test(hintBlob);
};

export const isDualPassBankHint = (hintBlob: string | undefined): boolean => {
  const template = detectBankTemplate(hintBlob);
  if (template) return template.dualPassPreferred;
  return !!hintBlob && GENERIC_DUAL_PASS_REGEX.test(hintBlob);
};

