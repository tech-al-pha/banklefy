import type { Transaction } from './financial-engine.ts';
import type { BankInfo } from './excel-generator.ts';
import {
  buildCSV,
  buildFOIRReport,
  buildFraudReport,
  buildJSON,
  buildMT940,
  buildXLSX,
  type ExportBuildArtifact as BuilderArtifact,
  type ExportFormat,
  type ExportMetadata,
  type XlsxBuilderContext,
} from './export-builders.ts';

const CRITICAL_FRAUD_FLAGS = new Set([
  'tampered_document',
  'edited_timestamp_mismatch',
  'high_conflict_reconciliation',
]);

const DEFAULT_MIN_CONFIDENCE = Number(Deno.env.get('EXPORT_MIN_CONFIDENCE') ?? '0.55');
const MAX_EXPORT_FILE_SIZE_BYTES = Number(Deno.env.get('EXPORT_MAX_SIZE_BYTES') ?? String(25 * 1024 * 1024));
const BALANCE_TOLERANCE = Number(Deno.env.get('EXPORT_BALANCE_TOLERANCE') ?? '0.5');
const MAX_BALANCE_MISMATCH_RATIO = Number(Deno.env.get('EXPORT_MAX_MISMATCH_RATIO') ?? '0.2');

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const asIsoDate = (value: string): string | null => {
  const source = String(value || '').trim();
  if (!source) return null;
  const isoLike = source.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoLike) return `${isoLike[1]}-${isoLike[2]}-${isoLike[3]}`;
  const ddmmyyyy = source.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (ddmmyyyy) return `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`;
  const parsed = new Date(source);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
};

const toNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
};

const txHash = (tx: Transaction): string =>
  [
    tx.date,
    (tx.description ?? '').trim().toLowerCase(),
    Number(tx.debit || 0).toFixed(2),
    Number(tx.credit || 0).toFixed(2),
    Number(tx.balance || 0).toFixed(2),
  ].join('|');

const normalizeTransactions = (transactions: ReadonlyArray<Transaction>) => {
  const normalized: Transaction[] = [];
  const seen = new Set<string>();

  for (const row of transactions) {
    const date = asIsoDate(row.date);
    if (!date) {
      continue;
    }
    const debit = Math.abs(Number(row.debit || 0));
    const credit = Math.abs(Number(row.credit || 0));
    const balance = Number(row.balance || 0);
    if (!Number.isFinite(debit) || !Number.isFinite(credit) || !Number.isFinite(balance)) continue;

    const tx: Transaction = {
      ...row,
      date,
      debit,
      credit,
      balance,
    };
    const hash = txHash(tx);
    if (seen.has(hash)) continue;
    seen.add(hash);
    normalized.push(tx);
  }

  normalized.sort((a, b) => a.date.localeCompare(b.date));
  return normalized;
};

const validateRunningBalance = (transactions: ReadonlyArray<Transaction>) => {
  if (transactions.length <= 1) {
    return { mismatchRatio: 0, mismatchCount: 0, isValid: true };
  }
  let mismatches = 0;
  for (let i = 1; i < transactions.length; i++) {
    const prev = transactions[i - 1];
    const curr = transactions[i];
    const expected = Number(prev.balance || 0) + Number(curr.credit || 0) - Number(curr.debit || 0);
    const actual = Number(curr.balance || 0);
    if (!Number.isFinite(expected) || !Number.isFinite(actual)) {
      mismatches++;
      continue;
    }
    if (Math.abs(expected - actual) > BALANCE_TOLERANCE) {
      mismatches++;
    }
  }
  const total = Math.max(1, transactions.length - 1);
  const mismatchRatio = mismatches / total;
  return {
    mismatchRatio,
    mismatchCount: mismatches,
    isValid: mismatchRatio <= MAX_BALANCE_MISMATCH_RATIO,
  };
};

type PlanCapabilities = {
  planName: string;
  allowedFormats: Set<ExportFormat>;
  allowFraudPreview: boolean;
  allowFoirExport: boolean;
};

