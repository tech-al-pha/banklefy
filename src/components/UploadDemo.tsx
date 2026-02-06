import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Upload, FileText, CheckCircle, Sparkles, Loader2, Download, FileSpreadsheet, AlertTriangle, TrendingUp, TrendingDown, PieChart, ShieldAlert, Lock, Eye, EyeOff, RefreshCw, XCircle, FileCode, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/supabaseApi";
import { useAuth } from "@/hooks/useAuth";
import { validateFile, sanitizeFilename } from "@/lib/fileValidation";
import { PDFJS_WORKER_SRC } from "@/lib/pdfWorker";
import { useNavigate } from "react-router-dom";
import { useUsageLimit } from "@/hooks/useUsageLimit";
import { UsageLimitBanner } from "./UsageLimitBanner";
import { useRecaptcha } from "@/hooks/useRecaptcha";
import { FraudAlertPanel } from "./FraudAlertPanel";
import { UnderwritingPanel } from "./UnderwritingPanel";
import { UnderwritingPanelSkeleton } from "./UnderwritingPanelSkeleton";
import { AIStatusPanel } from "./AIStatusPanel";
import akromedaLogo from "@/assets/akromeda-logo.png";
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

// Enhanced Transaction interface with Universal Schema
interface Transaction {
  date: string;
  description: string;
  category: string;
  debit: number;
  credit: number;
  balance: number;
  isDuplicate?: boolean;
  duplicateGroup?: number | null;
  balanceMismatch?: boolean;
  expectedBalance?: number | null;
  riskFlag?: string | null;
  // Legacy fields for backward compatibility
  amount?: number;
  type?: string;
}

interface RiskAnalysis {
  integrityScore: number;
  balanceMismatches: number;
  averageDailyBalance: number;
  maxDip: { amount: number; date: string | null };
  maxPeak: number;
  riskFlags: { type: string; count: number }[];
  fraudAlerts: any[];
}

interface UnderwritingAnalysis {
  salaryCredits: { date: string; amount: number; description: string }[];
  emiDebits: { date: string; amount: number; description: string; loanType: string }[];
  monthlyBreakdown: { month: string; salaryIncome: number; emiOutflow: number }[];
  summary: {
    avgMonthlyIncome: number;
    avgMonthlyEMI: number;
    foirScore: number;
    foirStatus: 'excellent' | 'good' | 'moderate' | 'high';
    emiByLoanType: Record<string, { count: number; totalAmount: number }>;
    totalSalaryDetected: number;
    totalEMIDetected: number;
  };
  eligibility: {
    status: 'excellent' | 'good' | 'moderate' | 'poor' | 'ineligible';
    message: string;
    factors: string[];
    maxNewEMI: number;
    estimatedLoanEligibility: number;
  };
}

interface Analytics {
  totalTransactions: number;
  totalCredits: number;
  totalDebits: number;
  netFlow: number;
  duplicateCount: number;
  categoryBreakdown: Record<string, { count: number; totalDebit: number; totalCredit: number }>;
  riskAnalysis?: RiskAnalysis;
  underwriting?: UnderwritingAnalysis;
}

interface MultiStatementResult {
  fileName: string;
  excelData: string;
  totals?: { totalCredits: number; totalDebits: number };
}

interface MergeTotals {
  totalDebit: number;
  totalCredit: number;
  finalBalance: number | null;
}

interface MergeInfo {
  available: boolean;
  reasons: string[];
  statementPeriod?: string;
  duplicatesRemoved?: number;
  totals?: MergeTotals;
  excelData?: string;
  fileName?: string;
}

