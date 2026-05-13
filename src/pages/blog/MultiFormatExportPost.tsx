import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import AutoHideHeader from "@/components/AutoHideHeader";

const MultiFormatExportPost = () => {
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
            <FileSpreadsheet className="h-4 w-4" />
            Export Formats
          </div>
          <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white">
            Multi-Format Export: Excel, CSV, JSON, XML &amp; MT940
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground">
            Jan 20, 2026 · 4 min read
          </p>
        </section>

        <article className="space-y-6 text-base sm:text-lg text-muted-foreground leading-relaxed">
          <p>
            Different teams need different formats. Accountants prefer Excel with formulas intact, ERPs
            ingest CSV or XML, and banking systems expect MT940. Banklefy now exports all five from a
            single upload.
          </p>

          <h2 className="text-2xl font-bold text-white">Supported formats</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Excel (.xlsx)</strong> — formatted sheets with headers, auto-widths, and balance columns.</li>
            <li><strong>CSV</strong> — lightweight, universal, ready for any spreadsheet app or database import.</li>
            <li><strong>JSON</strong> — structured data for developers building reconciliation pipelines.</li>
            <li><strong>XML</strong> — schema-friendly output for ERP and compliance integrations.</li>
            <li><strong>MT940 (SWIFT)</strong> — industry-standard banking format for treasury and payment systems.</li>
          </ul>

          <h2 className="text-2xl font-bold text-white">Why this matters</h2>
          <p>
            Instead of converting a PDF, exporting to Excel, then manually reformatting for your ERP,
            you select the target format upfront. The output is structured and validated, saving hours
            of manual cleanup every month.
          </p>
        </article>

        <section className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center">
          <Button className="bg-primary text-primary-foreground shadow-neon" onClick={() => navigate("/")}>
            Try the Converter
          </Button>
          <Button variant="outline" className="border-primary/40 text-foreground" onClick={() => navigate("/features")}>
            See All Features
          </Button>
        </section>
      </main>
    </div>
  );
};

export default MultiFormatExportPost;