const resolvePlanCapabilities = (rawPlan: string, isAdminOverride: boolean): PlanCapabilities => {
  const plan = String(rawPlan || 'free').trim().toLowerCase();
  if (isAdminOverride) {
    return {
      planName: plan || 'admin',
      allowedFormats: new Set<ExportFormat>([
        'xlsx',
        'csv',
        'json',
        'mt940',
        'fraud_report',
        'foir_report',
      ]),
      allowFraudPreview: true,
      allowFoirExport: true,
    };
  }

  const core = new Set<ExportFormat>(['xlsx', 'csv', 'json', 'mt940']);
  const paid = plan.startsWith('monthly') || plan.startsWith('yearly') || plan.startsWith('per_page') || plan === 'business';

  return {
    planName: plan || 'free',
    allowedFormats: paid
      ? new Set<ExportFormat>([...core, 'fraud_report', 'foir_report'])
      : core,
    allowFraudPreview: paid,
    allowFoirExport: paid,
  };
};

export type ExportPipelineInput = {
  sessionId: string;
  structuredTransactions: Transaction[];
  bankId: string;
  confidenceScore: number;
  parseMode: string;
  fraudAnalysis?: unknown;
  analytics?: unknown;
  userPlan: string;
  requestedFormat: ExportFormat;
  fraudFlags?: string[];
  creditsRemainingBefore: number;
  minimumConfidenceScore?: number;
  planAllowsFraudOverride?: boolean;
  allowFraudReport?: boolean;
  allowFoirReport?: boolean;
  previewOnly?: boolean;
  statementReference?: string;
  bankInfo?: BankInfo;
  xlsxContext: XlsxBuilderContext;
  jsonSummary: {
    totalCredits: number;
    totalDebits: number;
    netFlow: number;
  };
  prepareDownload: (
    artifact: ExportPreparedArtifact,
  ) => Promise<{ downloadUrl: string | null; storagePath: string | null; fileSize: number }>;
  exportId?: string;
  commitExportTransaction?: (payload: ExportCommitPayload) => Promise<ExportCommitResult>;
  deductCredits?: () => Promise<{ ok: boolean; creditsRemaining: number; error?: string }>;
  auditExport: (payload: {
    userId?: string | null;
    exportId: string;
    planName: string;
    creditsUsed: number;
    timestamp: string;
    format: ExportFormat;
    rowCount: number;
    fileSize: number;
    status: 'success';
    sessionId: string;
  }) => Promise<void>;
  includeCompatibilityBundle?: boolean;
};

export type ExportPipelineSuccess = {
  ok: true;
  exportId: string;
  downloadUrl: string | null;
  format: ExportFormat;
  rowCount: number;
  fileSize: number;
  confidenceScore: number;
  parseMode: string;
  planName: string;
  creditsRemaining: number;
  exportMode: 'standardized';
  metadata: ExportMetadata;
  primary: ExportPreparedArtifact;
  compatibility: Partial<Record<'xlsx' | 'csv' | 'json' | 'mt940', ExportPreparedArtifact>>;
  transactions: Transaction[];
  storagePath: string | null;
};

export type ExportPipelineFailure = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};

export type ExportPipelineResult = ExportPipelineSuccess | ExportPipelineFailure;

export type ExportPreparedArtifact = BuilderArtifact & {
  format: ExportFormat;
  extension: string;
  rowCount: number;
};

export type ExportCommitPayload = {
  exportId: string;
  sessionId: string;
  timestamp: string;
  format: ExportFormat;
  planName: string;
  rowCount: number;
  fileSize: number;
  creditsUsed: number;
  downloadUrl: string | null;
  storagePath: string | null;
};

export type ExportCommitResult = {
  ok: boolean;
  alreadyProcessed?: boolean;
  creditsRemaining: number;
  error?: string;
  previous?: {
    downloadUrl?: string | null;
    storagePath?: string | null;
    fileSize?: number;
  };
};

const FORMAT_EXTENSION: Record<ExportFormat, string> = {
  xlsx: 'xlsx',
  csv: 'csv',
  json: 'json',
  mt940: 'mt940',
  fraud_report: 'json',
  foir_report: 'json',
};

const inFlightExportCommits = new Map<string, Promise<ExportCommitResult>>();
const completedExportCommits = new Map<string, ExportCommitResult>();

