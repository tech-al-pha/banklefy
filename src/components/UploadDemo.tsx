import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Upload, FileText, CheckCircle, Sparkles, Loader2, Download, FileSpreadsheet, AlertTriangle, TrendingUp, TrendingDown, PieChart, ShieldAlert, Lock, Eye, EyeOff, RefreshCw, XCircle, Crown, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/supabaseApi";
import { useAuth } from "@/hooks/useAuth";
import { validateFile, sanitizeFilename } from "@/lib/fileValidation";
import { getPdfWorkerSrc } from "@/lib/pdfWorker";
import { useNavigate } from "react-router-dom";
import { useUsageLimit } from "@/hooks/useUsageLimit";
import { UsageLimitBanner } from "./UsageLimitBanner";
import { useRecaptcha } from "@/hooks/useRecaptcha";
import { FraudAlertPanel } from "./FraudAlertPanel";
import { UnderwritingPanel } from "./UnderwritingPanel";
import { UnderwritingPanelSkeleton } from "./UnderwritingPanelSkeleton";
import { AIStatusPanel } from "./AIStatusPanel";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import banklefyLogo from "@/assets/banklefy-logo.svg";
import { formatCurrencyValue, normalizeCurrencyCode, sumMoney } from "@/lib/currency";
import { getAnonymousClientId } from "@/lib/usageClient";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  Transaction,
  Analytics,
  AiStatus,
  MergeInfo,
  MultiConversionResponse,
  ConversionResponse,
  BatchFilePayload,
  BatchRequestBody,
} from "./uploadDemo/types";

