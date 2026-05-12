import type { Transaction, UnderwritingResult, LiquidityAnalysis, ReconciliationResult, FraudAlert } from './financial-engine.ts';
import type { BankInfo } from './excel-generator.ts';
import { generateProfessionalExcel } from './excel-generator.ts';
import { buildJsonExport, buildMt940Export } from './export-formatters.ts';

export type ExportFormat =
  | 'xlsx'
  | 'csv'
  | 'json'
  | 'mt940'
  | 'fraud_report'
  | 'foir_report';

export type ExportMetadata = {
  bankId: string;
  exportTimestamp: string;
  confidenceScore: number;
  parseMode: string;
  userPlan: string;
  requestedFormat: ExportFormat;
  fraudAnalysis?: unknown;
  analytics?: unknown;
  bankInfo?: BankInfo;
};

export type XlsxBuilderContext = {
  analytics: {
    totalCredits: number;
    totalDebits: number;
    netFlow: number;
    duplicateCount: number;
    categoryBreakdown: Record<string, { count: number; totalDebit: number; totalCredit: number }>;
  };
  underwriting?: UnderwritingResult;
  fraudAlerts?: FraudAlert[];
  liquidity?: LiquidityAnalysis;
  reconciliation?: ReconciliationResult;
  bankInfo?: BankInfo;
};

export type ExportBuildArtifact = {
  fileBuffer: Uint8Array;
  mimeType: string;
};

type JsonSummary = {
  totalCredits: number;
  totalDebits: number;
  netFlow: number;
};

const encoder = new TextEncoder();

const toBytes = (value: string): Uint8Array => encoder.encode(value);

const csvEscape = (value: unknown): string => {
  const str = String(value ?? '');
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const buildCSV = (
  transactions: ReadonlyArray<Transaction>,
  _metadata: ExportMetadata,
): ExportBuildArtifact => {
  const header = ['Date', 'Description', 'Category', 'Debit', 'Credit', 'Balance', 'Reference'];
  const rows = transactions.map((tx) => [
    tx.date,
    tx.description ?? '',
    tx.category ?? '',
    Number(tx.debit || 0).toFixed(2),
    Number(tx.credit || 0).toFixed(2),
    Number(tx.balance || 0).toFixed(2),
    tx.refNumber ?? '',
  ]);
  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
  return {
    fileBuffer: toBytes(csv),
    mimeType: 'text/csv; charset=utf-8',
  };
};

const PREMIUM_PLAN_PREFIXES = ['per_page_', 'unlimited', 'starter', 'business', 'admin'];

const isPremiumPlan = (plan?: string): boolean => {
  const p = String(plan || '').toLowerCase();
  if (!p || p === 'free') return false;
  return PREMIUM_PLAN_PREFIXES.some((prefix) => p.startsWith(prefix));
};

export const buildXLSX = async (
  transactions: ReadonlyArray<Transaction>,
  metadata: ExportMetadata,
  context: XlsxBuilderContext,
): Promise<ExportBuildArtifact> => {
  const excel = await generateProfessionalExcel({
    transactions: [...transactions],
    analytics: context.analytics,
    underwriting: context.underwriting,
    fraudAlerts: context.fraudAlerts,
    liquidity: context.liquidity,
    reconciliation: context.reconciliation,
    bankInfo: context.bankInfo,
    premiumExport: isPremiumPlan(metadata.userPlan),
  });
  return {
    fileBuffer: new Uint8Array(excel.buffer),
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
};

export const buildJSON = (
  transactions: ReadonlyArray<Transaction>,
  metadata: ExportMetadata,
  summary: JsonSummary,
): ExportBuildArtifact => {
  const json = buildJsonExport({
    transactions: [...transactions],
    bankMetadata: metadata.bankInfo,
    summary,
  });
  return {
    fileBuffer: toBytes(json),
    mimeType: 'application/json; charset=utf-8',
  };
};

export const buildMT940 = (
  transactions: ReadonlyArray<Transaction>,
  metadata: ExportMetadata,
  statementReference?: string,
): ExportBuildArtifact => {
  const mt940 = buildMt940Export({
    transactions: [...transactions],
    bankMetadata: metadata.bankInfo,
    statementReference,
  });
  return {
    fileBuffer: toBytes(mt940),
    mimeType: 'text/plain; charset=utf-8',
  };
};

export const buildFraudReport = (
  transactions: ReadonlyArray<Transaction>,
  metadata: ExportMetadata,
): ExportBuildArtifact => {
  const payload = {
    metadata,
    rowCount: transactions.length,
    fraudAnalysis: metadata.fraudAnalysis ?? null,
  };
  return {
    fileBuffer: toBytes(JSON.stringify(payload, null, 2)),
    mimeType: 'application/json; charset=utf-8',
  };
};

export const buildFOIRReport = (
  transactions: ReadonlyArray<Transaction>,
  metadata: ExportMetadata,
): ExportBuildArtifact => {
  const payload = {
    metadata,
    rowCount: transactions.length,
    foir: (metadata.analytics as Record<string, unknown> | undefined)?.riskAnalysis
      ? (metadata.analytics as Record<string, unknown>).riskAnalysis
      : null,
    underwriting: (metadata.analytics as Record<string, unknown> | undefined)?.underwriting ?? null,
  };
  return {
    fileBuffer: toBytes(JSON.stringify(payload, null, 2)),
    mimeType: 'application/json; charset=utf-8',
  };
};