const createDeterministicExportId = async (
  sessionId: string,
  format: ExportFormat,
  rowCount: number,
  fileSize: number,
): Promise<string> => {
  const source = `${sessionId}|${format}|${rowCount}|${fileSize}`;
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(source));
  const bytes = new Uint8Array(digest);
  return Array.from(bytes)
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

const commitExportOnce = async (
  exportId: string,
  commit: () => Promise<ExportCommitResult>,
): Promise<ExportCommitResult> => {
  const completed = completedExportCommits.get(exportId);
  if (completed) return completed;

  const inflight = inFlightExportCommits.get(exportId);
  if (inflight) return inflight;

  const task = (async () => {
    try {
      const result = await commit();
      if (result.ok) {
        completedExportCommits.set(exportId, result);
      }
      return result;
    } finally {
      inFlightExportCommits.delete(exportId);
    }
  })();

  inFlightExportCommits.set(exportId, task);
  return task;
};

const withArtifactMeta = (
  format: ExportFormat,
  artifact: BuilderArtifact,
  rowCount: number,
): ExportPreparedArtifact => ({
  ...artifact,
  format,
  extension: FORMAT_EXTENSION[format],
  rowCount,
});

const buildForFormat = (
  format: ExportFormat,
  transactions: ReadonlyArray<Transaction>,
  metadata: ExportMetadata,
  input: ExportPipelineInput,
): ExportPreparedArtifact => {
  const rowCount = transactions.length;
  switch (format) {
    case 'xlsx':
      return withArtifactMeta(format, buildXLSX(transactions, metadata, input.xlsxContext), rowCount);
    case 'csv':
      return withArtifactMeta(format, buildCSV(transactions, metadata), rowCount);
    case 'json':
      return withArtifactMeta(format, buildJSON(transactions, metadata, input.jsonSummary), rowCount);
    case 'mt940':
      return withArtifactMeta(format, buildMT940(transactions, metadata, input.statementReference), rowCount);
    case 'fraud_report':
      return withArtifactMeta(format, buildFraudReport(transactions, metadata), rowCount);
    case 'foir_report':
      return withArtifactMeta(format, buildFOIRReport(transactions, metadata), rowCount);
    default:
      return withArtifactMeta('xlsx', buildXLSX(transactions, metadata, input.xlsxContext), rowCount);
  }
};

const validateBufferIntegrity = (
  artifact: ExportPreparedArtifact,
  expectedRows: number,
): { ok: true; size: number } | { ok: false; reason: string } => {
  const size = artifact.fileBuffer.byteLength;
  if (size <= 0) return { ok: false, reason: 'empty_file_buffer' };
  if (artifact.rowCount !== expectedRows) {
    return { ok: false, reason: 'row_count_mismatch' };
  }
  if (size > MAX_EXPORT_FILE_SIZE_BYTES) {
    return { ok: false, reason: 'file_too_large' };
  }
  return { ok: true, size };
};