// Category color mapping
const categoryColors: Record<string, string> = {
  "Salary/Income": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "Transfer In": "bg-green-500/20 text-green-400 border-green-500/30",
  "Transfer Out": "bg-orange-500/20 text-orange-400 border-orange-500/30",
  "Bills & Utilities": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "Shopping": "bg-pink-500/20 text-pink-400 border-pink-500/30",
  "Food & Dining": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "Transportation": "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  "Entertainment": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "Healthcare": "bg-red-500/20 text-red-400 border-red-500/30",
  "Education": "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  "Insurance": "bg-slate-500/20 text-slate-400 border-slate-500/30",
  "Investments": "bg-teal-500/20 text-teal-400 border-teal-500/30",
  "Loan/EMI": "bg-rose-500/20 text-rose-400 border-rose-500/30",
  "Cash": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "Bank Fees": "bg-gray-500/20 text-gray-400 border-gray-500/30",
  "Other": "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

const conversionSteps = [
  "Reading document",
  "Detecting amounts",
  "Categorizing data",
  "Analyzing information",
  "Done",
];

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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [conversionResult, setConversionResult] = useState<{ id: string | null; resultPath: string | null; excelData?: string } | null>(null);
  const [singleDownloadFileName, setSingleDownloadFileName] = useState<string>("bank-statement.xlsx");
  const [batchResults, setBatchResults] = useState<Array<{ fileName: string; downloadFileName?: string; status: 'success' | 'error'; data?: { excelData?: string; resultPath?: string | null }; error?: string }>>([]);
  const [mergeInfo, setMergeInfo] = useState<MergeInfo | null>(null);
  const [mergeResult, setMergeResult] = useState<{ excelData?: string; resultPath?: string | null; fileName: string } | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [currencyCode, setCurrencyCode] = useState<string>('');
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [batchDownloading, setBatchDownloading] = useState(false);
  const [mergeDownloading, setMergeDownloading] = useState(false);
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
  const [pdfPassword, setPdfPassword] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [lastError, setLastError] = useState<{ message: string; canRetry: boolean } | null>(null);
  const [editedPdfWarning, setEditedPdfWarning] = useState<{ fileName: string; reason: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [limitDialogTitle, setLimitDialogTitle] = useState("Daily Limit Reached");
  const [limitDialogMessage, setLimitDialogMessage] = useState("");
  const [limitDialogShowSignup, setLimitDialogShowSignup] = useState(false);
  const [limitDialogShowPricing, setLimitDialogShowPricing] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const pdfPasswordHelpId = "pdf-password-help";
  const pdfPasswordErrorId = "pdf-password-error";
  const dismissedEditedWarningsRef = useRef<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { hasChatAuraAccess } = useSubscriptionTier();
  const navigate = useNavigate();
  const formatAmount = (
    value: number,
    options?: { minimumFractionDigits?: number; maximumFractionDigits?: number; signDisplay?: 'auto' | 'always' | 'never' },
  ) => formatCurrencyValue(value ?? 0, currencyCode, options);
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
  const getPdfPageCount = async (file: File, password?: string): Promise<number | null> => {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = await getPdfWorkerSrc();

    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        password: password || undefined,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true,
      });
      const pdf = await loadingTask.promise;
      const count = pdf.numPages;
      await pdf.destroy?.();
      return count;
    } catch (err: unknown) {
      const error = err as { name?: string; message?: string };
      if (
        error?.name === 'PasswordException' ||
        String(error?.message || '').toLowerCase().includes('password')
      ) {
        return null;
      }
      return null;
    }
  };

  const getFilePageCount = async (file: File): Promise<number | null> => {
    const isPdf = file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) return 1;
    const count = await getPdfPageCount(file, pdfPassword.trim() || undefined);
    if (count === null) return null;
    return count;
  };

  const getTotalPages = async (files: File[]): Promise<{ total: number; unknown: boolean; overCap: boolean; maxSingle: number }> => {
    let total = 0;
    let unknown = false;
    let overCap = false;
    let maxSingle = 0;
    for (const file of files) {
      const pages = await getFilePageCount(file);
      if (pages === null) {
        unknown = true;
        continue;
      }
      total += pages;
      if (pages > MAX_PDF_RENDER_PAGES) {
        overCap = true;
        maxSingle = Math.max(maxSingle, pages);
      }
    }
    return { total, unknown, overCap, maxSingle };
  };

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
        const { unknown, overCap, maxSingle } = await getTotalPages(candidateFiles);
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

  const detectEditedPdf = async (file: File): Promise<{ suspected: boolean; reason: string }> => {
    const buffer = await file.arrayBuffer();
    const text = new TextDecoder('latin1').decode(new Uint8Array(buffer));
    const eofMatches = text.match(/%%EOF/g) || [];
    const hasPrev = /\/Prev\s+\d+/i.test(text);
    const hasIncremental = eofMatches.length > 1 || hasPrev;

    const reasons: string[] = [];
    if (eofMatches.length > 1) reasons.push('Multiple EOF markers (incremental updates)');
    if (hasPrev) reasons.push('Incremental update reference found');

    return {
      suspected: hasIncremental,
      reason: reasons.join(', ') || 'Heuristic indicator found',
    };
  };

  const detectPasswordProtectedPdf = async (file: File): Promise<boolean> => {
    const pdfjsLib = await import('pdfjs-dist');

    // IMPORTANT: Use bundled worker (same-origin). CDN worker can fail due to CORS/dynamic import.
    pdfjsLib.GlobalWorkerOptions.workerSrc = await getPdfWorkerSrc();

    const arrayBuffer = await file.arrayBuffer();
    try {
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        password: '',
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true,
      });
      const pdf = await loadingTask.promise;
      await pdf.destroy?.();
      return false;
    } catch (err: unknown) {
      const error = err as { name?: string; message?: string };
      return (
        error?.name === 'PasswordException' ||
        String(error?.message || '').toLowerCase().includes('password')
      );
    }
  };

  const pdfToPageImages = async (file: File, password?: string): Promise<string[]> => {
    const pdfjsLib = await import('pdfjs-dist');

    // IMPORTANT: Use bundled worker (same-origin). CDN worker can fail due to CORS/dynamic import.
    pdfjsLib.GlobalWorkerOptions.workerSrc = await getPdfWorkerSrc();

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      password: password || undefined,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    });

    const pdf = await loadingTask.promise;
    if (pdf.numPages > maxPdfRenderPages) {
      await pdf.destroy?.();
      if (isFreeUsageMode) {
        throw new Error(`Free tier supports PDFs up to ${FREE_MAX_PDF_PAGES_PER_FILE} pages per file.`);
      }
      throw new Error(`This PDF has ${pdf.numPages} pages. The current maximum supported per file is ${MAX_PDF_RENDER_PAGES} pages.`);
    }

    const pageCount = pdf.numPages;

    const images: string[] = [];
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.6 });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      await page.render({ canvasContext: ctx, viewport }).promise;

      // JPEG keeps payload smaller than PNG
      images.push(canvas.toDataURL('image/jpeg', 0.82));
    }

    await pdf.destroy?.();
    return images;
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
      if (!user) {
        const clientId = getAnonymousClientId();
        if (clientId) requestBody.clientId = clientId;
      }

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
          requestBody.pdfPageImages = await pdfToPageImages(fileToConvert, pdfPassword.trim() || undefined);
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
            // User appears logged in but session is invalid - still allow conversion
            // Edge function will treat as anonymous but that's OK
          } else {
            accessToken = refreshData.session.access_token;
          }
        } else {
          accessToken = sessionData.session.access_token;
        }
      }

      const { data, error: functionError } = await invokeEdgeFunction<ConversionResponse>('convert-document', {
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
      if (!user) {
        const clientId = getAnonymousClientId();
        if (clientId) requestBody.clientId = clientId;
      }

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
            payload.pdfPageImages = await pdfToPageImages(file, pdfPassword.trim() || undefined);
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
          if (!refreshError && refreshData.session) {
            accessToken = refreshData.session.access_token;
          }
        } else {
          accessToken = sessionData.session.access_token;
        }
      }

      const { data, error: functionError } = await invokeEdgeFunction<MultiConversionResponse>('convert-statements-batch', {
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

  const exportAsCSV = () => {
    if (transactions.length === 0) return;

    // Simple CSV with only essential columns: Date, Description, Debit, Credit, Balance
    const headers = ['Date', 'Description', 'Debit', 'Credit', 'Balance'];

    // Calculate totals
    const totalDebit = sumMoney(transactions.map((t) => t.debit || 0));
    const totalCredit = sumMoney(transactions.map((t) => t.credit || 0));
    const totalDebitDisplay = totalDebit.toFixed(2);
    const totalCreditDisplay = totalCredit.toFixed(2);

    const csvRows = [
      headers.join(','),
      ...transactions.map(t =>
        [
          t.date || '',
          `"${(t.description || '').replace(/"/g, '""')}"`,
          t.debit || '',
          t.credit || '',
          t.balance ?? '',
        ].join(',')
      ),
      // Add totals row
      ['', 'TOTAL', totalDebitDisplay, totalCreditDisplay, ''].join(',')
    ];
    const csvContent = csvRows.join('\n');

    // Create and download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "CSV Downloaded",
      description: "Your transaction data has been exported to CSV.",
    });
  };

  const exportAsPDF = async () => {
    if (transactions.length === 0) return;

    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      type JsPdfWithExtras = InstanceType<typeof jsPDF> & {
        setCharSpace?: (value: number) => void;
        setWordSpacing?: (value: number) => void;
        lastAutoTable?: { finalY?: number };
      };
      const doc = new jsPDF({ unit: "pt", format: "a4" }) as JsPdfWithExtras;

      const marginX = 40;
      const pageHeight = doc.internal.pageSize.getHeight();
      let cursorY = 48;

      const formatAmount = (value: number, decimals = 2) =>
        formatCurrencyValue(value, currencyCode, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

      const addLine = (text: string) => {
        if (cursorY > pageHeight - 48) {
          doc.addPage();
          cursorY = 48;
        }
        doc.text(text, marginX, cursorY);
        cursorY += 14;
      };

      const addSection = (title: string) => {
        if (cursorY > pageHeight - 72) {
          doc.addPage();
          cursorY = 48;
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(title, marginX, cursorY);
        cursorY += 16;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
      };

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Analyzed Statement Report", marginX, cursorY);
      cursorY += 18;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      // Reset spacing to avoid any unexpected letter spacing in PDF viewers
      doc.setCharSpace?.(0);
      doc.setWordSpacing?.(0);
      doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, marginX, cursorY);
      cursorY += 16;

      doc.setFontSize(11);
      addLine(`Total Transactions: ${transactions.length}`);
      addLine(`Total Credits: ${formatAmount(truncateDecimals(analytics?.totalCredits ?? 0))}`);
      addLine(`Total Debits: ${formatAmount(truncateDecimals(analytics?.totalDebits ?? 0))}`);
      addLine(`Net Flow: ${formatAmount(truncateDecimals(analytics?.netFlow ?? 0))}`);

      if (analytics?.underwriting) {
        addSection("Underwriting Summary");
        addLine(`FOIR Score: ${(analytics.underwriting.summary?.foirScore ?? 0).toFixed(1)}%`);
        addLine(`FOIR Status: ${(analytics.underwriting.summary?.foirStatus ?? "N/A").toUpperCase()}`);
        addLine(`Avg Monthly Income: ${formatAmount(analytics.underwriting.summary?.avgMonthlyIncome ?? 0, 0)}`);
        addLine(`Avg Monthly EMI: ${formatAmount(analytics.underwriting.summary?.avgMonthlyEMI ?? 0, 0)}`);
        addLine(`Salary Credits Detected: ${analytics.underwriting.summary?.totalSalaryDetected ?? 0}`);
        addLine(`EMI Debits Detected: ${analytics.underwriting.summary?.totalEMIDetected ?? 0}`);
        addLine(`Est. Loan Eligibility: ${formatAmount(analytics.underwriting.eligibility?.estimatedLoanEligibility ?? 0, 0)}`);
        addLine(`Max New EMI: ${formatAmount(analytics.underwriting.eligibility?.maxNewEMI ?? 0, 0)}`);
        addLine(`Eligibility Status: ${(analytics.underwriting.eligibility?.status ?? "N/A").toUpperCase()}`);
        if (analytics.underwriting.eligibility?.message) {
          addLine(`Message: ${analytics.underwriting.eligibility.message}`);
        }
      }

      if (analytics?.riskAnalysis) {
        addSection("Risk & Integrity Analysis");
        addLine(`Integrity Score: ${analytics.riskAnalysis.integrityScore}%`);
        addLine(`Balance Mismatches: ${analytics.riskAnalysis.balanceMismatches}`);
        addLine(`Avg Daily Balance: ${formatAmount(analytics.riskAnalysis.averageDailyBalance ?? 0, 0)}`);
        addLine(`Lowest Balance: ${formatAmount(analytics.riskAnalysis.maxDip?.amount ?? 0, 0)}${analytics.riskAnalysis.maxDip?.date ? ` on ${analytics.riskAnalysis.maxDip.date}` : ""}`);
        const riskFlagCount = analytics.riskAnalysis.riskFlags?.reduce((sum, r) => sum + r.count, 0) ?? 0;
        addLine(`Risk Flags: ${riskFlagCount}`);
        if (analytics.duplicateCount > 0) {
          addLine(`Duplicates Found: ${analytics.duplicateCount}`);
        }
        if (analytics.riskAnalysis.fraudAlerts?.length) {
          addLine(`Fraud Alerts: ${analytics.riskAnalysis.fraudAlerts.length}`);
        }
      }

      if (analytics?.categoryBreakdown && Object.keys(analytics.categoryBreakdown).length > 0) {
        addSection("Category Breakdown");
        const categoryRows = Object.entries(analytics.categoryBreakdown)
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 12)
          .map(([category, data]) => [
            category,
            `${data.count}`,
            formatAmount(truncateDecimals(data.totalDebit ?? 0)),
            formatAmount(truncateDecimals(data.totalCredit ?? 0)),
          ]);

        autoTable(doc, {
          startY: cursorY + 6,
          head: [["Category", "Count", "Total Debit", "Total Credit"]],
          body: categoryRows,
          styles: { fontSize: 9, cellPadding: 4 },
          headStyles: { fillColor: [24, 24, 24], textColor: [255, 255, 255] },
          columnStyles: {
            0: { cellWidth: 180 },
            1: { halign: "right" },
            2: { halign: "right" },
            3: { halign: "right" },
          },
          margin: { left: marginX, right: marginX },
        });

        cursorY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 16 : cursorY + 24;
      }

      const tableRows = transactions.slice(0, 100).map((t) => [
        t.date || "",
        t.description || "",
        t.debit ? formatAmount(t.debit) : "",
        t.credit ? formatAmount(t.credit) : "",
        t.balance != null ? formatAmount(t.balance) : "",
      ]);

      addSection("Transaction Details (first 100 rows)");
      autoTable(doc, {
        startY: cursorY + 6,
        head: [["Date", "Description", "Debit", "Credit", "Balance"]],
        body: tableRows,
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: [24, 24, 24], textColor: [255, 255, 255] },
        columnStyles: {
          0: { cellWidth: 72 },
          1: { cellWidth: 220 },
          2: { halign: "right" },
          3: { halign: "right" },
          4: { halign: "right" },
        },
        margin: { left: marginX, right: marginX },
      });

      doc.save(`analyzed_report_${Date.now()}.pdf`);

      toast({
        title: "PDF Downloaded",
        description: "Your analyzed report has been exported to PDF.",
      });
    } catch (error: unknown) {
      console.error("PDF export error:", error);
      toast({
        variant: "destructive",
        title: "PDF export failed",
        description: getErrorMessage(error, "Failed to export PDF."),
      });
    }
  };

  // Check if user has premium access
  const isPaidUser = planType && planType !== 'free';
  const toneClasses = {
    excellent: { text: 'tone-excellent-text', border: 'tone-excellent-border' },
    good: { text: 'tone-good-text', border: 'tone-good-border' },
    moderate: { text: 'tone-moderate-text', border: 'tone-moderate-border' },
    bad: { text: 'tone-bad-text', border: 'tone-bad-border' },
  } as const;

  type Tone = keyof typeof toneClasses;

  const getCreditTone = (totalCredits: number): Tone => (totalCredits > 0 ? 'excellent' : 'bad');
  const getDebitTone = (totalCredits: number, totalDebits: number): Tone => {
    if (totalCredits <= 0) return totalDebits > 0 ? 'bad' : 'moderate';
    const ratio = totalDebits / totalCredits;
    if (ratio <= 0.6) return 'good';
    if (ratio <= 0.9) return 'moderate';
    return 'bad';
  };
  const getNetFlowTone = (netFlow: number, totalCredits: number): Tone => {
    if (totalCredits > 0) {
      const ratio = netFlow / totalCredits;
      if (ratio >= 0.2) return 'excellent';
      if (ratio > 0) return 'good';
      if (ratio >= -0.1) return 'moderate';
      return 'bad';
    }
    if (netFlow > 0) return 'good';
    if (netFlow === 0) return 'moderate';
    return 'bad';
  };

  const exportAsODS = async () => {
    if (transactions.length === 0) return;

    try {
      const XLSX = await import("xlsx");

      const headers = [
        'Date',
        'Reference No / Transaction ID',
        'Description',
        'Debit',
        'Credit',
        'Balance',
        'Pricing Mismatch Flag',
        'Duplicate Flag',
      ];
      const rows = [
        headers,
        ...transactions.map(t => [
          t.date || '',
          t.refNumber || '',
          t.description || '',
          t.debit ?? 0,
          t.credit ?? 0,
          t.balance ?? 0,
          t.balanceMismatch ? 'YES' : '',
          t.isDuplicate ? 'YES' : '',
        ]),
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
      const wbout = XLSX.write(workbook, { bookType: 'ods', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.oasis.opendocument.spreadsheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions_${Date.now()}.ods`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "ODS Downloaded",
        description: "Your transaction data has been exported to ODS.",
      });
    } catch (error: unknown) {
      console.error('ODS export error:', error);
      toast({
        variant: "destructive",
        title: "ODS export failed",
        description: getErrorMessage(error, "Failed to export ODS."),
      });
    }
  };

  const exportAsDOCX = async () => {
    if (transactions.length === 0) return;

    try {
      const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, WidthType, BorderStyle, AlignmentType } = await import('docx');

      // Create header rows for transaction table
      const headerRow = new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Date', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Description', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Category', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Debit', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Credit', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Balance', bold: true })] })] }),
        ],
      });

      // Create data rows (limit to first 100 for performance)
      const dataRows = transactions.slice(0, 100).map(t => new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(t.date || '')] }),
          new TableCell({ children: [new Paragraph((t.description || '').substring(0, 50))] }),
          new TableCell({ children: [new Paragraph(t.category || 'Other')] }),
          new TableCell({ children: [new Paragraph(`${t.debit || 0}`)] }),
          new TableCell({ children: [new Paragraph(`${t.credit || 0}`)] }),
          new TableCell({ children: [new Paragraph(`${t.balance || 0}`)] }),
        ],
      }));

      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              text: 'BANKLEFY',
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              text: 'Financial Intelligence Report',
              heading: HeadingLevel.HEADING_2,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              text: `Generated: ${new Date().toLocaleString()}`,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({ text: '' }),
            new Paragraph({
              text: 'Financial Summary',
              heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({ text: `Total Transactions: ${transactions.length}` }),
            new Paragraph({ text: `Total Credits: ${formatAmount(truncateDecimals(analytics?.totalCredits || 0), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }),
            new Paragraph({ text: `Total Debits: ${formatAmount(truncateDecimals(analytics?.totalDebits || 0), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }),
            new Paragraph({ text: `Net Flow: ${formatAmount(truncateDecimals(analytics?.netFlow || 0), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }),
            new Paragraph({ text: '' }),
            ...(analytics?.underwriting ? [
              new Paragraph({
                text: 'FOIR Analysis',
                heading: HeadingLevel.HEADING_1,
              }),
              new Paragraph({ text: `FOIR Score: ${analytics.underwriting.summary?.foirScore?.toFixed(2) || 0}%` }),
              new Paragraph({ text: `Status: ${(analytics.underwriting.summary?.foirStatus || 'N/A').toUpperCase()}` }),
              new Paragraph({ text: `Avg Monthly Income: ${formatAmount(analytics.underwriting.summary?.avgMonthlyIncome || 0, { maximumFractionDigits: 0 })}` }),
              new Paragraph({ text: `Avg Monthly EMI: ${formatAmount(analytics.underwriting.summary?.avgMonthlyEMI || 0, { maximumFractionDigits: 0 })}` }),
              new Paragraph({ text: '' }),
            ] : []),
            new Paragraph({
              text: `Transaction Details (${Math.min(transactions.length, 100)} of ${transactions.length})`,
              heading: HeadingLevel.HEADING_1,
            }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [headerRow, ...dataRows],
            }),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bank_statement_report_${Date.now()}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "DOCX Downloaded",
        description: "Your professional Word document has been exported.",
      });
    } catch (error) {
      console.error('DOCX export error:', error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "Failed to generate Word document.",
      });
    }
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

  const creditTone: Tone = analytics ? getCreditTone(analytics.totalCredits) : 'good';
  const debitTone: Tone = analytics ? getDebitTone(analytics.totalCredits, analytics.totalDebits) : 'moderate';
  const netFlowTone: Tone = analytics ? getNetFlowTone(analytics.netFlow, analytics.totalCredits) : 'moderate';

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

              {/* Batch Results and Download */}
              {batchResults.length > 0 && (
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center gap-2 tone-excellent-text">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Batch Conversion Complete!</span>
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Download options:</p>
                   <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Button
                      size="lg"
                      className="excel-button"
                      onClick={handleBatchDownload}
                      disabled={batchDownloading}
                    >
                       {batchDownloading ? (
                         <>
                           <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                           Downloading...
                         </>
                       ) : (
                         <>
                           <FileSpreadsheet className="mr-2 h-5 w-5" />
                           Separate Excel
                         </>
                       )}
                     </Button>
                     {mergeInfo && mergeInfo.available && mergeResult && (
                      <Button
                        size="lg"
                        className="excel-button"
                        onClick={handleMergedDownload}
                        disabled={mergeDownloading}
                      >
                         {mergeDownloading ? (
                           <>
                             <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                             Preparing...
                           </>
                         ) : (
                           <>
                             <FileSpreadsheet className="mr-2 h-5 w-5" />
                             Merge Excel
                           </>
                         )}
                       </Button>
                     )}
                   </div>
                   {mergeInfo && !mergeInfo.available && (
                     <p className="text-xs text-muted-foreground">
                       Merge disabled: {mergeInfo.reasons?.join('; ') || 'Conditions not met'}
                     </p>
                   )}
                   <p className="text-xs text-muted-foreground">Successfully converted: {batchResults.filter(r => r.status === 'success').length}/{batchResults.length}</p>

                   {/* Additional Export Options for Batch */}
                   <div className="flex flex-wrap gap-2 justify-center pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={exportAsCSV}
                      disabled={transactions.length === 0}
                      className="csv-button"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      CSV
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={exportAsPDF}
                      disabled={transactions.length === 0}
                      className="text-white"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Analyzed PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePremiumExport('docx')}
                      disabled={transactions.length === 0}
                      className={`text-white ${!isPaidUser ? 'bg-[#404040] border-[#404040] hover:bg-[#4a4a4a] hover:border-[#4a4a4a]' : ''}`}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      DOCX
                      {!isPaidUser && <Lock className="ml-1 h-3 w-3" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePremiumExport('ods')}
                      disabled={transactions.length === 0}
                      className={`text-white ${!isPaidUser ? 'bg-[#404040] border-[#404040] hover:bg-[#4a4a4a] hover:border-[#4a4a4a]' : ''}`}
                    >
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      ODS
                      {!isPaidUser && <Lock className="ml-1 h-3 w-3" />}
                    </Button>
                   </div>
                   {!isPaidUser && (
                     <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                       <Crown className="h-3 w-3 text-amber-500" />
                       DOCX & ODS are premium formats
                     </p>
                   )}
                 </div>
               )}

              {/* Single File Download Buttons - Show after conversion */}
              {conversionResult && batchResults.length === 0 && (
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center gap-2 tone-excellent-text">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Conversion Complete!</span>
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Download your file:</p>
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Button
                      size="lg"
                      className="excel-button"
                      onClick={handleDownload}
                      disabled={downloading}
                    >
                      {downloading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-5 w-5" />
                          Download Excel
                        </>
                      )}
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={exportAsCSV}
                      disabled={transactions.length === 0}
                      className="csv-button"
                    >
                      <FileText className="mr-2 h-5 w-5" />
                      CSV
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={exportAsPDF}
                      disabled={transactions.length === 0}
                      className="text-white"
                    >
                      <FileText className="mr-2 h-5 w-5" />
                      Analyzed PDF
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => handlePremiumExport('docx')}
                      disabled={transactions.length === 0}
                      className={`text-white ${!isPaidUser ? 'bg-[#404040] border-[#404040] hover:bg-[#4a4a4a] hover:border-[#4a4a4a]' : ''}`}
                    >
                      <FileText className="mr-2 h-5 w-5" />
                      DOCX
                      {!isPaidUser && <Lock className="ml-1 h-4 w-4" />}
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => handlePremiumExport('ods')}
                      disabled={transactions.length === 0}
                      className={`text-white ${!isPaidUser ? 'bg-[#404040] border-[#404040] hover:bg-[#4a4a4a] hover:border-[#4a4a4a]' : ''}`}
                    >
                      <FileSpreadsheet className="mr-2 h-5 w-5" />
                      ODS
                      {!isPaidUser && <Lock className="ml-1 h-4 w-4" />}
                    </Button>
                  </div>
                  {!isPaidUser && (
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <Crown className="h-3 w-3 text-amber-500" />
                      DOCX & ODS are premium formats
                    </p>
                  )}
                </div>
              )}

              {/* AI Processing Status Panel */}
              {aiStatus && !conversionResult && <AIStatusPanel aiStatus={aiStatus} />}

              {(converting || showProgress) && (
                <div className="rounded-xl border border-white/10 bg-[#191919]/80 p-4 sm:p-5" role="status" aria-live="polite" aria-atomic="true">
                  <div className="space-y-2">
                    {conversionSteps.map((step, index) => {
                      const isDone = index < progressStep;
                      const isActive = index === progressStep;
                      const isUpcoming = index > progressStep;

                      return (
                        <div
                          key={step}
                          className={`relative flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-500 ${
                            isActive
                              ? "text-white"
                              : isDone
                                ? "text-emerald-200"
                                : "text-white/50"
                          } ${
                            isActive
                              ? "before:absolute before:inset-0 before:-z-10 before:rounded-lg before:bg-primary/10 before:blur-xl before:opacity-70 before:content-['']"
                              : ""
                          } ${
                            isDone
                              ? "bg-emerald-500/10 border border-emerald-500/25"
                              : isActive
                                ? "bg-primary/5 border border-primary/20"
                                : "border border-transparent"
                          }`}
                        >
                          <div
                            className={`relative flex h-6 w-6 items-center justify-center rounded-full border transition-all duration-500 ${
                              isDone
                                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                                : isActive
                                  ? "border-primary/60 text-primary shadow-[0_0_18px_hsl(var(--primary)/0.35)]"
                                  : "border-white/10 text-white/40"
                            }`}
                          >
                            {isDone ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <div
                                className={`h-2 w-2 rounded-full ${
                                  isActive ? "bg-primary animate-pulse" : "bg-white/20"
                                }`}
                              />
                            )}
                          </div>
                          <span className={`text-sm font-medium ${isUpcoming ? "text-white/50" : ""}`}>
                            {step}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* FOIR & Underwriting Analysis Panel - with skeleton during conversion */}
              {converting && (
                <UnderwritingPanelSkeleton />
              )}
              {!converting && analytics?.underwriting && (
                <UnderwritingPanel underwriting={analytics.underwriting} currencyCode={currencyCode} />
              )}

              {/* Risk Analysis & Fraud Detection Panel */}
              {analytics?.riskAnalysis && (
                <FraudAlertPanel riskAnalysis={analytics.riskAnalysis} currencyCode={currencyCode} />
              )}

              {/* Analytics Summary */}
              {analytics && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-primary" />
                    Financial Analytics
                  </h3>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className={`p-4 !bg-[#191919] ${toneClasses[creditTone].border}`}>
                      <div className={`flex items-center gap-2 text-sm mb-1 ${toneClasses[creditTone].text}`}>
                        <TrendingUp className={`w-4 h-4 ${toneClasses[creditTone].text}`} />
                        Total Credits
                      </div>
                      <p className={`text-2xl font-bold ${toneClasses[creditTone].text}`}>
                        {formatAmount(truncateDecimals(analytics.totalCredits), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </Card>

                    <Card className={`p-4 !bg-[#191919] ${toneClasses[debitTone].border}`}>
                      <div className={`flex items-center gap-2 text-sm mb-1 ${toneClasses[debitTone].text}`}>
                        <TrendingDown className={`w-4 h-4 ${toneClasses[debitTone].text}`} />
                        Total Debits
                      </div>
                      <p className={`text-2xl font-bold ${toneClasses[debitTone].text}`}>
                        {formatAmount(truncateDecimals(analytics.totalDebits), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </Card>

                    <Card className={`p-4 !bg-[#191919] ${toneClasses[netFlowTone].border}`}>
                      <div className={`flex items-center gap-2 text-sm mb-1 ${toneClasses[netFlowTone].text}`}>
                        {analytics.netFlow >= 0 ? <TrendingUp className={`w-4 h-4 ${toneClasses[netFlowTone].text}`} /> : <TrendingDown className={`w-4 h-4 ${toneClasses[netFlowTone].text}`} />}
                        Net Flow
                      </div>
                      <p className={`text-2xl font-bold ${toneClasses[netFlowTone].text}`}>
                        {formatAmount(truncateDecimals(analytics.netFlow), { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: 'always' })}
                      </p>
                    </Card>

                    {analytics.duplicateCount > 0 && (
                      <Card className="p-4 !bg-[#191919] border-orange-500/30">
                        <div className="flex items-center gap-2 text-sm tone-moderate-text mb-1">
                          <AlertTriangle className="w-4 h-4 tone-moderate-text" />
                          Duplicates Found
                        </div>
                        <p className="text-2xl font-bold tone-moderate-text">
                          {analytics.duplicateCount}
                        </p>
                      </Card>
                    )}
                  </div>

                  {/* Category Breakdown */}
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-3">Category Breakdown</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(analytics.categoryBreakdown)
                        .sort((a, b) => b[1].count - a[1].count)
                        .slice(0, 8)
                        .map(([category, data]) => (
                          <Badge
                            key={category}
                            variant="outline"
                            className={`${categoryColors[category] || categoryColors['Other']} border`}
                          >
                            {category}: {data.count}
                          </Badge>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Transaction Preview */}
              {transactions.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-lg font-semibold">Extracted Transactions</h3>
                    <div className="flex items-center gap-3">
                      {analytics && analytics.duplicateCount > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowDuplicatesOnly(!showDuplicatesOnly)}
                          className={
                            showDuplicatesOnly
                              ? "bg-surface-elevated/30 border border-surface-elevated/60 shadow-[0_0_10px_rgba(0,0,0,0.18)]"
                              : ""
                          }
                        >
                          <AlertTriangle className="w-4 h-4 mr-1" />
                          {showDuplicatesOnly ? 'Show All' : `Show Duplicates (${analytics.duplicateCount})`}
                        </Button>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} found
                      </span>
                    </div>
                  </div>

                  <Card className="overflow-hidden !bg-[#191919] border-primary/20">
                    <div className="overflow-x-auto">
                      <ScrollArea className="h-[400px] min-w-[720px]">
                        <Table className="min-w-[720px]">
                        <TableHeader>
                          <TableRow className="bg-[#191919]">
                            <TableHead className="font-semibold">Date</TableHead>
                            <TableHead className="font-semibold">Description</TableHead>
                            <TableHead className="font-semibold">Category</TableHead>
                            <TableHead className="font-semibold text-right tone-bad-text">Debit</TableHead>
                            <TableHead className="font-semibold text-right tone-excellent-text">Credit</TableHead>
                            <TableHead className="font-semibold text-right">Balance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transactions
                            .filter(t => !showDuplicatesOnly || t.isDuplicate)
                            .map((transaction, index) => (
                            <TableRow
                              key={index}
                              className={`${
                                transaction.balanceMismatch
                                  ? 'bg-red-500/10 border-l-2 border-l-red-500'
                                  : transaction.riskFlag
                                    ? 'bg-orange-500/5 border-l-2 border-l-orange-500'
                                    : transaction.isDuplicate
                                      ? 'bg-yellow-500/5 border-l-2 border-l-yellow-500'
                                      : ''
                              }`}
                            >
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  {transaction.date}
                                  {transaction.balanceMismatch && (
                                    <Tooltip>
                                      <TooltipTrigger aria-label="Balance mismatch warning">
                                        <ShieldAlert className="w-4 h-4 tone-bad-text" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Balance mismatch! Expected: {transaction.expectedBalance == null ? 'N/A' : formatAmount(transaction.expectedBalance, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                  {transaction.riskFlag && !transaction.balanceMismatch && (
                                    <Tooltip>
                                      <TooltipTrigger aria-label="Risk flag warning">
                                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Risk Flag: {transaction.riskFlag}
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                  {transaction.isDuplicate && !transaction.balanceMismatch && !transaction.riskFlag && (
                                    <Tooltip>
                                      <TooltipTrigger aria-label="Potential duplicate warning">
                                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Potential duplicate (Group #{transaction.duplicateGroup})
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate">
                                {transaction.description}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${categoryColors[transaction.category] || categoryColors['Other']} border`}
                                >
                                  {transaction.category}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {transaction.debit > 0 ? (
                                  <span className="inline-flex items-center justify-end rounded-md tone-bad-bg tone-bad-text px-2 py-0.5 font-semibold tabular-nums">
                                    {formatAmount(transaction.debit, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {transaction.credit > 0 ? (
                                  <span className="inline-flex items-center justify-end rounded-md tone-excellent-bg tone-excellent-text px-2 py-0.5 font-semibold tabular-nums">
                                    {formatAmount(transaction.credit, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className={`text-right ${transaction.balanceMismatch ? 'tone-bad-text' : ''}`}>
                                {formatAmount(transaction.balance, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                {transaction.balanceMismatch && transaction.expectedBalance && (
                                  <div className="text-xs text-muted-foreground">
                                    Expected: {formatAmount(transaction.expectedBalance, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>
                  </Card>
                </div>
              )}

              {/* Process Steps */}
              <div className="grid md:grid-cols-3 gap-6">
                <div className="subtle-border-glow flex items-start gap-3 p-4 rounded-lg bg-[#191919]/70 backdrop-blur-lg border border-primary/20">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-sm">1. Upload</p>
                    <p className="text-xs text-muted-foreground">
                      Drag & drop your statement
                    </p>
                  </div>
                </div>

                <div className="subtle-border-glow flex items-start gap-3 p-4 rounded-lg bg-[#191919]/70 backdrop-blur-lg border border-secondary/20">
                  <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                    <div className="w-4 h-4 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-sm">2. AI Processing</p>
                    <p className="text-xs text-muted-foreground">
                      Our AI extracts data
                    </p>
                  </div>
                </div>

                <div className="subtle-border-glow flex items-start gap-3 p-4 rounded-lg bg-[#191919]/70 backdrop-blur-lg border border-green-500/20">
                  <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-4 h-4 tone-excellent-text" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-sm">3. Download</p>
                    <p className="text-xs text-muted-foreground">
                      Get your Excel file
                    </p>
                  </div>
                </div>
              </div>

              {/* Supported Banks */}
              <div className="text-center pt-8 border-t border-muted">
                <p className="text-sm text-muted-foreground mb-4">
                  Compatible with most major banks worldwide
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {["HDFC Bank", "ICICI Bank", "Axis Bank", "State Bank of India", "IDBI Bank", "Yes Bank", "Kotak Bank", "Union Bank", "Bank of Baroda", "Punjab National Bank", "HSBC", "Citibank", "Deutsche Bank", "Chase Bank", "Bank of America", "Wells Fargo", "Santander", "BNP Paribas", "ING", "Barclays", "DBS Bank", "OCBC", "UOB", "China Construction Bank", "Agricultural Bank of China", "Bank of China", "ICBC", "Mitsubishi UFJ", "Sumitomo Mitsui", "Nomura"].map((bank) => (
                    <span
                      key={bank}
                      className="px-3 py-1 text-xs rounded-full bg-muted/50 text-muted-foreground transition-all"
                    >
                      {bank}
                    </span>
                  ))}
                </div>
              </div>
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




