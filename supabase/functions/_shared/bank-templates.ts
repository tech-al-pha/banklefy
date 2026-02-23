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
  | 'hdfc'
  | 'wio'
  | 'hsbc'
  | 'icici'
  | 'axis'
  | 'sbi'
  | 'kotak'
  | 'pnb'
  | 'bank_of_baroda'
  | 'union_bank'
  | 'idbi'
  | 'yes_bank'
  | 'citibank'
  | 'deutsche'
  | 'chase'
  | 'bank_of_america'
  | 'wells_fargo'
  | 'santander'
  | 'bnp_paribas'
  | 'ing'
  | 'barclays'
  | 'dbs'
  | 'ocbc'
  | 'uob'
  | 'ccb'
  | 'abc'
  | 'boc'
  | 'icbc'
  | 'abn_amro'
  | 'cma';

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
    id: 'wio',
    label: 'Wio Bank',
    detectPatterns: [
      /\bwio\b/i,
      /\bwio\s+bank\b/i,
      /\bwio\s+business\b/i,
    ],
    complexLayout: false,
    denseTable: false,
    dualPassPreferred: false,
    headerAliases: {
      description: ['details', 'transaction details'],
      balance: ['running balance', 'balance'],
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
  {
    id: 'hsbc',
    label: 'HSBC',
    detectPatterns: [/\bhsbc\b/i, /hongkong\s+and\s+shanghai/i],
    complexLayout: false,
    denseTable: false,
    dualPassPreferred: false,
    headerAliases: {
      description: ['narration', 'details', 'transaction details'],
      balance: ['balance'],
    },
  },
  {
    id: 'icici',
    label: 'ICICI Bank',
    detectPatterns: [/\bicici\b/i, /\bicici\s+bank\b/i],
    complexLayout: false,
    denseTable: false,
    dualPassPreferred: false,
    headerAliases: {
      reference: ['transaction id', 'ref no'],
      balance: ['balance'],
    },
  },
  {
    id: 'axis',
    label: 'Axis Bank',
    detectPatterns: [/\baxis\b/i, /\baxis\s+bank\b/i],
    complexLayout: false,
    denseTable: false,
    dualPassPreferred: false,
    headerAliases: {
      reference: ['chq no', 'ref no'],
      balance: ['balance'],
    },
  },
  {
    id: 'sbi',
    label: 'State Bank of India',
    detectPatterns: [/\bsbi\b/i, /state\s+bank\s+of\s+india/i],
    complexLayout: false,
    denseTable: false,
    dualPassPreferred: false,
    headerAliases: {
      reference: ['ref no', 'txn id'],
      balance: ['balance'],
    },
  },
  {
    id: 'kotak',
    label: 'Kotak Bank',
    detectPatterns: [/\bkotak\b/i, /\bkotak\s+bank\b/i],
    complexLayout: false,
    denseTable: false,
    dualPassPreferred: false,
    headerAliases: {
      balance: ['balance'],
    },
  },
  {
    id: 'pnb',
    label: 'Punjab National Bank',
    detectPatterns: [/\bpnb\b/i, /punjab\s+national\s+bank/i],
    complexLayout: false,
    denseTable: false,
    dualPassPreferred: false,
    headerAliases: {
      balance: ['balance'],
    },
  },
  {
    id: 'bank_of_baroda',
    label: 'Bank of Baroda',
    detectPatterns: [/bank\s+of\s+baroda/i, /\bbob\b/i],
    complexLayout: false,
    denseTable: false,
    dualPassPreferred: false,
    headerAliases: {
      balance: ['balance'],
    },
  },
  {
    id: 'union_bank',
    label: 'Union Bank',
    detectPatterns: [/union\s+bank/i],
    complexLayout: false,
    denseTable: false,
    dualPassPreferred: false,
    headerAliases: {
      balance: ['balance'],
    },
  },
  {
    id: 'idbi',
    label: 'IDBI Bank',
    detectPatterns: [/\bidbi\b/i, /\bidbi\s+bank\b/i],
    complexLayout: false,
    denseTable: false,
    dualPassPreferred: false,
    headerAliases: {
      balance: ['balance'],
    },
  },
  {
    id: 'yes_bank',
    label: 'Yes Bank',
    detectPatterns: [/\byes\s+bank\b/i],
    complexLayout: false,
    denseTable: false,
    dualPassPreferred: false,
    headerAliases: {
      balance: ['balance'],
    },
  },
  {
    id: 'citibank',
    label: 'Citibank',
    detectPatterns: [/\bciti\b/i, /\bcitibank\b/i],
    complexLayout: false,
    denseTable: false,
    dualPassPreferred: false,
    headerAliases: {
      description: ['description', 'details'],
      balance: ['balance'],
    },
  },
  {
    id: 'deutsche',
    label: 'Deutsche Bank',
    detectPatterns: [/deutsche\s+bank/i],
    complexLayout: false,
    denseTable: false,
    dualPassPreferred: false,
    headerAliases: {
      balance: ['balance'],
    },
  },
  {
    id: 'chase',
    label: 'Chase Bank',
    detectPatterns: [/\bchase\b/i, /jpmorgan\s+chase/i],
    complexLayout: false,
    denseTable: false,
    dualPassPreferred: false,
    headerAliases: {
      description: ['description'],
      balance: ['balance'],
    },
  },
  {
    id: 'bank_of_america',
    label: 'Bank of America',
    detectPatterns: [/bank\s+of\s+america/i, /\bboa\b/i],
    complexLayout: false,
    denseTable: false,
    dualPassPreferred: false,
    headerAliases: {
      description: ['description'],
      balance: ['balance'],
    },
  },
  {
    id: 'wells_fargo',
    label: 'Wells Fargo',
    detectPatterns: [/wells\s+fargo/i],
    complexLayout: false,
    denseTable: false,
    dualPassPreferred: false,
    headerAliases: {
      description: ['description'],
      balance: ['balance'],
    },
  },
  {
    id: 'santander',
    label: 'Santander',
    detectPatterns: [/santander/i],
    complexLayout: false,
    denseTable: false,
    dualPassPreferred: false,
    headerAliases: {
      description: ['description'],
      balance: ['balance'],
    },
  },
  {
    id: 'bnp_paribas',
    label: 'BNP Paribas',
    detectPatterns: [/bnp\s+paribas/i],
    complexLayout: false,
    denseTable: false,
    dualPassPreferred: false,
    headerAliases: {
      description: ['description'],
      balance: ['balance'],
    },
  },
  {
    id: 'ing',
    label: 'ING',
    detectPatterns: [/\bing\b/i, /ing\s+bank/i],
    complexLayout: false,
    denseTable: false,
    dualPassPreferred: false,
    headerAliases: {
      description: ['description'],
      balance: ['balance'],
    },
  },
  {
    id: 'barclays',
    label: 'Barclays',
    detectPatterns: [/barclays/i],
    complexLayout: false,
    denseTable: false,
    dualPassPreferred: false,
    headerAliases: {
      description: ['description'],
      balance: ['balance'],
    },
  },
  {
    id: 'dbs',
    label: 'DBS',
    detectPatterns: [/\bdbs\b/i, /dbs\s+bank/i],
    complexLayout: false,
    denseTable: false,
    dualPassPreferred: false,
    headerAliases: {
      description: ['description'],
      balance: ['balance'],
    },
  },
  {
    id: 'ocbc',
    label: 'OCBC',
    detectPatterns: [/\bocbc\b/i],
    complexLayout: false,
    denseTable: false,
    dualPassPreferred: false,
    headerAliases: {
      description: ['description'],
      balance: ['balance'],
    },
  },
  {
    id: 'uob',
    label: 'UOB',
    detectPatterns: [/\buob\b/i, /united\s+overseas\s+bank/i],
    complexLayout: false,
    denseTable: false,
    dualPassPreferred: false,
    headerAliases: {
      description: ['description'],
      balance: ['balance'],
    },
  },
  {
    id: 'ccb',
    label: 'China Construction Bank',
    detectPatterns: [/china\s+construction\s+bank/i, /\bccb\b/i],
    complexLayout: false,
    denseTable: false,
    dualPassPreferred: false,
    headerAliases: {
      balance: ['balance'],
    },
  },
  {
    id: 'abc',
    label: 'Agricultural Bank of China',
    detectPatterns: [/agricultural\s+bank\s+of\s+china/i],
    complexLayout: false,
    denseTable: false,
    dualPassPreferred: false,
    headerAliases: {
      balance: ['balance'],
    },
  },
  {
    id: 'boc',
    label: 'Bank of China',
    detectPatterns: [/bank\s+of\s+china/i],
    complexLayout: false,
    denseTable: false,
    dualPassPreferred: false,
    headerAliases: {
      balance: ['balance'],
    },
  },
  {
    id: 'icbc',
    label: 'ICBC',
    detectPatterns: [/\bicbc\b/i, /industrial\s+and\s+commercial\s+bank\s+of\s+china/i],
    complexLayout: false,
    denseTable: false,
    dualPassPreferred: false,
    headerAliases: {
      balance: ['balance'],
    },
  },
  {
    id: 'abn_amro',
    label: 'ABN AMRO',
    detectPatterns: [/abn\s+amro/i, /\babn\b/i],
    complexLayout: false,
    denseTable: false,
    dualPassPreferred: false,
    headerAliases: {
      description: ['description', 'details'],
      balance: ['balance'],
    },
  },
  {
    id: 'cma',
    label: 'CMA',
    detectPatterns: [/\bcma\b/i, /cash\s+management\s+account/i],
    complexLayout: false,
    denseTable: false,
    dualPassPreferred: false,
    headerAliases: {
      description: ['description', 'details'],
      balance: ['balance'],
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
