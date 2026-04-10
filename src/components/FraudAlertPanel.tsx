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
import { formatCurrencyValue } from "@/lib/currency";

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
  currencyCode?: string;
  showEditDetectorSignals?: boolean;
  extractionConfidence?: {
    score: number;
    label: string;
    reasons: string[];
  };
}

const EDIT_DETECTOR_ALERT_TYPES = new Set([
  "PDF_TAMPER",
  "EDITED_PDF",
  "SUSPICIOUS_PRODUCER",
  "UNKNOWN_PRODUCER",
  "INCREMENTAL_UPDATE",
  "METADATA_ANOMALY",
  "ANNOTATIONS_PRESENT",
  "ACROFORM_PRESENT",
  "LAYERS_PRESENT",
  "ACTIVE_CONTENT",
  "FONT_INCONSISTENCY",
  "IMAGE_TEXT_OVERLAY",
  "MIXED_PAGE_TYPES",
  "FUTURE_MOD_DATE",
  "FUTURE_CREATION_DATE",
]);

const severityConfig = {
  low: { 
    bg: 'tone-excellent-bg', 
    border: 'tone-excellent-border', 
    text: 'tone-excellent-text',
    badge: 'tone-excellent-bg tone-excellent-text tone-excellent-border'
  },
  medium: { 
    bg: 'tone-good-bg', 
    border: 'tone-good-border', 
    text: 'tone-good-text',
    badge: 'tone-good-bg tone-good-text tone-good-border'
  },
  high: { 
    bg: 'tone-moderate-bg', 
    border: 'tone-moderate-border', 
    text: 'tone-moderate-text',
    badge: 'tone-moderate-bg tone-moderate-text tone-moderate-border'
  },
  critical: { 
    bg: 'tone-bad-bg', 
    border: 'tone-bad-border', 
    text: 'tone-bad-text',
    badge: 'tone-bad-bg tone-bad-text tone-bad-border'
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
  if (score >= 80) return <ShieldCheck className="w-8 h-8 tone-excellent-text" />;
  if (score >= 60) return <Shield className="w-8 h-8 tone-good-text" />;
  if (score >= 40) return <ShieldAlert className="w-8 h-8 tone-moderate-text" />;
  return <ShieldX className="w-8 h-8 tone-bad-text" />;
};

const getIntegrityColor = (score: number) => {
  if (score >= 80) return 'tone-excellent-text';
  if (score >= 60) return 'tone-good-text';
  if (score >= 40) return 'tone-moderate-text';
  return 'tone-bad-text';
};

const getIntegrityLabel = (score: number) => {
  if (score >= 80) return 'Verified';
  if (score >= 60) return 'Minor Issues';
  if (score >= 40) return 'Suspicious';
  return 'Tamper Alert';
};

export const FraudAlertPanel = ({
  riskAnalysis,
  currencyCode,
  showEditDetectorSignals = true,
  extractionConfidence,
}: FraudAlertPanelProps) => {
  const { integrityScore, fraudAlerts, balanceMismatches, averageDailyBalance, maxDip, riskFlags } = riskAnalysis;
  const visibleAlerts = showEditDetectorSignals
    ? fraudAlerts
    : fraudAlerts.filter((alert) => !EDIT_DETECTOR_ALERT_TYPES.has(alert.type));

  const criticalAlerts = visibleAlerts.filter(a => a.severity === 'critical');
  const highAlerts = visibleAlerts.filter(a => a.severity === 'high');
  const otherAlerts = visibleAlerts.filter(a => a.severity !== 'critical' && a.severity !== 'high');
  const totalRiskFlags = riskFlags.reduce((sum, r) => sum + r.count, 0);

  const toneText = {
    excellent: 'tone-excellent-text',
    good: 'tone-good-text',
    moderate: 'tone-moderate-text',
    bad: 'tone-bad-text',
  } as const;

  const getMismatchTone = (count: number) =>
    count === 0 ? 'excellent' : count <= 2 ? 'good' : count <= 5 ? 'moderate' : 'bad';
  const getRiskTone = (count: number) =>
    count === 0 ? 'excellent' : count <= 2 ? 'good' : count <= 5 ? 'moderate' : 'bad';
  const getAvgBalanceTone = (value: number) =>
    value >= 10000 ? 'excellent' : value > 0 ? 'good' : 'bad';
  const getLowestBalanceTone = (value: number) =>
    value >= 10000 ? 'excellent' : value >= 1000 ? 'good' : value > 0 ? 'moderate' : 'bad';
  const getAlertHeaderTone = () =>
    criticalAlerts.length > 0 ? 'bad' : highAlerts.length > 0 ? 'moderate' : visibleAlerts.length > 0 ? 'good' : 'excellent';

  const balanceTone = getMismatchTone(balanceMismatches);
  const riskTone = getRiskTone(totalRiskFlags);
  const avgBalanceTone = getAvgBalanceTone(averageDailyBalance);
  const lowestBalanceTone = getLowestBalanceTone(maxDip.amount);
  const alertHeaderTone = getAlertHeaderTone();
  const panelTitle = showEditDetectorSignals ? "Document Integrity & Risk Analysis" : "Transaction Risk Analysis";
  const scoreTooltip = showEditDetectorSignals
    ? "100% = No anomalies detected by our checks. Lower scores indicate potential tampering or high-risk activities."
    : "Higher score indicates cleaner transaction consistency and lower financial risk signals.";
  const formatAmount = (
    value: number,
    options?: { minimumFractionDigits?: number; maximumFractionDigits?: number; signDisplay?: 'auto' | 'always' | 'never' },
  ) => formatCurrencyValue(value ?? 0, currencyCode, { ...options, showSymbol: false });

  return (
    <div className="space-y-4">
      {/* Integrity Score Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Shield className={`w-5 h-5 ${getIntegrityColor(integrityScore)}`} />
          {panelTitle}
        </h3>
        <Tooltip>
          <TooltipTrigger className="no-hover-glow">
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
              {scoreTooltip}
            </p>
          </TooltipContent>
        </Tooltip>
      </div>

      {extractionConfidence && (
        <Card className="p-4 !bg-[#191919] border-primary/20">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-white/15 bg-white/5 text-white">
                  {extractionConfidence.label}
                </Badge>
                <span className="text-sm text-muted-foreground">Extraction trust signal</span>
              </div>
              <p className="text-3xl font-bold text-white">{extractionConfidence.score}/100</p>
              <p className="text-sm text-muted-foreground">
                This score blends balance math, low-confidence rows, duplicate signals, and date quality.
              </p>
            </div>

            <div className="grid gap-2 text-sm text-muted-foreground md:max-w-[420px]">
              {extractionConfidence.reasons.slice(0, 4).map((reason) => (
                <div key={reason} className="flex items-start gap-2">
                  {reason.includes("No ") || reason.includes("look consistent") || reason.includes("All extracted") ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 tone-excellent-text" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-4 w-4 tone-moderate-text" />
                  )}
                  <span>{reason}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className={`p-3 !bg-[#191919] ${balanceMismatches > 0 ? 'bg-ink/60 border-border/60' : 'bg-surface-elevated/20 border-border/40'}`}>
          <div className="flex items-center gap-2 text-xs label-muted mb-1">
            {balanceMismatches > 0 ? (
              <XCircle className={`w-3 h-3 ${toneText[balanceTone]}`} />
            ) : (
              <CheckCircle2 className={`w-3 h-3 ${toneText[balanceTone]}`} />
            )}
            Balance Check
          </div>
          <p className={`text-lg font-bold ${toneText[balanceTone]}`}>
            {balanceMismatches > 0 ? `${balanceMismatches} Errors` : 'Passed'}
          </p>
        </Card>

        <Card className="p-3 !bg-[#191919] border-primary/20">
          <div className="flex items-center gap-2 text-xs label-muted mb-1">
            <TrendingDown className={`w-3 h-3 ${toneText[avgBalanceTone]}`} />
            Avg Daily Balance
          </div>
          <p className={`text-lg font-bold ${toneText[avgBalanceTone]}`}>
            {formatAmount(averageDailyBalance, { maximumFractionDigits: 0 })}
          </p>
        </Card>

        <Card className={`p-3 !bg-[#191919] ${maxDip.amount <= 0 ? 'bg-ink/60 border-border/60' : 'bg-muted/30 border-border/30'}`}>
          <div className="flex items-center gap-2 text-xs label-muted mb-1">
            <TrendingDown className={`w-3 h-3 ${toneText[lowestBalanceTone]}`} />
            Lowest Balance
          </div>
          <p className={`text-lg font-bold ${toneText[lowestBalanceTone]}`}>
            {formatAmount(maxDip.amount, { maximumFractionDigits: 0 })}
          </p>
          {maxDip.date && (
            <p className="text-xs text-muted-foreground">{maxDip.date}</p>
          )}
        </Card>

        <Card className={`p-3 !bg-[#191919] ${riskFlags.length > 0 ? 'bg-ink/60 border-border/60' : 'bg-surface-elevated/20 border-border/40'}`}>
          <div className="flex items-center gap-2 text-xs label-muted mb-1">
            <AlertTriangle className={`w-3 h-3 ${toneText[riskTone]}`} />
            Risk Flags
          </div>
          <p className={`text-lg font-bold ${toneText[riskTone]}`}>
            {riskFlags.length > 0 ? totalRiskFlags : 'None'}
          </p>
        </Card>
      </div>

      {/* Fraud Alerts */}
      {visibleAlerts.length > 0 ? (
        <Card className="p-4 !bg-[#191919] border-border/50">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className={`w-5 h-5 ${toneText[alertHeaderTone]}`} />
            <h4 className={`font-semibold ${toneText[alertHeaderTone]}`}>
              {visibleAlerts.length} Alert{visibleAlerts.length !== 1 ? 's' : ''} Detected
            </h4>
          </div>

          <Accordion type="multiple" className="space-y-2">
            {/* Critical alerts first */}
            {criticalAlerts.map((alert, index) => (
              <AccordionItem 
                key={`critical-${index}`} 
                value={`critical-${index}`}
                className={`border rounded-lg px-4 card-hover-glow ${severityConfig.critical.bg} ${severityConfig.critical.border}`}
              >
                <AccordionTrigger className="hover:no-underline py-3 no-hover-glow text-hover-glow">
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
                          {alert.metadata.details.slice(0, 5).map((d, i) => {
                            const expected =
                              d.expected == null
                                ? 'N/A'
                                : formatAmount(d.expected, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                            const actual =
                              d.actual == null
                                ? 'N/A'
                                : formatAmount(d.actual, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                            const diff =
                              d.difference == null
                                ? 'N/A'
                                : formatAmount(d.difference, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                            return (
                              <li key={i} className="text-xs">
                                Row {d.rowIndex + 1}: Expected {expected} but found {actual} (Diff: {diff})
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                    {alert.metadata.transactions && (
                      <div>
                        <p className="text-muted-foreground mb-1">Flagged Transactions:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {alert.metadata.transactions.slice(0, 5).map((t, i) => {
                            const amount =
                              t.amount == null
                                ? 'N/A'
                                : formatAmount(t.amount, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                            return (
                              <li key={i} className="text-xs">
                                {t.date}: {t.description} - {amount}
                              </li>
                            );
                          })}
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
                className={`border rounded-lg px-4 card-hover-glow ${severityConfig.high.bg} ${severityConfig.high.border}`}
              >
                <AccordionTrigger className="hover:no-underline py-3 no-hover-glow text-hover-glow">
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
                          {alert.metadata.details.slice(0, 5).map((d, i) => {
                            const expected =
                              d.expected == null
                                ? 'N/A'
                                : formatAmount(d.expected, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                            const actual =
                              d.actual == null
                                ? 'N/A'
                                : formatAmount(d.actual, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                            return (
                              <li key={i} className="text-xs">
                                Row {d.rowIndex + 1}: Expected {expected}, Found {actual}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                    {alert.metadata.transactions && (
                      <div>
                        <p className="text-muted-foreground mb-1">Detected Activity:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {alert.metadata.transactions.slice(0, 5).map((t, i) => {
                            const amount =
                              t.amount == null
                                ? 'N/A'
                                : formatAmount(t.amount, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                            return (
                              <li key={i} className="text-xs">
                                {t.date}: {t.description} - {amount}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                    {alert.metadata.transferCount && (
                      <p className="text-xs text-muted-foreground">
                        Pattern: {alert.metadata.pattern} | Total: {alert.metadata.totalAmount == null ? 'N/A' : formatAmount(alert.metadata.totalAmount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                className={`border rounded-lg px-4 card-hover-glow ${severityConfig[alert.severity].bg} ${severityConfig[alert.severity].border}`}
              >
                <AccordionTrigger className="hover:no-underline py-3 no-hover-glow text-hover-glow">
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
        <Card className="p-4 !bg-[#191919] border-border/40">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 tone-excellent-text" />
            <div>
              <p className="font-semibold tone-excellent-text">No Anomalies Detected</p>
              <p className="text-sm text-muted-foreground">
                No suspicious financial activity found in this statement.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

