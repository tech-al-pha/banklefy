import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import AutoHideHeader from "@/components/AutoHideHeader";

const FraudDetectionPost = () => {
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
            <ShieldAlert className="h-4 w-4" />
            Fraud Detection
          </div>
          <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white">
            Detecting Tampered Bank Statements with AI-Driven Fraud Alerts
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground">
            Mar 1, 2026 · 4 min read
          </p>
        </section>

        <article className="space-y-6 text-base sm:text-lg text-muted-foreground leading-relaxed">
          <p>
            Fraudulent bank statements cost lenders and businesses millions every year. Banklefy
            now includes automated fraud detection that flags suspicious patterns during conversion,
            giving reviewers an early warning before they rely on the data.
          </p>

          <h2 className="text-2xl font-bold text-white">What we check</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Balance continuity</strong> — closing balance of one day must match the opening of the next.</li>
            <li><strong>Round-number patterns</strong> — unusual clusters of perfectly round transactions.</li>
            <li><strong>Font &amp; formatting inconsistencies</strong> — detected during OCR where text layers differ.</li>
            <li><strong>Duplicate entries</strong> — identical transactions repeated across pages or dates.</li>
            <li><strong>Gap detection</strong> — missing date ranges that suggest pages were removed.</li>
          </ul>

          <h2 className="text-2xl font-bold text-white">Severity levels</h2>
          <p>
            Each alert is classified as low, medium, high, or critical severity. Critical alerts
            (like balance discontinuity across pages) surface immediately so reviewers can decide
            whether to proceed or request original documents.
          </p>

          <h2 className="text-2xl font-bold text-white">Built for trust</h2>
          <p>
            Fraud alerts don't block the conversion — they inform it. The exported data includes
            an integrity score and flag summary, so downstream teams have full context when making
            credit or compliance decisions.
          </p>
        </article>

        <section className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center">
          <Button className="bg-primary text-primary-foreground shadow-neon" onClick={() => navigate("/")}>
            Upload a Statement
          </Button>
          <Button variant="outline" className="border-primary/40 text-foreground" onClick={() => navigate("/features")}>
            See All Features
          </Button>
        </section>
      </main>
    </div>
  );
};

export default FraudDetectionPost;
