import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertTriangle,
  CheckCircle,
  Crown,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Lock,
  PieChart,
  ShieldAlert,
  ScanSearch,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { UnderwritingPanel } from "@/components/UnderwritingPanel";
import { FraudAlertPanel } from "@/components/FraudAlertPanel";
import { categoryColors, supportedBanks } from "./constants";
import { parseStatementDateToIso } from "@/lib/date-parsing";
import type {
  Analytics,
  MergeInfo,
  Transaction,
} from "./types";

type ToneName = "excellent" | "good" | "moderate" | "bad";

const toneClasses: Record<ToneName, { border: string; text: string }> = {
  excellent: { border: "border-[hsl(var(--tone-excellent-border))]", text: "tone-excellent-text" },
  good: { border: "border-[hsl(var(--tone-good-border))]", text: "tone-good-text" },
  moderate: { border: "border-[hsl(var(--tone-moderate-border))]", text: "tone-moderate-text" },
  bad: { border: "border-[hsl(var(--tone-bad-border))]", text: "tone-bad-text" },
};

const getCreditTone = (totalCredits: number): ToneName => (totalCredits > 0 ? "excellent" : "bad");
const getDebitTone = (totalCredits: number, totalDebits: number): ToneName => {
  if (totalDebits <= 0) return "moderate";
  if (totalCredits <= 0) return "bad";
  const ratio = totalDebits / totalCredits;
  if (ratio <= 0.7) return "good";
  if (ratio <= 1.0) return "moderate";
  return "bad";
};
const getNetFlowTone = (netFlow: number, totalCredits: number): ToneName => {
  if (netFlow > 0) return "excellent";
  if (netFlow === 0) return "moderate";
  if (totalCredits > 0 && Math.abs(netFlow) / totalCredits <= 0.2) return "moderate";
  return "bad";
};

type FormatAmountFn = (
  value: number,
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    signDisplay?: "auto" | "always" | "never";
  },
) => string;

type ResultsSectionProps = {
  batchResults: Array<{ status: "success" | "error" }>;
  batchDownloading: boolean;
  mergeInfo: MergeInfo | null;
  mergeResult: { excelData?: string; resultPath?: string | null; fileName: string } | null;
  mergeDownloading: boolean;
  handleBatchDownload: () => Promise<void>;
  handleMergedDownload: () => Promise<void>;
  conversionResult: { id: string | null; resultPath: string | null; excelData?: string } | null;
  downloading: boolean;
  handleDownload: () => Promise<void>;
  transactions: Transaction[];
  isPaidUser: boolean;
  hasTallyAccess: boolean;
  exportAsCSV: () => Promise<void>;
  handleTallyExport: () => Promise<boolean>;
  handlePremiumExport: (format: "json" | "mt940" | "quickbooks" | "xero" | "zoho" | "tally") => void;
  converting: boolean;
  analytics: Analytics | null;
  currencyCode: string;
  showDuplicatesOnly: boolean;
  setShowDuplicatesOnly: (value: boolean) => void;
  formatAmountNoSymbol: FormatAmountFn;
  truncateDecimals: (value: number, decimals?: number) => number;
  showEditDetectorSignals?: boolean;
  resultMode?: "standard" | "tally_only";
  editedPdfCheckResult?: { fileName: string; status: "clean" | "suspected"; reason: string } | null;
  showUnderwriting?: boolean;
  showFraudSignals?: boolean;
  conversionProgressPercent?: number;
  conversionProgressLabel?: string;
  conversionProgressSubLabel?: string;
  showImageProcessingHint?: boolean;
};

