import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  FileSpreadsheet,
  FileText,
  Landmark,
  ShieldCheck,
  Sparkles,
  Table2,
  TrendingDown,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { hasFoirDashboardAccess, hasFraudDetectorAccess } from "@/lib/entitlements";

const baseHighlights = [
  "Transaction summary and cashflow",
  "Category breakdown and trends",
  "Clean, audit-ready formatting",
];

const downloads = [
  {
    label: "Excel (.xlsx)",
    href: "/samples/sample-report.xlsx",
    icon: FileSpreadsheet,
    desc: "Clean spreadsheet output",
  },
  {
    label: "CSV (.csv)",
    href: "/samples/sample-report.csv",
    icon: FileText,
    desc: "Raw table export",
  },
  {
    label: "JSON (.json)",
    href: "/samples/sample-report.json",
    icon: FileText,
    desc: "Structured machine-readable export",
  },
  {
    label: "MT940 (.mt940)",
    href: "/samples/sample-report.mt940",
    icon: FileText,
    desc: "Banking interchange statement format",
  },
  {
    label: "PDF (.pdf)",
    href: "/samples/sample-source.pdf",
    icon: FileText,
    desc: "Original statement sample",
  },
  {
    label: "Tally (.xml)",
    href: "/samples/sample-report.xml",
    icon: FileText,
    desc: "Tally import-ready sample",
  },
];

const upcomingFormats = [
  {
    label: "QuickBooks",
    icon: FileText,
  },
  {
    label: "Xero",
    icon: FileText,
  },
  {
    label: "Zoho",
    icon: FileText,
  },
];

const previewTransactions = [
  {
    date: "02 Jun 2018",
    narration: "GM1TSA/MY0326/19",
    category: "Salary/Income",
    credit: "14,955.00",
    balance: "29,064.95",
  },
  {
    date: "03 Jun 2018",
    narration: "IB BILLPAY DR-HDFCPE...",
    category: "Bills & Utilities",
    debit: "1,285.98",
    balance: "27,778.97",
  },
  {
    date: "05 Jun 2018",
    narration: "EMI 4923306 CHQ S49...",
    category: "Loan/EMI",
    debit: "2,268.00",
    balance: "27,510.97",
  },
];

const exportPreviewCards = [
  {
    label: "XLSX",
    desc: "Structured workbook with ready-to-use sheets",
  },
  {
    label: "CSV",
    desc: "Flat export for bulk imports and review",
  },
  {
    label: "JSON",
    desc: "Machine-readable format for systems and APIs",
  },
  {
    label: "MT940",
    desc: "Banking format for reconciliation workflows",
  },
];

