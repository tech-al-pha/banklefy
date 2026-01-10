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

interface FraudAlert {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedRows: number[];
  metadata: Record<string, any>;
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
    bg: 'bg-blue-500/10', 
    border: 'border-blue-500/30', 
    text: 'text-blue-400',
    badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
  },
  medium: { 
    bg: 'bg-yellow-500/10', 
    border: 'border-yellow-500/30', 
    text: 'text-yellow-400',
    badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
  },
  high: { 
    bg: 'bg-orange-500/10', 
    border: 'border-orange-500/30', 
    text: 'text-orange-400',
    badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30'
  },
  critical: { 
    bg: 'bg-red-500/10', 
    border: 'border-red-500/30', 
    text: 'text-red-400',
    badge: 'bg-red-500/20 text-red-400 border-red-500/30'
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
  if (score >= 80) return <ShieldCheck className="w-8 h-8 text-green-500" />;
  if (score >= 60) return <Shield className="w-8 h-8 text-yellow-500" />;
  if (score >= 40) return <ShieldAlert className="w-8 h-8 text-orange-500" />;
  return <ShieldX className="w-8 h-8 text-red-500" />;
};

const getIntegrityColor = (score: number) => {
  if (score >= 80) return 'text-green-500';
  if (score >= 60) return 'text-yellow-500';
  if (score >= 40) return 'text-orange-500';
  return 'text-red-500';
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
              100% = Perfect document integrity with no anomalies detected.
              Lower scores indicate potential tampering or high-risk activities.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className={`p-3 ${balanceMismatches > 0 ? 'bg-red-500/5 border-red-500/20' : 'bg-green-500/5 border-green-500/20'}`}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            {balanceMismatches > 0 ? (
              <XCircle className="w-3 h-3 text-red-500" />
            ) : (
              <CheckCircle2 className="w-3 h-3 text-green-500" />
            )}
            Balance Check
          </div>
          <p className={`text-lg font-bold ${balanceMismatches > 0 ? 'text-red-500' : 'text-green-500'}`}>
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

        <Card className={`p-3 ${maxDip.amount <= 0 ? 'bg-red-500/5 border-red-500/20' : 'bg-muted/30 border-muted'}`}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <TrendingDown className="w-3 h-3" />
            Lowest Balance
          </div>
          <p className={`text-lg font-bold ${maxDip.amount <= 0 ? 'text-red-500' : 'text-foreground'}`}>
            ₹{maxDip.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          {maxDip.date && (
            <p className="text-xs text-muted-foreground">{maxDip.date}</p>
          )}
        </Card>

        <Card className={`p-3 ${riskFlags.length > 0 ? 'bg-orange-500/5 border-orange-500/20' : 'bg-green-500/5 border-green-500/20'}`}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <AlertTriangle className="w-3 h-3" />
            Risk Flags
          </div>
          <p className={`text-lg font-bold ${riskFlags.length > 0 ? 'text-orange-500' : 'text-green-500'}`}>
            {riskFlags.length > 0 ? riskFlags.reduce((sum, r) => sum + r.count, 0) : 'None'}
          </p>
        </Card>
      </div>

      {/* Fraud Alerts */}
      {fraudAlerts.length > 0 ? (
        <Card className="p-4 border-orange-500/20 bg-orange-500/5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <h4 className="font-semibold text-orange-500">
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
                          {alert.metadata.details.slice(0, 5).map((d: any, i: number) => (
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
                          {alert.metadata.transactions.slice(0, 5).map((t: any, i: number) => (
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
                          {alert.metadata.details.slice(0, 5).map((d: any, i: number) => (
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
                          {alert.metadata.transactions.slice(0, 5).map((t: any, i: number) => (
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
        <Card className="p-4 border-green-500/20 bg-green-500/5">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-green-500" />
            <div>
              <p className="font-semibold text-green-500">No Anomalies Detected</p>
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
