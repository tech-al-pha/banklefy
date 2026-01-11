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
}

interface UnderwritingPanelProps {
  underwriting: UnderwritingAnalysis;
}

const statusConfig = {
  excellent: { 
    bg: 'bg-emerald-500/10', 
    border: 'border-emerald-500/30', 
    text: 'text-emerald-500',
    icon: CheckCircle2,
  },
  good: { 
    bg: 'bg-green-500/10', 
    border: 'border-green-500/30', 
    text: 'text-green-500',
    icon: CheckCircle2,
  },
  moderate: { 
    bg: 'bg-yellow-500/10', 
    border: 'border-yellow-500/30', 
    text: 'text-yellow-500',
    icon: AlertTriangle,
  },
  poor: { 
    bg: 'bg-orange-500/10', 
    border: 'border-orange-500/30', 
    text: 'text-orange-500',
    icon: AlertTriangle,
  },
  ineligible: { 
    bg: 'bg-red-500/10', 
    border: 'border-red-500/30', 
    text: 'text-red-500',
    icon: XCircle,
  },
};

const foirColors = {
  excellent: 'text-emerald-500',
  good: 'text-green-500',
  moderate: 'text-yellow-500',
  high: 'text-red-500',
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

export const UnderwritingPanel = ({ underwriting }: UnderwritingPanelProps) => {
  const { summary, eligibility, salaryCredits, emiDebits, monthlyBreakdown } = underwriting;
  const StatusIcon = statusConfig[eligibility.status].icon;
  
  // Calculate FOIR progress (0-100, where lower is better)
  const foirProgress = Math.min(100, summary.foirScore);
  const foirProgressColor = summary.foirScore <= 30 ? 'bg-emerald-500' : 
                            summary.foirScore <= 50 ? 'bg-green-500' : 
                            summary.foirScore <= 65 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Wallet className="w-5 h-5 text-primary" />
          FOIR & Loan Eligibility Analysis
        </h3>
        <Badge variant="outline" className={`${statusConfig[eligibility.status].bg} ${statusConfig[eligibility.status].border} ${statusConfig[eligibility.status].text}`}>
          {eligibility.status.toUpperCase()}
        </Badge>
      </div>

      {/* Eligibility Summary Card */}
      <Card className={`p-4 ${statusConfig[eligibility.status].bg} ${statusConfig[eligibility.status].border}`}>
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
        <Card className="p-3">
          <Tooltip>
            <TooltipTrigger className="w-full text-left">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <BadgePercent className="w-3 h-3" />
                FOIR Score
              </div>
              <div className="space-y-2">
                <p className={`text-2xl font-bold ${foirColors[summary.foirStatus]}`}>
                  {summary.foirScore.toFixed(1)}%
                </p>
                <Progress 
                  value={foirProgress} 
                  className="h-1.5"
                  // @ts-ignore - custom color
                  indicatorClassName={foirProgressColor}
                />
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
        <Card className="p-3 bg-green-500/5 border-green-500/20">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <TrendingUp className="w-3 h-3 text-green-500" />
            Avg Monthly Income
          </div>
          <p className="text-lg font-bold text-green-500">
            ₹{summary.avgMonthlyIncome.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-muted-foreground">
            {summary.totalSalaryDetected} salary credit(s)
          </p>
        </Card>

        {/* Monthly EMI */}
        <Card className="p-3 bg-orange-500/5 border-orange-500/20">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <TrendingDown className="w-3 h-3 text-orange-500" />
            Avg Monthly EMI
          </div>
          <p className="text-lg font-bold text-orange-500">
            ₹{summary.avgMonthlyEMI.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-muted-foreground">
            {summary.totalEMIDetected} EMI debit(s)
          </p>
        </Card>

        {/* Loan Eligibility */}
        <Card className="p-3 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <CircleDollarSign className="w-3 h-3 text-primary" />
            Est. Loan Eligibility
          </div>
          <p className="text-lg font-bold text-primary">
            ₹{eligibility.estimatedLoanEligibility.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-muted-foreground">
            Max new EMI: ₹{eligibility.maxNewEMI.toLocaleString('en-IN')}
          </p>
        </Card>
      </div>

      {/* EMI Breakdown by Loan Type */}
      {Object.keys(summary.emiByLoanType).length > 0 && (
        <Card className="p-4">
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
                    {data.count}x • ₹{data.totalAmount.toLocaleString('en-IN')}
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
        {salaryCredits.length > 0 && (
          <AccordionItem value="salaries" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span>Salary Credits Detected ({salaryCredits.length})</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="space-y-2">
                {salaryCredits.map((s, i) => (
                  <div key={i} className="flex justify-between items-center text-sm p-2 rounded bg-green-500/5">
                    <div>
                      <p className="font-medium">{s.description}</p>
                      <p className="text-xs text-muted-foreground">{s.date}</p>
                    </div>
                    <p className="font-medium text-green-500">
                      +₹{s.amount.toLocaleString('en-IN')}
                    </p>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* EMI Debits */}
        {emiDebits.length > 0 && (
          <AccordionItem value="emis" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-orange-500" />
                <span>EMI/Loan Debits Detected ({emiDebits.length})</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="space-y-2">
                {emiDebits.map((e, i) => (
                  <div key={i} className="flex justify-between items-center text-sm p-2 rounded bg-orange-500/5">
                    <div>
                      <p className="font-medium">{e.description}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {e.loanType}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{e.date}</span>
                      </div>
                    </div>
                    <p className="font-medium text-orange-500">
                      -₹{e.amount.toLocaleString('en-IN')}
                    </p>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Monthly Breakdown */}
        {monthlyBreakdown.length > 0 && (
          <AccordionItem value="monthly" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary" />
                <span>Monthly Income vs EMI ({monthlyBreakdown.length} months)</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="space-y-2">
                {monthlyBreakdown.filter(m => m.salaryIncome > 0 || m.emiOutflow > 0).map((m, i) => (
                  <div key={i} className="flex justify-between items-center text-sm p-2 rounded bg-muted/30">
                    <span className="font-medium">{m.month}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-green-500">
                        +₹{m.salaryIncome.toLocaleString('en-IN')}
                      </span>
                      <span className="text-orange-500">
                        -₹{m.emiOutflow.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      {/* No Data Message */}
      {salaryCredits.length === 0 && emiDebits.length === 0 && (
        <Card className="p-4 border-yellow-500/20 bg-yellow-500/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            <div>
              <p className="font-medium text-yellow-500">Limited Financial Data</p>
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
