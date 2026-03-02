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

const DEFAULT_MIN_CONFIDENCE = Number(Deno.env.get('EXPORT_MIN_CONFIDENCE') ?? '0.35');
const BLOCK_LOW_CONFIDENCE_EXPORTS =
  String(Deno.env.get('EXPORT_BLOCK_LOW_CONFIDENCE') ?? 'false').trim().toLowerCase() === 'true';
const MAX_EXPORT_FILE_SIZE_BYTES = Number(Deno.env.get('EXPORT_MAX_SIZE_BYTES') ?? String(25 * 1024 * 1024));
const BALANCE_TOLERANCE = Number(Deno.env.get('EXPORT_BALANCE_TOLERANCE') ?? '0.01');
const MAX_BALANCE_MISMATCH_RATIO = Number(Deno.env.get('EXPORT_MAX_MISMATCH_RATIO') ?? '0.2');

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const round2 = (value: number): number => Math.round(value * 100) / 100;

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

type ValidationSeverity = 'minor' | 'major';

type ExportValidationIssue = {
  index: number;
  code:
    | 'invalid_date'
    | 'invalid_debit'
    | 'invalid_credit'
    | 'invalid_balance'
    | 'negative_amount_normalized'
    | 'balance_minor_rounding_fix'
    | 'balance_major_mismatch';
  message: string;
  severity: ValidationSeverity;
};

type PreparedTransactions = {
  transactions: Transaction[];
  issues: ExportValidationIssue[];
  flaggedIndices: number[];
  invalidFieldCount: number;
  normalizedNegativeCount: number;
};

const txHash = (tx: Transaction): string =>
  [
    tx.date,
    (tx.description ?? '').trim().toLowerCase(),
    Number(tx.debit || 0).toFixed(2),
    Number(tx.credit || 0).toFixed(2),
    Number(tx.balance || 0).toFixed(2),
  ].join('|');

const prepareTransactions = (transactions: ReadonlyArray<Transaction>): PreparedTransactions => {
  const output: Transaction[] = [];
  const issues: ExportValidationIssue[] = [];
  const flagged = new Set<number>();
  let invalidFieldCount = 0;
  let normalizedNegativeCount = 0;

  for (let index = 0; index < transactions.length; index += 1) {
    const row = transactions[index];
    const isoDate = asIsoDate(row.date);
    const debitRaw = toNumber(row.debit);
    const creditRaw = toNumber(row.credit);
    const balanceRaw = toNumber(row.balance);

    let debit = Number.isFinite(debitRaw) ? debitRaw : 0;
    let credit = Number.isFinite(creditRaw) ? creditRaw : 0;
    const balance = Number.isFinite(balanceRaw) ? balanceRaw : 0;

    if (!isoDate) {
      invalidFieldCount += 1;
      flagged.add(index);
      issues.push({
        index,
        code: 'invalid_date',
        message: 'Transaction date is invalid; using UNKNOWN.',
        severity: 'major',
      });
    }
    if (!Number.isFinite(debitRaw)) {
      invalidFieldCount += 1;
      flagged.add(index);
      issues.push({
        index,
        code: 'invalid_debit',
        message: 'Debit is invalid; normalized to 0.',
        severity: 'major',
      });
    }
    if (!Number.isFinite(creditRaw)) {
      invalidFieldCount += 1;
      flagged.add(index);
      issues.push({
        index,
        code: 'invalid_credit',
        message: 'Credit is invalid; normalized to 0.',
        severity: 'major',
      });
    }
    if (!Number.isFinite(balanceRaw)) {
      invalidFieldCount += 1;
      flagged.add(index);
      issues.push({
        index,
        code: 'invalid_balance',
        message: 'Balance is invalid; normalized to 0.',
        severity: 'major',
      });
    }

    if (debit < 0 || credit < 0) {
      normalizedNegativeCount += 1;
      flagged.add(index);
      issues.push({
        index,
        code: 'negative_amount_normalized',
        message: 'Negative amount normalized to positive for export integrity.',
        severity: 'minor',
      });
    }

    debit = Math.abs(debit);
    credit = Math.abs(credit);

    output.push({
      ...row,
      date: isoDate ?? 'UNKNOWN',
      debit: round2(debit),
      credit: round2(credit),
      balance: round2(balance),
    });
  }

  return {
    transactions: output,
    issues,
    flaggedIndices: Array.from(flagged.values()).sort((a, b) => a - b),
    invalidFieldCount,
    normalizedNegativeCount,
  };
};