export const runStandardizedExportPipeline = async (
  input: ExportPipelineInput,
): Promise<ExportPipelineResult> => {
  if (!input.sessionId || !input.bankId || !input.parseMode || !input.requestedFormat) {
    return {
      ok: false,
      error: {
        code: 'EXPORT_INVALID_INPUT',
        message: 'Missing required export inputs.',
      },
    };
  }

  const minConfidence = Number.isFinite(input.minimumConfidenceScore ?? NaN)
    ? Number(input.minimumConfidenceScore)
    : DEFAULT_MIN_CONFIDENCE;
  if (!Array.isArray(input.structuredTransactions) || input.structuredTransactions.length === 0) {
    return {
      ok: false,
      error: {
        code: 'EXPORT_EMPTY_TRANSACTIONS',
        message: 'No transactions available for export.',
      },
    };
  }
  if (!Number.isFinite(input.confidenceScore) || input.confidenceScore < minConfidence) {
    return {
      ok: false,
      error: {
        code: 'EXPORT_LOW_CONFIDENCE',
        message: `Confidence score below export threshold (${minConfidence}).`,
        details: {
          confidenceScore: input.confidenceScore,
          threshold: minConfidence,
        },
      },
    };
  }

  const normalized = normalizeTransactions(input.structuredTransactions);
  if (normalized.length === 0) {
    return {
      ok: false,
      error: {
        code: 'EXPORT_NORMALIZATION_FAILED',
        message: 'Transactions failed normalization checks.',
      },
    };
  }

  for (const row of normalized) {
    const debit = toNumber(row.debit);
    const credit = toNumber(row.credit);
    const balance = toNumber(row.balance);
    if (!Number.isFinite(debit) || !Number.isFinite(credit) || !Number.isFinite(balance)) {
      return {
        ok: false,
        error: {
          code: 'EXPORT_NUMERIC_INTEGRITY_FAILED',
          message: 'Numeric integrity validation failed for debit/credit/balance.',
        },
      };
    }
  }

  const balanceValidation = validateRunningBalance(normalized);
  if (!balanceValidation.isValid) {
    return {
      ok: false,
      error: {
        code: 'EXPORT_BALANCE_VALIDATION_FAILED',
        message: 'Running balance arithmetic validation failed.',
        details: {
          mismatchRatio: balanceValidation.mismatchRatio,
          mismatchCount: balanceValidation.mismatchCount,
        },
      },
    };
  }

  const fraudFlags = input.fraudFlags ?? [];
  const hasCriticalFraudFlag = fraudFlags.some((flag) => CRITICAL_FRAUD_FLAGS.has(String(flag).toLowerCase()));
  if (hasCriticalFraudFlag && !input.planAllowsFraudOverride) {
    return {
      ok: false,
      error: {
        code: 'EXPORT_BLOCKED_CRITICAL_FRAUD_FLAG',
        message: 'Critical fraud flags detected. Export blocked for current plan.',
        details: { fraudFlags },
      },
    };
  }

  const planCaps = resolvePlanCapabilities(input.userPlan, !!input.planAllowsFraudOverride);
  if (!planCaps.allowedFormats.has(input.requestedFormat)) {
    return {
      ok: false,
      error: {
        code: 'EXPORT_PLAN_RESTRICTED_FORMAT',
        message: `Format '${input.requestedFormat}' is not allowed for current plan.`,
        details: {
          requestedFormat: input.requestedFormat,
          allowedFormats: Array.from(planCaps.allowedFormats.values()),
          planName: planCaps.planName,
        },
      },
    };
  }
  if (input.creditsRemainingBefore <= 0 && !input.previewOnly) {
    return {
      ok: false,
      error: {
        code: 'EXPORT_CREDITS_EXHAUSTED',
        message: 'No credits remaining for export.',
        details: {
          creditsRemaining: input.creditsRemainingBefore,
          planName: planCaps.planName,
        },
      },
    };
  }

  const metadata: ExportMetadata = {
    bankId: input.bankId,
    exportTimestamp: new Date().toISOString(),
    confidenceScore: input.confidenceScore,
    parseMode: input.parseMode,
    userPlan: planCaps.planName,
    requestedFormat: input.requestedFormat,
    fraudAnalysis: planCaps.allowFraudPreview ? input.fraudAnalysis : undefined,
    analytics: planCaps.allowFoirExport ? input.analytics : undefined,
    bankInfo: input.bankInfo,
  };

  const primary = buildForFormat(input.requestedFormat, normalized, metadata, input);
  const integrity = validateBufferIntegrity(primary, normalized.length);
  if (!integrity.ok) {
    return {
      ok: false,
      error: {
        code: 'EXPORT_FILE_INTEGRITY_FAILED',
        message: 'Export artifact failed integrity checks.',
        details: { reason: integrity.reason, format: input.requestedFormat },
      },
    };
  }

  console.log('EXPORT_METRIC', {
    stage: 'post_build_integrity',
    format: input.requestedFormat,
    plan: planCaps.planName,
    rowCount: primary.rowCount,
    fileSize: integrity.size,
    fps: primary.rowCount > 0 ? Number((primary.rowCount / Math.max(1, integrity.size / 1024)).toFixed(4)) : 0,
  });

  const exportId =
    input.exportId ??
    await createDeterministicExportId(input.sessionId, input.requestedFormat, primary.rowCount, integrity.size);

  let downloadPrep = await input.prepareDownload(primary);
  if (!downloadPrep || (downloadPrep.fileSize ?? 0) <= 0) {
    return {
      ok: false,
      error: {
        code: 'EXPORT_DOWNLOAD_PREP_FAILED',
        message: 'Failed to prepare secure download artifact.',
      },
    };
  }

  let creditsRemaining = input.creditsRemainingBefore;
  if (!input.previewOnly) {
    if (input.commitExportTransaction) {
      const timestamp = new Date().toISOString();
      const commitResult = await commitExportOnce(exportId, () =>
        input.commitExportTransaction!({
          exportId,
          sessionId: input.sessionId,
          timestamp,
          format: input.requestedFormat,
          planName: planCaps.planName,
          rowCount: primary.rowCount,
          fileSize: downloadPrep.fileSize,
          creditsUsed: 1,
          downloadUrl: downloadPrep.downloadUrl,
          storagePath: downloadPrep.storagePath,
        }),
      );
      if (!commitResult.ok) {
        return {
          ok: false,
          error: {
            code: 'EXPORT_CREDIT_DEDUCTION_FAILED',
            message: commitResult.error || 'Failed to commit export transaction.',
          },
        };
      }
      creditsRemaining = commitResult.creditsRemaining;
      if (commitResult.alreadyProcessed && commitResult.previous) {
        downloadPrep = {
          downloadUrl: commitResult.previous.downloadUrl ?? downloadPrep.downloadUrl,
          storagePath: commitResult.previous.storagePath ?? downloadPrep.storagePath,
          fileSize: commitResult.previous.fileSize ?? downloadPrep.fileSize,
        };
      }
    } else {
      const deduction = await input.deductCredits?.();
      if (!deduction?.ok) {
        return {
          ok: false,
          error: {
            code: 'EXPORT_CREDIT_DEDUCTION_FAILED',
            message: deduction?.error || 'Failed to deduct credits after successful export prep.',
          },
        };
      }
      creditsRemaining = deduction.creditsRemaining;
    }
  }

  const compatibility: Partial<Record<'xlsx' | 'csv' | 'json' | 'mt940', ExportPreparedArtifact>> = {};
  if (input.includeCompatibilityBundle !== false) {
    const baseFormats: Array<'xlsx' | 'csv' | 'json' | 'mt940'> = ['xlsx', 'csv', 'json', 'mt940'];
    for (const format of baseFormats) {
      if (!planCaps.allowedFormats.has(format)) continue;
      const artifact = buildForFormat(format, normalized, metadata, input);
      const compatIntegrity = validateBufferIntegrity(artifact, normalized.length);
      if (compatIntegrity.ok) {
        compatibility[format] = artifact;
      }
    }
  }

  await input.auditExport({
    exportId,
    planName: planCaps.planName,
    creditsUsed: input.previewOnly ? 0 : 1,
    timestamp: new Date().toISOString(),
    format: input.requestedFormat,
    rowCount: primary.rowCount,
    fileSize: downloadPrep.fileSize,
    status: 'success',
    sessionId: input.sessionId,
  });

  return {
    ok: true,
    exportId,
    downloadUrl: downloadPrep.downloadUrl,
    format: input.requestedFormat,
    rowCount: primary.rowCount,
    fileSize: downloadPrep.fileSize,
    confidenceScore: input.confidenceScore,
    parseMode: input.parseMode,
    planName: planCaps.planName,
    creditsRemaining,
    exportMode: 'standardized',
    metadata,
    primary,
    compatibility,
    transactions: normalized,
    storagePath: downloadPrep.storagePath,
  };
};

export const decodeArtifactToText = (artifact?: ExportPreparedArtifact): string | null => {
  if (!artifact) return null;
  try {
    return decoder.decode(artifact.fileBuffer);
  } catch {
    return null;
  }
};

export const encodeArtifactToBase64 = (artifact?: ExportPreparedArtifact): string | null => {
  if (!artifact) return null;
  const bytes = artifact.fileBuffer;
  if (!bytes || bytes.byteLength === 0) return null;
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
};

export const encodeTextToBytes = (value: string): Uint8Array => encoder.encode(value);
