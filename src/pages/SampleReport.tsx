import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, FileSpreadsheet, FileText, ShieldCheck, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const highlights = [
  "Transaction summary and cashflow",
  "Category breakdown and trends",
  "Risk flags and balance checks",
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
    label: "DOCX (.docx)",
    href: "/samples/sample-report.docx",
    icon: FileText,
    desc: "Formatted report view",
  },
  {
    label: "ODS (.ods)",
    href: "/samples/sample-report.ods",
    icon: FileSpreadsheet,
    desc: "OpenDocument spreadsheet output",
  },
];

export default function SampleReport() {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen overflow-hidden bg-background px-4 py-16 sm:px-6">
      <div className="absolute inset-0 bg-gradient-dark -z-10">
        <div className="absolute inset-0 bg-gradient-glow opacity-40" />
        <div className="absolute -top-10 left-8 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-10 right-8 h-64 w-64 rounded-full bg-secondary/20 blur-3xl" />
      </div>

      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Button
            variant="ghost"
            className="back-pill"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>

          <Button className="bg-primary text-primary-foreground shadow-neon">
            <Download className="mr-2 h-4 w-4" />
            Download Samples
          </Button>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="space-y-3">
              <Badge className="bg-primary/15 text-primary border border-primary/30">
                Sample Report
              </Badge>
              <h1 className="text-4xl font-bold text-white md:text-5xl">
                AI Bank Statement Report
              </h1>
              <p className="text-muted-foreground">
                A preview of the structured Excel-style report users receive after conversion.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {highlights.map((item) => (
                <Card key={item} className="border-primary/20 bg-surface-elevated/80 p-4 backdrop-blur-xl">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <p className="text-sm text-white/90">{item}</p>
                  </div>
                </Card>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {downloads.map((file) => (
                <a
                  key={file.href}
                  href={file.href}
                  download
                  className="group rounded-xl border border-primary/20 bg-surface-elevated/80 p-4 backdrop-blur-xl transition-all duration-300 hover:border-primary/40 hover:shadow-neon"
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
          </div>

          <Card className="border-primary/20 bg-surface-elevated/80 p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Report Overview
                </p>
                <h2 className="text-2xl font-semibold text-white">Akromeda Statement</h2>
              </div>
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>

            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="rounded-lg border border-primary/20 bg-ink/30 p-3">
                  <p className="text-muted-foreground">Period</p>
                  <p className="text-white">Jan 01 - Jan 31</p>
                </div>
                <div className="rounded-lg border border-primary/20 bg-ink/30 p-3">
                  <p className="text-muted-foreground">Transactions</p>
                  <p className="text-white">142</p>
                </div>
                <div className="rounded-lg border border-primary/20 bg-ink/30 p-3">
                  <p className="text-muted-foreground">Total Credits</p>
                  <p className="text-white">$48,210</p>
                </div>
                <div className="rounded-lg border border-primary/20 bg-ink/30 p-3">
                  <p className="text-muted-foreground">Total Debits</p>
                  <p className="text-white">$41,782</p>
                </div>
              </div>

              <div className="rounded-lg border border-primary/20 bg-ink/30 p-4">
                <p className="text-sm text-muted-foreground">Top Categories</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["Salary", "Transfers", "Utilities", "Shopping", "Subscriptions"].map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-primary/20 bg-ink/30 p-4">
                <p className="text-sm text-muted-foreground">Risk Flags</p>
                <p className="mt-2 text-sm text-white/90">
                  No critical anomalies detected. 2 minor balance mismatches flagged for review.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
