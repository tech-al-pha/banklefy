import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Upload, FileText, CheckCircle, Sparkles, Loader2, Download, FileSpreadsheet, FileJson, AlertTriangle, TrendingUp, TrendingDown, PieChart, ShieldAlert, Lock, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { validateFile, sanitizeFilename } from "@/lib/fileValidation";
import { useNavigate } from "react-router-dom";
import { useUsageLimit } from "@/hooks/useUsageLimit";
import { UsageLimitBanner } from "./UsageLimitBanner";
import { useRecaptcha } from "@/hooks/useRecaptcha";
import { FraudAlertPanel } from "./FraudAlertPanel";
import { UnderwritingPanel } from "./UnderwritingPanel";
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
  const [downloading, setDownloading] = useState(false);
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
  const [pdfPassword, setPdfPassword] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
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
    
    // Show password input for PDF files
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      setShowPasswordInput(true);
    } else {
      setShowPasswordInput(false);
    }
    
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

  const handleConvert = async () => {
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
        // Anonymous user - send file as base64
        const base64Data = await fileToBase64(selectedFile);
        requestBody.fileData = base64Data;
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
      const errorMessage = error.message || '';
      
      // Check if it's a password-related error
      if (errorMessage.toLowerCase().includes('password') || 
          errorMessage.toLowerCase().includes('encrypted') ||
          errorMessage.toLowerCase().includes('protected')) {
        setPasswordError(true);
        toast({
          variant: "destructive",
          title: "Password Required",
          description: "This PDF is password-protected. Please enter the correct password.",
        });
      } else {
        // Reset reCAPTCHA on error so user can try again
        resetRecaptcha();
        toast({
          variant: "destructive",
          title: "Conversion failed",
          description: errorMessage || "An error occurred during conversion.",
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

  return (
    <section className="relative py-24 px-6 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-secondary/20 rounded-full blur-3xl" />

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
          <Card className="p-8 md:p-12 glass-premium lightning-border rounded-2xl">
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

              {/* Upload Zone - Lightning Border Glow Effect */}
              <div 
                onClick={handleUploadClick}
                data-hover
                className={`upload-zone-lightning rounded-xl p-12 text-center transition-all duration-500 cursor-pointer group relative ${
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
                      : 'bg-gradient-to-br from-primary/20 to-primary/10 group-hover:scale-110 group-hover:shadow-neon'
                  }`}>
                    <Upload className={`w-10 h-10 transition-all duration-300 ${
                      limitReached 
                        ? 'text-muted-foreground utility-icon-muted' 
                        : 'text-primary group-hover:text-accent'
                    }`} />
                  </div>
                  
                  <div className="space-y-3">
                    <p className="text-xl font-semibold tracking-wide">
                      {selectedFile ? selectedFile.name : "Drop your bank statement here"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {limitReached 
                        ? "Daily limit reached" 
                        : "or click to browse files • Supports PDF, PNG, JPG"}
                    </p>
                  </div>
                  
                  <Button 
                    className="btn-premium bg-gradient-primary hover:bg-primary/90 text-primary-foreground font-medium px-8 py-3 shadow-neon"
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

              {/* PDF Password Input - Always visible for PDF files */}
              {selectedFile && showPasswordInput && !limitReached && (
                <div className="space-y-4 p-6 bg-muted/10 rounded-xl border-2 border-primary/30">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-lg">
                      <Lock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-primary">PDF Password (optional)</p>
                      <p className="text-xs text-muted-foreground">Enter password if your PDF is protected</p>
                    </div>
                  </div>
                  
                  <Input
                    type="password"
                    placeholder="Enter PDF password..."
                    value={pdfPassword}
                    onChange={(e) => {
                      setPdfPassword(e.target.value);
                      setPasswordError(false);
                    }}
                    className={`bg-background/50 border-2 ${passwordError ? 'border-destructive focus:border-destructive' : 'border-primary/40 focus:border-primary'}`}
                  />
                  
                  {passwordError && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" />
                      Incorrect password. Please try again.
                    </p>
                  )}
                </div>
              )}


              {/* reCAPTCHA for anonymous users */}
              {showRecaptcha && !user && selectedFile && !limitReached && (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-sm text-muted-foreground">
                    Please verify you're human to continue
                  </p>
                  <div id="recaptcha-container" className="flex justify-center" />
                  {recaptchaToken && (
                    <p className="text-sm text-green-500 flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" />
                      Verified
                    </p>
                  )}
                </div>
              )}

              {/* Convert Button */}
              {selectedFile && !limitReached && (
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

              {/* FOIR & Underwriting Analysis Panel */}
              {analytics?.underwriting && (
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