interface MultiConversionResponse {
  success: boolean;
  separate: {
    results: MultiStatementResult[];
    failures?: Array<{ fileName: string; error: string }>;
  };
  merge: MergeInfo;
  remaining?: number;
  analytics?: Analytics;
  transactions?: Transaction[];
  planType?: string;
}

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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [conversionResult, setConversionResult] = useState<{ id: string | null; resultPath: string | null; excelData?: string } | null>(null);
  const [batchResults, setBatchResults] = useState<Array<{ fileName: string; status: 'success' | 'error'; data?: any; error?: string }>>([]);
  const [mergeInfo, setMergeInfo] = useState<MergeInfo | null>(null);
  const [mergeResult, setMergeResult] = useState<{ excelData: string; fileName: string } | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [aiStatus, setAiStatus] = useState<{
    groqVision?: { success: boolean; time?: number; error?: string };
    groqText?: { success: boolean; time?: number; error?: string };
    mistral?: { success: boolean; time?: number; error?: string };
    gemini?: { success: boolean; time?: number; error?: string };
    lovable?: { success: boolean; time?: number; error?: string };
    patternFallback?: { success: boolean; time?: number; error?: string };
  } | null>(null);
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
  const [progressStep, setProgressStep] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const dismissedEditedWarningsRef = useRef<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setSelectedFiles((prev) => [...prev, ...newFiles]);
      setPasswordError(false);
      setPdfPassword('');
      setShowPasswordInput(false);
      setShowPassword(false);
      setEditedPdfWarning(null);
      
      toast({
        title: "Files Selected",
        description: `${newFiles.length} file(s) added - Ready to convert`,
      });
    }
  };

  const handleUploadClick = () => {
    if (limitReached) {
      toast({
        variant: "destructive",
        title: "Limit reached",
        description: isAuthenticated 
          ? "You've reached your daily limit. Try again tomorrow!"
          : "Sign up for a free account to get more conversions!",
      });
      if (!isAuthenticated) {
        navigate('/auth');
      }
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

  const pdfToPageImages = async (file: File, password?: string): Promise<string[]> => {
    const pdfjsLib = await import('pdfjs-dist');

    // IMPORTANT: Use bundled worker (same-origin). CDN worker can fail due to CORS/dynamic import.
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      password: password || undefined,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    });

    const pdf = await loadingTask.promise;
    // Safety cap to prevent huge payloads/timeouts
    const MAX_PAGES = 10;
    const pageCount = Math.min(pdf.numPages, MAX_PAGES);

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
      toast({
        variant: "destructive",
        title: "Limit reached",
        description: isAuthenticated 
          ? "You've reached your daily limit. Try again tomorrow!"
          : "Sign up for a free account to get more conversions!",
      });
      if (!isAuthenticated) {
        navigate('/auth');
      }
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

    setUploading(true);

    try {
      const timezone = getTimezone();
      let requestBody: any = {
        fileName: fileToConvert.name,
        timezone,
      };

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
        } catch (err: any) {
          // Surface password errors in existing UX
          if (err?.name === 'PasswordException' || String(err?.message || '').toLowerCase().includes('password')) {
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

      const { data, error: functionError, response } = await invokeEdgeFunction<any>('convert-document', {
        body: requestBody,
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });

      if (functionError) {
        let message = functionError.message || 'Conversion failed';
        
        // Check if we got structured error data
        if (data && typeof data === 'object') {
          if ((data as any).limitReached) {
            refreshUsageLimit();
          }
          if ((data as any).requiresPassword) {
            setPasswordError(true);
            setShowPasswordInput(true);
          }
          message = (data as any).message || (data as any).error || message;
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

      // Store conversion result and transaction data
      setConversionResult({
        id: data.conversionId,
        resultPath: data.resultPath,
        excelData: data.excelData,
      });
      
      if (data.transactions && Array.isArray(data.transactions)) {
        setTransactions(data.transactions);
      }
      
      if (data.analytics) {
        setAnalytics(data.analytics);
      }

      // Store AI processing status for display
      if (data.aiStatus) {
        setAiStatus(data.aiStatus);
      }

      // Store extracted PDF context in sessionStorage for Chat Aura access
      // This allows Chat Aura to provide context-aware responses about the PDF
      if (data.transactions && Array.isArray(data.transactions)) {
        // Create a concise text representation of the extracted data
        const extractedSummary = `Bank Statement Extracted Data:
        
Total Transactions: ${data.transactions.length}

Transactions:
${data.transactions.map((t: any, i: number) => 
  i < 50 ? `${t.date} | ${t.description} | Category: ${t.category} | Debit: ${t.debit} | Credit: ${t.credit} | Balance: ${t.balance}` : ''
).filter(Boolean).join('\n')}
${data.transactions.length > 50 ? `\n... and ${data.transactions.length - 50} more transactions` : ''}

${data.analytics ? `
Analytics Summary:
- Total Credits: ₹${data.analytics.totalCredits}
- Total Debits: ₹${data.analytics.totalDebits}
- Net Flow: ₹${data.analytics.netFlow}
` : ''}`;
        
        sessionStorage.setItem('chatAuraContext', extractedSummary);
        sessionStorage.setItem('chatAuraFileName', selectedFile?.name || 'Bank Statement');
      }

      // Refresh usage limit after successful conversion
      refreshUsageLimit();

      toast({
        title: "Conversion complete!",
        description: `Extracted ${data.transactions?.length || 0} transactions. ${data.remaining} conversions remaining today.`,
      });

      setSelectedFile(null);
      setSelectedFiles([]);
      setShowPasswordInput(false);
      setPdfPassword('');
      setPasswordError(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Conversion error:', error);
      const errorMessage = error.message || 'An unexpected error occurred';
      
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
      toast({
        variant: "destructive",
        title: "Limit reached",
        description: isAuthenticated
          ? "You've reached your daily limit. Try again tomorrow!"
          : "Sign up for a free account to get more conversions!",
      });
      if (!isAuthenticated) {
        navigate('/auth');
      }
      return;
    }

    setUploading(true);
    setBatchResults([]);
    setMergeInfo(null);
    setMergeResult(null);
    setConversionResult(null);
    setTransactions([]);
    setAnalytics(null);
    setAiStatus(null);

    try {
      const timezone = getTimezone();
      const requestBody: any = {
        files: [],
        timezone,
      };

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
        const payload: any = { fileName: file.name };

        if (pdfPassword.trim()) {
          payload.pdfPassword = pdfPassword.trim();
        }

        if (isPdf) {
          try {
            payload.pdfPageImages = await pdfToPageImages(file, pdfPassword.trim() || undefined);
          } catch (err: any) {
            if (err?.name === 'PasswordException' || String(err?.message || '').toLowerCase().includes('password')) {
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
        const payload = data as any;
        if (payload?.limitReached) {
          refreshUsageLimit();
        }
        if (payload?.requiresPassword) {
          setPasswordError(true);
          setShowPasswordInput(true);
        }
        message = payload?.message || payload?.error || message;
        throw new Error(message);
      }

      if ((data as any)?.error) {
        const payload = data as any;
        if (payload?.limitReached) {
          refreshUsageLimit();
          throw new Error(payload.message || 'Conversion limit reached');
        }
        if (payload?.requiresPassword) {
          setPasswordError(true);
          setShowPasswordInput(true);
          throw new Error(payload.error);
        }
        throw new Error(payload.error);
      }

      const results = data?.separate?.results || [];
      const failures = data?.separate?.failures || [];
      setBatchResults([
        ...results.map((result) => ({ fileName: result.fileName, status: 'success' as const, data: { excelData: result.excelData } })),
        ...failures.map((failure) => ({ fileName: failure.fileName, status: 'error' as const, error: failure.error })),
      ]);

      setMergeInfo(data?.merge || null);
      if (data?.merge?.available && data?.merge?.excelData) {
        setMergeResult({
          excelData: data.merge.excelData,
          fileName: data.merge.fileName || `merged_${Date.now()}.xlsx`,
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

      refreshUsageLimit();

      toast({
        title: "Batch conversion complete!",
        description: `${results.length} statement(s) converted. ${data?.remaining ?? ''}`.trim(),
      });

      setSelectedFiles([]);
      setSelectedFile(null);
      setShowPasswordInput(false);
      setPdfPassword('');
      setPasswordError(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Batch conversion error:', error);
      const errorMessage = error.message || 'An unexpected error occurred';

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
      a.download = `converted_${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Downloaded!",
        description: "Your Excel file has been downloaded.",
      });
    } catch (error: any) {
      console.error('Download error:', error);
      toast({
        variant: "destructive",
        title: "Download failed",
        description: error.message || "Failed to download the file.",
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
        if (result.status === 'success' && result.data?.excelData) {
          const binaryString = atob(result.data.excelData);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${result.fileName}.xlsx`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          // Small delay between downloads
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      toast({
        title: "Downloaded!",
        description: `${batchResults.filter(r => r.status === 'success').length} file(s) downloaded.`,
      });
    } catch (error: any) {
      console.error('Batch download error:', error);
      toast({
        variant: "destructive",
        title: "Download failed",
        description: error.message || "Failed to download the files.",
      });
    } finally {
      setBatchDownloading(false);
    }
  };

  const handleMergedDownload = async () => {
    if (!mergeResult) return;

    setMergeDownloading(true);
    try {
      const binaryString = atob(mergeResult.excelData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
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
    } catch (error: any) {
      console.error('Merge download error:', error);
      toast({
        variant: "destructive",
        title: "Download failed",
        description: error.message || "Failed to download the merged file.",
      });
    } finally {
      setMergeDownloading(false);
    }
  };

  const exportAsCSV = () => {
    if (transactions.length === 0) return;

    // Convert transactions to CSV with new schema
    const headers = ['Date', 'Description', 'Category', 'Debit', 'Credit', 'Balance', 'Is Duplicate'];
    const csvRows = [
      headers.join(','),
      ...transactions.map(t => 
        [t.date, `"${t.description}"`, `"${t.category}"`, t.debit, t.credit, t.balance, t.isDuplicate ? 'Yes' : 'No'].join(',')
      )
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

  // Check if user has premium access
  const isPaidUser = planType && planType !== 'free';

  const exportAsXML = () => {
    if (transactions.length === 0) return;

    // Build XML structure
    const xmlTransactions = transactions.map(t => `    <Transaction>
      <Date>${t.date || ''}</Date>
      <Description><![CDATA[${t.description || ''}]]></Description>
      <Category>${t.category || 'Other'}</Category>
      <Debit>${t.debit || 0}</Debit>
      <Credit>${t.credit || 0}</Credit>
      <Balance>${t.balance || 0}</Balance>
    </Transaction>`).join('\n');

    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<BankStatement>
  <Metadata>
    <GeneratedAt>${new Date().toISOString()}</GeneratedAt>
    <TotalTransactions>${transactions.length}</TotalTransactions>
    <TotalCredits>${analytics?.totalCredits || 0}</TotalCredits>
    <TotalDebits>${analytics?.totalDebits || 0}</TotalDebits>
    <NetFlow>${analytics?.netFlow || 0}</NetFlow>
  </Metadata>
  <Transactions>
${xmlTransactions}
  </Transactions>
</BankStatement>`;

    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${Date.now()}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "XML Downloaded",
      description: "Your transaction data has been exported to XML.",
    });
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
              text: 'AKROMEDA',
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
            new Paragraph({ text: `Total Credits: ₹${(analytics?.totalCredits || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` }),
            new Paragraph({ text: `Total Debits: ₹${(analytics?.totalDebits || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` }),
            new Paragraph({ text: `Net Flow: ₹${(analytics?.netFlow || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` }),
            new Paragraph({ text: '' }),
            ...(analytics?.underwriting ? [
              new Paragraph({
                text: 'FOIR Analysis',
                heading: HeadingLevel.HEADING_1,
              }),
              new Paragraph({ text: `FOIR Score: ${analytics.underwriting.summary?.foirScore?.toFixed(2) || 0}%` }),
              new Paragraph({ text: `Status: ${(analytics.underwriting.summary?.foirStatus || 'N/A').toUpperCase()}` }),
              new Paragraph({ text: `Avg Monthly Income: ₹${(analytics.underwriting.summary?.avgMonthlyIncome || 0).toLocaleString('en-IN')}` }),
              new Paragraph({ text: `Avg Monthly EMI: ₹${(analytics.underwriting.summary?.avgMonthlyEMI || 0).toLocaleString('en-IN')}` }),
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

  const handlePremiumExport = (format: 'docx' | 'xml') => {
    if (!isPaidUser) {
      setShowUpgradeDialog(true);
      return;
    }
    if (format === 'docx') {
      exportAsDOCX();
    } else {
      exportAsXML();
    }
  };

  return (
    <section className="relative py-16 px-4 sm:px-6 overflow-hidden bg-[#0A0502]">
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
          <Card className="p-6 sm:p-8 md:p-12 bg-[#1a120b]/80 backdrop-blur-xl border border-primary/20 rounded-2xl">
            {/* Usage Limit Banner */}
            {!usageLimitLoading && (
              <UsageLimitBanner
                remaining={remaining}
                limit={conversionsLimit}
                isAuthenticated={isAuthenticated}
                limitReached={limitReached}
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
                data-hover
                className={`bg-[#0f0906]/80 border-2 border-primary/20 hover:border-primary/40 rounded-xl p-6 sm:p-10 md:p-12 text-center transition-all duration-500 cursor-pointer group relative ${
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
                        : 'text-primary group-hover:text-accent'
                    }`} />
                  </div>
                  
                  <div className="space-y-3">
                    <p className="text-xl font-semibold tracking-wide text-white">
                      {selectedFiles.length > 0 
                        ? `${selectedFiles.length} file(s) selected` 
                        : "Drop your bank statements here"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {limitReached 
                        ? "Daily limit reached" 
                        : "or click to browse files • Supports PDF, PNG, JPG • Upload multiple files"}
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
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFiles(selectedFiles.filter((_, i) => i !== idx));
                            }}
                            className="text-destructive hover:text-destructive/80"
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
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-8 py-3 rounded-lg w-full sm:w-auto"
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
                        className="bg-accent hover:bg-accent/90 text-accent-foreground font-medium px-8 py-3 rounded-lg w-full sm:w-auto"
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
                <div className="space-y-4 p-6 bg-destructive/5 rounded-xl border-2 border-destructive/30">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-destructive/20 rounded-lg">
                      <Lock className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <p className="font-semibold text-destructive">Password Required</p>
                      <p className="text-xs text-muted-foreground">This PDF is password protected. Enter the password to continue.</p>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter PDF password..."
                      value={pdfPassword}
                      onChange={(e) => {
                        setPdfPassword(e.target.value);
                        setPasswordError(false);
                      }}
                      className={`bg-background/50 border-2 pr-10 ${passwordError ? 'border-destructive focus:border-destructive' : 'border-destructive/40 focus:border-destructive'}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  
                  {passwordError && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" />
                      Incorrect password. Please try again.
                    </p>
                  )}
                </div>
              )}

              {/* Edited PDF Warning */}
              {editedPdfWarning && selectedFile && !converting && !uploading && (
                <div className="p-4 bg-amber-500/10 border-2 border-amber-500/30 rounded-xl space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-amber-500">Possible Edited PDF Detected</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        This statement looks like it may have been edited. Reason: {editedPdfWarning.reason}.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      variant="outline"
                      className="w-full border-[#F2C94C]/55 hover:bg-[#F2C94C]/10 text-[#F2C94C] shadow-[0_0_14px_rgba(242,201,76,0.22)] hover:shadow-[0_0_18px_rgba(242,201,76,0.28)]"
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
                      className="w-full text-muted-foreground hover:text-foreground"
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
                <div className="p-4 bg-destructive/10 border-2 border-destructive/30 rounded-xl space-y-3">
                  <div className="flex items-start gap-3">
                    <XCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-destructive">Conversion Failed</p>
                      <p className="text-sm text-muted-foreground mt-1">{lastError.message}</p>
                    </div>
                  </div>
                  {lastError.canRetry && (
                    <Button
                      variant="outline"
                      className="w-full border-destructive/50 hover:bg-destructive/10 text-destructive"
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
                        className="bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-neon w-full md:w-auto"
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
                      <p className="text-xs text-muted-foreground">{selectedFiles.length} file(s) ready to convert</p>
                    </div>
                  )}
                </div>
              )}

              {/* Batch Results and Download */}
              {batchResults.length > 0 && (
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center gap-2 text-green-500">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Batch Conversion Complete!</span>
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Download options:</p>
                   <div className="flex flex-col sm:flex-row gap-2 justify-center">
                     <Button
                       size="lg"
                       className="bg-primary hover:bg-primary/90 text-primary-foreground"
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
                         className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
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
                     >
                       <FileText className="mr-2 h-4 w-4" />
                       CSV
                     </Button>
                     <Button
                       size="sm"
                       variant="outline"
                       onClick={() => handlePremiumExport('xml')}
                       disabled={transactions.length === 0}
                       className={!isPaidUser ? 'opacity-70' : ''}
                     >
                       <FileCode className="mr-2 h-4 w-4" />
                       XML
                       {!isPaidUser && <Lock className="ml-1 h-3 w-3" />}
                     </Button>
                     <Button
                       size="sm"
                       variant="outline"
                       onClick={() => handlePremiumExport('docx')}
                       disabled={transactions.length === 0}
                       className={!isPaidUser ? 'opacity-70' : ''}
                     >
                       <FileText className="mr-2 h-4 w-4" />
                       DOCX
                       {!isPaidUser && <Lock className="ml-1 h-3 w-3" />}
                     </Button>
                   </div>
                   {!isPaidUser && (
                     <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                       <Crown className="h-3 w-3 text-amber-500" />
                       XML & DOCX are premium formats
                     </p>
                   )}
                 </div>
               )}

              {/* Single File Download Buttons - Show after conversion */}
              {conversionResult && batchResults.length === 0 && (
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center gap-2 text-green-500">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Conversion Complete!</span>
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Download your file:</p>
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white"
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
                    >
                      <FileText className="mr-2 h-5 w-5" />
                      CSV
                    </Button>
                     <Button
                       size="lg"
                       variant="outline"
                       onClick={() => handlePremiumExport('xml')}
                       disabled={transactions.length === 0}
                       className={!isPaidUser ? 'opacity-70' : ''}
                     >
                       <FileCode className="mr-2 h-5 w-5" />
                       XML
                       {!isPaidUser && <Lock className="ml-1 h-4 w-4" />}
                     </Button>
                     <Button
                       size="lg"
                       variant="outline"
                       onClick={() => handlePremiumExport('docx')}
                       disabled={transactions.length === 0}
                       className={!isPaidUser ? 'opacity-70' : ''}
                     >
                       <FileText className="mr-2 h-5 w-5" />
                       DOCX
                       {!isPaidUser && <Lock className="ml-1 h-4 w-4" />}
                     </Button>
                  </div>
                   {!isPaidUser && (
                     <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                       <Crown className="h-3 w-3 text-amber-500" />
                       XML & DOCX are premium formats
                     </p>
                   )}
                </div>
              )}

              {/* AI Processing Status Panel */}
              {aiStatus && <AIStatusPanel aiStatus={aiStatus} />}

              {(converting || showProgress) && (
                <div className="rounded-xl border border-primary/20 bg-muted/20 p-4 sm:p-5">
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
                              ? "text-foreground"
                              : isDone
                                ? "text-foreground/80"
                                : "text-muted-foreground"
                          } ${
                            isActive
                              ? "before:absolute before:inset-0 before:-z-10 before:rounded-lg before:bg-primary/10 before:blur-xl before:opacity-70 before:content-['']"
                              : ""
                          } ${isDone ? "bg-primary/5 border border-primary/10" : "border border-transparent"}`}
                        >
                          <div
                            className={`relative flex h-6 w-6 items-center justify-center rounded-full border transition-all duration-500 ${
                              isDone
                                ? "bg-primary/15 border-primary/40 text-primary"
                                : isActive
                                  ? "border-primary/60 text-primary shadow-[0_0_18px_hsl(var(--primary)/0.35)]"
                                  : "border-white/10 text-muted-foreground"
                            }`}
                          >
                            {isDone ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <div
                                className={`h-2 w-2 rounded-full ${
                                  isActive ? "bg-primary animate-pulse" : "bg-white/30"
                                }`}
                              />
                            )}
                          </div>
                          <span className={`text-sm font-medium ${isUpcoming ? "text-muted-foreground" : ""}`}>
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
                <UnderwritingPanel underwriting={analytics.underwriting} />
              )}

              {/* Risk Analysis & Fraud Detection Panel */}
              {analytics?.riskAnalysis && (
                <FraudAlertPanel riskAnalysis={analytics.riskAnalysis} />
              )}

              {/* Analytics Summary */}
              {analytics && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-primary" />
                    Financial Analytics
                  </h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="p-4 bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        Total Credits
                      </div>
                      <p className="text-2xl font-bold text-green-500">
                        ₹{analytics.totalCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </Card>
                    
                    <Card className="p-4 bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <TrendingDown className="w-4 h-4 text-red-500" />
                        Total Debits
                      </div>
                      <p className="text-2xl font-bold text-red-500">
                        ₹{analytics.totalDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </Card>
                    
                    <Card className={`p-4 bg-gradient-to-br ${analytics.netFlow >= 0 ? 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20' : 'from-orange-500/10 to-orange-500/5 border-orange-500/20'}`}>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        {analytics.netFlow >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-500" /> : <TrendingDown className="w-4 h-4 text-orange-500" />}
                        Net Flow
                      </div>
                      <p className={`text-2xl font-bold ${analytics.netFlow >= 0 ? 'text-emerald-500' : 'text-orange-500'}`}>
                        {analytics.netFlow >= 0 ? '+' : ''}₹{analytics.netFlow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </Card>
                    
                    {analytics.duplicateCount > 0 && (
                      <Card className="p-4 bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <AlertTriangle className="w-4 h-4 text-yellow-500" />
                          Duplicates Found
                        </div>
                        <p className="text-2xl font-bold text-yellow-500">
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
                          className={showDuplicatesOnly ? 'bg-[#F2C94C]/20 border-[#F2C94C]/50 shadow-[0_0_10px_rgba(242,201,76,0.18)]' : ''}
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
                  
                  <Card className="overflow-hidden border-primary/20">
                    <div className="overflow-x-auto">
                      <ScrollArea className="h-[400px] min-w-[720px]">
                        <Table className="min-w-[720px]">
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="font-semibold">Date</TableHead>
                            <TableHead className="font-semibold">Description</TableHead>
                            <TableHead className="font-semibold">Category</TableHead>
                            <TableHead className="font-semibold text-right">Debit</TableHead>
                            <TableHead className="font-semibold text-right">Credit</TableHead>
                            <TableHead className="font-semibold text-right">Balance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transactions
                            .filter(t => !showDuplicatesOnly || t.isDuplicate)
                            .map((transaction, index) => (
                            <TableRow 
                              key={index} 
                              className={`hover:bg-muted/30 ${
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
                                      <TooltipTrigger>
                                        <ShieldAlert className="w-4 h-4 text-red-500" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Balance mismatch! Expected: ₹{transaction.expectedBalance?.toLocaleString('en-IN')}
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                  {transaction.riskFlag && !transaction.balanceMismatch && (
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Risk Flag: {transaction.riskFlag}
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                  {transaction.isDuplicate && !transaction.balanceMismatch && !transaction.riskFlag && (
                                    <Tooltip>
                                      <TooltipTrigger>
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
                              <TableCell className="text-right font-semibold text-red-500">
                                {transaction.debit > 0 ? `₹${transaction.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                              </TableCell>
                              <TableCell className="text-right font-semibold text-green-500">
                                {transaction.credit > 0 ? `₹${transaction.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                              </TableCell>
                              <TableCell className={`text-right ${transaction.balanceMismatch ? 'text-red-500' : ''}`}>
                                ₹{transaction.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                {transaction.balanceMismatch && transaction.expectedBalance && (
                                  <div className="text-xs text-muted-foreground">
                                    Expected: ₹{transaction.expectedBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                <div className="flex items-start gap-3 p-4 rounded-lg bg-[#0A0502]/40 backdrop-blur-lg border border-primary/20">
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

                <div className="flex items-start gap-3 p-4 rounded-lg bg-[#0A0502]/40 backdrop-blur-lg border border-secondary/20">
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

                <div className="flex items-start gap-3 p-4 rounded-lg bg-[#0A0502]/40 backdrop-blur-lg border border-green-500/20">
                  <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-4 h-4 text-green-500" />
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
                  Supports 1000+ banks worldwide
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {["HDFC Bank", "ICICI Bank", "Axis Bank", "State Bank of India", "IDBI Bank", "Yes Bank", "Kotak Bank", "Union Bank", "Bank of Baroda", "Punjab National Bank", "HSBC", "Citibank", "Deutsche Bank", "Chase Bank", "Bank of America", "Wells Fargo", "Santander", "BNP Paribas", "ING", "Barclays", "DBS Bank", "OCBC", "UOB", "China Construction Bank", "Agricultural Bank of China", "Bank of China", "ICBC", "Mitsubishi UFJ", "Sumitomo Mitsui", "Nomura"].map((bank) => (
                    <span 
                      key={bank}
                      className="px-3 py-1 text-xs rounded-full bg-muted/50 text-muted-foreground hover:bg-primary/20 hover:text-primary transition-all"
                    >
                      {bank}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

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
                Upgrade your plan to unlock DOCX and XML exports for your financial data.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 pt-4">
                <Button 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
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

