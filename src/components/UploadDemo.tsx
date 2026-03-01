import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileText, Sparkles, Loader2, AlertTriangle, Lock, Eye, EyeOff, RefreshCw, XCircle, Crown, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useReducer, useRef, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { validateFile, sanitizeFilename } from "@/lib/fileValidation";
import { useNavigate } from "react-router-dom";
import { useUsageLimit } from "@/hooks/useUsageLimit";
import { UsageLimitBanner } from "./UsageLimitBanner";
import { useRecaptcha } from "@/hooks/useRecaptcha";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { useSettings } from "@/hooks/useSettings";
import {
  getEditPdfDetectorTier,
  hasFoirDashboardAccess,
  hasFraudDetectorAccess,
  hasMt940Access,
  hasTallyXmlAccess,
} from "@/lib/entitlements";
import banklefyLogo from "@/assets/banklefy-logo.svg";
import { formatCurrencyValue, normalizeCurrencyCode, sumMoney } from "@/lib/currency";
import { useLanguage } from "@/contexts/LanguageContext";
const loadPdfUtils = () => import("./uploadDemo/pdfUtils");
const loadExporters = () => import("./uploadDemo/exporters");
import { ResultsSection } from "./uploadDemo/ResultsSection";
import { initialUploadState, type UploadDemoState, uploadDemoReducer } from "./uploadDemo/state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  AiStatus,
  Analytics,
  BankInfo,
  BatchFilePayload,
  BatchRequestBody,
  ConversionResponse,
  MergeInfo,
  MultiConversionResponse,
  Transaction,
} from "./uploadDemo/types";

const PURCHASE_TOAST_STORAGE_KEY = "banklefy:last-plan-purchase";
const EDITED_WARNING_BYPASS_KEY = "banklefy:edited-warning-bypass-all";

