import { useNavigate } from "react-router-dom";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import AutoHideHeader from "@/components/AutoHideHeader";

const UnderwritingPost = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AutoHideHeader as="nav" className="border-b border-primary/10 bg-ink/40 backdrop-blur-md p-4">
        <div className="container mx-auto flex flex-row items-center justify-between gap-3">
          <Logo />
          <Button variant="ghost" onClick={() => navigate("/blog")} className="back-pill">
            <ArrowLeft size={18} /> Back to Blog
          </Button>
        </div>
      </AutoHideHeader>

      <main className="container mx-auto px-4 sm:px-6 pt-24 pb-16 sm:pt-28 sm:pb-20 max-w-3xl">
        <section className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-primary">
            <BarChart3 className="h-4 w-4" />
            Risk Analysis
          </div>
          <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white">
            AI-Powered Underwriting &amp; Risk Analysis from Bank Statements
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground">
            Feb 20, 2026 · 5 min read
          </p>
        </section>

        <article className="space-y-6 text-base sm:text-lg text-muted-foreground leading-relaxed">
          <p>
            Beyond converting statements to spreadsheets, Banklefy now generates an underwriting
            summary automatically. Lenders and credit analysts get key financial metrics without
            building formulas manually.
          </p>

          <h2 className="text-2xl font-bold text-white">What the analysis includes</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Average Daily Balance (ADB)</strong> — computed across the full statement period.</li>
            <li><strong>FOIR Score</strong> — Fixed Obligation to Income Ratio based on detected EMIs and salary credits.</li>
            <li><strong>Net Cashflow</strong> — total inflow vs outflow with trend indicators.</li>
            <li><strong>Balance Dip Detection</strong> — highlights the lowest balance point and date.</li>
            <li><strong>Salary &amp; EMI Identification</strong> — auto-categorised recurring credits and debits.</li>
          </ul>

          <h2 className="text-2xl font-bold text-white">How it helps lenders</h2>
          <p>
            Instead of spending 30–45 minutes per applicant manually reviewing transactions, the
            underwriting panel delivers a structured risk snapshot in seconds. This accelerates
            loan decisioning while maintaining accuracy.
          </p>

          <h2 className="text-2xl font-bold text-white">Data integrity</h2>
          <p>
            The analysis runs on the same validated transaction data used for exports. Balance
            mismatches and integrity scores are flagged so reviewers know exactly where to focus.
          </p>
        </article>

        <section className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center">
          <Button className="bg-primary text-primary-foreground shadow-neon" onClick={() => navigate("/")}>
            Try Risk Analysis
          </Button>
          <Button variant="outline" className="border-primary/40 text-foreground" onClick={() => navigate("/sample-report")}>
            View Sample Report
          </Button>
        </section>
      </main>
    </div>
  );
};

export default UnderwritingPost;
