import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Upload, FileText, CheckCircle, Sparkles, Loader2, Download, FileSpreadsheet, FileJson, AlertTriangle, TrendingUp, TrendingDown, PieChart, ShieldAlert, Lock, Eye, EyeOff, RefreshCw, XCircle, FileDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import amLogoImg from "@/assets/am-logo.png";
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

// Lazy load PDF preview for performance
const PdfPreview = lazy(() => import('./PdfPreview').then(m => ({ default: m.PdfPreview })));

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

export const UploadDemo = () => {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [conversionResult, setConversionResult] = useState<{ id: string | null; resultPath: string | null; excelData?: string } | null>(null);
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
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
  const [pdfPassword, setPdfPassword] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [lastError, setLastError] = useState<{ message: string; canRetry: boolean } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
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
    getTimezone
  } = useUsageLimit();
  
  // reCAPTCHA for anonymous users
  const { recaptchaToken, isLoaded: recaptchaLoaded, renderRecaptcha, resetRecaptcha } = useRecaptcha();
  const [showRecaptcha, setShowRecaptcha] = useState(false);

  // Render reCAPTCHA when needed for anonymous users
  useEffect(() => {
    if (showRecaptcha && !user && recaptchaLoaded) {
      renderRecaptcha('recaptcha-container');
    }
  }, [showRecaptcha, user, recaptchaLoaded, renderRecaptcha]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateFile(file);
    if (!validation.success) {
      toast({
        variant: "destructive",
        title: "Invalid file",
        description: validation.error,
      });
      return;
    }

    setSelectedFile(file);
    setPasswordError(false);
    setPdfPassword('');
    setShowPasswordInput(false); // Don't show password field by default - only when backend says it's needed
    setShowPassword(false);
    
    // Show reCAPTCHA for anonymous users
    if (!user) {
      setShowRecaptcha(true);
    }
    
    toast({
      title: "File Selected",
      description: `${file.name} - Ready to convert`,
    });
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

  const handleConvert = async () => {
    // Clear previous errors
    setLastError(null);
    
    if (!selectedFile) {
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

    // For anonymous users, require reCAPTCHA verification
    if (!user && !recaptchaToken) {
      toast({
        variant: "destructive",
        title: "Verification required",
        description: "Please complete the CAPTCHA verification below.",
      });
      return;
    }

    setUploading(true);

    try {
      const timezone = getTimezone();
      const isPdf = selectedFile.name.toLowerCase().endsWith('.pdf');
      let requestBody: any = {
        fileName: selectedFile.name,
        timezone,
      };

      // Add PDF password if provided
      if (pdfPassword.trim()) {
        requestBody.pdfPassword = pdfPassword.trim();
      }

      // Add reCAPTCHA token for anonymous users
      if (!user && recaptchaToken) {
        requestBody.recaptchaToken = recaptchaToken;
      }

      // For PDFs: render page images client-side and send to backend (Groq Vision can't accept PDFs directly)
      if (isPdf) {
        try {
          requestBody.pdfPageImages = await pdfToPageImages(selectedFile, pdfPassword.trim() || undefined);
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
        const sanitized = sanitizeFilename(selectedFile.name);
        const filePath = `${Date.now()}_${sanitized}`;

        const { error: uploadError } = await supabase.storage
          .from('bank-statements')
          .upload(`${user.id}/${filePath}`, selectedFile, {
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
          const base64Data = await fileToBase64(selectedFile);
          requestBody.fileData = base64Data;
        }
      }

      toast({
        title: user ? "File uploaded" : "Processing file",
        description: "Starting conversion...",
      });

      setUploading(false);
      setConverting(true);

      // Call edge function to process conversion
      // Explicitly pass the current access token to avoid being treated as anonymous.
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      const { data, error: functionError } = await supabase.functions.invoke('convert-document', {
        body: requestBody,
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });

      if (functionError) {
        // Supabase returns a generic message for non-2xx responses.
        // Try to extract a useful message from the response body.
        const ctx = (functionError as any).context;
        let message = functionError.message || 'Conversion failed';

        try {
          // context can be a Response, or an object holding a Response
          const res: Response | undefined =
            ctx instanceof Response
              ? ctx
              : ctx?.response instanceof Response
                ? ctx.response
                : undefined;

          if (res) {
            const payload = await res.clone().json().catch(() => null);
            if (payload && typeof payload === 'object') {
              if ((payload as any).limitReached) {
                refreshUsageLimit();
              }
              if ((payload as any).requiresPassword) {
                setPasswordError(true);
                setShowPasswordInput(true);
              }
              message = (payload as any).message || (payload as any).error || message;
            }
          } else if (ctx && typeof ctx.json === 'function') {
            const payload = await ctx.json().catch(() => null);
            if (payload && typeof payload === 'object') {
              if ((payload as any).limitReached) {
                refreshUsageLimit();
              }
              if ((payload as any).requiresPassword) {
                setPasswordError(true);
                setShowPasswordInput(true);
              }
              message = (payload as any).message || (payload as any).error || message;
            }
          }
        } catch {
          // ignore parsing issues
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

      // Refresh usage limit after successful conversion
      refreshUsageLimit();

      toast({
        title: "Conversion complete!",
        description: `Extracted ${data.transactions?.length || 0} transactions. ${data.remaining} conversions remaining today.`,
      });

      setSelectedFile(null);
      setShowRecaptcha(false);
      setShowPasswordInput(false);
      setPdfPassword('');
      setPasswordError(false);
      resetRecaptcha();
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
        // CAPTCHA error - can retry after completing verification
        resetRecaptcha();
        setLastError({ message: 'Verification failed. Please complete the CAPTCHA again.', canRetry: true });
        toast({
          variant: "destructive",
          title: "Verification Failed",
          description: "Please complete the CAPTCHA verification again.",
        });
      } else {
        // General error - can retry
        resetRecaptcha();
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

  const exportAsJSON = () => {
    if (transactions.length === 0) return;

    // Convert transactions to JSON
    const jsonContent = JSON.stringify(transactions, null, 2);

    // Create and download JSON file
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "JSON Downloaded",
      description: "Your transaction data has been exported to JSON.",
    });
  };

  const exportAsPDF = async () => {
    if (transactions.length === 0 && !analytics) return;

    try {
      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 15;

      // Add Akromeda Logo
      try {
        // Load logo as base64
        const logoResponse = await fetch(amLogoImg);
        const logoBlob = await logoResponse.blob();
        const logoBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(logoBlob);
        });
        
        // Add logo to PDF (left side)
        doc.addImage(logoBase64, 'PNG', 14, yPos - 5, 25, 25);
      } catch (logoErr) {
        console.warn('Could not load logo for PDF:', logoErr);
      }

      // Title (next to logo)
      doc.setFontSize(18);
      doc.setTextColor(180, 120, 60); // Gold-ish color
      doc.text('AKROMEDA', 45, yPos + 5);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text('Financial Intelligence Report', 45, yPos + 12);
      yPos += 30;

      // Divider line
      doc.setDrawColor(180, 120, 60);
      doc.setLineWidth(0.5);
      doc.line(14, yPos, pageWidth - 14, yPos);
      yPos += 10;

      // Date
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, yPos);
      yPos += 10;

      // Financial Summary Section
      if (analytics) {
        doc.setFontSize(14);
        doc.setTextColor(40);
        doc.text('Financial Summary', 14, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setTextColor(60);
        const summaryData = [
          ['Total Transactions', analytics.totalTransactions.toString()],
          ['Total Credits', `₹${analytics.totalCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
          ['Total Debits', `₹${analytics.totalDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
          ['Net Cash Flow', `₹${analytics.netFlow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
        ];

        autoTable(doc, {
          startY: yPos,
          head: [['Metric', 'Value']],
          body: summaryData,
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246] },
          margin: { left: 14, right: 14 },
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      // FOIR & Loan Eligibility Section
      if (analytics?.underwriting) {
        const uw = analytics.underwriting;

        doc.setFontSize(14);
        doc.setTextColor(40);
        doc.text('FOIR & Loan Eligibility Analysis', 14, yPos);
        yPos += 8;

        const foirData = [
          ['Average Monthly Income', `₹${(uw.summary?.avgMonthlyIncome ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
          ['Average Monthly EMI', `₹${(uw.summary?.avgMonthlyEMI ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
          ['FOIR Score', `${(uw.summary?.foirScore ?? 0).toFixed(2)}%`],
          ['FOIR Status', (uw.summary?.foirStatus ?? 'N/A').toUpperCase()],
          ['Eligibility Status', (uw.eligibility?.status ?? 'N/A').toUpperCase()],
          ['Max New EMI Possible', `₹${(uw.eligibility?.maxNewEMI ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
          ['Estimated Loan Eligibility', `₹${(uw.eligibility?.estimatedLoanEligibility ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`],
        ];

        autoTable(doc, {
          startY: yPos,
          head: [['Parameter', 'Value']],
          body: foirData,
          theme: 'grid',
          headStyles: { fillColor: [16, 185, 129] },
          margin: { left: 14, right: 14 },
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;

        // Eligibility Factors
        if (uw.eligibility?.factors && uw.eligibility.factors.length > 0) {
          doc.setFontSize(12);
          doc.text('Eligibility Factors:', 14, yPos);
          yPos += 6;
          doc.setFontSize(9);
          uw.eligibility.factors.forEach((factor) => {
            doc.text(`• ${factor}`, 18, yPos);
            yPos += 5;
          });
          yPos += 5;
        }

        // Salary Credits Detected
        if (uw.salaryCredits && uw.salaryCredits.length > 0) {
          doc.addPage();
          yPos = 20;
          doc.setFontSize(14);
          doc.setTextColor(40);
          doc.text('Salary Credits Detected', 14, yPos);
          yPos += 8;

          const salaryData = uw.salaryCredits.map(s => [
            s.date || 'N/A',
            `₹${(s.amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
            (s.description || '').substring(0, 40),
          ]);

          autoTable(doc, {
            startY: yPos,
            head: [['Date', 'Amount', 'Description']],
            body: salaryData,
            theme: 'grid',
            headStyles: { fillColor: [34, 197, 94] },
            margin: { left: 14, right: 14 },
          });
          yPos = (doc as any).lastAutoTable.finalY + 10;
        }

        // EMI Debits Detected
        if (uw.emiDebits && uw.emiDebits.length > 0) {
          doc.setFontSize(14);
          doc.text('EMI/Loan Debits Detected', 14, yPos);
          yPos += 8;

          const emiData = uw.emiDebits.map(e => [
            e.date || 'N/A',
            `₹${(e.amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
            e.loanType || 'Unknown',
            (e.description || '').substring(0, 30),
          ]);

          autoTable(doc, {
            startY: yPos,
            head: [['Date', 'Amount', 'Loan Type', 'Description']],
            body: emiData,
            theme: 'grid',
            headStyles: { fillColor: [239, 68, 68] },
            margin: { left: 14, right: 14 },
          });
          yPos = (doc as any).lastAutoTable.finalY + 10;
        }
      }

      // Risk Analysis Section
      if (analytics?.riskAnalysis) {
        const risk = analytics.riskAnalysis;

        doc.addPage();
        yPos = 20;
        doc.setFontSize(14);
        doc.setTextColor(40);
        doc.text('Risk & Fraud Analysis', 14, yPos);
        yPos += 8;

        const riskData = [
          ['Document Integrity Score', `${risk.integrityScore ?? 0}%`],
          ['Balance Mismatches', (risk.balanceMismatches ?? 0).toString()],
          ['Average Daily Balance', `₹${(risk.averageDailyBalance ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
          ['Max Dip Amount', `₹${(risk.maxDip?.amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
          ['Max Dip Date', risk.maxDip?.date || 'N/A'],
        ];

        autoTable(doc, {
          startY: yPos,
          head: [['Metric', 'Value']],
          body: riskData,
          theme: 'grid',
          headStyles: { fillColor: [249, 115, 22] },
          margin: { left: 14, right: 14 },
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;

        // Risk Flags
        if (risk.riskFlags && risk.riskFlags.length > 0) {
          doc.setFontSize(12);
          doc.text('Risk Flags Detected:', 14, yPos);
          yPos += 6;

          const flagData = risk.riskFlags.map(f => [f.type || 'Unknown', (f.count ?? 0).toString()]);

          autoTable(doc, {
            startY: yPos,
            head: [['Risk Type', 'Count']],
            body: flagData,
            theme: 'grid',
            headStyles: { fillColor: [220, 38, 38] },
            margin: { left: 14, right: 14 },
          });
          yPos = (doc as any).lastAutoTable.finalY + 10;
        }

        // Fraud Alerts
        if (risk.fraudAlerts && risk.fraudAlerts.length > 0) {
          doc.setFontSize(12);
          doc.text('Fraud Alerts:', 14, yPos);
          yPos += 6;

          const alertData = risk.fraudAlerts.map((a: any) => [
            a.alert_type || a.type || 'Unknown',
            a.severity || 'medium',
            (a.description || '').substring(0, 50),
          ]);

          autoTable(doc, {
            startY: yPos,
            head: [['Type', 'Severity', 'Description']],
            body: alertData,
            theme: 'grid',
            headStyles: { fillColor: [185, 28, 28] },
            margin: { left: 14, right: 14 },
          });
          yPos = (doc as any).lastAutoTable.finalY + 10;
        }
      }

      // Transactions Table
      if (transactions.length > 0) {
        doc.addPage();
        yPos = 20;
        doc.setFontSize(14);
        doc.setTextColor(40);
        doc.text('Transaction Details', 14, yPos);
        yPos += 8;

        const txnData = transactions.slice(0, 100).map(t => [
          t.date || 'N/A',
          (t.description || '').substring(0, 25),
          t.category || 'Other',
          (t.debit ?? 0) > 0 ? `₹${(t.debit ?? 0).toLocaleString('en-IN')}` : '-',
          (t.credit ?? 0) > 0 ? `₹${(t.credit ?? 0).toLocaleString('en-IN')}` : '-',
          `₹${(t.balance ?? 0).toLocaleString('en-IN')}`,
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Date', 'Description', 'Category', 'Debit', 'Credit', 'Balance']],
          body: txnData,
          theme: 'grid',
          headStyles: { fillColor: [99, 102, 241] },
          styles: { fontSize: 8 },
          margin: { left: 14, right: 14 },
        });

        if (transactions.length > 100) {
          yPos = (doc as any).lastAutoTable.finalY + 5;
          doc.setFontSize(9);
          doc.setTextColor(100);
          doc.text(`... and ${transactions.length - 100} more transactions`, 14, yPos);
        }
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Page ${i} of ${pageCount} | Generated by Akromeda`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      doc.save(`bank_statement_analysis_${Date.now()}.pdf`);

      toast({
        title: "PDF Report Downloaded",
        description: "Your complete analysis report has been exported to PDF.",
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "Failed to generate PDF report.",
      });
    }
  };

  return (
    <section className="relative py-24 px-6 overflow-hidden bg-[#0A0502]">
      <div className="container mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold">
            See It In
            <span className="bg-gradient-primary bg-clip-text text-transparent"> Action</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Upload, convert, and download in three simple steps
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card className="p-8 md:p-12 bg-[#1a120b]/80 backdrop-blur-xl border border-primary/20 rounded-2xl">
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
              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Upload Zone - Dark Brown Theme */}
              <div 
                onClick={handleUploadClick}
                data-hover
                className={`bg-[#0f0906]/80 border-2 border-primary/20 hover:border-primary/40 rounded-xl p-12 text-center transition-all duration-500 cursor-pointer group relative ${
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
                      {selectedFile ? selectedFile.name : "Drop your bank statement here"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {limitReached 
                        ? "Daily limit reached" 
                        : "or click to browse files • Supports PDF, PNG, JPG"}
                    </p>
                  </div>

                  {/* reCAPTCHA radio button indicator */}
                  <div className="flex items-center justify-center gap-4">
                    <div className="w-8 h-8 rounded-full border-2 border-primary/40 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    </div>
                    
                    <Button 
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-8 py-3 rounded-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUploadClick();
                      }}
                      disabled={uploading || converting || limitReached}
                    >
                      {limitReached ? "Limit Reached" : "Choose File"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* PDF Password Input - Only show when password is required */}
              {selectedFile && showPasswordInput && !limitReached && (
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


              {/* reCAPTCHA for anonymous users - hide after verification */}
              {showRecaptcha && !user && selectedFile && !limitReached && !recaptchaToken && (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-sm text-muted-foreground">
                    Please verify you're human to continue
                  </p>
                  <div id="recaptcha-container" className="flex justify-center" />
                </div>
              )}
              
              {/* Show verified badge briefly */}
              {showRecaptcha && !user && selectedFile && !limitReached && recaptchaToken && (
                <div className="flex justify-center">
                  <p className="text-sm text-green-500 flex items-center gap-2 bg-green-500/10 px-4 py-2 rounded-full">
                    <CheckCircle className="h-4 w-4" />
                    Verified - Ready to convert
                  </p>
                </div>
              )}

              {/* Error Panel with Retry */}
              {lastError && selectedFile && !converting && !uploading && (
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
                        handleConvert();
                      }}
                      disabled={!user && !recaptchaToken}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Try Again
                    </Button>
                  )}
                </div>
              )}

              {/* Convert Button */}
              {selectedFile && !limitReached && !lastError && (
                <div className="text-center">
                  <Button
                    size="lg"
                    className="bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-neon w-full md:w-auto"
                    onClick={handleConvert}
                    disabled={uploading || converting || (!user && !recaptchaToken)}
                  >
                    {uploading || converting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        {uploading ? 'Uploading...' : 'Converting...'}
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-5 w-5" />
                        Convert to Excel
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Download Buttons - Show after conversion */}
              {conversionResult && (
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
                      className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white"
                      onClick={exportAsPDF}
                      disabled={transactions.length === 0 && !analytics}
                    >
                      <FileDown className="mr-2 h-5 w-5" />
                      PDF Report
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
                      onClick={exportAsJSON}
                      disabled={transactions.length === 0}
                    >
                      <FileJson className="mr-2 h-5 w-5" />
                      JSON
                    </Button>
                  </div>
                </div>
              )}

              {/* AI Processing Status Panel */}
              {aiStatus && <AIStatusPanel aiStatus={aiStatus} />}

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
                          className={showDuplicatesOnly ? 'bg-yellow-500/20 border-yellow-500/50' : ''}
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
                    <ScrollArea className="h-[400px]">
                      <Table>
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
                  </Card>
                </div>
              )}

              {/* Process Steps */}
              <div className="grid md:grid-cols-3 gap-6">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/20">
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

                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/20">
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

                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/20">
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

              {/* Supported Languages */}
              <div className="text-center pt-8 border-t border-muted">
                <p className="text-sm text-muted-foreground mb-4">
                  Supports 50+ banks worldwide
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {["English", "Spanish", "French", "German", "Arabic", "Hindi", "Chinese"].map((lang) => (
                    <span 
                      key={lang}
                      className="px-3 py-1 text-xs rounded-full bg-muted/50 text-muted-foreground"
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};
