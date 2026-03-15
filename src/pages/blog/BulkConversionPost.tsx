import { useNavigate } from "react-router-dom";
import { ArrowLeft, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";

const BulkConversionPost = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-primary/10 bg-ink/40 backdrop-blur-md p-4">
        <div className="container mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <Button variant="ghost" onClick={() => navigate("/blog")} className="back-pill w-full sm:w-auto">
            <ArrowLeft size={18} /> Back to Blog
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 sm:px-6 pt-24 pb-16 sm:pt-28 sm:pb-20 max-w-3xl">
        <section className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-primary">
            <Layers className="h-4 w-4" />
            Bulk Processing
          </div>
          <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white">
            Bulk Bank Statement Conversion: Process Multiple Files at Once
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground">
            Jan 28, 2026 · 3 min read
          </p>
        </section>

        <article className="space-y-6 text-base sm:text-lg text-muted-foreground leading-relaxed">
          <p>
            Processing one statement at a time works for individuals, but finance teams handling
            dozens of accounts monthly need batch capability. Banklefy now supports uploading and
            converting multiple bank statements in a single session.
          </p>

          <h2 className="text-2xl font-bold text-white">How it works</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Select multiple PDF or image files from your device.</li>
            <li>Each file is processed independently — text PDFs use deterministic parsing, scanned files use AI OCR.</li>
            <li>Results download as individual exports or a combined archive.</li>
          </ul>

          <h2 className="text-2xl font-bold text-white">Built for speed</h2>
          <p>
            Files are processed in parallel where possible. Text-based PDFs complete in seconds,
            while scanned documents run through selective page-level OCR to avoid wasting time on
            pages that don't need it.
          </p>

          <h2 className="text-2xl font-bold text-white">Who benefits</h2>
          <p>
            Loan officers reviewing multiple applicant statements, auditors reconciling client
            accounts, and bookkeepers managing monthly closings all save significant time with
            batch uploads.
          </p>
        </article>

        <section className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center">
          <Button className="bg-primary text-primary-foreground shadow-neon" onClick={() => navigate("/")}>
            Upload Multiple Statements
          </Button>
          <Button variant="outline" className="border-primary/40 text-foreground" onClick={() => navigate("/pricing")}>
            View Plans
          </Button>
        </section>
      </main>
    </div>
  );
};

export default BulkConversionPost;
