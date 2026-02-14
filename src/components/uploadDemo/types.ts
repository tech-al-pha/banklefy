export interface Transaction {
  date: string;
  description: string;
  category: string;
  debit: number;
  credit: number;
  balance: number;
  refNumber?: string;
  isDuplicate?: boolean;
  duplicateGroup?: number | null;
  balanceMismatch?: boolean;
  expectedBalance?: number | null;
  riskFlag?: string | null;
  // Legacy fields for backward compatibility
  amount?: number;
  type?: string;
}

export interface FraudAlertDetail {
  rowIndex: number;
  expected?: number;
  actual?: number;
  difference?: number;
}

export interface FraudAlertTransaction {
  date?: string;
  description?: string;
  amount?: number;
}

export interface FraudAlertMetadata {
  details?: FraudAlertDetail[];
  transactions?: FraudAlertTransaction[];
  transferCount?: number;
  pattern?: string;
  totalAmount?: number;
}

export interface FraudAlert {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedRows: number[];
  metadata: FraudAlertMetadata;
}

export interface RiskAnalysis {
  integrityScore: number;
  balanceMismatches: number;
  averageDailyBalance: number;
  maxDip: { amount: number; date: string | null };
  maxPeak: number;
  riskFlags: { type: string; count: number }[];
  fraudAlerts: FraudAlert[];
}

export interface UnderwritingAnalysis {
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

export interface Analytics {
  totalTransactions: number;
  totalCredits: number;
  totalDebits: number;
  netFlow: number;
  duplicateCount: number;
  categoryBreakdown: Record<string, { count: number; totalDebit: number; totalCredit: number }>;
  riskAnalysis?: RiskAnalysis;
  underwriting?: UnderwritingAnalysis;
}

export type AiStatus = {
  groqVision?: { success: boolean; time?: number; error?: string };
  groqText?: { success: boolean; time?: number; error?: string };
  mistral?: { success: boolean; time?: number; error?: string };
  gemini?: { success: boolean; time?: number; error?: string };
  lovable?: { success: boolean; time?: number; error?: string };
  patternFallback?: { success: boolean; time?: number; error?: string };
};

export interface BankInfo {
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  currency?: string;
  iban?: string;
  ifsc?: string;
  swift?: string;
  routingNumber?: string;
  sortCode?: string;
  bsb?: string;
  micr?: string;
  statementPeriod?: string;
  openingBalance?: number;
  closingBalance?: number;
}

export interface MultiStatementResult {
  fileName: string;
  excelData?: string;
  resultPath?: string | null;
  totals?: { totalCredits: number; totalDebits: number };
  bankInfo?: BankInfo;
}

export interface MergeTotals {
  totalDebit: number;
  totalCredit: number;
  finalBalance: number | null;
}

export interface MergeInfo {
  available: boolean;
  reasons: string[];
  statementPeriod?: string;
  duplicatesRemoved?: number;
  totals?: MergeTotals;
  excelData?: string;
  resultPath?: string | null;
  fileName?: string;
}

export interface MultiConversionResponse {
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
  bankInfo?: BankInfo;
  error?: string;
  message?: string;
  limitReached?: boolean;
  requiresPassword?: boolean;
}

export interface ConversionResponse {
  conversionId?: string | null;
  resultPath?: string | null;
  excelData?: string;
  transactions?: Transaction[];
  analytics?: Analytics;
  bankInfo?: BankInfo;
  aiStatus?: AiStatus;
  remaining?: number;
  limitReached?: boolean;
  requiresPassword?: boolean;
  error?: string;
  message?: string;
}

export interface BatchFilePayload {
  fileName: string;
  fileId?: string;
  fileData?: string;
  pdfPageImages?: string[];
  pdfPassword?: string;
}

export interface BatchRequestBody {
  files: BatchFilePayload[];
  timezone: string;
  pdfPassword?: string;
  recaptchaToken?: string;
}
