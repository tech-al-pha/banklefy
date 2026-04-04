import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import AutoHideHeader from "@/components/AutoHideHeader";

const LaunchPost = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AutoHideHeader as="nav" className="border-b border-primary/10 bg-ink/40 backdrop-blur-md p-4">
        <div className="container mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              variant="ghost"
              onClick={() => navigate("/blog")}
              className="back-pill w-full sm:w-auto"
            >
              <ArrowLeft size={18} /> Back to Blog
            </Button>
          </div>
        </div>
      </AutoHideHeader>

      <main className="container mx-auto px-4 sm:px-6 pt-24 pb-16 sm:pt-28 sm:pb-20 max-w-3xl">
        <section className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-primary">
            <Sparkles className="h-4 w-4" />
            Product Launch
          </div>
          <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white">
            Introducing Banklefy: Bank Statement to Excel in Minutes
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground">
            Feb 12, 2026 · 4 min read
          </p>
        </section>

        <article className="space-y-6 text-base sm:text-lg text-muted-foreground leading-relaxed">
          <p>
            Banklefy was built for finance teams, accountants, and business owners who spend too much time
            retyping bank statements. Our goal is simple: convert statements into clean spreadsheets with
            accuracy you can trust.
          </p>
          <p>
            The platform supports PDFs, scans, and mobile captures, then outputs Excel, CSV, and other
            formats so you can reconcile faster and move on to real work.
          </p>

          <h2 className="text-2xl font-bold text-white">What we focused on</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Reliable extraction for common Indian bank layouts.</li>
            <li>Deterministic parsing for text PDFs to avoid unnecessary OCR.</li>
            <li>Secure processing flow with clear user-controlled access.</li>
          </ul>

          <h2 className="text-2xl font-bold text-white">Who this is for</h2>
          <p>
            If you manage reconciliations, audit trails, or loan reviews, Banklefy removes the manual
            copy-paste work and delivers structured data quickly.
          </p>
        </article>

        <section className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center">
          <Button className="bg-primary text-primary-foreground shadow-neon" onClick={() => navigate("/")}>
            Try the Converter
          </Button>
          <Button variant="outline" className="border-primary/40 text-foreground" onClick={() => navigate("/sample-report")}>
            View Sample Report
          </Button>
        </section>
      </main>
    </div>
  );
};

export default LaunchPost;
