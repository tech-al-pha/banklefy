import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileText, Sparkles, Loader2, AlertTriangle, Lock, Eye, EyeOff, RefreshCw, XCircle, Crown, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useReducer, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { validateFile, sanitizeFilename } from "@/lib/fileValidation";
import { useNavigate } from "react-router-dom";
import { useUsageLimit } from "@/hooks/useUsageLimit";
import { UsageLimitBanner } from "./UsageLimitBanner";
import { useRecaptcha } from "@/hooks/useRecaptcha";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { isPaidPlan } from "@/lib/entitlements";
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
  MultiConversionResponse,
  ConversionResponse,
  BatchFilePayload,
  BatchRequestBody,
} from "./uploadDemo/types";

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
    currencyCode,
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
  const setCurrencyCode = (value: string) => dispatch({ type: "set", payload: { currencyCode: value } });
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { hasChatAuraAccess } = useSubscriptionTier();
  const navigate = useNavigate();
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
  const exportAsCSV = async () => {
    const { exportAsCSV: exportCsv } = await loadExporters();
    return exportCsv({
      transactions,
      analytics,
      currencyCode,
      toast,
      getErrorMessage,
      sumMoney,
      truncateDecimals,
    });
  };
  const exportAsPDF = async () => {
    const { exportAsPDF: exportPdf } = await loadExporters();
    return exportPdf({
      transactions,
      analytics,
      currencyCode,
      toast,
      getErrorMessage,
      sumMoney,
      truncateDecimals,
    });
  };
  const exportAsODS = async () => {
    const { exportAsODS: exportOds } = await loadExporters();
    return exportOds({
      transactions,
      analytics,
      currencyCode,
      toast,
      getErrorMessage,
      sumMoney,
      truncateDecimals,
    });
  };
  const exportAsDOCX = async () => {
    const { exportAsDOCX: exportDocx } = await loadExporters();
    return exportDocx({
      transactions,
      analytics,
      currencyCode,
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
  const normalizedPlanType = (planType ?? "free").toLowerCase();
  const isUnlimitedUsagePlan = normalizedPlanType === "unlimited";
  const isPerPageUsagePlan = normalizedPlanType.startsWith("per_page");
  const isMonthlyUsagePlan = normalizedPlanType.startsWith("monthly") || normalizedPlanType === "daily";
  const isYearlyUsagePlan = normalizedPlanType.startsWith("yearly") || normalizedPlanType === "business";
  const isKnownPaidUsagePlan = isPerPageUsagePlan || isMonthlyUsagePlan || isYearlyUsagePlan || isUnlimitedUsagePlan;
  const isFreeUsageMode = !isKnownPaidUsagePlan && (!isAuthenticated || normalizedPlanType === "free" || conversionsLimit <= 5);

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
    if (!converting) return;

    setShowProgress(true);
    setProgressStep(0);

    const timeouts: number[] = [];
    const delays = [900, 1100, 1300, 1500];

    const schedule = (nextStep: number) => {
      const delay = delays[nextStep - 1] ?? 1200;
      timeouts.push(
        window.setTimeout(() => {
          setProgressStep(nextStep);
          if (nextStep < 3) {
            schedule(nextStep + 1);
          }
        }, delay)
      );
    };

    schedule(1);

    return () => {
      timeouts.forEach((t) => window.clearTimeout(t));
    };
  }, [converting]);

  useEffect(() => {
    if (converting || !showProgress) return;

    setProgressStep(4);
    const timeout = window.setTimeout(() => {
      setShowProgress(false);
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [converting, showProgress]);

  const MAX_PDF_RENDER_PAGES = 120;
  const FREE_MAX_PDF_PAGES_PER_FILE = 15;
  const maxPdfRenderPages = isFreeUsageMode ? FREE_MAX_PDF_PAGES_PER_FILE : MAX_PDF_RENDER_PAGES;



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

      setSelectedFiles((prev) => [...prev, ...newFiles]);
      setPasswordError(false);
      setPdfPassword('');
      setShowPasswordInput(false);
      setShowPassword(false);
      setEditedPdfWarning(null);

      toast({
        title: "Files Selected",
        description: `${newFiles.length} ${pluralize(newFiles.length, "file")} added - Ready to convert`,
      });
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




  const handleConvert = async (fileOverride?: File) => {
    // Clear previous errors
    setLastError(null);
    setBatchResults([]);
    setMergeInfo(null);
    setMergeResult(null);

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
    if (isPdf && !dismissedEditedWarningsRef.current.has(fileToConvert.name)) {
      try {
        const { detectEditedPdf } = await loadPdfUtils();
        const detection = await detectEditedPdf(fileToConvert);
        if (detection.suspected) {
          setEditedPdfWarning({ fileName: fileToConvert.name, reason: detection.reason });
          return;
        }
      } catch {
        // If detection fails, allow conversion to proceed
      }
    }

    setCurrencyCode('');
    setUploading(true);

    try {
      const timezone = getTimezone();
      const requestBody: Record<string, unknown> = {
        fileName: fileToConvert.name,
        timezone,
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

      // For PDFs: render page images client-side and send to backend (Groq Vision can't accept PDFs directly)
      if (isPdf) {
        try {
          const { pdfToPageImages } = await loadPdfUtils();
          requestBody.pdfPageImages = await pdfToPageImages(fileToConvert, {
            password: pdfPassword.trim() || undefined,
            maxPdfRenderPages,
            isFreeUsageMode,
            freeMaxPdfPagesPerFile: FREE_MAX_PDF_PAGES_PER_FILE,
          });
        } catch (err: unknown) {
          const error = err as { name?: string; message?: string };
          // Surface password errors in existing UX
          if (error?.name === 'PasswordException' || String(error?.message || '').toLowerCase().includes('password')) {
            setPasswordError(true);
            setShowPasswordInput(true);
            throw new Error('This PDF is password-protected. Please enter the correct password.');
          }
          throw err;
        }
      }

      if (user) {
        // Authenticated user - upload file to storage first
        const sanitized = sanitizeFilename(fileToConvert.name);
        const filePath = `${Date.now()}_${sanitized}`;

        const { error: uploadError } = await supabase.storage
          .from('bank-statements')
          .upload(`${user.id}/${filePath}`, fileToConvert, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        requestBody.fileId = filePath;
      } else {
        if (!isPdf) {
          // Anonymous user - send file as base64 (images)
          const base64Data = await fileToBase64(fileToConvert);
          requestBody.fileData = base64Data;
        }
      }

      toast({
        title: user ? "File uploaded" : "Processing file",
        description: "Starting conversion...",
      });

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

      const { data, error: functionError } = await supabase.functions.invoke<ConversionResponse>('convert-document', {
        body: requestBody,
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });

      if (functionError) {
        let message = functionError.message || 'Conversion failed';

        // Check if we got structured error data
        if (data && typeof data === 'object') {
          const payload: Partial<ConversionResponse> = data;
          if (payload.limitReached) {
            refreshUsageLimit();
          }
          if (payload.requiresPassword) {
            setPasswordError(true);
            setShowPasswordInput(true);
          }
          message = payload.message || payload.error || message;
        }

        throw new Error(message);
      }

      if (data?.error) {
        if (data?.limitReached) {
          refreshUsageLimit();
          throw new Error(data.message || 'Conversion limit reached');
        }
        if (data?.requiresPassword) {
          setPasswordError(true);
          setShowPasswordInput(true);
          throw new Error(data.error);
        }
        throw new Error(data.error);
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

      // Refresh usage limit after successful conversion
      refreshUsageLimit();

      toast({
        title: "Conversion complete!",
        description: [
          `Extracted ${data?.transactions?.length || 0} transactions.`,
          formatRemaining(data?.remaining),
          hasChatAuraAccess ? "Chat Aura wants to say something. Open Chat Aura to view it." : null,
        ]
          .filter(Boolean)
          .join(" "),
      });

      setSelectedFile(null);
      setSelectedFiles([]);
      setShowPasswordInput(false);
      setPdfPassword('');
      setPasswordError(false);
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

  const handleConvertMultiple = async () => {
    setLastError(null);

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
      };
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
        const isPdf = file.name.toLowerCase().endsWith('.pdf');
        const payload: BatchFilePayload = { fileName: file.name };

        if (pdfPassword.trim()) {
          payload.pdfPassword = pdfPassword.trim();
        }

        if (isPdf) {
          try {
            const { pdfToPageImages } = await loadPdfUtils();
            payload.pdfPageImages = await pdfToPageImages(file, {
              password: pdfPassword.trim() || undefined,
              maxPdfRenderPages,
              isFreeUsageMode,
              freeMaxPdfPagesPerFile: FREE_MAX_PDF_PAGES_PER_FILE,
            });
          } catch (err: unknown) {
            const error = err as { name?: string; message?: string };
            if (error?.name === 'PasswordException' || String(error?.message || '').toLowerCase().includes('password')) {
              setPasswordError(true);
              setShowPasswordInput(true);
              throw new Error('This PDF is password-protected. Please enter the correct password.');
            }
            throw err;
          }
        }

        if (user) {
          const sanitized = sanitizeFilename(file.name);
          const filePath = `${Date.now()}_${index}_${sanitized}`;

          const { error: uploadError } = await supabase.storage
            .from('bank-statements')
            .upload(`${user.id}/${filePath}`, file, {
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadError) {
            throw uploadError;
          }

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
        const payload: Partial<MultiConversionResponse> = data ?? {};
        if (payload.limitReached) {
          refreshUsageLimit();
        }
        if (payload.requiresPassword) {
          setPasswordError(true);
          setShowPasswordInput(true);
        }
        message = payload.message || payload.error || message;
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

      refreshUsageLimit();

      toast({
        title: "Batch conversion complete!",
        description: [
          `${results.length} ${pluralize(results.length, "statement")} converted.`,
          formatRemaining(data?.remaining),
          hasChatAuraAccess ? "Chat Aura wants to say something. Open Chat Aura to view it." : null,
        ]
          .filter(Boolean)
          .join(" "),
      });

      setSelectedFiles([]);
      setSelectedFile(null);
      setShowPasswordInput(false);
      setPdfPassword('');
      setPasswordError(false);
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



  // Check if user has premium access
  const isPaidUser = isPaidPlan({
    planType,
    conversionsLimit,
    isAuthenticated: isAuthenticated,
  });
  const hasTallyAccess = (() => {
    if (!isAuthenticated) return false;
    const normalized = (planType ?? "free").toLowerCase();
    return (
      normalized === "monthly_pro" ||
      normalized === "monthly_enterprise" ||
      normalized === "yearly_full" ||
      normalized === "yearly_pro"
    );
  })();

  const handleTallyExport = async () => {
    if (!hasTallyAccess) {
      setShowUpgradeDialog(true);
      return;
    }
    await exportAsTally();
  };

  const handlePremiumExport = (format: 'docx' | 'ods') => {
    if (!isPaidUser) {
      setShowUpgradeDialog(true);
      return;
    }
    if (format === 'docx') {
      exportAsDOCX();
    } else {
      exportAsODS();
    }
  };

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
            {!usageLimitLoading && (
              <UsageLimitBanner
                remaining={remaining}
                limit={conversionsLimit}
                isAuthenticated={isAuthenticated}
                limitReached={limitReached}
                planType={planType}
              />
            )}

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
                          setSelectedFiles([]);
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
                <div className="space-y-4 p-6 bg-[#191919]/80 rounded-xl border border-red-500/30">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-500/15 rounded-lg">
                      <Lock className="h-5 w-5 text-red-400" />
                    </div>
                      <div>
                        <p className="font-semibold text-red-300">Password Required</p>
                        <p id={pdfPasswordHelpId} className="text-xs text-white/60">This PDF is password protected. Enter the password to continue.</p>
                      </div>
                    </div>

                    <div className="relative">
                      <label htmlFor="pdf-password" className="sr-only">PDF password</label>
                      <Input
                        id="pdf-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter PDF password..."
                        value={pdfPassword}
                        onChange={(e) => {
                          setPdfPassword(e.target.value);
                          setPasswordError(false);
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

                    {passwordError && (
                      <p id={pdfPasswordErrorId} role="alert" className="text-sm text-red-300 flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4" />
                        Incorrect password. Please try again.
                      </p>
                    )}
                </div>
              )}

              {/* Edited PDF Warning */}
              {editedPdfWarning && selectedFile && !converting && !uploading && (
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
                        dismissedEditedWarningsRef.current.add(editedPdfWarning.fileName);
                        setEditedPdfWarning(null);
                        if (selectedFile) {
                          handleConvert(selectedFile);
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
                          handleConvert(firstFile);
                        } else if (selectedFiles.length > 1) {
                          handleConvertMultiple();
                        } else {
                          handleConvert();
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
              {(selectedFile || selectedFiles.length > 0) && !limitReached && !lastError && (
                <div className="text-center space-y-3">
                  {selectedFiles.length > 0 && (
                    <div className="space-y-3">
                      <Button
                        size="lg"
                        className="convert-button w-full md:w-auto"
                        onClick={() => {
                          if (selectedFiles.length === 1) {
                            const firstFile = selectedFiles[0];
                            setSelectedFile(firstFile);
                            handleConvert(firstFile);
                          } else if (selectedFiles.length > 1) {
                            handleConvertMultiple();
                          }
                        }}
                        disabled={uploading || converting}
                      >
                        {uploading || converting ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            {uploading ? 'Uploading...' : 'Converting...'}
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-5 w-5" />
                            Convert All Statements
                          </>
                        )}
                      </Button>
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
                isPaidUser={isPaidUser}
                hasTallyAccess={hasTallyAccess}
                exportAsCSV={exportAsCSV}
                handleTallyExport={handleTallyExport}
                exportAsPDF={exportAsPDF}
                handlePremiumExport={handlePremiumExport}
                aiStatus={aiStatus}
                converting={converting}
                showProgress={showProgress}
                progressStep={progressStep}
                analytics={analytics}
                currencyCode={currencyCode}
                showDuplicatesOnly={showDuplicatesOnly}
                setShowDuplicatesOnly={setShowDuplicatesOnly}
                formatAmountNoSymbol={formatAmountNoSymbol}
                truncateDecimals={truncateDecimals}
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
                Upgrade your plan to unlock DOCX and ODS exports for your financial data.
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