export default function SampleReport() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { planType, tier } = useSubscriptionTier();
  const entitlementInput = {
    planType,
    tier,
    isAuthenticated: !!user,
  };
  const hasFoirAccess = !!user && hasFoirDashboardAccess(entitlementInput);
  const hasFraudAccess = !!user && hasFraudDetectorAccess(entitlementInput);
  const showPremiumLock = !hasFoirAccess && !hasFraudAccess;
  const highlights = [...baseHighlights];

  if (hasFraudAccess) {
    highlights.splice(2, 0, "Risk flags and balance checks");
  } else if (hasFoirAccess) {
    highlights.splice(2, 0, "Loan readiness snapshot");
  }

  return (
    <section className="relative min-h-screen bg-background px-4 py-16 sm:px-6">
      <div className="absolute inset-0 bg-gradient-dark -z-10">
        <div className="absolute inset-0 bg-gradient-glow opacity-40" />
        <div className="absolute -top-10 left-8 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-10 right-8 h-64 w-64 rounded-full bg-secondary/20 blur-3xl" />
      </div>

      <div className="container mx-auto w-full max-w-[1400px]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Button
            variant="ghost"
            className="back-pill"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>

          <div className="rounded-full border border-primary/20 bg-surface-elevated/70 px-4 py-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Samples are ready below
          </div>
        </div>

        <div className="mt-10 grid items-start gap-8 lg:[grid-template-columns:minmax(340px,36vw)_minmax(0,1fr)]">
          <div className="space-y-6 lg:max-w-[520px]">
            <div className="space-y-3">
              <Badge className="bg-primary/15 text-primary border border-primary/30">
                Sample Report
              </Badge>
              <h1 className="max-w-[14ch] text-4xl font-bold leading-tight text-white md:text-5xl xl:text-6xl">
                AI Bank Statement Report
              </h1>
              <p className="text-muted-foreground">
                A preview of the structured Excel-style report users receive after conversion.
              </p>
            </div>

            <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-[#111111] to-[#111111] p-5 backdrop-blur-xl shadow-[0_0_45px_rgba(60,130,255,0.18)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#9AFB3F]">Downloads</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Grab the sample files</h2>
                  <p className="mt-2 text-sm text-white/70">
                    Click any tile below to download the sample outputs and see the format quality.
                  </p>
                </div>
                <Badge className="border border-primary/40 bg-primary/15 text-primary">
                  Ready to download
                </Badge>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-[#9AFB3F]">
                <FileText className="h-4 w-4 text-[#9AFB3F]" />
                <span>Samples are real exports — not mockups.</span>
              </div>
            </Card>

            <div className="grid gap-3 sm:grid-cols-2">
              {downloads.map((file) => (
                <a
                  key={file.href}
                  href={file.href}
                  download
                  className="group rounded-xl border border-white/15 bg-[#141414] p-4 backdrop-blur-xl transition-all duration-300 hover:border-primary/40 hover:shadow-neon"
                >
                  <div className="flex items-center gap-3">
                    <file.icon className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-semibold text-white group-hover:text-white">
                        {file.label}
                      </p>
                      <p className="text-xs text-muted-foreground">{file.desc}</p>
                    </div>
                  </div>
                </a>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {upcomingFormats.map((format) => (
                <div
                  key={format.label}
                  className="rounded-xl border border-white/15 bg-[#141414] p-4 backdrop-blur-xl"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <format.icon className="h-5 w-5 text-primary" />
                      <p className="text-sm font-semibold text-white">{format.label}</p>
                    </div>
                    <Badge className="border border-white/20 bg-white/10 text-white/80">
                      Upcoming
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Temporarily unavailable for sample download.</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <Card className="border-white/20 bg-[#101010] p-5 backdrop-blur-xl">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <Badge className="border border-primary/40 bg-primary/10 text-primary">
                    Premium PDF Report
                  </Badge>
                  <h2 className="text-2xl font-semibold text-white">Client-ready PDF output</h2>
                  <p className="text-sm text-muted-foreground">
                    Polished, shareable reports that match your plan entitlements — no extra noise.
                  </p>
                </div>
                {showPremiumLock && (
                  <Badge className="border border-white/20 bg-white/10 text-white/80">
                    Locked
                  </Badge>
                )}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-[#181818] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">Baseline</p>
                  <p className="mt-2 text-sm font-semibold text-white">Branded cover + audit summary</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#181818] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">Appendix</p>
                  <p className="mt-2 text-sm font-semibold text-white">Transaction tables with clean formatting</p>
                </div>
                {hasFoirAccess && (
                  <div className="rounded-xl border border-white/10 bg-[#181818] p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/50">Loan Ready</p>
                    <p className="mt-2 text-sm font-semibold text-white">FOIR snapshot + monthly cashflow</p>
                  </div>
                )}
                {hasFraudAccess && (
                  <div className="rounded-xl border border-white/10 bg-[#181818] p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/50">Risk Signals</p>
                    <p className="mt-2 text-sm font-semibold text-white">Edited PDF flags + anomaly summary</p>
                  </div>
                )}
                {showPremiumLock && (
                  <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-primary/80">Upgrade</p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      Unlock advanced PDF insights with a paid plan.
                    </p>
                  </div>
                )}
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              {highlights.map((item) => (
                <Card key={item} className="border-white/15 bg-[#171717] p-4 backdrop-blur-xl">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <p className="text-sm text-white/90">{item}</p>
                  </div>
                </Card>
              ))}
            </div>

            {hasFraudAccess && (
              <Card className="border-white/15 bg-[#111111] p-5 backdrop-blur-xl">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 text-xl font-semibold text-white">
                    <ShieldCheck className="h-5 w-5 text-[#9AFB3F]" />
                    <span>Document Integrity & Risk Analysis</span>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-bold text-[#9AFB3F]">65%</p>
                    <p className="text-sm text-[#9AFB3F]">Minor Issues</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-[#181818] p-4">
                    <p className="text-sm text-muted-foreground">Balance Check</p>
                    <p className="mt-1 text-3xl font-semibold text-[#FF4D4D]">16 Errors</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-[#181818] p-4">
                    <p className="text-sm text-muted-foreground">Avg Daily Balance</p>
                    <p className="mt-1 text-3xl font-semibold text-[#53EFA3]">10,532</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-[#181818] p-4">
                    <p className="text-sm text-muted-foreground">Lowest Balance</p>
                    <p className="mt-1 text-3xl font-semibold text-[#9AFB3F]">1,129</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-[#181818] p-4">
                    <p className="text-sm text-muted-foreground">Risk Flags</p>
                    <p className="mt-1 text-3xl font-semibold text-[#53EFA3]">None</p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-500/10 p-4">
                  <div className="flex items-center gap-2 text-amber-400">
                    <AlertTriangle className="h-4 w-4" />
                    <p className="text-sm font-semibold">1 Alert Detected</p>
                  </div>
                  <p className="mt-2 text-base font-semibold text-amber-300">
                    16 transaction(s) have balance discrepancies. Mathematical reconciliation failed.
                  </p>
                </div>

                <div className="mt-5">
                  <h3 className="text-2xl font-semibold text-white">Financial Analytics</h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/10 bg-[#181818] p-4">
                      <p className="text-sm text-muted-foreground">Total Credits</p>
                      <p className="mt-1 text-3xl font-semibold text-[#53EFA3]">1,14,150.39</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-[#181818] p-4">
                      <p className="text-sm text-muted-foreground">Total Debits</p>
                      <p className="mt-1 text-3xl font-semibold text-[#FF4D4D]">2,56,969.40</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-[#181818] p-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <TrendingDown className="h-4 w-4" />
                        <p className="text-sm">Net Flow</p>
                      </div>
                      <p className="mt-1 text-3xl font-semibold text-[#FF4D4D]">-1,42,819.01</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-[#181818] p-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <AlertTriangle className="h-4 w-4" />
                        <p className="text-sm">Duplicates Found</p>
                      </div>
                      <p className="mt-1 text-3xl font-semibold text-amber-400">1</p>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {!hasFraudAccess && hasFoirAccess && (
              <Card className="border-white/15 bg-[#111111] p-5 backdrop-blur-xl">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 text-xl font-semibold text-white">
                    <ShieldCheck className="h-5 w-5 text-[#53EFA3]" />
                    <span>Loan Readiness Snapshot</span>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-bold text-[#53EFA3]">A+</p>
                    <p className="text-sm text-[#53EFA3]">Healthy</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-[#181818] p-4">
                    <p className="text-sm text-muted-foreground">Avg Daily Balance</p>
                    <p className="mt-1 text-3xl font-semibold text-[#53EFA3]">10,532</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-[#181818] p-4">
                    <p className="text-sm text-muted-foreground">Monthly Inflow</p>
                    <p className="mt-1 text-3xl font-semibold text-[#53EFA3]">1,14,150.39</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-[#181818] p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <TrendingDown className="h-4 w-4" />
                      <p className="text-sm">Net Flow</p>
                    </div>
                    <p className="mt-1 text-3xl font-semibold text-[#FF4D4D]">-1,42,819.01</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-[#181818] p-4">
                    <p className="text-sm text-muted-foreground">Lowest Balance</p>
                    <p className="mt-1 text-3xl font-semibold text-[#9AFB3F]">1,129</p>
                  </div>
                </div>
              </Card>
            )}

            <Card className="border-white/15 bg-[#111111] p-5 backdrop-blur-xl">
              <div className="flex flex-wrap gap-2">
                {[
                  "Transfer Out: 18",
                  "Loan/EMI: 18",
                  "Bills & Utilities: 13",
                  "Cash: 12",
                  "Transfer In: 8",
                  "Other: 7",
                  "Shopping: 5",
                  "Salary/Income: 3",
                ].map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-white/20 bg-black/30 px-3 py-1 text-xs text-white/80"
                  >
                    {chip}
                  </span>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-3xl font-semibold text-white">Extracted Transactions</h3>
                <div className="flex items-center gap-3">
                  <span className="rounded-full border border-white/20 px-3 py-1 text-sm text-white/85">
                    Show Duplicates (1)
                  </span>
                  <span className="text-sm text-muted-foreground">85 transactions found</span>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
                <div className="overflow-x-auto">
                <table className="min-w-[760px] w-full text-left text-sm">
                  <thead className="bg-white/5 text-white/75">
                    <tr>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Description</th>
                      <th className="px-4 py-3 font-medium">Category</th>
                      <th className="px-4 py-3 font-medium text-[#FF4D4D]">Debit</th>
                      <th className="px-4 py-3 font-medium text-[#53EFA3]">Credit</th>
                      <th className="px-4 py-3 font-medium">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-white/10">
                      <td className="px-4 py-3 text-white/90">2018-06-02</td>
                      <td className="px-4 py-3 text-white/80">GM1TSA/MY0326/19</td>
                      <td className="px-4 py-3 text-white/80">Salary/Income</td>
                      <td className="px-4 py-3 text-white/80">-</td>
                      <td className="px-4 py-3 text-[#53EFA3]">14,955.00</td>
                      <td className="px-4 py-3 text-white/90">29,064.95</td>
                    </tr>
                    <tr className="border-t border-white/10">
                      <td className="px-4 py-3 text-white/90">2018-06-03</td>
                      <td className="px-4 py-3 text-white/80">IB BILLPAY DR-HDFCPE...</td>
                      <td className="px-4 py-3 text-white/80">Bills & Utilities</td>
                      <td className="px-4 py-3 text-[#FF4D4D]">1,285.98</td>
                      <td className="px-4 py-3 text-white/80">-</td>
                      <td className="px-4 py-3 text-white/90">27,778.97</td>
                    </tr>
                    <tr className="border-t border-white/10">
                      <td className="px-4 py-3 text-white/90">2018-06-04</td>
                      <td className="px-4 py-3 text-white/80">UPI-303702011440904...</td>
                      <td className="px-4 py-3 text-white/80">Transfer In</td>
                      <td className="px-4 py-3 text-white/80">-</td>
                      <td className="px-4 py-3 text-[#53EFA3]">7,000.00</td>
                      <td className="px-4 py-3 text-white/90">29,778.97</td>
                    </tr>
                    <tr className="border-t border-white/10">
                      <td className="px-4 py-3 text-white/90">2018-06-05</td>
                      <td className="px-4 py-3 text-white/80">EMI 4923306 CHQ S49...</td>
                      <td className="px-4 py-3 text-white/80">Loan/EMI</td>
                      <td className="px-4 py-3 text-[#FF4D4D]">2,268.00</td>
                      <td className="px-4 py-3 text-white/80">-</td>
                      <td className="px-4 py-3 text-white/90">27,510.97</td>
                    </tr>
                    <tr className="border-t border-white/10">
                      <td className="px-4 py-3 text-white/90">2018-06-05</td>
                      <td className="px-4 py-3 text-white/80">UPI-303702011440904...</td>
                      <td className="px-4 py-3 text-white/80">Transfer In</td>
                      <td className="px-4 py-3 text-white/80">-</td>
                      <td className="px-4 py-3 text-[#53EFA3]">1,500.00</td>
                      <td className="px-4 py-3 text-white/90">29,010.97</td>
                    </tr>
                  </tbody>
                </table>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
