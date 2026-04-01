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
  confidenceScore?: number;
  confidenceReasons?: string[];
  lowConfidence?: boolean;
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
  tier?: 'basic' | 'pro' | 'advanced';
  tierLabel?: 'Basic' | 'Pro' | 'Advanced';
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
  advancedSignals?: {
    disposableIncome: number;
    foirCapPercent: number;
    availableEMIHeadroom: number;
    stressAdjustedHeadroom: number;
    assumedAnnualRate: number;
    assumedTenureMonths: number;
  };
}

export interface Analytics {
  totalTransactions: number;
  totalCredits: number;
  totalDebits: number;
  netFlow: number;
  duplicateCount: number;
  categoryBreakdown: Record<string, { count: number; totalDebit: number; totalCredit: number }>;
  confidenceSummary?: { averageScore: number; lowConfidenceCount: number; total: number };
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
  jsonData?: string;
  mt940Data?: string;
  outputMode?: "standard" | "tally_only";
  tallyEnabled?: boolean;
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
  jsonData?: string;
  mt940Data?: string;
  outputMode?: "standard" | "tally_only";
  tallyEnabled?: boolean;
  aiStatus?: AiStatus;
  remaining?: number;
  limitReached?: boolean;
  requiresPassword?: boolean;
  requiresPageImages?: boolean;
  error?: string;
  message?: string;
}

export interface BatchFilePayload {
  fileName: string;
  fileData?: string;
  pdfPageImages?: string[];
  pdfParsedTransactions?: Array<{
    date: string;
    valueDate?: string;
    description: string;
    debit?: number;
    credit?: number;
    balance?: number;
    refNumber?: string;
  }>;
  pdfParsedBankMetadata?: BankInfo;
  pdfPassword?: string;
}

export interface BatchRequestBody {
  files: BatchFilePayload[];
  timezone: string;
  outputMode?: "standard" | "tally_only";
  pdfPassword?: string;
  recaptchaToken?: string;
}
