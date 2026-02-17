import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  Banknote,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  CircleDollarSign,
  Building,
  Car,
  GraduationCap,
  BadgePercent
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatCurrencyValue } from "@/lib/currency";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface SalaryCredit {
  date: string;
  amount: number;
  description: string;
}

interface EMIDebit {
  date: string;
  amount: number;
  description: string;
  loanType: string;
}

interface MonthlyBreakdown {
  month: string;
  salaryIncome: number;
  emiOutflow: number;
}

interface UnderwritingAnalysis {
  tier?: 'basic' | 'pro' | 'advanced';
  tierLabel?: 'Basic' | 'Pro' | 'Advanced';
  salaryCredits: SalaryCredit[];
  emiDebits: EMIDebit[];
  monthlyBreakdown: MonthlyBreakdown[];
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

interface UnderwritingPanelProps {
  underwriting: UnderwritingAnalysis;
  currencyCode?: string;
}

const statusConfig = {
  excellent: { 
    bg: 'tone-excellent-bg', 
    border: 'tone-excellent-border', 
    text: 'tone-excellent-text',
    icon: CheckCircle2,
  },
  good: { 
    bg: 'tone-good-bg', 
    border: 'tone-good-border', 
    text: 'tone-good-text',
    icon: CheckCircle2,
  },
  moderate: { 
    bg: 'tone-moderate-bg', 
    border: 'tone-moderate-border', 
    text: 'tone-moderate-text',
    icon: AlertTriangle,
  },
  poor: { 
    bg: 'tone-moderate-bg', 
    border: 'tone-moderate-border', 
    text: 'tone-moderate-text',
    icon: AlertTriangle,
  },
  ineligible: { 
    bg: 'tone-bad-bg', 
    border: 'tone-bad-border', 
    text: 'tone-bad-text',
    icon: XCircle,
  },
};

const foirColors = {
  excellent: 'tone-excellent-text',
  good: 'tone-good-text',
  moderate: 'tone-moderate-text',
  high: 'tone-bad-text',
};

const loanTypeIcons: Record<string, React.ReactNode> = {
  'Housing': <Building className="w-4 h-4" />,
  'Vehicle': <Car className="w-4 h-4" />,
  'Personal': <Wallet className="w-4 h-4" />,
  'Credit Card': <CreditCard className="w-4 h-4" />,
  'Education': <GraduationCap className="w-4 h-4" />,
  'EMI': <Banknote className="w-4 h-4" />,
  'Unknown': <CircleDollarSign className="w-4 h-4" />,
};

export const UnderwritingPanel = ({ underwriting, currencyCode }: UnderwritingPanelProps) => {
  const underwritingTier = underwriting?.tier ?? 'advanced';
  const underwritingTierLabel = underwriting?.tierLabel ?? (underwritingTier === 'advanced' ? 'Advanced' : underwritingTier === 'pro' ? 'Pro' : 'Basic');
  const showProInsights = underwritingTier !== 'basic';
  const showAdvancedInsights = underwritingTier === 'advanced';

  // Guard against undefined/partial data to prevent toLocaleString crashes
  const summary = underwriting?.summary ?? {
    avgMonthlyIncome: 0,
    avgMonthlyEMI: 0,
    foirScore: 0,
    foirStatus: 'moderate' as const,
    emiByLoanType: {},
    totalSalaryDetected: 0,
    totalEMIDetected: 0,
  };
  const eligibility = underwriting?.eligibility ?? {
    status: 'moderate' as const,
    message: 'Insufficient data to determine eligibility',
    factors: [],
    maxNewEMI: 0,
    estimatedLoanEligibility: 0,
  };
  const salaryCredits = underwriting?.salaryCredits ?? [];
  const emiDebits = underwriting?.emiDebits ?? [];
  const monthlyBreakdown = underwriting?.monthlyBreakdown ?? [];
  const advancedSignals = underwriting?.advancedSignals;

  const StatusIcon = statusConfig[eligibility.status]?.icon ?? statusConfig.moderate.icon;
  
  // Calculate FOIR progress (0-100, where lower is better)
  const foirScore = summary.foirScore ?? 0;
  const foirProgress = Math.min(100, foirScore);
  const foirTone =
    foirScore <= 30 ? 'excellent' :
    foirScore <= 50 ? 'good' :
    foirScore <= 65 ? 'moderate' : 'ineligible';
  const foirProgressColor =
    foirScore <= 30 ? 'tone-excellent-fill' :
    foirScore <= 50 ? 'tone-good-fill' :
    foirScore <= 65 ? 'tone-moderate-fill' : 'tone-bad-fill';
  const incomeTone =
    (summary.avgMonthlyIncome ?? 0) <= 0
      ? 'ineligible'
      : (summary.avgMonthlyEMI ?? 0) <= 0
        ? 'excellent'
        : foirTone;
  const emiTone =
    (summary.avgMonthlyEMI ?? 0) <= 0
      ? 'excellent'
      : foirTone;
  const eligibilityTone =
    eligibility.status === 'excellent'
      ? 'excellent'
      : eligibility.status === 'good'
        ? 'good'
        : eligibility.status === 'moderate'
          ? 'moderate'
          : eligibility.status === 'poor'
            ? 'poor'
            : 'ineligible';
  const formatAmount = (
    value: number,
    options?: { minimumFractionDigits?: number; maximumFractionDigits?: number; signDisplay?: 'auto' | 'always' | 'never' },
  ) => formatCurrencyValue(value ?? 0, currencyCode, { ...options, showSymbol: false });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Wallet className={`w-5 h-5 ${statusConfig[eligibilityTone].text}`} />
          FOIR & Loan Eligibility Analysis
        </h3>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="uppercase tracking-wide border-primary/30 text-primary">
            {underwritingTierLabel}
          </Badge>
          <Badge variant="outline" className={`${statusConfig[eligibility.status].bg} ${statusConfig[eligibility.status].border} ${statusConfig[eligibility.status].text}`}>
            {eligibility.status.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Eligibility Summary Card */}
      <Card className={`p-4 !bg-[#191919] ${statusConfig[eligibility.status].bg} ${statusConfig[eligibility.status].border}`}>
        <div className="flex items-start gap-3">
          <StatusIcon className={`w-6 h-6 ${statusConfig[eligibility.status].text} flex-shrink-0 mt-0.5`} />
          <div className="flex-1">
            <p className={`font-medium ${statusConfig[eligibility.status].text}`}>
              {eligibility.message}
            </p>
            {eligibility.factors.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {eligibility.factors.map((factor, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {factor}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* FOIR Score */}
        <Card className="p-3 !bg-[#191919] card-hover-glow">
          <Tooltip>
            <TooltipTrigger className="w-full text-left no-hover-glow">
              <div className="flex items-center gap-2 text-xs label-muted mb-2">
                <BadgePercent className="w-3 h-3" />
                FOIR Score
              </div>
              <div className="space-y-2">
                <p className={`text-2xl font-bold ${foirColors[summary.foirStatus] ?? ''}`}>
                  {(foirScore ?? 0).toFixed(1)}%
                </p>
                <Progress value={foirProgress} className="h-1.5" />
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-[280px]">
              <p className="font-semibold mb-1">Fixed Obligation to Income Ratio</p>
              <p className="text-sm text-muted-foreground">
                FOIR measures what percentage of your income goes towards EMI payments.
                Ideal FOIR: Below 50%. Excellent: Below 30%.
              </p>
            </TooltipContent>
          </Tooltip>
        </Card>

        {/* Monthly Income */}
        <Card className={`p-3 !bg-[#191919] card-hover-glow ${statusConfig[incomeTone].border}`}>
          <div className="flex items-center gap-2 text-xs label-muted mb-1">
            <TrendingUp className={`w-3 h-3 ${statusConfig[incomeTone].text}`} />
            Avg Monthly Income
          </div>
          <p className={`text-lg font-bold ${statusConfig[incomeTone].text}`}>
            {formatAmount(summary.avgMonthlyIncome ?? 0, { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-muted-foreground">
            {summary.totalSalaryDetected ?? 0} salary credit(s)
          </p>
        </Card>

        {/* Monthly EMI */}
        <Card className={`p-3 !bg-[#191919] card-hover-glow ${statusConfig[emiTone].border}`}>
          <div className="flex items-center gap-2 text-xs label-muted mb-1">
            <TrendingDown className={`w-3 h-3 ${statusConfig[emiTone].text}`} />
            Avg Monthly EMI
          </div>
          <p className={`text-lg font-bold ${statusConfig[emiTone].text}`}>
            {formatAmount(summary.avgMonthlyEMI ?? 0, { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-muted-foreground">
            {summary.totalEMIDetected ?? 0} EMI debit(s)
          </p>
        </Card>

        {/* Loan Eligibility */}
        <Card className={`p-3 !bg-[#191919] card-hover-glow ${statusConfig[eligibilityTone].border}`}>
          <div className="flex items-center gap-2 text-xs label-muted mb-1">
            <CircleDollarSign className={`w-3 h-3 ${statusConfig[eligibilityTone].text}`} />
            Est. Loan Eligibility
          </div>
          <p className={`text-lg font-bold ${statusConfig[eligibilityTone].text}`}>
            {formatAmount(eligibility.estimatedLoanEligibility ?? 0, { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-muted-foreground">
            Max new EMI: {formatAmount(eligibility.maxNewEMI ?? 0)}
          </p>
        </Card>
      </div>

      {/* EMI Breakdown by Loan Type */}
      {showProInsights && Object.keys(summary.emiByLoanType).length > 0 && (
        <Card className="p-4 !bg-[#191919]">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-muted-foreground" />
            EMI Breakdown by Loan Type
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(summary.emiByLoanType).map(([type, data]) => (
              <div 
                key={type} 
                className="flex items-center gap-2 p-2 rounded-lg bg-muted/30"
              >
                <span className="text-muted-foreground">
                  {loanTypeIcons[type] || loanTypeIcons['Unknown']}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{type}</p>
                  <p className="text-xs text-muted-foreground">
                    {data?.count ?? 0}x • {formatAmount(data?.totalAmount ?? 0)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Detailed Breakdown Accordion */}
      <Accordion type="single" collapsible className="space-y-2">
        {/* Salary Credits */}
        {showAdvancedInsights && salaryCredits.length > 0 && (
          <AccordionItem value="salaries" className="border rounded-lg px-4 bg-[#191919] card-hover-glow">
            <AccordionTrigger className="hover:no-underline py-3 no-hover-glow text-hover-glow">
              <div className="flex items-center gap-2">
                <TrendingUp className={`w-4 h-4 ${statusConfig.excellent.text}`} />
                <span>Salary Credits Detected ({salaryCredits.length})</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="space-y-2">
                {salaryCredits.map((s, i) => (
                  <div key={i} className="flex justify-between items-center text-sm p-2 rounded tone-excellent-bg">
                    <div>
                      <p className="font-medium">{s.description}</p>
                      <p className="text-xs text-muted-foreground">{s.date}</p>
                    </div>
                    <p className={`font-medium ${statusConfig.excellent.text}`}>
                      {formatAmount(s.amount ?? 0, { signDisplay: 'always' })}
                    </p>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* EMI Debits */}
        {showAdvancedInsights && emiDebits.length > 0 && (
          <AccordionItem value="emis" className="border rounded-lg px-4 bg-[#191919] card-hover-glow">
            <AccordionTrigger className="hover:no-underline py-3 no-hover-glow text-hover-glow">
              <div className="flex items-center gap-2">
                <TrendingDown className={`w-4 h-4 ${statusConfig[emiTone].text}`} />
                <span>EMI/Loan Debits Detected ({emiDebits.length})</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="space-y-2">
                {emiDebits.map((e, i) => (
                  <div key={i} className={`flex justify-between items-center text-sm p-2 rounded ${statusConfig[emiTone].bg}`}>
                    <div>
                      <p className="font-medium">{e.description}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {e.loanType}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{e.date}</span>
                      </div>
                    </div>
                    <p className={`font-medium ${statusConfig[emiTone].text}`}>
                      {formatAmount(-(e.amount ?? 0), { signDisplay: 'always' })}
                    </p>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Monthly Breakdown */}
        {showProInsights && monthlyBreakdown.length > 0 && (
          <AccordionItem value="monthly" className="border rounded-lg px-4 bg-[#191919] card-hover-glow">
            <AccordionTrigger className="hover:no-underline py-3 no-hover-glow text-hover-glow">
              <div className="flex items-center gap-2">
                <Wallet className={`w-4 h-4 ${statusConfig[incomeTone].text}`} />
                <span>Monthly Income vs EMI ({monthlyBreakdown.length} months)</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="space-y-2">
                {monthlyBreakdown.filter(m => m.salaryIncome > 0 || m.emiOutflow > 0).map((m, i) => (
                  <div key={i} className="flex justify-between items-center text-sm p-2 rounded bg-muted/30">
                    <span className="font-medium">{m.month}</span>
                    <div className="flex items-center gap-4">
                      <span className={statusConfig[incomeTone].text}>
                        {formatAmount(m.salaryIncome ?? 0, { signDisplay: 'always' })}
                      </span>
                      <span className={statusConfig[emiTone].text}>
                        {formatAmount(-(m.emiOutflow ?? 0), { signDisplay: 'always' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      {showAdvancedInsights && advancedSignals && (
        <Card className="p-4 !bg-[#191919] border-primary/20">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-muted-foreground" />
            Advanced Underwriting Signals
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div className="rounded-md bg-muted/30 p-2">
              <p className="label-muted text-xs">Disposable Income</p>
              <p className="font-semibold">{formatAmount(advancedSignals.disposableIncome)}</p>
            </div>
            <div className="rounded-md bg-muted/30 p-2">
              <p className="label-muted text-xs">FOIR Cap</p>
              <p className="font-semibold">{advancedSignals.foirCapPercent}%</p>
            </div>
            <div className="rounded-md bg-muted/30 p-2">
              <p className="label-muted text-xs">EMI Headroom</p>
              <p className="font-semibold">{formatAmount(advancedSignals.availableEMIHeadroom)}</p>
            </div>
            <div className="rounded-md bg-muted/30 p-2">
              <p className="label-muted text-xs">Stress Headroom</p>
              <p className="font-semibold">{formatAmount(advancedSignals.stressAdjustedHeadroom)}</p>
            </div>
            <div className="rounded-md bg-muted/30 p-2">
              <p className="label-muted text-xs">Assumed APR</p>
              <p className="font-semibold">{(advancedSignals.assumedAnnualRate * 100).toFixed(2)}%</p>
            </div>
            <div className="rounded-md bg-muted/30 p-2">
              <p className="label-muted text-xs">Assumed Tenure</p>
              <p className="font-semibold">{advancedSignals.assumedTenureMonths} months</p>
            </div>
          </div>
        </Card>
      )}

      {!showAdvancedInsights && (
        <Card className="p-4 !bg-[#191919] border-primary/20">
          <p className="text-sm text-muted-foreground">
            {underwritingTier === 'basic'
              ? 'Basic tier shows FOIR summary only. Upgrade to Pro/Advanced for deeper EMI trends and transaction-level evidence.'
              : 'Pro tier includes monthly and category-level insights. Upgrade to Advanced for transaction-level salary and EMI evidence.'}
          </p>
        </Card>
      )}

      {/* No Data Message */}
      {showAdvancedInsights && salaryCredits.length === 0 && emiDebits.length === 0 && (
        <Card className="p-4 !bg-[#191919] tone-moderate-border">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 tone-moderate-text" />
            <div>
              <p className="font-medium tone-moderate-text">Limited Financial Data</p>
              <p className="text-sm text-muted-foreground">
                No clear salary or EMI patterns detected. This may affect underwriting accuracy.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