export const ResultsSection = ({
  batchResults,
  batchDownloading,
  mergeInfo,
  mergeResult,
  mergeDownloading,
  handleBatchDownload,
  handleMergedDownload,
  conversionResult,
  downloading,
  handleDownload,
  transactions,
  isPaidUser,
  hasTallyAccess,
  exportAsCSV,
  handleTallyExport,
  handlePremiumExport,
  converting,
  analytics,
  currencyCode,
  showDuplicatesOnly,
  setShowDuplicatesOnly,
  formatAmountNoSymbol,
  truncateDecimals,
  showEditDetectorSignals = true,
  resultMode = "standard",
  editedPdfCheckResult = null,
  showUnderwriting = true,
  showFraudSignals = true,
  conversionProgressPercent = 0,
  conversionProgressLabel = "Processing conversion...",
  conversionProgressSubLabel = "Preparing document...",
  showImageProcessingHint = false,
}: ResultsSectionProps) => {
  const [showPremiumFormats, setShowPremiumFormats] = useState(false);
  const isTallyOnlyMode = resultMode === "tally_only";
  const hasPremiumFormatAccess = isPaidUser || hasTallyAccess;
  const creditTone: ToneName = analytics ? getCreditTone(analytics.totalCredits) : "good";
  const debitTone: ToneName = analytics ? getDebitTone(analytics.totalCredits, analytics.totalDebits) : "moderate";
  const netFlowTone: ToneName = analytics ? getNetFlowTone(analytics.netFlow, analytics.totalCredits) : "moderate";
  const statementMonthCount = new Set(
    transactions
      .map((transaction) => parseStatementDateToIso(transaction.date)?.slice(0, 7))
      .filter((month): month is string => Boolean(month)),
  ).size;
  const lockedFormats: string[] = [];
  if (isTallyOnlyMode && !hasTallyAccess) lockedFormats.push("Tally XML");
  if (!isPaidUser) lockedFormats.push("JSON", "MT940");

  const premiumFormatCards = [
    {
      key: "tally",
      label: "Tally",
      status: "live" as const,
      onClick: () => void handlePremiumExport("tally"),
      className:
        "border-[#6a5b3a]/70 bg-[#211b12] text-[#ead8a7] hover:border-[#8a7650] hover:bg-[#282015]",
    },
    {
      key: "quickbooks",
      label: "QuickBooks",
      status: "live" as const,
      onClick: () => void handlePremiumExport("quickbooks"),
      className:
        "border-[#395947]/70 bg-[#16211b] text-[#c7ddcf] hover:border-[#4b735b] hover:bg-[#1a2821]",
    },
    {
      key: "xero",
      label: "Xero",
      status: "live" as const,
      onClick: () => void handlePremiumExport("xero"),
      className:
        "border-[#365566]/70 bg-[#131f27] text-[#c5d8e4] hover:border-[#496d81] hover:bg-[#182630]",
    },
    {
      key: "zoho",
      label: "Zoho",
      status: "live" as const,
      onClick: () => void handlePremiumExport("zoho"),
      className:
        "border-[#6c5148]/70 bg-[#221815] text-[#e2cbc3] hover:border-[#866258] hover:bg-[#2a1d19]",
    },
  ];

  const renderPremiumFormatsLauncher = () => (
    <div className="flex flex-col items-center gap-3">
      <Button
        size="lg"
        variant="outline"
        onClick={() => hasPremiumFormatAccess && setShowPremiumFormats((current) => !current)}
        disabled={transactions.length === 0}
        className={`min-w-[240px] text-white transition-all ${
          hasPremiumFormatAccess
            ? "border-white/15 bg-[#161616] hover:border-white/25 hover:bg-[#1b1b1b]"
            : "border-sky-300/35 bg-sky-500/10 text-sky-100 hover:border-sky-200/60 hover:bg-sky-500/20"
        }`}
      >
        <FileText className="mr-2 h-5 w-5" />
        Premium Formats
        {!hasPremiumFormatAccess && <Lock className="ml-2 h-4 w-4" />}
      </Button>

      {hasPremiumFormatAccess && showPremiumFormats && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {premiumFormatCards.map((format) => (
            <Button
              key={format.key}
              size="sm"
              variant="outline"
              onClick={format.onClick}
              disabled={format.status !== "live"}
              className={`min-w-[122px] border backdrop-blur-sm ${format.className}`}
            >
              {format.label}
              {format.status !== "live" && (
                <span className="ml-2 rounded-full border border-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.16em] text-white/65">
                  Soon
                </span>
              )}
            </Button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      {batchResults.length > 0 && (
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2 tone-excellent-text">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">
              {isTallyOnlyMode ? "Batch Tally Conversion Complete!" : "Batch Conversion Complete!"}
            </span>
          </div>
          <p className="text-sm font-medium text-muted-foreground">Download options:</p>
          {isTallyOnlyMode ? (
            renderPremiumFormatsLauncher()
          ) : (
            <>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button
                  size="lg"
                  className="excel-button"
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
                    className="excel-button"
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
                  Merge disabled: {mergeInfo.reasons?.join("; ") || "Conditions not met"}
                </p>
              )}
            </>
          )}
          <p className="text-xs text-muted-foreground">
            Successfully converted: {batchResults.filter((r) => r.status === "success").length}/{batchResults.length}
          </p>

          {!isTallyOnlyMode && (
            <>
              <div className="flex flex-wrap gap-2 justify-center pt-2">
                <Button size="sm" variant="outline" onClick={exportAsCSV} disabled={transactions.length === 0} className="csv-button">
                  <FileText className="mr-2 h-4 w-4" />
                  CSV
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePremiumExport("json")}
                  disabled={transactions.length === 0}
                  className={`text-white ${!isPaidUser ? "bg-[#404040] border-[#404040] hover:bg-[#4a4a4a] hover:border-[#4a4a4a]" : ""}`}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  JSON
                  {!isPaidUser && <Lock className="ml-1 h-3 w-3" />}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePremiumExport("mt940")}
                  disabled={transactions.length === 0}
                  className={`text-white ${!isPaidUser ? "bg-[#404040] border-[#404040] hover:bg-[#4a4a4a] hover:border-[#4a4a4a]" : ""}`}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  MT940
                  {!isPaidUser && <Lock className="ml-1 h-3 w-3" />}
                </Button>
              </div>
              {lockedFormats.length > 0 && (
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Crown className="h-3 w-3 text-amber-500" />
                  {lockedFormats.join(", ")} {lockedFormats.length === 1 ? "is" : "are"} plan-gated formats
                </p>
              )}
            </>
          )}
        </div>
      )}

      {conversionResult && batchResults.length === 0 && (
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2 tone-excellent-text">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">
              {isTallyOnlyMode ? "Tally Conversion Complete!" : "Conversion Complete!"}
            </span>
          </div>
          <p className="text-sm font-medium text-muted-foreground">Download your file:</p>
          {isTallyOnlyMode ? (
            renderPremiumFormatsLauncher()
          ) : (
            <>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button size="lg" className="excel-button" onClick={handleDownload} disabled={downloading}>
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
                <Button size="lg" variant="outline" onClick={exportAsCSV} disabled={transactions.length === 0} className="csv-button">
                  <FileText className="mr-2 h-5 w-5" />
                  CSV
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => handlePremiumExport("json")}
                  disabled={transactions.length === 0}
                  className={`text-white ${!isPaidUser ? "bg-[#404040] border-[#404040] hover:bg-[#4a4a4a] hover:border-[#4a4a4a]" : ""}`}
                >
                  <FileText className="mr-2 h-5 w-5" />
                  JSON
                  {!isPaidUser && <Lock className="ml-1 h-4 w-4" />}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => handlePremiumExport("mt940")}
                  disabled={transactions.length === 0}
                  className={`text-white ${!isPaidUser ? "bg-[#404040] border-[#404040] hover:bg-[#4a4a4a] hover:border-[#4a4a4a]" : ""}`}
                >
                  <FileText className="mr-2 h-5 w-5" />
                  MT940
                  {!isPaidUser && <Lock className="ml-1 h-4 w-4" />}
                </Button>
              </div>
              {lockedFormats.length > 0 && (
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Crown className="h-3 w-3 text-amber-500" />
                  {lockedFormats.join(", ")} {lockedFormats.length === 1 ? "is" : "are"} plan-gated formats
                </p>
              )}
            </>
          )}
        </div>
      )}

      {isTallyOnlyMode && showEditDetectorSignals && editedPdfCheckResult && (
        <Card
          className={`p-4 border ${
            editedPdfCheckResult.status === "suspected"
              ? "border-amber-500/40 bg-amber-500/10"
              : "border-emerald-500/35 bg-emerald-500/10"
          }`}
        >
          <div className="flex items-start gap-3">
            {editedPdfCheckResult.status === "suspected" ? (
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-300" />
            ) : (
              <CheckCircle className="mt-0.5 h-5 w-5 text-emerald-300" />
            )}
            <div className="space-y-1 text-left">
              <p className="text-sm font-semibold text-white">
                Edit PDF Check: {editedPdfCheckResult.status === "suspected" ? "Possible edit detected" : "No edit signal detected"}
              </p>
              <p className="text-xs text-white/70">{editedPdfCheckResult.reason}</p>
            </div>
          </div>
        </Card>
      )}

      {converting && (
        <Card className="p-4 bg-[#191919]/80 border border-white/10">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-white">{conversionProgressLabel}</p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, conversionProgressPercent))}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{conversionProgressSubLabel}</p>
          </div>
        </Card>
      )}
      {showUnderwriting && !converting && !isTallyOnlyMode && analytics?.underwriting && (
        <UnderwritingPanel
          underwriting={analytics.underwriting}
          currencyCode={currencyCode}
          statementMonthCount={statementMonthCount}
        />
      )}

      {!isTallyOnlyMode && showFraudSignals && analytics?.riskAnalysis && (
        <FraudAlertPanel
          riskAnalysis={analytics.riskAnalysis}
          currencyCode={currencyCode}
          showEditDetectorSignals={showEditDetectorSignals}
        />
      )}

      {!isTallyOnlyMode && analytics && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <PieChart className="w-5 h-5 text-primary" />
            Financial Analytics
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className={`p-4 !bg-[#191919] ${toneClasses[creditTone].border}`}>
              <div className={`flex items-center gap-2 text-sm mb-1 ${toneClasses[creditTone].text}`}>
                <TrendingUp className={`w-4 h-4 ${toneClasses[creditTone].text}`} />
                Total Credits
              </div>
              <p className={`text-2xl font-bold ${toneClasses[creditTone].text}`}>
                {formatAmountNoSymbol(truncateDecimals(analytics.totalCredits), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </Card>

            <Card className={`p-4 !bg-[#191919] ${toneClasses[debitTone].border}`}>
              <div className={`flex items-center gap-2 text-sm mb-1 ${toneClasses[debitTone].text}`}>
                <TrendingDown className={`w-4 h-4 ${toneClasses[debitTone].text}`} />
                Total Debits
              </div>
              <p className={`text-2xl font-bold ${toneClasses[debitTone].text}`}>
                {formatAmountNoSymbol(truncateDecimals(analytics.totalDebits), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </Card>

            <Card className={`p-4 !bg-[#191919] ${toneClasses[netFlowTone].border}`}>
              <div className={`flex items-center gap-2 text-sm mb-1 ${toneClasses[netFlowTone].text}`}>
                {analytics.netFlow >= 0 ? (
                  <TrendingUp className={`w-4 h-4 ${toneClasses[netFlowTone].text}`} />
                ) : (
                  <TrendingDown className={`w-4 h-4 ${toneClasses[netFlowTone].text}`} />
                )}
                Net Flow
              </div>
              <p className={`text-2xl font-bold ${toneClasses[netFlowTone].text}`}>
                {formatAmountNoSymbol(truncateDecimals(analytics.netFlow), { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: "always" })}
              </p>
            </Card>

            {analytics.duplicateCount > 0 && (
              <Card className="p-4 !bg-[#191919] border-orange-500/30">
                <div className="flex items-center gap-2 text-sm tone-moderate-text mb-1">
                  <AlertTriangle className="w-4 h-4 tone-moderate-text" />
                  Duplicates Found
                </div>
                <p className="text-2xl font-bold tone-moderate-text">{analytics.duplicateCount}</p>
              </Card>
            )}
          </div>

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
                    className={`${categoryColors[category] || categoryColors.Other} border`}
                  >
                    {category}: {data.count}
                  </Badge>
                ))}
            </div>
          </div>
        </div>
      )}

      {!isTallyOnlyMode && transactions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-lg font-semibold">Extracted Transactions</h3>
            <div className="flex items-center gap-3">
              {analytics && analytics.duplicateCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDuplicatesOnly(!showDuplicatesOnly)}
                  className={
                    showDuplicatesOnly
                      ? "bg-surface-elevated/30 border border-surface-elevated/60 shadow-[0_0_10px_rgba(0,0,0,0.18)]"
                      : ""
                  }
                >
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  {showDuplicatesOnly ? "Show All" : `Show Duplicates (${analytics.duplicateCount})`}
                </Button>
              )}
              <span className="text-sm text-muted-foreground">
                {transactions.length} transaction{transactions.length !== 1 ? "s" : ""} found
              </span>
            </div>
          </div>

          <Card className="overflow-hidden !bg-[#191919] border-primary/20">
            <div className="overflow-x-auto">
              <ScrollArea className="h-[400px] min-w-[720px]">
                <Table className="min-w-[720px]">
                  <TableHeader>
                    <TableRow className="bg-[#191919]">
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Description</TableHead>
                      <TableHead className="font-semibold">Category</TableHead>
                      <TableHead className="font-semibold text-right tone-bad-text">Debit</TableHead>
                      <TableHead className="font-semibold text-right tone-excellent-text">Credit</TableHead>
                      <TableHead className="font-semibold text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions
                      .filter((t) => !showDuplicatesOnly || t.isDuplicate)
                      .map((transaction, index) => (
                        <TableRow
                          key={index}
                          className={`${
                            transaction.balanceMismatch
                              ? "bg-red-500/10 border-l-2 border-l-red-500"
                              : showFraudSignals && transaction.riskFlag
                                ? "bg-orange-500/5 border-l-2 border-l-orange-500"
                                : transaction.isDuplicate
                                  ? "bg-yellow-500/5 border-l-2 border-l-yellow-500"
                                  : ""
                          }`}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {transaction.date}
                              {transaction.balanceMismatch && (
                                <Tooltip>
                                  <TooltipTrigger aria-label="Balance mismatch warning">
                                    <ShieldAlert className="w-4 h-4 tone-bad-text" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Balance mismatch! Expected: {transaction.expectedBalance == null ? "N/A" : formatAmountNoSymbol(transaction.expectedBalance, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {showFraudSignals && transaction.riskFlag && !transaction.balanceMismatch && (
                                <Tooltip>
                                  <TooltipTrigger aria-label="Risk flag warning">
                                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                                  </TooltipTrigger>
                                  <TooltipContent>Risk Flag: {transaction.riskFlag}</TooltipContent>
                                </Tooltip>
                              )}
                              {transaction.isDuplicate && !transaction.balanceMismatch && !transaction.riskFlag && (
                                <Tooltip>
                                  <TooltipTrigger aria-label="Potential duplicate warning">
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
                              className={`text-xs ${categoryColors[transaction.category] || categoryColors.Other} border`}
                            >
                              {transaction.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {transaction.debit > 0 ? (
                              <span className="inline-flex items-center justify-end rounded-md tone-bad-bg tone-bad-text px-2 py-0.5 font-semibold tabular-nums">
                                {formatAmountNoSymbol(transaction.debit, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {transaction.credit > 0 ? (
                              <span className="inline-flex items-center justify-end rounded-md tone-excellent-bg tone-excellent-text px-2 py-0.5 font-semibold tabular-nums">
                                {formatAmountNoSymbol(transaction.credit, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className={`text-right ${transaction.balanceMismatch ? "tone-bad-text" : ""}`}>
                            {formatAmountNoSymbol(transaction.balance, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            {transaction.balanceMismatch && transaction.expectedBalance && (
                              <div className="text-xs text-muted-foreground">
                                Expected: {formatAmountNoSymbol(transaction.expectedBalance, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="rounded-xl border border-white/20 bg-[#191919]/70 p-3 shadow-none">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-sky-300" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200">
              Text-based PDFs
            </p>
          </div>
          <p className="mt-2 text-xs leading-5 text-sky-50/75">
            Usually finish faster through deterministic parsing, but very large files still need more validation.
          </p>
        </Card>

        <Card className="rounded-xl border border-sky-500/15 bg-sky-500/[0.06] p-3 shadow-none">
          <div className="flex items-center gap-2">
            <ScanSearch className="h-4 w-4 text-sky-300" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200">
              Scanned / image-based PDFs
            </p>
          </div>
          <p className="mt-2 text-xs leading-5 text-sky-50/75">
            We run deeper OCR checks for cleaner extraction, so these usually take longer.
          </p>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="subtle-border-glow flex items-start gap-3 p-4 rounded-lg bg-[#191919]/70 backdrop-blur-lg border border-white/80">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-sm">1. Upload</p>
            <p className="text-xs text-muted-foreground">Drag & drop your statement</p>
          </div>
        </div>

        <div className="subtle-border-glow flex items-start gap-3 p-4 rounded-lg bg-[#191919]/70 backdrop-blur-lg border border-secondary/20">
          <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
            <div className="w-4 h-4 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-sm">2. AI Processing</p>
            <p className="text-xs text-muted-foreground">Our AI extracts data</p>
          </div>
        </div>

        <div className="subtle-border-glow flex items-start gap-3 p-4 rounded-lg bg-[#191919]/70 backdrop-blur-lg border border-green-500/20">
          <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
            <CheckCircle className="w-4 h-4 tone-excellent-text" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-sm">3. Download</p>
            <p className="text-xs text-muted-foreground">Get your Excel file</p>
          </div>
        </div>
      </div>

      <div className="text-center pt-8 border-t border-muted">
        <p className="text-sm text-muted-foreground mb-4">
          Compatible with most major banks worldwide
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {supportedBanks.map((bank) => (
            <span
              key={bank}
              className="px-3 py-1 text-xs rounded-full bg-muted/50 text-muted-foreground transition-all"
            >
              {bank}
            </span>
          ))}
        </div>
        <p className="mt-4 text-xs uppercase tracking-[0.2em] text-muted-foreground/80">
          Many more...
        </p>
      </div>
    </>
  );
};
