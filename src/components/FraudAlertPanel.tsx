import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  ShieldX,
  TrendingDown,
  Repeat,
  Banknote,
  AlertOctagon,
  CheckCircle2,
  XCircle
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FraudAlertDetail {
  rowIndex: number;
  expected?: number;
  actual?: number;
  difference?: number;
}

interface FraudAlertTransaction {
  date?: string;
  description?: string;
  amount?: number;
}

interface FraudAlertMetadata {
  details?: FraudAlertDetail[];
  transactions?: FraudAlertTransaction[];
  transferCount?: number;
  pattern?: string;
  totalAmount?: number;
}

interface FraudAlert {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedRows: number[];
  metadata: FraudAlertMetadata;
}

interface RiskAnalysis {
  integrityScore: number;
  balanceMismatches: number;
  averageDailyBalance: number;
  maxDip: { amount: number; date: string | null };
  maxPeak: number;
  riskFlags: { type: string; count: number }[];
  fraudAlerts: FraudAlert[];
}

interface FraudAlertPanelProps {
  riskAnalysis: RiskAnalysis;
}

const severityConfig = {
  low: { 
    bg: 'bg-surface-elevated/10', 
    border: 'border-border/30', 
    text: 'text-foreground',
    badge: 'bg-surface-elevated/20 text-foreground border-border/30'
  },
  medium: { 
    bg: 'bg-surface-elevated/20', 
    border: 'border-border/40', 
    text: 'text-primary',
    badge: 'bg-surface-elevated/30 text-primary border-border/40'
  },
  high: { 
    bg: 'bg-surface-elevated/30', 
    border: 'border-border/50', 
    text: 'text-primary',
    badge: 'bg-surface-elevated/40 text-primary border-border/50'
  },
  critical: { 
    bg: 'bg-ink/60', 
    border: 'border-border/60', 
    text: 'text-primary',
    badge: 'bg-ink/70 text-primary border-border/60'
  },
};

const alertTypeIcons: Record<string, React.ReactNode> = {
  'BALANCE_INTEGRITY': <ShieldX className="w-5 h-5" />,
  'HIGH_RISK_GAMBLING': <AlertOctagon className="w-5 h-5" />,
  'HIGH_RISK_PAYDAYLOAN': <Banknote className="w-5 h-5" />,
  'HIGH_RISK_BOUNCEDPAYMENT': <XCircle className="w-5 h-5" />,
  'CIRCULAR_TRADING': <Repeat className="w-5 h-5" />,
  'LIQUIDITY_CRISIS': <TrendingDown className="w-5 h-5" />,
};

const getIntegrityIcon = (score: number) => {
  if (score >= 80) return <ShieldCheck className="w-8 h-8 text-primary" />;
  if (score >= 60) return <Shield className="w-8 h-8 text-foreground" />;
  if (score >= 40) return <ShieldAlert className="w-8 h-8 text-muted-foreground" />;
  return <ShieldX className="w-8 h-8 text-muted-foreground" />;
};

const getIntegrityColor = (score: number) => {
  if (score >= 80) return 'text-primary';
  if (score >= 60) return 'text-foreground';
  if (score >= 40) return 'text-muted-foreground';
  return 'text-muted-foreground';
};

const getIntegrityLabel = (score: number) => {
  if (score >= 80) return 'Verified';
  if (score >= 60) return 'Minor Issues';
  if (score >= 40) return 'Suspicious';
  return 'Tamper Alert';
};

