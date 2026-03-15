import { useNavigate } from "react-router-dom";
import { ArrowLeft, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";

const AccuracyPost = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-primary/10 bg-ink/40 backdrop-blur-md p-4">
        <div className="container mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <Button
            variant="ghost"
            onClick={() => navigate("/blog")}
            className="back-pill w-full sm:w-auto"
          >
            <ArrowLeft size={18} /> Back to Blog
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 sm:px-6 pt-24 pb-16 sm:pt-28 sm:pb-20 max-w-3xl">
        <section className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-primary">
            <Target className="h-4 w-4" />
            Accuracy
          </div>
          <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white">
            How We Improve OCR Accuracy on Low-Quality Scans
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground">
            Feb 10, 2026 · 5 min read
          </p>
        </section>

        <article className="space-y-6 text-base sm:text-lg text-muted-foreground leading-relaxed">
          <p>
            Scanned statements can include faint text, shadows, or skewed pages. We focus on minimizing
            these issues so transaction tables still parse correctly.
          </p>

          <h2 className="text-2xl font-bold text-white">What helps accuracy most</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>High-contrast scans with readable table lines.</li>
            <li>Clear column headers and consistent alignment.</li>
            <li>Clean page order without rotated pages.</li>
          </ul>

          <h2 className="text-2xl font-bold text-white">Our OCR safeguards</h2>
          <p>
            When a scan is unavoidable, we validate row-level balances and apply column locking to keep
            debit, credit, and balance values aligned. This reduces shifts that cause mismatches.
          </p>

          <h2 className="text-2xl font-bold text-white">Tips you can use</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Scan at 300 DPI or export the original PDF when possible.</li>
            <li>Remove shadows and glare before upload.</li>
            <li>Keep the statement flat and centered in the frame.</li>
          </ul>
        </article>

        <section className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center">
          <Button className="bg-primary text-primary-foreground shadow-neon" onClick={() => navigate("/")}>
            Try with Your Statement
          </Button>
          <Button variant="outline" className="border-primary/40 text-foreground" onClick={() => navigate("/help#upload-tips")}>
            See Upload Tips
          </Button>
        </section>
      </main>
    </div>
  );
};

export default AccuracyPost;