export const UploadDemo = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const pluralize = (count: number, singular: string, plural = `${singular}s`) =>
    count === 1 ? singular : plural;
  const formatRemaining = (remaining?: number) => {
    if (remaining === null || remaining === undefined) return "";
    const normalizedPlan = (planType ?? "free").toLowerCase();
    const isUnlimitedPlan = normalizedPlan === "unlimited";
    const isPerPagePlan = normalizedPlan.startsWith("per_page");
    const isMonthlyPlan = normalizedPlan.startsWith("monthly") || normalizedPlan === "daily";
    const isYearlyPlan = normalizedPlan.startsWith("yearly") || normalizedPlan === "business";
    const isKnownPaidPlan = isPerPagePlan || isMonthlyPlan || isYearlyPlan || isUnlimitedPlan;
    const isFreeMode = !isKnownPaidPlan && (!isAuthenticated || normalizedPlan === "free" || (conversionsLimit ?? 0) <= 5);

    const conversionLabel = pluralize(remaining, "conversion");
    const pageLabel = pluralize(remaining, "page");

    if (isFreeMode) {
      return `${remaining} ${conversionLabel} remaining today.`;
    }
    if (isUnlimitedPlan) {
      return "Unlimited pages remaining.";
    }
    if (isMonthlyPlan) {
      return `${remaining} ${pageLabel} remaining this month.`;
    }
    if (isYearlyPlan) {
      return `${remaining} ${pageLabel} remaining this year.`;
    }
    if (isPerPagePlan) {
      return `${remaining} ${pageLabel} remaining in your pack.`;
    }
    return `${remaining} ${pageLabel} remaining.`;
  };
  const [state, dispatch] = useReducer(uploadDemoReducer, initialUploadState);
  const {
    selectedFiles,
    selectedFile,
    uploading,
    converting,
    conversionResult,
    singleDownloadFileName,
    batchResults,
    mergeInfo,
    mergeResult,
    transactions,
    analytics,
    bankInfo,
    currencyCode,
    jsonData,
    mt940Data,
    aiStatus,
    downloading,
    batchDownloading,
    mergeDownloading,
    showDuplicatesOnly,
    pdfPassword,
    showPasswordInput,
    passwordError,
    lastError,
    editedPdfWarning,
    showPassword,
    showUpgradeDialog,
    showLimitDialog,
    limitDialogTitle,
    limitDialogMessage,
    limitDialogShowSignup,
    limitDialogShowPricing,
    progressStep,
    showProgress,
  } = state;
  const setSelectedFiles = (value: File[] | ((prev: File[]) => File[])) =>
    dispatch({
      type: "set",
      payload: {
        selectedFiles: typeof value === "function" ? value(state.selectedFiles) : value,
      },
    });
  const setSelectedFile = (value: File | null) => dispatch({ type: "set", payload: { selectedFile: value } });
  const setUploading = (value: boolean) => dispatch({ type: "set", payload: { uploading: value } });
  const setConverting = (value: boolean) => dispatch({ type: "set", payload: { converting: value } });
  const setConversionResult = (value: UploadDemoState["conversionResult"]) =>
    dispatch({ type: "set", payload: { conversionResult: value } });
  const setSingleDownloadFileName = (value: string) =>
    dispatch({ type: "set", payload: { singleDownloadFileName: value } });
  const setBatchResults = (value: UploadDemoState["batchResults"]) =>
    dispatch({ type: "set", payload: { batchResults: value } });
  const setMergeInfo = (value: MergeInfo | null) => dispatch({ type: "set", payload: { mergeInfo: value } });
  const setMergeResult = (value: UploadDemoState["mergeResult"]) =>
    dispatch({ type: "set", payload: { mergeResult: value } });
  const setTransactions = (value: Transaction[]) => dispatch({ type: "set", payload: { transactions: value } });
  const setAnalytics = (value: Analytics | null) => dispatch({ type: "set", payload: { analytics: value } });
  const setBankInfo = (value: BankInfo | null) => dispatch({ type: "set", payload: { bankInfo: value } });
  const setCurrencyCode = (value: string) => dispatch({ type: "set", payload: { currencyCode: value } });
  const setJsonData = (value: string | null) => dispatch({ type: "set", payload: { jsonData: value } });
  const setMt940Data = (value: string | null) => dispatch({ type: "set", payload: { mt940Data: value } });
  const setAiStatus = (value: AiStatus | null) => dispatch({ type: "set", payload: { aiStatus: value } });
  const setDownloading = (value: boolean) => dispatch({ type: "set", payload: { downloading: value } });
  const setBatchDownloading = (value: boolean) =>
    dispatch({ type: "set", payload: { batchDownloading: value } });
  const setMergeDownloading = (value: boolean) =>
    dispatch({ type: "set", payload: { mergeDownloading: value } });
  const setShowDuplicatesOnly = (value: boolean) =>
    dispatch({ type: "set", payload: { showDuplicatesOnly: value } });
  const setPdfPassword = (value: string) => dispatch({ type: "set", payload: { pdfPassword: value } });
  const setShowPasswordInput = (value: boolean) =>
    dispatch({ type: "set", payload: { showPasswordInput: value } });
  const setPasswordError = (value: boolean) => dispatch({ type: "set", payload: { passwordError: value } });
  const setLastError = (value: UploadDemoState["lastError"]) =>
    dispatch({ type: "set", payload: { lastError: value } });
  const setEditedPdfWarning = (value: UploadDemoState["editedPdfWarning"]) =>
    dispatch({ type: "set", payload: { editedPdfWarning: value } });
  const setShowPassword = (value: boolean) => dispatch({ type: "set", payload: { showPassword: value } });
  const setShowUpgradeDialog = (value: boolean) =>
    dispatch({ type: "set", payload: { showUpgradeDialog: value } });
  const setShowLimitDialog = (value: boolean) =>
    dispatch({ type: "set", payload: { showLimitDialog: value } });
  const setLimitDialogTitle = (value: string) =>
    dispatch({ type: "set", payload: { limitDialogTitle: value } });
  const setLimitDialogMessage = (value: string) =>
    dispatch({ type: "set", payload: { limitDialogMessage: value } });
  const setLimitDialogShowSignup = (value: boolean) =>
    dispatch({ type: "set", payload: { limitDialogShowSignup: value } });
  const setLimitDialogShowPricing = (value: boolean) =>
    dispatch({ type: "set", payload: { limitDialogShowPricing: value } });
  const setProgressStep = (value: number) => dispatch({ type: "set", payload: { progressStep: value } });
  const setShowProgress = (value: boolean) => dispatch({ type: "set", payload: { showProgress: value } });
  const pdfPasswordHelpId = "pdf-password-help";
  const pdfPasswordErrorId = "pdf-password-error";
  const dismissedEditedWarningsRef = useRef<Set<string>>(new Set());
  const [editedWarningBypassAll, setEditedWarningBypassAll] = useState<boolean>(() => {
    try {
      return localStorage.getItem(EDITED_WARNING_BYPASS_KEY) === "1";
    } catch {
      return false;
    }
  });
  type ConversionMode = "standard" | "tally_only";
  type EditedPdfCheckResult = {
    fileName: string;
    status: "clean" | "suspected";
    reason: string;
  };
  const [conversionMode, setConversionMode] = useState<ConversionMode>("standard");
  const [editedPdfCheckResult, setEditedPdfCheckResult] = useState<EditedPdfCheckResult | null>(null);
  const [showScanTimeCard, setShowScanTimeCard] = useState(false);
  const [uploadPrepActive, setUploadPrepActive] = useState(false);
  const [uploadPrepProgress, setUploadPrepProgress] = useState(0);
  const [uploadPrepLabel, setUploadPrepLabel] = useState("Reading document...");
  const [uploadPrepFileName, setUploadPrepFileName] = useState<string | null>(null);
  const preparedPdfDataRef = useRef<
    Map<string, { transactions?: BatchFilePayload["pdfParsedTransactions"]; bankMetadata?: BatchFilePayload["pdfParsedBankMetadata"] }>
  >(new Map());
  const preparedPdfImagesRef = useRef<Map<string, string[]>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { hasChatAuraAccess } = useSubscriptionTier();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const editedPdfWarningTiming = settings.editedPdfWarningTiming ?? "convert";
  useEffect(() => {
    if (selectedFiles.length === 0) {
      setShowScanTimeCard(false);
      return;
    }
    const hasDirectImageUpload = selectedFiles.some((file) => /\.(png|jpe?g)$/i.test(file.name));
    if (hasDirectImageUpload) {
      setShowScanTimeCard(true);
      return;
    }
    setShowScanTimeCard(false);
  }, [selectedFiles]);
  const formatAmountNoSymbol = (
    value: number,
    options?: { minimumFractionDigits?: number; maximumFractionDigits?: number; signDisplay?: 'auto' | 'always' | 'never' },
  ) => formatCurrencyValue(value ?? 0, currencyCode, { ...options, showSymbol: false });
  const truncateDecimals = (value: number, decimals = 2) => {
    const factor = 10 ** decimals;
    if (!Number.isFinite(value)) return 0;
    return Math.trunc(value * factor) / factor;
  };
  const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message) return error.message;
    if (typeof error === 'string') return error;
    return fallback;
  };
  const parseEdgeStatusCode = (error: unknown): number | undefined => {
    if (!error || typeof error !== "object") return undefined;
    const maybe = error as { context?: { status?: number }; status?: number; response?: { status?: number } };
    const statusValue = maybe.context?.status ?? maybe.status ?? maybe.response?.status;
    return typeof statusValue === "number" ? statusValue : undefined;
  };
  const isLikelyEdgeResourceError = (message: string, statusCode?: number): boolean => {
    const normalized = message.toLowerCase();
    if ([413, 429, 504, 524, 546].includes(statusCode ?? -1)) return true;
    if (normalized.includes("status code 546")) return true;
    if (normalized.includes("non-2xx status code") && [413, 429, 504, 524, 546].includes(statusCode ?? -1)) return true;
    if (normalized.includes("failed to send a request")) return true;
    if (normalized.includes("network error")) return true;
    if (normalized.includes("worker_limit")) return true;
    if (normalized.includes("not having enough compute resources")) return true;
    if (normalized.includes("request was too large/complex")) return true;
    if (normalized.includes("deadline exceeded")) return true;
    return false;
  };
  const parseStructuredErrorCode = (payload: unknown): string | null => {
    if (!payload || typeof payload !== "object") return null;
    const maybePayload = payload as Record<string, unknown>;
    const code = maybePayload.code ?? maybePayload.errorCode ?? maybePayload.error_code;
    if (typeof code !== "string") return null;
    const normalized = code.trim().toUpperCase();
    return normalized.length > 0 ? normalized : null;
  };
  const parseEdgeErrorPayload = async (error: unknown): Promise<Record<string, unknown> | null> => {
    if (!error || typeof error !== "object") return null;
    const context = (error as { context?: unknown }).context;
    if (!context || typeof context !== "object") return null;
    const responseLike = context as { clone?: () => { text?: () => Promise<string> }; text?: () => Promise<string> };
    const source = typeof responseLike.clone === "function" ? responseLike.clone() : responseLike;
    if (typeof source?.text !== "function") return null;
    try {
      const body = await source.text();
      if (!body) return null;
      const parsed = JSON.parse(body);
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  };
  const getFileCacheKey = (file: File): string => `${file.name}__${file.size}__${file.lastModified}`;
  const estimateDataUrlBytes = (dataUrl: string): number => {
    const commaIndex = dataUrl.indexOf(",");
    const base64 = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
    return Math.floor((base64.length * 3) / 4);
  };
  const estimatePdfPageImagesBytes = (images?: string[]): number => {
    if (!Array.isArray(images)) return 0;
    return images.reduce((total, image) => total + (typeof image === "string" ? estimateDataUrlBytes(image) : 0), 0);
  };
  const formatMegabytes = (bytes: number): string => `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  const buildPdfPayloadTooLargeMessage = (scope: "single" | "batch", pages: number, bytes: number): string => {
    const payload = `~${formatMegabytes(bytes)} OCR payload across ${pages} PDF page${pages === 1 ? "" : "s"}`;
    if (scope === "single") {
      return `This PDF is too heavy for one run (${payload}). Please split into smaller PDFs (recommended 10-20 pages each).`;
    }
    return `Selected batch is too heavy for one run (${payload}). Please split files into smaller batches.`;
  };
  const formatFileSize = (bytes: number): string => {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };
  const isTransientStorageUploadError = (error: unknown): boolean => {
    const message =
      typeof error === "string"
        ? error
        : error instanceof Error
          ? error.message
          : typeof error === "object" && error && "message" in error
            ? String((error as { message?: unknown }).message ?? "")
            : "";
    const normalized = message.toLowerCase();
    return (
      normalized.includes("failed to fetch") ||
      normalized.includes("networkerror") ||
      normalized.includes("network request failed") ||
      normalized.includes("err_timed_out") ||
      normalized.includes("timeout")
    );
  };
  const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
  const uploadSourceFileWithRetry = async (storagePath: string, file: File) => {
    const maxAttempts = 3;
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const { error: uploadError } = await supabase.storage
        .from("bank-statements")
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (!uploadError) {
        return;
      }

      // If previous attempt succeeded but response was interrupted, retry can hit "already exists".
      if (String(uploadError.message || "").toLowerCase().includes("already exists")) {
        return;
      }

      lastError = uploadError;
      if (!isTransientStorageUploadError(uploadError) || attempt === maxAttempts) {
        throw uploadError;
      }

      await sleep(attempt * 1000);
    }

    if (lastError) {
      throw lastError;
    }
  };
  const AUTO_CHUNK_MAX_PDF_PAGES = 25;
  const AUTO_CHUNK_MAX_PDF_BYTES = 8 * 1024 * 1024;
  const AUTO_CHUNK_EAGER_MIN_PDF_PAGES = 16;
  const HARD_AUTO_CHUNK_MAX_PDF_PAGES = 8;
  const HARD_AUTO_CHUNK_MAX_PDF_BYTES = 4 * 1024 * 1024;
  const HARD_AUTO_CHUNK_EAGER_MIN_PDF_PAGES = 3;
  const HARD_AUTO_CHUNK_AVG_PAGE_BYTES = 850 * 1024;
  const MIN_DETERMINISTIC_PDF_ROWS = 6;
  const HARD_PDF_BANK_PATTERN = /(enbd|emirates[\s_-]?nbd|adcb|mashreq|wio|emirates[\s_-]?islamic)/i;
  const splitPdfPageImagesForChunking = (
    images: string[],
    options?: { maxPages?: number; maxBytes?: number },
  ): string[][] => {
    const maxPages = Math.max(1, options?.maxPages ?? AUTO_CHUNK_MAX_PDF_PAGES);
    const maxBytes = Math.max(256 * 1024, options?.maxBytes ?? AUTO_CHUNK_MAX_PDF_BYTES);
    if (!Array.isArray(images) || images.length === 0) return [];

    const chunks: string[][] = [];
    let currentChunk: string[] = [];
    let currentBytes = 0;

    for (const image of images) {
      if (typeof image !== "string") continue;
      const imageBytes = estimateDataUrlBytes(image);
      const nextChunkWouldOverflow =
        currentChunk.length >= maxPages ||
        (currentChunk.length > 0 && currentBytes + imageBytes > maxBytes);

      if (nextChunkWouldOverflow) {
        chunks.push(currentChunk);
        currentChunk = [];
        currentBytes = 0;
      }

      currentChunk.push(image);
      currentBytes += imageBytes;
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }

    return chunks;
  };
  const aggregateChunkAnalytics = (allTransactions: Transaction[]): Analytics | null => {
    if (!allTransactions.length) return null;

    const totalCredits = sumMoney(allTransactions.map((transaction) => Number(transaction.credit || 0)));
    const totalDebits = sumMoney(allTransactions.map((transaction) => Number(transaction.debit || 0)));
    const netFlow = sumMoney([totalCredits, -totalDebits]);
    const duplicateCount = allTransactions.reduce(
      (count, transaction) => count + (transaction.isDuplicate ? 1 : 0),
      0,
    );

    const categoryBreakdown: Record<string, { count: number; totalDebit: number; totalCredit: number }> = {};
    for (const transaction of allTransactions) {
      const category = transaction.category?.trim() || "Other";
      if (!categoryBreakdown[category]) {
        categoryBreakdown[category] = { count: 0, totalDebit: 0, totalCredit: 0 };
      }
      categoryBreakdown[category].count += 1;
      categoryBreakdown[category].totalDebit = sumMoney([
        categoryBreakdown[category].totalDebit,
        Number(transaction.debit || 0),
      ]);
      categoryBreakdown[category].totalCredit = sumMoney([
        categoryBreakdown[category].totalCredit,
        Number(transaction.credit || 0),
      ]);
    }

    return {
      totalTransactions: allTransactions.length,
      totalCredits,
      totalDebits,
      netFlow,
      duplicateCount,
      categoryBreakdown,
    };
  };
  const mergeChunkBankInfo = (infos: Array<BankInfo | null | undefined>): BankInfo | null => {
    const merged: BankInfo = {};
    for (const info of infos) {
      if (!info) continue;
      for (const [key, value] of Object.entries(info) as Array<[keyof BankInfo, BankInfo[keyof BankInfo]]>) {
        if (value === undefined || value === null || value === "") continue;
        const existing = merged[key];
        if (existing === undefined || existing === null || existing === "") {
          merged[key] = value;
        }
      }
    }
    return Object.keys(merged).length > 0 ? merged : null;
  };
  const buildChunkedMergedExcelBase64 = async (
    allTransactions: Transaction[],
    mergedBankInfo: BankInfo | null,
    resolvedCurrency: string,
  ): Promise<string> => {
    const XLSX = await import("xlsx");
    const rows: Array<Array<string | number>> = [];

    const metadataRows: Array<[string, string | number | undefined | null]> = [
      ["Bank Name", mergedBankInfo?.bankName],
      ["Currency Type", mergedBankInfo?.currency || resolvedCurrency],
      ["Account Number", mergedBankInfo?.accountNumber],
      ["Account Holder Name", mergedBankInfo?.accountHolder],
      ["Statement Period", mergedBankInfo?.statementPeriod],
      ["IBAN", mergedBankInfo?.iban],
      ["IFSC", mergedBankInfo?.ifsc],
      ["SWIFT", mergedBankInfo?.swift],
      ["Routing Number", mergedBankInfo?.routingNumber],
      ["Opening Balance", mergedBankInfo?.openingBalance],
      ["Closing Balance", mergedBankInfo?.closingBalance],
      ["Generated On", new Date().toLocaleString("en-IN")],
    ];

    metadataRows.forEach(([label, value]) => {
      if (value === undefined || value === null || value === "") return;
      rows.push([label, value]);
    });

    if (rows.length > 0) rows.push([]);

    rows.push([
      "Date",
      "Description",
      "Debit",
      "Credit",
      "Balance",
      "Category",
      "Duplicate",
      "Balance Mismatch",
      "Confidence",
    ]);

    allTransactions.forEach((transaction) => {
      const debitValue = Number(transaction.debit || 0);
      const creditValue = Number(transaction.credit || 0);
      const balanceValue =
        transaction.balance === null || transaction.balance === undefined || transaction.balance === ""
          ? ""
          : Number(transaction.balance);
      rows.push([
        transaction.date || "",
        transaction.description || "",
        debitValue === 0 ? "" : debitValue,
        creditValue === 0 ? "" : creditValue,
        Number.isFinite(Number(balanceValue)) ? Number(balanceValue) : "",
        transaction.category || "",
        transaction.isDuplicate ? "YES" : "",
        transaction.balanceMismatch ? "YES" : "",
        Number.isFinite(Number(transaction.confidenceScore))
          ? Number(Number(transaction.confidenceScore).toFixed(3))
          : "",
      ]);
    });

    rows.push([]);
    rows.push([
      "",
      "TOTAL",
      Number(sumMoney(allTransactions.map((transaction) => Number(transaction.debit || 0))).toFixed(2)),
      Number(sumMoney(allTransactions.map((transaction) => Number(transaction.credit || 0))).toFixed(2)),
      "",
      "",
      "",
      "",
      "",
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    worksheet["!cols"] = [
      { wch: 14 },
      { wch: 60 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
      { wch: 18 },
      { wch: 12 },
      { wch: 16 },
      { wch: 12 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Statement");
    return XLSX.write(workbook, { bookType: "xlsx", type: "base64" });
  };
  const getExportBaseName = () => {
    const preferredName =
      singleDownloadFileName ||
      mergeResult?.fileName ||
      batchResults.find((result) => result.status === 'success')?.downloadFileName ||
      batchResults.find((result) => result.status === 'success')?.fileName ||
      selectedFile?.name ||
      selectedFiles[0]?.name ||
      "bank-statement";

    const noExtension = preferredName.replace(/\.[^/.\\]+$/, "");
    const safe = noExtension
      .replace(/[<>:"/\\|?*]/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\.+$/g, "")
      .trim();
    return safe || "bank-statement";
  };
  const exportAsCSV = async () => {
    const { exportAsCSV: exportCsv } = await loadExporters();
    return exportCsv({
      transactions,
      analytics,
      currencyCode,
      exportBaseName: getExportBaseName(),
      toast,
      getErrorMessage,
      sumMoney,
      truncateDecimals,
    });
  };
  const exportAsJSON = async () => {
    const { exportAsJSON: exportJson } = await loadExporters();
    return exportJson({
      transactions,
      analytics,
      bankInfo,
      currencyCode,
      jsonData,
      mt940Data,
      exportBaseName: getExportBaseName(),
      toast,
      getErrorMessage,
      sumMoney,
      truncateDecimals,
    });
  };
  const exportAsMT940 = async () => {
    const { exportAsMT940: exportMt940 } = await loadExporters();
    return exportMt940({
      transactions,
      analytics,
      bankInfo,
      currencyCode,
      jsonData,
      mt940Data,
      exportBaseName: getExportBaseName(),
      toast,
      getErrorMessage,
      sumMoney,
      truncateDecimals,
    });
  };
  const exportAsTally = async () => {
    const { exportAsTallyXml: exportTallyXml } = await loadExporters();
    return exportTallyXml({
      transactions,
      analytics,
      currencyCode,
      exportBaseName: getExportBaseName(),
      toast,
      getErrorMessage,
      sumMoney,
      truncateDecimals,
    });
  };
  const sanitizeFileBaseName = (value?: string | null, fallback = "bank-statement") => {
    const source = (value ?? "").trim();
    const noExtension = source.replace(/\.[^/.\\]+$/, "");
    const safe = noExtension
      .replace(/[<>:"/\\|?*]/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\.+$/g, "")
      .trim();
    return safe || fallback;
  };
  const buildExcelDownloadName = (bankName?: string | null, fallbackName?: string | null) => {
    const baseName = sanitizeFileBaseName(bankName || fallbackName);
    return `${baseName}.xlsx`;
  };
  const {
    remaining,
    conversionsLimit,
    limitReached,
    isAuthenticated,
    loading: usageLimitLoading,
    refresh: refreshUsageLimit,
    getTimezone,
    planType
  } = useUsageLimit();

  useEffect(() => {
    const raw = sessionStorage.getItem(PURCHASE_TOAST_STORAGE_KEY);
    if (!raw) return;

    sessionStorage.removeItem(PURCHASE_TOAST_STORAGE_KEY);

    try {
      const parsed = JSON.parse(raw) as {
        at?: unknown;
        planName?: unknown;
        pagesAdded?: unknown;
        features?: unknown;
      };

      const purchasedAt = Number(parsed.at ?? 0);
      if (!Number.isFinite(purchasedAt) || Date.now() - purchasedAt > 15 * 60 * 1000) {
        return;
      }

      const planName = typeof parsed.planName === "string" && parsed.planName.trim()
        ? parsed.planName.trim()
        : "Your plan";
      const pagesAdded = Number(parsed.pagesAdded ?? 0);
      const features = Array.isArray(parsed.features)
        ? parsed.features.filter((feature): feature is string => typeof feature === "string").slice(0, 3)
        : [];

      const descriptionParts = [
        Number.isFinite(pagesAdded) ? `${Math.max(0, pagesAdded)} pages added.` : null,
        features.length > 0 ? `Unlocked: ${features.join(" | ")}.` : null,
      ].filter(Boolean) as string[];

      toast({
        title: `Plan activated: ${planName}`,
        description: descriptionParts.join(" "),
      });

      window.dispatchEvent(new Event("banklefy:subscription-updated"));
      void refreshUsageLimit();
    } catch {
      // Ignore malformed payloads and continue.
    }
  }, [refreshUsageLimit, toast]);

  const normalizedPlanType = (planType ?? "free").toLowerCase();
  const isUnlimitedUsagePlan = normalizedPlanType === "unlimited";
  const isPerPageUsagePlan = normalizedPlanType.startsWith("per_page");
  const isMonthlyUsagePlan = normalizedPlanType.startsWith("monthly") || normalizedPlanType === "daily";
  const isYearlyUsagePlan = normalizedPlanType.startsWith("yearly") || normalizedPlanType === "business";
  const isKnownPaidUsagePlan = isPerPageUsagePlan || isMonthlyUsagePlan || isYearlyUsagePlan || isUnlimitedUsagePlan;
  const isFreeUsageMode = !isKnownPaidUsagePlan && (!isAuthenticated || normalizedPlanType === "free" || conversionsLimit <= 5);
  const entitlementInput = {
    planType,
    conversionsLimit,
    isAuthenticated,
  };
  const pdfDetectorTier = getEditPdfDetectorTier(entitlementInput);
  const hasEditPdfDetectorAccess = pdfDetectorTier !== "none";

  // reCAPTCHA v3 for anonymous users - runs invisibly in background
  const { executeRecaptcha } = useRecaptcha();

  useEffect(() => {
    if (selectedFiles.length === 1) {
      setSelectedFile(selectedFiles[0]);
      return;
    }

    if (selectedFiles.length === 0) {
      setSelectedFile(null);
    } else {
      setSelectedFile(null);
    }
  }, [selectedFiles]);

  useEffect(() => {
    let isMounted = true;
    const checkPassword = async () => {
      if (!selectedFile) return;
      const isPdf = selectedFile.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        if (isMounted) setShowPasswordInput(false);
        return;
      }
      try {
        const { detectPasswordProtectedPdf } = await loadPdfUtils();
        const requiresPassword = await detectPasswordProtectedPdf(selectedFile);
        if (!isMounted) return;
        setShowPasswordInput(requiresPassword);
        if (requiresPassword) setPasswordError(false);
      } catch {
        // If detection fails, allow conversion flow to handle the error.
      }
    };

    checkPassword();
    return () => {
      isMounted = false;
    };
  }, [selectedFile]);

  useEffect(() => {
    let intervalId: number | undefined;

    if (uploading) {
      setShowProgress(true);
      setProgressStep(0);
      let value = 0;
      intervalId = window.setInterval(() => {
        value = Math.min(value + 5, 35);
        setProgressStep(value);
      }, 140);
      return () => {
        if (intervalId) window.clearInterval(intervalId);
      };
    }

    if (converting) {
      setShowProgress(true);
      let value = 35;
      setProgressStep(value);
      intervalId = window.setInterval(() => {
        value = Math.min(value + 3, 95);
        setProgressStep(value);
      }, 220);
      return () => {
        if (intervalId) window.clearInterval(intervalId);
      };
    }

    return undefined;
  }, [uploading, converting]);

  useEffect(() => {
    if (!hasEditPdfDetectorAccess && editedPdfWarning) {
      setEditedPdfWarning(null);
    }
    if (!hasEditPdfDetectorAccess && editedPdfCheckResult) {
      setEditedPdfCheckResult(null);
    }
  }, [hasEditPdfDetectorAccess, editedPdfWarning, editedPdfCheckResult]);

  useEffect(() => {
    if (uploading || converting || !showProgress) return;

    setProgressStep(100);
    const timeout = window.setTimeout(() => {
      setShowProgress(false);
      setProgressStep(0);
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [uploading, converting, showProgress]);

  const MAX_PDF_RENDER_PAGES = 120;
  const FREE_MAX_PDF_PAGES_PER_FILE = 15;
  const maxPdfRenderPages = isFreeUsageMode ? FREE_MAX_PDF_PAGES_PER_FILE : MAX_PDF_RENDER_PAGES;
  const EDGE_FUNCTION_SAFE_SINGLE_PDF_PAYLOAD_BYTES = 18 * 1024 * 1024;
  const EDGE_FUNCTION_SAFE_BATCH_PDF_PAYLOAD_BYTES = 20 * 1024 * 1024;
  const EDGE_FUNCTION_SAFE_BATCH_PDF_PAGES = 45;



  const openLimitDialog = (options: {
    title: string;
    message: string;
    showSignup: boolean;
    showPricing: boolean;
  }) => {
    setLimitDialogTitle(options.title);
    setLimitDialogMessage(options.message);
    setLimitDialogShowSignup(options.showSignup);
    setLimitDialogShowPricing(options.showPricing);
    setShowLimitDialog(true);
  };

  const showLimitReachedDialog = () => {
    const limit = Math.max(0, conversionsLimit ?? 0);
    const title = isFreeUsageMode ? t("upload.limit.daily.title") : t("upload.limit.usage.title");
    let message = "";

    if (isFreeUsageMode) {
      message = isAuthenticated
        ? `You have used all ${limit} daily conversions. Your free limit resets at midnight.`
        : `You have used all ${limit} free daily conversions. Sign up for 5 conversions/day or choose a plan.`;
    } else if (isPerPageUsagePlan) {
      message = `You have used all ${limit} pages in your current pack. Purchase another pack to continue.`;
    } else if (isYearlyUsagePlan) {
      message = `You have used all ${limit} pages for this year. Your usage resets at the start of next year.`;
    } else if (isMonthlyUsagePlan) {
      message = `You have used all ${limit} pages for this month. Your usage resets at the start of next month.`;
    } else if (isUnlimitedUsagePlan) {
      message = "Your plan is unlimited. Please refresh and try again.";
    } else {
      message = `You have used all ${limit} pages in your plan.`;
    }

    openLimitDialog({
      title,
      message,
      showSignup: !isAuthenticated,
      showPricing: true,
    });
  };

  const showSelectionLimitDialog = (selectedFilesCount: number, remainingCount: number, limit: number) => {
    const title = t("upload.limit.page.title");
    const message = isFreeUsageMode
      ? `You selected ${selectedFilesCount} files, but only ${remainingCount} conversion${remainingCount === 1 ? "" : "s"} are left today (daily limit ${limit}).`
      : `You selected files beyond your remaining quota. Remaining: ${remainingCount}, limit: ${limit}.`;
    openLimitDialog({
      title,
      message,
      showSignup: !isAuthenticated,
      showPricing: true,
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate each file
      const validation = validateFile(file);
      if (!validation.success) {
        toast({
          variant: "destructive",
          title: "Invalid file",
          description: `${file.name}: ${validation.error}`,
        });
        continue;
      }

      newFiles.push(file);
    }

    if (newFiles.length > 0) {
      void supabase.functions
        .invoke('warm-up', { body: { ts: Date.now() } })
        .catch(() => undefined);
      setUploadPrepActive(true);
      setUploadPrepProgress(0);
      setUploadPrepFileName(newFiles[0]?.name ?? null);
      setUploadPrepLabel("Reading document...");
      try {
        setUploadPrepProgress(12);
        if (limitReached) {
          showLimitReachedDialog();
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          return;
        }

        if (!usageLimitLoading) {
          const candidateFiles = [...selectedFiles, ...newFiles];
          const { getTotalPages } = await loadPdfUtils();
          const { unknown, overCap, maxSingle } = await getTotalPages(
            candidateFiles,
            pdfPassword.trim() || undefined,
            maxPdfRenderPages
          );
          if (overCap) {
            toast({
              variant: "destructive",
              title: "PDF too large",
              description: `This PDF has ${maxSingle} pages. The current maximum supported per file is ${MAX_PDF_RENDER_PAGES} pages. Please split the PDF and try again.`,
            });
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
            return;
          }

          if (!unknown && isFreeUsageMode && maxSingle > FREE_MAX_PDF_PAGES_PER_FILE) {
            toast({
              variant: "destructive",
              title: "Free tier file limit",
              description: `Free tier allows up to ${FREE_MAX_PDF_PAGES_PER_FILE} pages per PDF. One selected file has ${maxSingle} pages.`,
            });
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
            return;
          }

          const remainingCount = Math.max(0, remaining ?? 0);
          const limit = Math.max(0, conversionsLimit ?? 0);
          if (isFreeUsageMode && candidateFiles.length > remainingCount) {
            showSelectionLimitDialog(candidateFiles.length, remainingCount, limit);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
            return;
          }
        }

        setUploadPrepProgress(40);
        setUploadPrepLabel("Detecting amounts...");
        try {
          const { extractPdfDataFromText, pdfToPageImages } = await loadPdfUtils();
          for (const file of newFiles) {
            if (!file.name.toLowerCase().endsWith(".pdf")) continue;
            const cacheKey = getFileCacheKey(file);
            let parsedPdfTransactionsCount = 0;
            try {
              const parsedPdf = await extractPdfDataFromText(file, {
                password: pdfPassword.trim() || undefined,
                maxPdfRenderPages,
              });
              parsedPdfTransactionsCount = parsedPdf.transactions.length;
              preparedPdfDataRef.current.set(getFileCacheKey(file), {
                transactions: parsedPdf.transactions,
                bankMetadata: parsedPdf.bankMetadata,
              });
            } catch {
              preparedPdfDataRef.current.delete(cacheKey);
            }

            if (parsedPdfTransactionsCount === 0) {
              setUploadPrepProgress(65);
              setUploadPrepLabel("Preparing OCR pages...");
              try {
                const renderedPdfPageImages = await pdfToPageImages(file, {
                  password: pdfPassword.trim() || undefined,
                  maxPdfRenderPages,
                  isFreeUsageMode,
                  freeMaxPdfPagesPerFile: FREE_MAX_PDF_PAGES_PER_FILE,
                });
                if (Array.isArray(renderedPdfPageImages) && renderedPdfPageImages.length > 0) {
                  preparedPdfImagesRef.current.set(cacheKey, renderedPdfPageImages);
                  setShowScanTimeCard(true);
                } else {
                  preparedPdfImagesRef.current.delete(cacheKey);
                }
              } catch {
                preparedPdfImagesRef.current.delete(cacheKey);
              }
            } else {
              preparedPdfImagesRef.current.delete(cacheKey);
            }
          }
        } catch {
          // Preparation failures should not block file selection.
        }

        setUploadPrepProgress(75);
        setUploadPrepLabel("Categorizing data...");
        await new Promise((resolve) => setTimeout(resolve, 120));
        setUploadPrepProgress(100);
        await new Promise((resolve) => setTimeout(resolve, 120));

        setSelectedFiles((prev) => [...prev, ...newFiles]);
        setPasswordError(false);
        setPdfPassword('');
        setShowPasswordInput(false);
        setShowPassword(false);
        setEditedPdfWarning(null);
        setEditedPdfCheckResult(null);

        if (hasEditPdfDetectorAccess && editedPdfWarningTiming === "upload") {
          for (const file of newFiles) {
            const shouldBlockForEditedPdf = await runEditedPdfDetection(file);
            if (shouldBlockForEditedPdf) {
              break;
            }
          }
        }

        toast({
          title: "Files Selected",
          description: `${newFiles.length} ${pluralize(newFiles.length, "file")} added - Ready to convert`,
        });
      } finally {
        setUploadPrepActive(false);
        setUploadPrepProgress(0);
        setUploadPrepFileName(null);
        setUploadPrepLabel("Reading document...");
      }
    }
  };

  const handleUploadClick = () => {
    if (limitReached) {
      showLimitReachedDialog();
      return;
    }
    fileInputRef.current?.click();
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const runEditedPdfDetection = async (file: File): Promise<boolean> => {
    const isPdf = file.name.toLowerCase().endsWith(".pdf");
    if (
      !isPdf ||
      !hasEditPdfDetectorAccess ||
      editedWarningBypassAll ||
      dismissedEditedWarningsRef.current.has(file.name)
    ) {
      return false;
    }

    try {
      const { detectEditedPdf } = await loadPdfUtils();
      const detection = await detectEditedPdf(file, {
        tier: pdfDetectorTier,
        password: pdfPassword.trim() || undefined,
      });
      if (!detection.suspected) {
        setEditedPdfCheckResult({
          fileName: file.name,
          status: "clean",
          reason: detection.reason,
        });
        return false;
      }

      setSelectedFile(file);
      setEditedPdfCheckResult({
        fileName: file.name,
        status: "suspected",
        reason: `${detection.riskLevel.toUpperCase()} risk - ${detection.reason}`,
      });
      setEditedPdfWarning({
        fileName: file.name,
        reason: `${detection.riskLevel.toUpperCase()} risk - ${detection.reason}`,
      });
      return true;
    } catch {
      // Detector failure must not block conversion flow.
      return false;
    }
  };




  const handleConvert = async (fileOverride?: File, mode: ConversionMode = "standard") => {
    // Clear previous errors
    setLastError(null);
    setBatchResults([]);
    setMergeInfo(null);
    setMergeResult(null);
    setConversionMode(mode);

    const fileToConvert = fileOverride ?? selectedFile;

    if (!fileToConvert) {
      toast({
        title: "No File Selected",
        description: "Please select a bank statement to convert",
        variant: "destructive",
      });
      return;
    }

    if (limitReached) {
      showLimitReachedDialog();
      return;
    }

    // IMPORTANT: Authenticated users SKIP reCAPTCHA completely
    // For anonymous users, reCAPTCHA v3 runs in background - token generated at conversion time

    const isPdf = fileToConvert.name.toLowerCase().endsWith('.pdf');
    if (editedPdfWarningTiming === "convert") {
      const shouldBlockForEditedPdf = await runEditedPdfDetection(fileToConvert);
      if (shouldBlockForEditedPdf) return;
    }

    setCurrencyCode('');
    setBankInfo(null);
    setJsonData(null);
    setMt940Data(null);
    setUploading(true);
    const allowPdfAutoChunking = mode === "standard";
    let pdfChunksForRetry: string[][] = [];
    let runChunkingFirst = false;

    try {
      const timezone = getTimezone();
      const requestBody: Record<string, unknown> = {
        fileName: fileToConvert.name,
        timezone,
        outputMode: mode,
      };
        // Anonymous users are tracked server-side by fingerprint (no client IDs).

      // Add PDF password if provided
      if (pdfPassword.trim()) {
        requestBody.pdfPassword = pdfPassword.trim();
      }

        // For anonymous users, require reCAPTCHA v3 token
        if (!user) {
          const token = await executeRecaptcha('convert');
          if (!token) {
            throw new Error('CAPTCHA not ready');
          }
          requestBody.recaptchaToken = token;
        }

      // For PDFs: try deterministic text extraction first. Render page images only if needed.
      if (isPdf) {
        const cacheKey = getFileCacheKey(fileToConvert);
        const cachedParsedPdf = preparedPdfDataRef.current.get(cacheKey);
        const parsedPdfTransactionsCount = cachedParsedPdf?.transactions?.length ?? 0;
        if (parsedPdfTransactionsCount > 0) {
          requestBody.pdfParsedTransactions = cachedParsedPdf?.transactions;
        }
        if (cachedParsedPdf?.bankMetadata) {
          requestBody.pdfParsedBankMetadata = cachedParsedPdf.bankMetadata;
        }
        if (parsedPdfTransactionsCount === 0) {
          const cachedPageImages = preparedPdfImagesRef.current.get(cacheKey);
          if (cachedPageImages && cachedPageImages.length > 0) {
            requestBody.pdfPageImages = cachedPageImages;
            setShowScanTimeCard(true);
          }
        }
      }

      if (user) {
        // Authenticated user - upload file to storage first
        const sanitized = sanitizeFilename(fileToConvert.name);
        const filePath = `${Date.now()}_${sanitized}`;

          await uploadSourceFileWithRetry(`${user.id}/${filePath}`, fileToConvert);

        requestBody.fileId = filePath;
      } else {
        if (!isPdf || !("pdfPageImages" in requestBody)) {
          // Anonymous user - send file as base64 (images or text-based PDF)
          const base64Data = await fileToBase64(fileToConvert);
          requestBody.fileData = base64Data;
        }
      }

      setUploading(false);
      setConverting(true);

      // Call edge function to process conversion via explicit REST URL (deployment-agnostic)
      // IMPORTANT: Get fresh session to avoid stale token issues
      // If user is logged in but session is stale, refresh it first
      let accessToken: string | undefined;

      if (user) {
        // User is authenticated - get fresh token
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !sessionData.session) {
          // Session might be stale, try to refresh
          console.log('Session stale or missing, attempting refresh...');
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

          if (refreshError || !refreshData.session) {
            console.error('Failed to refresh session:', refreshError);
            throw new Error('Session expired. Please sign in again.');
          } else {
            accessToken = refreshData.session.access_token;
          }
        } else {
          accessToken = sessionData.session.access_token;
        }
      }

      type InvokeConversionError = Error & {
        resourceError?: boolean;
        limitReached?: boolean;
        requiresPassword?: boolean;
        requiresPageImages?: boolean;
      };
      const invokeConvertDocument = async (payload: Record<string, unknown>): Promise<ConversionResponse> => {
        const { data, error: functionError } = await supabase.functions.invoke<ConversionResponse>('convert-document', {
          body: payload,
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        });

        if (functionError) {
          let message = functionError.message || 'Conversion failed';
          const statusCode = parseEdgeStatusCode(functionError);
          let limitReachedFromPayload = false;
          let requiresPasswordFromPayload = false;
          let requiresPageImagesFromPayload = false;
          const parsedErrorPayload = await parseEdgeErrorPayload(functionError);
          const mergedPayload =
            parsedErrorPayload && typeof parsedErrorPayload === "object"
              ? { ...(data && typeof data === "object" ? data : {}), ...parsedErrorPayload }
              : data;
          const structuredErrorCode = parseStructuredErrorCode(mergedPayload);

          if (mergedPayload && typeof mergedPayload === 'object') {
            const payloadData: Partial<ConversionResponse> = mergedPayload as Partial<ConversionResponse>;
            limitReachedFromPayload = !!payloadData.limitReached;
            requiresPasswordFromPayload = !!payloadData.requiresPassword;
            requiresPageImagesFromPayload = !!payloadData.requiresPageImages;
            if (limitReachedFromPayload) {
              refreshUsageLimit();
            }
            if (requiresPasswordFromPayload) {
              setPasswordError(true);
              setShowPasswordInput(true);
            }
            if (payloadData.message || payloadData.error) {
              message = payloadData.message || payloadData.error || message;
            }
          }

          const resourceError =
            structuredErrorCode === "WORKER_LIMIT" ||
            isLikelyEdgeResourceError(message, statusCode);
          if (resourceError) {
            message = 'Processing service is temporarily busy. Please retry in a moment.';
          }

          const typedError = new Error(message) as InvokeConversionError;
          typedError.resourceError = resourceError;
          typedError.limitReached = limitReachedFromPayload;
          typedError.requiresPassword = requiresPasswordFromPayload;
          typedError.requiresPageImages = requiresPageImagesFromPayload;
          throw typedError;
        }

        if (data?.error) {
          if (data.limitReached) {
            refreshUsageLimit();
          }
          if (data.requiresPassword) {
            setPasswordError(true);
            setShowPasswordInput(true);
          }
          const resourceError =
            parseStructuredErrorCode(data) === "WORKER_LIMIT" ||
            isLikelyEdgeResourceError(data.message || data.error || "Conversion failed");
          const typedError = new Error(
            resourceError
              ? 'Processing service is temporarily busy. Please retry in a moment.'
              : (data.message || data.error || 'Conversion failed'),
          ) as InvokeConversionError;
          typedError.limitReached = !!data.limitReached;
          typedError.requiresPassword = !!data.requiresPassword;
          typedError.requiresPageImages = !!data.requiresPageImages;
          typedError.resourceError = resourceError;
          throw typedError;
        }

        return data ?? {};
      };

      const runChunkedPdfConversion = async (chunks: string[][]): Promise<ConversionResponse[]> => {
        const responses: ConversionResponse[] = [];
        const baseChunkName = sanitizeFileBaseName(fileToConvert.name);

        for (let index = 0; index < chunks.length; index += 1) {
          const chunkImages = chunks[index];
          const chunkBody: Record<string, unknown> = {
            ...requestBody,
            fileName: `${baseChunkName}_part_${index + 1}.pdf`,
            pdfPageImages: chunkImages,
          };
          delete chunkBody.pdfParsedTransactions;

          if (!user) {
            const chunkToken = await executeRecaptcha('convert');
            if (!chunkToken) {
              throw new Error('CAPTCHA not ready');
            }
            chunkBody.recaptchaToken = chunkToken;
          }

          const chunkResponse = await invokeConvertDocument(chunkBody);
          responses.push(chunkResponse);
        }

        return responses;
      };

      const applyChunkedPdfSuccess = async (chunkResponses: ConversionResponse[]) => {
        const baseChunkName = sanitizeFileBaseName(fileToConvert.name);
        const combinedTransactions = chunkResponses.flatMap((chunkResponse) =>
          Array.isArray(chunkResponse.transactions) ? chunkResponse.transactions : [],
        );
        const combinedBankInfo = mergeChunkBankInfo(chunkResponses.map((chunkResponse) => chunkResponse.bankInfo || null));
        const responseCurrency = normalizeCurrencyCode(
          combinedBankInfo?.currency || chunkResponses.find((chunkResponse) => chunkResponse.bankInfo?.currency)?.bankInfo?.currency,
        );
        const combinedAnalytics = aggregateChunkAnalytics(combinedTransactions);
        let mergedChunkExcelData: string | null = null;
        try {
          mergedChunkExcelData = await buildChunkedMergedExcelBase64(
            combinedTransactions,
            combinedBankInfo,
            responseCurrency,
          );
        } catch (mergeError) {
          console.error("Failed to compose merged XLSX for chunked PDF:", mergeError);
        }
        const chunkDownloadResults = chunkResponses.map((chunkResponse, index) => {
          const hasDownload = !!(chunkResponse.excelData || chunkResponse.resultPath);
          return hasDownload
            ? {
                fileName: `${baseChunkName}_part_${index + 1}.pdf`,
                downloadFileName: `${baseChunkName}_part_${String(index + 1).padStart(2, "0")}.xlsx`,
                status: 'success' as const,
                data: {
                  excelData: chunkResponse.excelData,
                  resultPath: chunkResponse.resultPath ?? null,
                },
              }
            : {
                fileName: `${baseChunkName}_part_${index + 1}.pdf`,
                status: 'error' as const,
                error: 'No downloadable output returned for this chunk.',
              };
        });
        if (mergedChunkExcelData) {
          setConversionResult({
            id: null,
            resultPath: null,
            excelData: mergedChunkExcelData,
          });
          setBatchResults([]);
        } else {
          setConversionResult(null);
          setBatchResults(chunkDownloadResults);
        }
        setSingleDownloadFileName(buildExcelDownloadName(combinedBankInfo?.bankName, fileToConvert.name));
        setMergeInfo(null);
        setMergeResult(null);
        setTransactions(combinedTransactions);
        setAnalytics(combinedAnalytics);
        setCurrencyCode(responseCurrency);
        setBankInfo(combinedBankInfo);
        setJsonData(null);
        setMt940Data(null);
        setAiStatus(chunkResponses[chunkResponses.length - 1]?.aiStatus || null);
        setConversionMode("standard");

        refreshUsageLimit();

        const remainingFromLastChunk = chunkResponses[chunkResponses.length - 1]?.remaining;
        toast({
          title: "Conversion complete!",
          description: [
            mergedChunkExcelData
              ? `Large PDF processed in ${chunkResponses.length} chunks and merged into one Excel file.`
              : `Large PDF processed in ${chunkResponses.length} chunks.`,
            `Extracted ${combinedTransactions.length} transactions.`,
            formatRemaining(remainingFromLastChunk),
          ]
            .filter(Boolean)
            .join(" "),
        });

        setSelectedFile(null);
        setSelectedFiles([]);
        preparedPdfDataRef.current.clear();
        preparedPdfImagesRef.current.clear();
        setShowPasswordInput(false);
        setPdfPassword('');
        setPasswordError(false);
        setEditedPdfCheckResult(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      };

      if (isPdf && allowPdfAutoChunking && runChunkingFirst && pdfChunksForRetry.length > 1) {
        const chunkResponses = await runChunkedPdfConversion(pdfChunksForRetry);
        await applyChunkedPdfSuccess(chunkResponses);
        return;
      }

      let data: ConversionResponse;
      try {
        data = await invokeConvertDocument(requestBody);
      } catch (invokeError: unknown) {
        const error = invokeError as InvokeConversionError;
        const errorMessage = (error?.message || '').toLowerCase();
        const isStorageSourceError =
          isPdf &&
          !!user &&
          !("fileData" in requestBody) &&
          (
            errorMessage.includes('pdf bytes missing') ||
            errorMessage.includes('file not found') ||
            errorMessage.includes('file id or filedata required') ||
            errorMessage.includes('source_file_not_ready')
          );

        if (isStorageSourceError) {
          // Storage download can occasionally fail despite successful upload.
          // Retry once with direct fileData to keep frontend-backend flow resilient.
          requestBody.fileData = await fileToBase64(fileToConvert);
          const retryWithFileData = await invokeConvertDocument(requestBody);
          data = retryWithFileData;
          // Continue with normal success path below.
          // eslint-disable-next-line no-lonely-if
        } else {
        const hasDeterministicPdfRows =
          Array.isArray(requestBody.pdfParsedTransactions) &&
          requestBody.pdfParsedTransactions.length > 0;
        const isRequiresImageFallbackError =
          isPdf &&
          !("pdfPageImages" in requestBody) &&
          !hasDeterministicPdfRows &&
          (
            (error as { requiresPageImages?: boolean })?.requiresPageImages ||
            errorMessage.includes('requires page images') ||
            errorMessage.includes('no transactions found') ||
            errorMessage.includes('no data extracted')
          );

        if (isRequiresImageFallbackError) {
          setShowScanTimeCard(true);
          const renderedPdfPageImages = preparedPdfImagesRef.current.get(getFileCacheKey(fileToConvert));
          if (!renderedPdfPageImages || renderedPdfPageImages.length === 0) {
            throw new Error("PDF preparation is not ready yet. Please re-add the file and try again.");
          }
          requestBody.pdfPageImages = renderedPdfPageImages;
          delete requestBody.pdfParsedTransactions;
          const pdfPayloadBytes = estimatePdfPageImagesBytes(renderedPdfPageImages);
          const pdfPayloadPages = renderedPdfPageImages.length;
          const averagePageBytes = pdfPayloadPages > 0 ? pdfPayloadBytes / pdfPayloadPages : 0;
          const isLikelyHardPdf =
            HARD_PDF_BANK_PATTERN.test(fileToConvert.name) ||
            averagePageBytes >= HARD_AUTO_CHUNK_AVG_PAGE_BYTES;
          const chunkingOptions = isLikelyHardPdf
            ? {
                maxPages: HARD_AUTO_CHUNK_MAX_PDF_PAGES,
                maxBytes: HARD_AUTO_CHUNK_MAX_PDF_BYTES,
              }
            : undefined;
          const eagerChunkPageThreshold = isLikelyHardPdf
            ? HARD_AUTO_CHUNK_EAGER_MIN_PDF_PAGES
            : AUTO_CHUNK_EAGER_MIN_PDF_PAGES;
          pdfChunksForRetry = splitPdfPageImagesForChunking(renderedPdfPageImages, chunkingOptions);
          const hasChunkPlan = pdfChunksForRetry.length > 1;

          if (
            pdfPayloadBytes > EDGE_FUNCTION_SAFE_SINGLE_PDF_PAYLOAD_BYTES &&
            (!hasChunkPlan || !allowPdfAutoChunking)
          ) {
            throw new Error(buildPdfPayloadTooLargeMessage("single", pdfPayloadPages, pdfPayloadBytes));
          }

          runChunkingFirst = allowPdfAutoChunking &&
            hasChunkPlan &&
            (
              isLikelyHardPdf ||
              pdfPayloadBytes > EDGE_FUNCTION_SAFE_SINGLE_PDF_PAYLOAD_BYTES ||
              pdfPayloadPages >= eagerChunkPageThreshold
            );

          if (runChunkingFirst && pdfChunksForRetry.length > 1) {
            const chunkResponses = await runChunkedPdfConversion(pdfChunksForRetry);
            await applyChunkedPdfSuccess(chunkResponses);
            return;
          }
          const retryData = await invokeConvertDocument(requestBody);
          data = retryData;
          // Continue with normal success path below.
        } else {
          // Lean mode: no nested retries (only OCR fallback path above).
          throw invokeError;
        }
        }
      }

      const responseCurrency = normalizeCurrencyCode(data?.bankInfo?.currency);

      // Store conversion result and transaction data
      setConversionResult({
        id: data.conversionId,
        resultPath: data.resultPath,
        excelData: data.excelData,
      });
      setSingleDownloadFileName(buildExcelDownloadName(data?.bankInfo?.bankName, fileToConvert.name));

      if (data?.transactions && Array.isArray(data.transactions)) {
        setTransactions(data.transactions);
      }

      if (data?.analytics) {
        setAnalytics(data.analytics);
      }
      setCurrencyCode(responseCurrency);
      setBankInfo(data?.bankInfo || null);
      setJsonData(data?.jsonData || null);
      setMt940Data(data?.mt940Data || null);

      // Store AI processing status for display
      if (data?.aiStatus) {
        setAiStatus(data.aiStatus);
      }

      // Store extracted PDF context in sessionStorage for Chat Aura access
      // This allows Chat Aura to provide context-aware responses about the PDF
      if (data?.transactions && Array.isArray(data.transactions)) {
        // Create a concise text representation of the extracted data
        const extractedSummary = `Bank Statement Extracted Data:

Total Transactions: ${data.transactions.length}

Transactions:
${data.transactions.map((t: Transaction, i: number) =>
  i < 50 ? `${t.date} | ${t.description} | Category: ${t.category} | Debit: ${t.debit} | Credit: ${t.credit} | Balance: ${t.balance}` : ''
).filter(Boolean).join('\n')}
${data.transactions.length > 50 ? `\n... and ${data.transactions.length - 50} more transactions` : ''}

${data.analytics ? `
Analytics Summary:
- Total Credits: ${formatCurrencyValue(truncateDecimals(data.analytics.totalCredits), responseCurrency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Total Debits: ${formatCurrencyValue(truncateDecimals(data.analytics.totalDebits), responseCurrency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Net Flow: ${formatCurrencyValue(truncateDecimals(data.analytics.netFlow), responseCurrency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
` : ''}`;

        try {
          sessionStorage.setItem('chatAuraContext', extractedSummary);
          sessionStorage.setItem('chatAuraFileName', selectedFile?.name || 'Bank Statement');
        } catch {
          // Ignore sessionStorage failures (privacy mode/quota)
        }
      }

      if (data?.conversionId) {
        try {
          sessionStorage.setItem('chatAuraLastConversionId', data.conversionId);
        } catch {
          // Ignore sessionStorage failures (privacy mode/quota)
        }
      }

      const resolvedOutputMode: ConversionMode = data?.outputMode === "tally_only" ? "tally_only" : "standard";
      setConversionMode(resolvedOutputMode);

      // Refresh usage limit after successful conversion
      refreshUsageLimit();

      if (resolvedOutputMode === "tally_only") {
        const tallyDownloaded = await handleTallyExport();
        if (!tallyDownloaded) {
          throw new Error("Tally export could not be generated.");
        }
      }

      toast({
        title: resolvedOutputMode === "tally_only" ? "Tally conversion complete!" : "Conversion complete!",
        description:
          resolvedOutputMode === "tally_only"
            ? [
                `Extracted ${data?.transactions?.length || 0} transactions.`,
                "Tally XML downloaded.",
                formatRemaining(data?.remaining),
              ]
                .filter(Boolean)
                .join(" ")
            : [
                `Extracted ${data?.transactions?.length || 0} transactions.`,
                formatRemaining(data?.remaining),
                hasChatAuraAccess ? "Chat Aura wants to say something. Open Chat Aura to view it." : null,
              ]
                .filter(Boolean)
                .join(" "),
      });

      setSelectedFile(null);
      setSelectedFiles([]);
      preparedPdfDataRef.current.clear();
      preparedPdfImagesRef.current.clear();
      setShowPasswordInput(false);
      setPdfPassword('');
      setPasswordError(false);
      setEditedPdfCheckResult(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: unknown) {
      console.error('Conversion error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';

      if (errorMessage.toLowerCase().includes('session expired')) {
        toast({
          variant: "destructive",
          title: "Session Expired",
          description: "Please sign in again.",
        });
        navigate('/auth');
        return;
      }

      // Check if it's a password-related error
      if (errorMessage.toLowerCase().includes('password') ||
          errorMessage.toLowerCase().includes('encrypted') ||
          errorMessage.toLowerCase().includes('protected')) {
        setPasswordError(true);
        setLastError({ message: 'This PDF is password-protected. Please enter the correct password.', canRetry: true });
        toast({
          variant: "destructive",
          title: "Password Required",
          description: "This PDF is password-protected. Please enter the correct password.",
        });
      } else if (errorMessage.toLowerCase().includes('limit')) {
        // Limit reached - cannot retry
        setLastError({ message: errorMessage, canRetry: false });
        toast({
          variant: "destructive",
          title: "Limit Reached",
          description: errorMessage,
        });
      } else if (errorMessage.toLowerCase().includes('captcha') || errorMessage.toLowerCase().includes('verification')) {
        // CAPTCHA error - can retry (v3 will auto-generate new token)
        setLastError({ message: 'Verification failed. Please try again.', canRetry: true });
        toast({
          variant: "destructive",
          title: "Verification Failed",
          description: "Please try again.",
        });
      } else if (isTransientStorageUploadError(errorMessage)) {
        const networkMessage =
          "Network timeout while uploading PDF. Please retry. If this keeps happening, disable VPN/proxy and check internet stability.";
        setLastError({ message: networkMessage, canRetry: true });
        toast({
          variant: "destructive",
          title: "Network Timeout",
          description: networkMessage,
        });
      } else {
        // General error - can retry
        setLastError({ message: errorMessage, canRetry: true });
        toast({
          variant: "destructive",
          title: "Conversion Failed",
          description: errorMessage,
        });
      }
    } finally {
      setUploading(false);
      setConverting(false);
    }
  };

  const handleConvertMultiple = async (mode: ConversionMode = "standard") => {
    setLastError(null);
    setConversionMode(mode);

    if (selectedFiles.length === 0) {
      toast({
        title: "No Files Selected",
        description: "Please select bank statements to convert",
        variant: "destructive",
      });
      return;
    }

    if (limitReached) {
      showLimitReachedDialog();
      return;
    }

    if (isFreeUsageMode) {
      const remainingConversions = Math.max(0, remaining ?? 0);
      const limit = Math.max(0, conversionsLimit ?? 0);
      if (selectedFiles.length > remainingConversions) {
        showSelectionLimitDialog(selectedFiles.length, remainingConversions, limit);
        return;
      }
    }

    setUploading(true);
    setCurrencyCode('');
    setBankInfo(null);
    setJsonData(null);
    setMt940Data(null);
    setBatchResults([]);
    setMergeInfo(null);
    setMergeResult(null);
    setConversionResult(null);
    setTransactions([]);
    setAnalytics(null);
    setAiStatus(null);

    try {
      const timezone = getTimezone();
      const requestBody: BatchRequestBody = {
        files: [],
        timezone,
        outputMode: mode,
      };
      let batchPdfPayloadBytes = 0;
      let batchPdfPages = 0;
      // Anonymous users are tracked server-side by fingerprint (no client IDs).

      if (pdfPassword.trim()) {
        requestBody.pdfPassword = pdfPassword.trim();
      }

      if (!user) {
        const token = await executeRecaptcha('convert');
        if (!token) {
          throw new Error('CAPTCHA not ready');
        }
        requestBody.recaptchaToken = token;
      }

      for (const [index, file] of selectedFiles.entries()) {
        if (editedPdfWarningTiming === "convert") {
          const shouldBlockForEditedPdf = await runEditedPdfDetection(file);
          if (shouldBlockForEditedPdf) {
            return;
          }
        }

        const isPdf = file.name.toLowerCase().endsWith('.pdf');
        const payload: BatchFilePayload = { fileName: file.name };

        if (pdfPassword.trim()) {
          payload.pdfPassword = pdfPassword.trim();
        }

        if (isPdf) {
          const cacheKey = getFileCacheKey(file);
          const cachedParsedPdf = preparedPdfDataRef.current.get(cacheKey);
          const parsedPdfTransactionsCount = cachedParsedPdf?.transactions?.length ?? 0;
          if (parsedPdfTransactionsCount > 0) {
            payload.pdfParsedTransactions = cachedParsedPdf?.transactions;
          }
          if (cachedParsedPdf?.bankMetadata) {
            payload.pdfParsedBankMetadata = cachedParsedPdf.bankMetadata;
          }
          if (parsedPdfTransactionsCount === 0) {
            payload.pdfPageImages = preparedPdfImagesRef.current.get(cacheKey);
            const filePdfPayloadBytes = estimatePdfPageImagesBytes(payload.pdfPageImages);
            const filePdfPages = payload.pdfPageImages?.length ?? 0;
            if (!payload.pdfPageImages || filePdfPages === 0) {
              throw new Error(`Preparation pending for ${file.name}. Please re-add the file and try again.`);
            }
            if (filePdfPayloadBytes > EDGE_FUNCTION_SAFE_SINGLE_PDF_PAYLOAD_BYTES) {
              throw new Error(buildPdfPayloadTooLargeMessage("single", filePdfPages, filePdfPayloadBytes));
            }
            batchPdfPayloadBytes += filePdfPayloadBytes;
            batchPdfPages += filePdfPages;
            if (batchPdfPayloadBytes > EDGE_FUNCTION_SAFE_BATCH_PDF_PAYLOAD_BYTES) {
              throw new Error(buildPdfPayloadTooLargeMessage("batch", batchPdfPages, batchPdfPayloadBytes));
            }
            if (batchPdfPages > EDGE_FUNCTION_SAFE_BATCH_PDF_PAGES) {
              throw new Error(
                `Batch has ${batchPdfPages} PDF pages. For reliable processing, split into smaller batches (recommended up to ${EDGE_FUNCTION_SAFE_BATCH_PDF_PAGES} pages at a time).`,
              );
            }
            setShowScanTimeCard(true);
          }
        }

        if (user) {
          const sanitized = sanitizeFilename(file.name);
          const filePath = `${Date.now()}_${index}_${sanitized}`;

          await uploadSourceFileWithRetry(`${user.id}/${filePath}`, file);

          payload.fileId = filePath;
        } else if (!isPdf) {
          payload.fileData = await fileToBase64(file);
        }

        requestBody.files.push(payload);
      }

      toast({
        title: user ? "Files uploaded" : "Processing files",
        description: "Starting batch conversion...",
      });

      setUploading(false);
      setConverting(true);

      let accessToken: string | undefined;
      if (user) {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session) {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError || !refreshData.session) {
            console.error('Failed to refresh session for batch conversion:', refreshError);
            throw new Error('Session expired. Please sign in again.');
          } else {
            accessToken = refreshData.session.access_token;
          }
        } else {
          accessToken = sessionData.session.access_token;
        }
      }

      const { data, error: functionError } = await supabase.functions.invoke<MultiConversionResponse>('convert-statements-batch', {
        body: requestBody,
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });

      if (functionError) {
        let message = functionError.message || 'Batch conversion failed';
        const statusCode = parseEdgeStatusCode(functionError);
        const payload: Partial<MultiConversionResponse> = data ?? {};
        const structuredErrorCode = parseStructuredErrorCode(payload);
        if (payload.limitReached) {
          refreshUsageLimit();
        }
        if (payload.requiresPassword) {
          setPasswordError(true);
          setShowPasswordInput(true);
        }
        if (payload.message || payload.error) {
          message = payload.message || payload.error || message;
        }
        if (structuredErrorCode === "WORKER_LIMIT" || isLikelyEdgeResourceError(message, statusCode)) {
          message = 'Processing service is temporarily busy. Please retry with fewer files.';
        }
        throw new Error(message);
      }

      if (data?.error) {
        const payload: MultiConversionResponse = data;
        if (payload.limitReached) {
          refreshUsageLimit();
          throw new Error(payload.message || 'Conversion limit reached');
        }
        if (payload.requiresPassword) {
          setPasswordError(true);
          setShowPasswordInput(true);
          throw new Error(payload.error);
        }
        throw new Error(payload.error);
      }

      const results = data?.separate?.results || [];
      const failures = data?.separate?.failures || [];
      const fileNameUsage = new Map<string, number>();
      const successResults = results.map((result) => {
        const baseName = sanitizeFileBaseName(result.bankInfo?.bankName, sanitizeFileBaseName(result.fileName));
        const occurrence = (fileNameUsage.get(baseName) ?? 0) + 1;
        fileNameUsage.set(baseName, occurrence);
        const uniqueBaseName = occurrence > 1 ? `${baseName}_${occurrence}` : baseName;

        return {
          fileName: result.fileName,
          downloadFileName: `${uniqueBaseName}.xlsx`,
          status: 'success' as const,
          data: { excelData: result.excelData, resultPath: result.resultPath ?? null },
        };
      });

      setBatchResults([
        ...successResults,
        ...failures.map((failure) => ({ fileName: failure.fileName, status: 'error' as const, error: failure.error })),
      ]);

      setMergeInfo(data?.merge || null);
      if (data?.merge?.available && (data.merge.excelData || data.merge.resultPath)) {
        setMergeResult({
          excelData: data.merge.excelData,
          resultPath: data.merge.resultPath ?? null,
          fileName: buildExcelDownloadName(data?.bankInfo?.bankName, data.merge.fileName || "merged-statements"),
        });
      }

      // Parse aggregated analytics from batch response for panels
      if (data?.analytics) {
        setAnalytics(data.analytics);
      }

      // Store transactions for export options
      if (data?.transactions && Array.isArray(data.transactions)) {
        setTransactions(data.transactions);
      }
      const batchCurrency = normalizeCurrencyCode(
        data?.bankInfo?.currency || results.find((r) => r.bankInfo?.currency)?.bankInfo?.currency,
      );
      setCurrencyCode(batchCurrency);
      setBankInfo(data?.bankInfo || results.find((r) => r.bankInfo)?.bankInfo || null);
      setJsonData(data?.jsonData || null);
      setMt940Data(data?.mt940Data || null);

      const resolvedOutputMode: ConversionMode = data?.outputMode === "tally_only" ? "tally_only" : "standard";
      setConversionMode(resolvedOutputMode);

      refreshUsageLimit();

      if (resolvedOutputMode === "tally_only") {
        const tallyDownloaded = await handleTallyExport();
        if (!tallyDownloaded) {
          throw new Error("Tally export could not be generated.");
        }
      }

      toast({
        title: resolvedOutputMode === "tally_only" ? "Batch Tally conversion complete!" : "Batch conversion complete!",
        description:
          resolvedOutputMode === "tally_only"
            ? [
                `${results.length} ${pluralize(results.length, "statement")} converted.`,
                "Tally XML downloaded.",
                formatRemaining(data?.remaining),
              ]
                .filter(Boolean)
                .join(" ")
            : [
                `${results.length} ${pluralize(results.length, "statement")} converted.`,
                formatRemaining(data?.remaining),
                hasChatAuraAccess ? "Chat Aura wants to say something. Open Chat Aura to view it." : null,
              ]
                .filter(Boolean)
                .join(" "),
      });

      setSelectedFiles([]);
      setSelectedFile(null);
      preparedPdfDataRef.current.clear();
      preparedPdfImagesRef.current.clear();
      setShowPasswordInput(false);
      setPdfPassword('');
      setPasswordError(false);
      setEditedPdfCheckResult(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: unknown) {
      console.error('Batch conversion error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';

      if (errorMessage.toLowerCase().includes('session expired')) {
        toast({
          variant: "destructive",
          title: "Session Expired",
          description: "Please sign in again.",
        });
        navigate('/auth');
        return;
      }

      if (errorMessage.toLowerCase().includes('password') ||
          errorMessage.toLowerCase().includes('encrypted') ||
          errorMessage.toLowerCase().includes('protected')) {
        setPasswordError(true);
        setLastError({ message: 'This PDF is password-protected. Please enter the correct password.', canRetry: true });
        toast({
          variant: "destructive",
          title: "Password Required",
          description: "This PDF is password-protected. Please enter the correct password.",
        });
      } else if (errorMessage.toLowerCase().includes('limit')) {
        setLastError({ message: errorMessage, canRetry: false });
        toast({
          variant: "destructive",
          title: "Limit Reached",
          description: errorMessage,
        });
      } else if (errorMessage.toLowerCase().includes('captcha') || errorMessage.toLowerCase().includes('verification')) {
        setLastError({ message: 'Verification failed. Please try again.', canRetry: true });
        toast({
          variant: "destructive",
          title: "Verification Failed",
          description: "Please try again.",
        });
      } else if (isTransientStorageUploadError(errorMessage)) {
        const networkMessage =
          "Batch upload timed out while sending files. Please retry. If it repeats, reduce batch size or disable VPN/proxy.";
        setLastError({ message: networkMessage, canRetry: true });
        toast({
          variant: "destructive",
          title: "Network Timeout",
          description: networkMessage,
        });
      } else {
        setLastError({ message: errorMessage, canRetry: true });
        toast({
          variant: "destructive",
          title: "Batch Conversion Failed",
          description: errorMessage,
        });
      }
    } finally {
      setUploading(false);
      setConverting(false);
    }
  };

  const handleDownload = async () => {
    if (!conversionResult) return;

    setDownloading(true);
    try {
      let blob: Blob;

      if (conversionResult.excelData) {
        // Anonymous user - convert base64 to blob
        const binaryString = atob(conversionResult.excelData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      } else if (conversionResult.resultPath && user) {
        // Authenticated user - download from storage
        const { data, error } = await supabase.storage
          .from('bank-statements')
          .download(conversionResult.resultPath);

        if (error) throw error;
        blob = data;
      } else {
        throw new Error('No download available');
      }

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = singleDownloadFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Downloaded!",
        description: "Your Excel file has been downloaded.",
      });
    } catch (error: unknown) {
      console.error('Download error:', error);
      toast({
        variant: "destructive",
        title: "Download failed",
        description: getErrorMessage(error, "Failed to download the file."),
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleBatchDownload = async () => {
    if (batchResults.length === 0) return;

    setBatchDownloading(true);
    try {
      // Download each file individually
      for (const result of batchResults) {
        if (result.status !== 'success') continue;

        let blob: Blob | null = null;

        if (result.data?.excelData) {
          const binaryString = atob(result.data.excelData);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        } else if (result.data?.resultPath && user) {
          const { data: fileData, error } = await supabase.storage
            .from('bank-statements')
            .download(result.data.resultPath);
          if (error || !fileData) {
            throw error || new Error('Failed to download file');
          }
          blob = fileData;
        }

        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = result.downloadFileName || buildExcelDownloadName(undefined, result.fileName);
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          // Small delay between downloads
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      const successCount = batchResults.filter((result) => result.status === "success").length;
      toast({
        title: "Downloaded!",
        description: `${successCount} ${pluralize(successCount, "file")} downloaded.`,
      });
    } catch (error: unknown) {
      console.error('Batch download error:', error);
      toast({
        variant: "destructive",
        title: "Download failed",
        description: getErrorMessage(error, "Failed to download the files."),
      });
    } finally {
      setBatchDownloading(false);
    }
  };

  const handleMergedDownload = async () => {
    if (!mergeResult) return;

    setMergeDownloading(true);
    try {
      let blob: Blob | null = null;

      if (mergeResult.excelData) {
        const binaryString = atob(mergeResult.excelData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      } else if (mergeResult.resultPath && user) {
        const { data: fileData, error } = await supabase.storage
          .from('bank-statements')
          .download(mergeResult.resultPath);
        if (error || !fileData) {
          throw error || new Error('Failed to download file');
        }
        blob = fileData;
      }

      if (!blob) {
        throw new Error('No merged file available to download.');
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = mergeResult.fileName || `merged_${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Downloaded!",
        description: "Your merged Excel file has been downloaded.",
      });
    } catch (error: unknown) {
      console.error('Merge download error:', error);
      toast({
        variant: "destructive",
        title: "Download failed",
        description: getErrorMessage(error, "Failed to download the merged file."),
      });
    } finally {
      setMergeDownloading(false);
    }
  };



  // Plan-based feature access
  const hasPremiumExportAccess = hasMt940Access(entitlementInput);
  const hasTallyAccess = hasTallyXmlAccess(entitlementInput);
  const hasFoirAccess = hasFoirDashboardAccess(entitlementInput);
  const hasFraudAccess = hasFraudDetectorAccess(entitlementInput);

  const getTallyLimit = (normalizedPlan: string): number | null => {
    if (normalizedPlan === "monthly_pro") return 25;
    if (normalizedPlan === "monthly_enterprise") return 150;
    if (normalizedPlan === "yearly_full") return 300;
    if (normalizedPlan === "yearly_pro") return 1200;
    return null;
  };

  const getTallyPeriodKey = (normalizedPlan: string): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    if (normalizedPlan.startsWith("monthly")) {
      return `${year}-${month}`;
    }
    if (normalizedPlan.startsWith("yearly")) {
      return `${year}`;
    }
    return `${year}-${month}`;
  };

  const getTallyUsage = (normalizedPlan: string) => {
    const limit = getTallyLimit(normalizedPlan);
    const periodKey = getTallyPeriodKey(normalizedPlan);
    const storageKey = `banklefy:tally:${normalizedPlan}:${periodKey}`;
    const used = Number.parseInt(localStorage.getItem(storageKey) ?? "0", 10) || 0;
    const remaining = limit ? Math.max(0, limit - used) : 0;
    return { limit, used, remaining, storageKey, periodKey };
  };

  const ensureTallyExportAllowed = () => {
    if (!hasTallyAccess) {
      setShowUpgradeDialog(true);
      return null;
    }
    const normalized = (planType ?? "free").toLowerCase();
    const { limit, remaining, storageKey } = getTallyUsage(normalized);

    if (!limit) {
      setShowUpgradeDialog(true);
      return null;
    }

    if (remaining <= 0) {
      toast({
        variant: "destructive",
        title: "Tally export limit reached",
        description: "You have used all Tally exports for this billing period.",
      });
      setShowUpgradeDialog(true);
      return null;
    }

    return { remaining, storageKey };
  };

  const handleTallyExport = async (): Promise<boolean> => {
    if (conversionMode !== "tally_only") {
      toast({
        variant: "destructive",
        title: "Tally export unavailable",
        description: "Use 'Convert to Tally XML' first.",
      });
      return false;
    }

    const usageContext = ensureTallyExportAllowed();
    if (!usageContext) return false;

    const { remaining, storageKey } = usageContext;
    await exportAsTally();
    localStorage.setItem(storageKey, String((Number.parseInt(localStorage.getItem(storageKey) ?? "0", 10) || 0) + 1));
    toast({
      title: "Tally export ready",
      description: `Remaining exports this period: ${Math.max(0, remaining - 1)}`,
    });
    return true;
  };

  const handlePremiumExport = (format: 'json' | 'mt940') => {
    if (!hasPremiumExportAccess) {
      setShowUpgradeDialog(true);
      return;
    }
    if (format === 'json') {
      exportAsJSON();
    } else {
      exportAsMT940();
    }
  };

  const runSelectedConversion = (mode: ConversionMode) => {
    if (mode === "tally_only" && !ensureTallyExportAllowed()) {
      return;
    }
    setConversionMode(mode);
    setShowProgress(true);
    setProgressStep(0);

    if (selectedFiles.length === 1) {
      const firstFile = selectedFiles[0];
      setSelectedFile(firstFile);
      void handleConvert(firstFile, mode);
      return;
    }
    if (selectedFiles.length > 1) {
      void handleConvertMultiple(mode);
      return;
    }
    void handleConvert(undefined, mode);
  };

  const handleUnlockPassword = () => {
    if (!pdfPassword.trim()) {
      setPasswordError(true);
      return;
    }
    setPasswordError(false);
    setLastError(null);
    runSelectedConversion(conversionMode);
  };

  const showImageProcessingHint =
    showScanTimeCard ||
    selectedFiles.some((file) => {
      if (!file.name.toLowerCase().endsWith(".pdf")) return false;
      const cached = preparedPdfDataRef.current.get(getFileCacheKey(file));
      return !cached?.transactions || cached.transactions.length === 0;
    });
  const conversionProgressDetail = uploading
    ? "Uploading file and preparing document..."
    : progressStep < 45
      ? "Reading document structure..."
      : progressStep < 65
        ? "Detecting amounts and balance columns..."
        : progressStep < 82
          ? "Categorizing and validating transactions..."
          : progressStep < 96
            ? "Running final checks and reconciliation..."
            : "Preparing download output...";

  return (
    <section className="relative py-16 px-4 sm:px-6 overflow-hidden bg-background">
      <div className="container mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold">
            See It In
            <span className="bg-gradient-primary bg-clip-text text-transparent"> Action</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Upload, convert, and download in three simple steps
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="space-y-8">
            {/* Usage Limit Banner */}
            <UsageLimitBanner
              remaining={remaining}
              limit={conversionsLimit}
              isAuthenticated={isAuthenticated}
              limitReached={limitReached}
              planType={planType}
            />
            <div className="space-y-8">
              {/* Hidden File Input - Multiple Files */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileSelect}
                multiple
                className="hidden"
              />

              {/* Upload Zone - Dark Brown Theme */}
              <div
                onClick={handleUploadClick}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleUploadClick();
                  }
                }}
                role="button"
                tabIndex={0}
                aria-disabled={limitReached}
                data-hover
                className={`subtle-border-glow bg-[#191919]/80 border-2 border-primary/20 hover:border-primary/40 rounded-xl p-6 sm:p-10 md:p-12 text-center transition-all duration-500 cursor-pointer group relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  limitReached
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                }`}
              >
                {/* Inner glow effect */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 via-transparent to-primary/3 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="space-y-6 relative z-10">
                  {/* Icon with premium glow */}
                  <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 ${
                    limitReached
                      ? 'bg-muted/10'
                      : 'bg-primary/20 group-hover:scale-110 group-hover:shadow-neon'
                  }`}>
                    <Upload className={`w-10 h-10 transition-all duration-300 ${
                      limitReached
                        ? 'text-muted-foreground utility-icon-muted'
                        : 'text-primary'
                    }`} />
                  </div>

                  <div className="space-y-3">
                    <p className="text-xl font-semibold tracking-wide text-white">
                      {selectedFiles.length > 0
                        ? `${selectedFiles.length} ${pluralize(selectedFiles.length, "file")} selected`
                        : "Drop your bank statements here"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {limitReached
                        ? "Daily limit reached"
                        : "or click to browse files | Supports PDF, PNG, JPG/JPEG | Upload multiple files"}
                    </p>
                  </div>

                  {/* Display selected files list */}
                  {selectedFiles.length > 0 && (
                    <div className="mt-6 space-y-2 max-h-48 overflow-y-auto">
                      {selectedFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-primary/10 p-3 rounded-lg">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-4 w-4 text-primary" />
                            <span className="flex-1 min-w-0 text-sm text-white truncate">{file.name}</span>
                          </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const removed = selectedFiles[idx];
                                if (removed) {
                                  preparedPdfDataRef.current.delete(getFileCacheKey(removed));
                                  preparedPdfImagesRef.current.delete(getFileCacheKey(removed));
                                }
                                setSelectedFiles(selectedFiles.filter((_, i) => i !== idx));
                              }}
                              className="text-white/85 hover:text-white"
                              aria-label={`Remove ${file.name}`}
                              title={`Remove ${file.name}`}
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {uploadPrepActive && (selectedFiles.length > 0 || uploadPrepFileName) && (
                    <div className="mx-auto mt-4 w-full max-w-xl space-y-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                      <p className="text-sm text-white truncate">
                        {uploadPrepFileName ?? selectedFiles[0]?.name}
                      </p>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
                          style={{ width: `${Math.min(100, Math.max(0, uploadPrepProgress))}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">{uploadPrepLabel}</p>
                    </div>
                  )}

                  {selectedFiles.length > 0 && (
                    <div className="mx-auto mt-2 flex w-full max-w-xl items-center justify-center gap-2 text-xs text-muted-foreground">
                      {uploadPrepActive ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      )}
                      <span>{uploadPrepActive ? "Preparing..." : "Ready"}</span>
                    </div>
                  )}

                  {/* Choose File button - Orange circle removed */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Button
                      className="bg-primary text-primary-foreground font-medium px-8 py-3 rounded-lg w-full sm:w-auto active:bg-primary active:text-primary-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUploadClick();
                      }}
                      disabled={uploading || converting || limitReached}
                    >
                      {limitReached ? "Limit Reached" : "Add Files"}
                    </Button>
                    {selectedFiles.length > 0 && (
                      <Button
                        className="bg-accent text-accent-foreground font-medium px-8 py-3 rounded-lg w-full sm:w-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          preparedPdfDataRef.current.clear();
                          preparedPdfImagesRef.current.clear();
                          setSelectedFiles([]);
                          setSelectedFile(null);
                          setEditedPdfWarning(null);
                          setEditedPdfCheckResult(null);
                        }}
                      >
                        Clear All
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* PDF Password Input - Only show when password is required */}
              {(selectedFile || selectedFiles.length > 0) && showPasswordInput && !limitReached && (
                <div className="space-y-3 rounded-xl border border-white/15 bg-[#141414] p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center">
                      <Lock className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-white">
                        {(selectedFile || selectedFiles[0])?.name || "Password protected PDF"}
                      </p>
                      <p id={pdfPasswordHelpId} className="text-xs text-muted-foreground">
                        {formatFileSize((selectedFile || selectedFiles[0])?.size || 0)} • Password required
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="relative flex-1">
                      <label htmlFor="pdf-password" className="sr-only">PDF password</label>
                      <Input
                        id="pdf-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter password"
                        value={pdfPassword}
                        onChange={(e) => {
                          setPdfPassword(e.target.value);
                          setPasswordError(false);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            handleUnlockPassword();
                          }
                        }}
                        aria-invalid={passwordError}
                        aria-describedby={`${pdfPasswordHelpId}${passwordError ? ` ${pdfPasswordErrorId}` : ''}`}
                        className={`bg-[#0f0f0f] border pr-10 text-white placeholder:text-white/40 ${passwordError ? 'border-red-500/60 focus:border-red-500' : 'border-white/10 focus:border-white/30'}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 transition-colors"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        aria-pressed={showPassword}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <Button
                      type="button"
                      onClick={handleUnlockPassword}
                      disabled={uploading || converting || !pdfPassword.trim()}
                      className="sm:w-auto min-w-[120px]"
                    >
                      {uploading || converting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Unlocking...
                        </>
                      ) : (
                        "Unlock"
                      )}
                    </Button>
                  </div>

                  {passwordError && (
                    <p id={pdfPasswordErrorId} role="alert" className="text-xs text-red-300 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Incorrect password. Please try again.
                    </p>
                  )}
                </div>
              )}

              {/* Edited PDF Warning */}
              {hasEditPdfDetectorAccess && editedPdfWarning && selectedFile && !converting && !uploading && (
                <div className="p-4 bg-[#191919]/80 border border-amber-500/30 rounded-xl space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-amber-300">Possible Edited PDF Detected</p>
                      <p className="text-sm text-white/60 mt-1">
                        This statement looks like it may have been edited. Reason: {editedPdfWarning.reason}.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      variant="outline"
                      className="w-full border border-amber-500/40 text-amber-200 bg-amber-500/10 hover:bg-amber-500/20"
                      onClick={() => {
                        try {
                          localStorage.setItem(EDITED_WARNING_BYPASS_KEY, "1");
                        } catch {
                          // Ignore localStorage errors and continue.
                        }
                        setEditedWarningBypassAll(true);
                        dismissedEditedWarningsRef.current.add(editedPdfWarning.fileName);
                        setEditedPdfWarning(null);
                        if (selectedFiles.length > 1) {
                          void handleConvertMultiple(conversionMode);
                        } else if (selectedFile) {
                          void handleConvert(selectedFile, conversionMode);
                        }
                      }}
                      disabled={false}
                    >
                      Proceed Anyway
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full text-white/60 hover:text-white"
                      onClick={() => setEditedPdfWarning(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* reCAPTCHA v3 runs invisibly - no UI needed */}

              {/* Error Panel with Retry */}
              {lastError && (selectedFile || selectedFiles.length > 0) && !converting && !uploading && (
                <div className="p-4 bg-[#141414] border border-white/20 rounded-xl space-y-3" role="alert" aria-live="assertive">
                  <div className="flex items-start gap-3">
                    <XCircle className="h-5 w-5 text-[#787878] mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-[#d3d3d3]">Conversion Failed</p>
                      <p className="text-sm text-muted-foreground mt-1">{lastError.message}</p>
                    </div>
                  </div>
                  {lastError.canRetry && (
                    <Button
                      variant="outline"
                      className="w-full border-[#787878] bg-[#787878] text-[#141414] hover:bg-[#6f6f6f] hover:text-[#141414]"
                      onClick={() => {
                        setLastError(null);
                        if (selectedFiles.length === 1) {
                          const firstFile = selectedFiles[0];
                          setSelectedFile(firstFile);
                          void handleConvert(firstFile, conversionMode);
                        } else if (selectedFiles.length > 1) {
                          void handleConvertMultiple(conversionMode);
                        } else {
                          void handleConvert(undefined, conversionMode);
                        }
                      }}
                      disabled={false}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Try Again
                    </Button>
                  )}
                </div>
              )}

              {/* Convert Buttons */}
              {(selectedFile || selectedFiles.length > 0) && !limitReached && !lastError && !uploadPrepActive && (
                <div className="text-center space-y-3">
                  {selectedFiles.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                        <Button
                          size="lg"
                          className="convert-button w-full md:w-auto"
                          onClick={() => runSelectedConversion("standard")}
                          disabled={uploading || converting || uploadPrepActive || Boolean(editedPdfWarning)}
                        >
                          {uploading || converting ? (
                            <>
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                              {uploading ? 'Uploading...' : 'Converting...'}
                            </>
                          ) : (
                            <>
                              <Sparkles className="mr-2 h-5 w-5" />
                              {selectedFiles.length === 1 ? "Convert" : "Convert All Statements"}
                            </>
                          )}
                        </Button>
                        <Button
                          size="lg"
                          variant="outline"
                          className={`w-full md:w-auto ${
                            !hasTallyAccess
                              ? "border-sky-300/40 bg-sky-500/10 text-sky-100 hover:border-sky-200/60 hover:bg-sky-500/20"
                              : "border-primary/30 text-primary"
                          }`}
                          onClick={() => runSelectedConversion("tally_only")}
                          disabled={uploading || converting || uploadPrepActive || Boolean(editedPdfWarning)}
                        >
                          <FileText className="mr-2 h-5 w-5" />
                          Tally XML
                          {!hasTallyAccess && <Lock className="ml-2 h-4 w-4" />}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {selectedFiles.length} {pluralize(selectedFiles.length, "file")} ready to convert
                      </p>
                    </div>
                  )}
                </div>
              )}

              <ResultsSection
                batchResults={batchResults}
                batchDownloading={batchDownloading}
                mergeInfo={mergeInfo}
                mergeResult={mergeResult}
                mergeDownloading={mergeDownloading}
                handleBatchDownload={handleBatchDownload}
                handleMergedDownload={handleMergedDownload}
                conversionResult={conversionResult}
                downloading={downloading}
                handleDownload={handleDownload}
                transactions={transactions}
                isPaidUser={hasPremiumExportAccess}
                hasTallyAccess={hasTallyAccess}
                exportAsCSV={exportAsCSV}
                handleTallyExport={handleTallyExport}
                handlePremiumExport={handlePremiumExport}
                aiStatus={aiStatus}
                converting={converting}
                analytics={analytics}
                currencyCode={currencyCode}
                showDuplicatesOnly={showDuplicatesOnly}
                setShowDuplicatesOnly={setShowDuplicatesOnly}
                formatAmountNoSymbol={formatAmountNoSymbol}
                truncateDecimals={truncateDecimals}
                showEditDetectorSignals={hasEditPdfDetectorAccess}
                resultMode={conversionMode}
                editedPdfCheckResult={editedPdfCheckResult}
                showPipeline={false}
                showUnderwriting={hasFoirAccess}
                showFraudSignals={hasFraudAccess}
                conversionProgressPercent={progressStep}
                conversionProgressLabel={
                  uploading
                    ? "Uploading and preparing document..."
                    : converting
                      ? "Converting and validating transactions..."
                      : "Finalizing..."
                }
                conversionProgressSubLabel={conversionProgressDetail}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Upload Limit Dialog */}
      <Dialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
        <DialogContent className="bg-card border-primary/20">
          <DialogHeader>
            <DialogTitle>{limitDialogTitle}</DialogTitle>
            <DialogDescription className="space-y-4 pt-4">
              <p>{limitDialogMessage}</p>
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                {limitDialogShowSignup && (
                  <Button
                    className="bg-primary text-primary-foreground"
                    onClick={() => {
                      setShowLimitDialog(false);
                      navigate('/auth');
                    }}
                  >
                    <User className="mr-2 h-4 w-4" />
                    Sign Up
                  </Button>
                )}
                {limitDialogShowPricing && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowLimitDialog(false);
                      navigate('/pricing');
                    }}
                  >
                    <Crown className="mr-2 h-4 w-4" />
                    View Plans
                  </Button>
                )}
                <Button variant="ghost" onClick={() => setShowLimitDialog(false)}>
                  Close
                </Button>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Premium Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="bg-card border-primary/20">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              Premium Feature
            </DialogTitle>
            <DialogDescription className="space-y-4 pt-4">
              <p>This export is available for paid users only.</p>
              <p className="text-sm text-muted-foreground">
                Upgrade your plan to unlock JSON and MT940 exports for your financial data.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 pt-4">
                <Button
                  className="bg-primary text-primary-foreground"
                  onClick={() => {
                    setShowUpgradeDialog(false);
                    navigate('/pricing');
                  }}
                >
                  <Crown className="mr-2 h-4 w-4" />
                  View Plans
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowUpgradeDialog(false)}
                >
                  Maybe Later
                </Button>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </section>
  );
};