export const FraudAlertPanel = ({ riskAnalysis }: FraudAlertPanelProps) => {
  const { integrityScore, fraudAlerts, balanceMismatches, averageDailyBalance, maxDip, riskFlags } = riskAnalysis;
  
  const criticalAlerts = fraudAlerts.filter(a => a.severity === 'critical');
  const highAlerts = fraudAlerts.filter(a => a.severity === 'high');
  const otherAlerts = fraudAlerts.filter(a => a.severity !== 'critical' && a.severity !== 'high');

  return (
    <div className="space-y-4">
      {/* Integrity Score Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Document Integrity & Risk Analysis
        </h3>
        <Tooltip>
          <TooltipTrigger>
            <div className="flex items-center gap-2 cursor-help">
              {getIntegrityIcon(integrityScore)}
              <div className="text-right">
                <p className={`text-2xl font-bold ${getIntegrityColor(integrityScore)}`}>
                  {integrityScore}%
                </p>
                <p className={`text-xs ${getIntegrityColor(integrityScore)}`}>
                  {getIntegrityLabel(integrityScore)}
                </p>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-[300px]">
            <p className="font-semibold mb-1">Integrity Score</p>
            <p className="text-sm text-muted-foreground">
              100% = No anomalies detected by our checks.
              Lower scores indicate potential tampering or high-risk activities.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className={`p-3 ${balanceMismatches > 0 ? 'bg-ink/60 border-border/60' : 'bg-surface-elevated/20 border-border/40'}`}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            {balanceMismatches > 0 ? (
              <XCircle className="w-3 h-3 text-muted-foreground" />
            ) : (
              <CheckCircle2 className="w-3 h-3 text-primary" />
            )}
            Balance Check
          </div>
          <p className={`text-lg font-bold ${balanceMismatches > 0 ? 'text-muted-foreground' : 'text-primary'}`}>
            {balanceMismatches > 0 ? `${balanceMismatches} Errors` : 'Passed'}
          </p>
        </Card>

        <Card className="p-3 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <TrendingDown className="w-3 h-3 text-primary" />
            Avg Daily Balance
          </div>
          <p className="text-lg font-bold text-primary">
            ₹{averageDailyBalance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </Card>

        <Card className={`p-3 ${maxDip.amount <= 0 ? 'bg-ink/60 border-border/60' : 'bg-muted/30 border-border/30'}`}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <TrendingDown className="w-3 h-3" />
            Lowest Balance
          </div>
          <p className={`text-lg font-bold ${maxDip.amount <= 0 ? 'text-muted-foreground' : 'text-foreground'}`}>
            ₹{maxDip.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          {maxDip.date && (
            <p className="text-xs text-muted-foreground">{maxDip.date}</p>
          )}
        </Card>

        <Card className={`p-3 ${riskFlags.length > 0 ? 'bg-ink/60 border-border/60' : 'bg-surface-elevated/20 border-border/40'}`}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <AlertTriangle className="w-3 h-3" />
            Risk Flags
          </div>
          <p className={`text-lg font-bold ${riskFlags.length > 0 ? 'text-muted-foreground' : 'text-primary'}`}>
            {riskFlags.length > 0 ? riskFlags.reduce((sum, r) => sum + r.count, 0) : 'None'}
          </p>
        </Card>
      </div>

      {/* Fraud Alerts */}
      {fraudAlerts.length > 0 ? (
        <Card className="p-4 border-border/50 bg-surface-elevated/15">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-primary" />
            <h4 className="font-semibold text-primary">
              {fraudAlerts.length} Alert{fraudAlerts.length !== 1 ? 's' : ''} Detected
            </h4>
          </div>

          <Accordion type="multiple" className="space-y-2">
            {/* Critical alerts first */}
            {criticalAlerts.map((alert, index) => (
              <AccordionItem 
                key={`critical-${index}`} 
                value={`critical-${index}`}
                className={`border rounded-lg px-4 ${severityConfig.critical.bg} ${severityConfig.critical.border}`}
              >
                <AccordionTrigger className="hover:no-underline py-3">
                  <div className="flex items-center gap-3 text-left">
                    <span className={severityConfig.critical.text}>
                      {alertTypeIcons[alert.type] || <AlertTriangle className="w-5 h-5" />}
                    </span>
                    <div>
                      <p className={`font-medium ${severityConfig.critical.text}`}>
                        {alert.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={severityConfig.critical.badge}>
                          CRITICAL
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {alert.affectedRows.length} row(s) affected
                        </span>
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4">
                  <div className="text-sm space-y-2">
                    {alert.metadata.details && (
                      <div>
                        <p className="text-muted-foreground mb-1">Affected Transactions:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {alert.metadata.details.slice(0, 5).map((d, i) => (
                            <li key={i} className="text-xs">
                              Row {d.rowIndex + 1}: Expected ₹{d.expected?.toFixed(2)} but found ₹{d.actual?.toFixed(2)} (Diff: ₹{d.difference?.toFixed(2)})
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {alert.metadata.transactions && (
                      <div>
                        <p className="text-muted-foreground mb-1">Flagged Transactions:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {alert.metadata.transactions.slice(0, 5).map((t, i) => (
                            <li key={i} className="text-xs">
                              {t.date}: {t.description} - ₹{t.amount?.toLocaleString('en-IN')}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}

            {/* High alerts */}
            {highAlerts.map((alert, index) => (
              <AccordionItem 
                key={`high-${index}`} 
                value={`high-${index}`}
                className={`border rounded-lg px-4 ${severityConfig.high.bg} ${severityConfig.high.border}`}
              >
                <AccordionTrigger className="hover:no-underline py-3">
                  <div className="flex items-center gap-3 text-left">
                    <span className={severityConfig.high.text}>
                      {alertTypeIcons[alert.type] || <AlertTriangle className="w-5 h-5" />}
                    </span>
                    <div>
                      <p className={`font-medium ${severityConfig.high.text}`}>
                        {alert.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={severityConfig.high.badge}>
                          HIGH
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {alert.affectedRows.length} row(s) affected
                        </span>
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4">
                  <div className="text-sm space-y-2">
                    {alert.metadata.details && (
                      <div>
                        <p className="text-muted-foreground mb-1">Balance Mismatches:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {alert.metadata.details.slice(0, 5).map((d, i) => (
                            <li key={i} className="text-xs">
                              Row {d.rowIndex + 1}: Expected ₹{d.expected?.toFixed(2)}, Found ₹{d.actual?.toFixed(2)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {alert.metadata.transactions && (
                      <div>
                        <p className="text-muted-foreground mb-1">Detected Activity:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {alert.metadata.transactions.slice(0, 5).map((t, i) => (
                            <li key={i} className="text-xs">
                              {t.date}: {t.description} - ₹{t.amount?.toLocaleString('en-IN')}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {alert.metadata.transferCount && (
                      <p className="text-xs text-muted-foreground">
                        Pattern: {alert.metadata.pattern} | Total: ₹{alert.metadata.totalAmount?.toLocaleString('en-IN')}
                      </p>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}

            {/* Other alerts */}
            {otherAlerts.map((alert, index) => (
              <AccordionItem 
                key={`other-${index}`} 
                value={`other-${index}`}
                className={`border rounded-lg px-4 ${severityConfig[alert.severity].bg} ${severityConfig[alert.severity].border}`}
              >
                <AccordionTrigger className="hover:no-underline py-3">
                  <div className="flex items-center gap-3 text-left">
                    <span className={severityConfig[alert.severity].text}>
                      {alertTypeIcons[alert.type] || <AlertTriangle className="w-5 h-5" />}
                    </span>
                    <div>
                      <p className={`font-medium ${severityConfig[alert.severity].text}`}>
                        {alert.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={severityConfig[alert.severity].badge}>
                          {alert.severity.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {alert.affectedRows.length} row(s) affected
                        </span>
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4">
                  <p className="text-sm text-muted-foreground">
                    Affected row indices: {alert.affectedRows.slice(0, 10).join(', ')}
                    {alert.affectedRows.length > 10 && ` and ${alert.affectedRows.length - 10} more...`}
                  </p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>
      ) : (
        <Card className="p-4 border-border/40 bg-surface-elevated/15">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-primary" />
            <div>
              <p className="font-semibold text-primary">No Anomalies Detected</p>
              <p className="text-sm text-muted-foreground">
                Document passed all integrity checks. No suspicious activity found.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