type BalanceValidationResult = {
  transactions: Transaction[];
  mismatchRatio: number;
  mismatchCount: number;
  majorMismatchCount: number;
  minorFixCount: number;
  issues: ExportValidationIssue[];
  flaggedIndices: number[];
  isValid: boolean;
};

const validateAndRepairRunningBalance = (transactions: ReadonlyArray<Transaction>): BalanceValidationResult => {
  const output = transactions.map((tx) => ({ ...tx }));
  if (output.length <= 1) {
    return {
      transactions: output,
      mismatchRatio: 0,
      mismatchCount: 0,
      majorMismatchCount: 0,
      minorFixCount: 0,
      issues: [],
      flaggedIndices: [],
      isValid: true,
    };
  }

  let mismatchCount = 0;
  let majorMismatchCount = 0;
  let minorFixCount = 0;
  const issues: ExportValidationIssue[] = [];
  const flagged = new Set<number>();

  for (let index = 1; index < output.length; index += 1) {
    const prev = output[index - 1];
    const curr = output[index];
    const expected = round2(Number(prev.balance || 0) + Number(curr.credit || 0) - Number(curr.debit || 0));
    const actual = round2(Number(curr.balance || 0));

    if (!Number.isFinite(expected) || !Number.isFinite(actual)) {
      mismatchCount += 1;
      majorMismatchCount += 1;
      flagged.add(index);
      issues.push({
        index,
        code: 'balance_major_mismatch',
        message: 'Running balance contains non-finite values.',
        severity: 'major',
      });
      continue;
    }

    const diff = round2(expected - actual);
    const absDiff = Math.abs(diff);

    if (absDiff === 0) continue;

    mismatchCount += 1;
    if (absDiff <= BALANCE_TOLERANCE) {
      curr.balance = expected;
      minorFixCount += 1;
      flagged.add(index);
      issues.push({
        index,
        code: 'balance_minor_rounding_fix',
        message: `Minor rounding correction applied (${diff.toFixed(2)}).`,
        severity: 'minor',
      });
    } else {
      majorMismatchCount += 1;
      flagged.add(index);
      issues.push({
        index,
        code: 'balance_major_mismatch',
        message: `Balance mismatch detected (${diff.toFixed(2)}).`,
        severity: 'major',
      });
    }
  }

  const total = Math.max(1, output.length - 1);
  const mismatchRatio = mismatchCount / total;
  return {
    transactions: output,
    mismatchRatio,
    mismatchCount,
    majorMismatchCount,
    minorFixCount,
    issues,
    flaggedIndices: Array.from(flagged.values()).sort((a, b) => a - b),
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
const completedAuditExportIds = new Set<string>();

const hashBytes = async (value: Uint8Array | string): Promise<string> => {
  const bytes = typeof value === 'string' ? encoder.encode(value) : value;
  const digestInput = new Uint8Array(bytes.byteLength);
  digestInput.set(bytes);
  const digest = await crypto.subtle.digest('SHA-256', digestInput);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

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

  const configuredThreshold = Number.isFinite(input.minimumConfidenceScore ?? NaN)
    ? Number(input.minimumConfidenceScore)
    : DEFAULT_MIN_CONFIDENCE;
  const minConfidence = Math.max(0, Math.min(1, configuredThreshold));
  if (!Array.isArray(input.structuredTransactions) || input.structuredTransactions.length === 0) {
    return {
      ok: false,
      error: {
        code: 'EXPORT_EMPTY_TRANSACTIONS',
        message: 'No transactions available for export.',
      },
    };
  }
  if (!Number.isFinite(input.confidenceScore)) {
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

  const prepared = prepareTransactions(input.structuredTransactions);
  if (prepared.transactions.length !== input.structuredTransactions.length) {
    return {
      ok: false,
      error: {
        code: 'EXPORT_ZERO_LOSS_FAILED',
        message: 'Export pipeline dropped rows during preparation.',
        details: {
          inputCount: input.structuredTransactions.length,
          preparedCount: prepared.transactions.length,
        },
      },
    };
  }

  const balanceValidation = validateAndRepairRunningBalance(prepared.transactions);
  const normalized = balanceValidation.transactions;
  const validationIssues: ExportValidationIssue[] = [...prepared.issues, ...balanceValidation.issues];
  const flaggedIndices = Array.from(new Set<number>([
    ...prepared.flaggedIndices,
    ...balanceValidation.flaggedIndices,
  ].values())).sort((a, b) => a - b);

  const majorIssues = validationIssues.filter((issue) => issue.severity === 'major');
  const minorIssues = validationIssues.filter((issue) => issue.severity === 'minor');

  const fraudFlags = input.fraudFlags ?? [];
  const hasCriticalFraudFlag = fraudFlags.some((flag) => CRITICAL_FRAUD_FLAGS.has(String(flag).toLowerCase()));
  const fraudRisk = hasCriticalFraudFlag ? 'high' : fraudFlags.length > 0 ? 'medium' : 'low';

  const planCaps = resolvePlanCapabilities(input.userPlan, !!input.planAllowsFraudOverride);
  let effectiveFormat = input.requestedFormat;
  const formatFallbackApplied = !planCaps.allowedFormats.has(input.requestedFormat);
  if (formatFallbackApplied) {
    if (planCaps.allowedFormats.has('json')) {
      effectiveFormat = 'json';
    } else if (planCaps.allowedFormats.has('csv')) {
      effectiveFormat = 'csv';
    } else {
      const firstAllowed = Array.from(planCaps.allowedFormats.values())[0];
      if (!firstAllowed) {
        return {
          ok: false,
          error: {
            code: 'EXPORT_PLAN_RESTRICTED_FORMAT',
            message: `Format '${input.requestedFormat}' is not allowed for current plan.`,
            details: {
              requestedFormat: input.requestedFormat,
              allowedFormats: [],
              planName: planCaps.planName,
            },
          },
        };
      }
      effectiveFormat = firstAllowed;
    }
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

  let exportConfidence = Math.max(0, Math.min(1, Number(input.confidenceScore)));
  if (minorIssues.length > 0) exportConfidence -= 0.08;
  if (majorIssues.length > 0) exportConfidence -= Math.min(0.35, 0.1 + (majorIssues.length * 0.05));
  if (fraudFlags.length > 0) exportConfidence -= 0.05;
  if (fraudRisk === 'high') exportConfidence -= 0.1;
  exportConfidence = Math.max(0, Math.min(1, round2(exportConfidence)));

  const warnings: string[] = [];
  if (exportConfidence <= minConfidence) {
    if (BLOCK_LOW_CONFIDENCE_EXPORTS) {
      return {
        ok: false,
        error: {
          code: 'EXPORT_LOW_CONFIDENCE',
          message: `Export confidence below threshold (${minConfidence}).`,
          details: {
            confidenceScore: input.confidenceScore,
            exportConfidence,
            threshold: minConfidence,
            flaggedTransactions: flaggedIndices.map((index) => ({
              index,
              transaction: normalized[index] ?? null,
              issues: validationIssues
                .filter((issue) => issue.index === index)
                .map((issue) => issue.code),
            })),
          },
        },
      };
    }
    warnings.push(
      `Low confidence (${exportConfidence}) is below threshold (${minConfidence}); exported with validation flags.`,
    );
  }
  if (formatFallbackApplied) {
    warnings.push(`Requested format '${input.requestedFormat}' downgraded to '${effectiveFormat}' by plan gate.`);
  }
  if (majorIssues.length > 0) {
    warnings.push(`Detected ${majorIssues.length} major validation issue(s).`);
  }
  if (minorIssues.length > 0) {
    warnings.push(`Applied ${minorIssues.length} minor validation fix(es).`);
  }
  if (fraudFlags.length > 0) {
    warnings.push(`Fraud flags detected (${fraudFlags.length}).`);
  }

  const fraudMeta = planCaps.allowFraudPreview
    ? {
      ...(typeof input.fraudAnalysis === 'object' && input.fraudAnalysis !== null
        ? input.fraudAnalysis as Record<string, unknown>
        : {}),
      fraud_risk: fraudRisk,
      fraud_flags_count: fraudFlags.length,
      fraud_flags: fraudFlags,
      warnings,
    }
    : undefined;

  const metadata = {
    bankId: input.bankId,
    exportTimestamp: new Date().toISOString(),
    confidenceScore: exportConfidence,
    parseMode: input.parseMode,
    userPlan: planCaps.planName,
    requestedFormat: effectiveFormat,
    fraudAnalysis: fraudMeta,
    analytics: planCaps.allowFoirExport ? input.analytics : undefined,
    bankInfo: input.bankInfo,
  } as ExportMetadata;

  const inputDataHash = await hashBytes(JSON.stringify(normalized.map((tx) => txHash(tx))));
  let primary = buildForFormat(effectiveFormat, normalized, metadata, input);
  let integrity = validateBufferIntegrity(primary, normalized.length);
  if (!integrity.ok) {
    return {
      ok: false,
      error: {
        code: 'EXPORT_FILE_INTEGRITY_FAILED',
        message: 'Export artifact failed integrity checks.',
        details: { reason: integrity.reason, format: effectiveFormat },
      },
    };
  }

  let outputHash = await hashBytes(primary.fileBuffer);
  const deterministicCandidate = buildForFormat(effectiveFormat, normalized, metadata, input);
  const deterministicIntegrity = validateBufferIntegrity(deterministicCandidate, normalized.length);
  if (!deterministicIntegrity.ok) {
    return {
      ok: false,
      error: {
        code: 'EXPORT_FILE_INTEGRITY_FAILED',
        message: 'Rebuild integrity check failed.',
        details: { reason: deterministicIntegrity.reason, format: effectiveFormat },
      },
    };
  }
  const deterministicHash = await hashBytes(deterministicCandidate.fileBuffer);
  if (outputHash !== deterministicHash) {
    const finalCandidate = buildForFormat(effectiveFormat, normalized, metadata, input);
    const finalIntegrity = validateBufferIntegrity(finalCandidate, normalized.length);
    if (!finalIntegrity.ok) {
      return {
        ok: false,
        error: {
          code: 'EXPORT_FILE_INTEGRITY_FAILED',
          message: 'File hash mismatch and rebuild failed.',
          details: { reason: finalIntegrity.reason, format: effectiveFormat },
        },
      };
    }
    const finalHash = await hashBytes(finalCandidate.fileBuffer);
    if (finalHash !== deterministicHash) {
      return {
        ok: false,
        error: {
          code: 'EXPORT_FILE_HASH_MISMATCH',
          message: 'Export artifact hash mismatch after rebuild.',
          details: {
            format: effectiveFormat,
            inputDataHash,
            firstHash: outputHash,
            secondHash: deterministicHash,
            thirdHash: finalHash,
          },
        },
      };
    }
    primary = finalCandidate;
    integrity = finalIntegrity;
    outputHash = finalHash;
  }

  console.log('EXPORT_METRIC', {
    stage: 'post_build_integrity',
    format: effectiveFormat,
    plan: planCaps.planName,
    rowCount: primary.rowCount,
    fileSize: integrity.size,
    inputHash: inputDataHash,
    outputHash,
    fraudRisk,
    issues: validationIssues.length,
    fps: primary.rowCount > 0 ? Number((primary.rowCount / Math.max(1, integrity.size / 1024)).toFixed(4)) : 0,
  });

  const exportId =
    input.exportId ??
    await createDeterministicExportId(input.sessionId, effectiveFormat, primary.rowCount, integrity.size);

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
          format: effectiveFormat,
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
  if (input.includeCompatibilityBundle === true) {
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

  if (!completedAuditExportIds.has(exportId)) {
    await input.auditExport({
      exportId,
      planName: planCaps.planName,
      creditsUsed: input.previewOnly ? 0 : 1,
      timestamp: new Date().toISOString(),
      format: effectiveFormat,
      rowCount: primary.rowCount,
      fileSize: downloadPrep.fileSize,
      status: 'success',
      sessionId: input.sessionId,
    });
    completedAuditExportIds.add(exportId);
  }

  return {
    ok: true,
    exportId,
    downloadUrl: downloadPrep.downloadUrl,
    format: effectiveFormat,
    rowCount: primary.rowCount,
    fileSize: downloadPrep.fileSize,
    confidenceScore: exportConfidence,
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
