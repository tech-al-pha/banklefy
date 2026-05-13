import { useNavigate } from "react-router-dom";
import { ArrowLeft, PenSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import AutoHideHeader from "@/components/AutoHideHeader";

const posts = [
  {
    id: "multi-language",
    slug: "/blog/multi-language",
    title: "Multi-Language Support",
    date: "Nov 15, 2025",
    summary:
      "Banklefy supports Hindi, Marathi, Tamil, Telugu, and more. The goal is simple: keep the statement conversion flow usable for more users across India.",
  },
  {
    id: "password-pdf",
    slug: "/blog/password-pdf",
    title: "Password-Protected PDFs",
    date: "Dec 5, 2025",
    summary:
      "Locked PDFs can be uploaded directly. Enter the password when prompted and the conversion continues from the same file.",
  },
  {
    id: "multi-format-export",
    slug: "/blog/multi-format-export",
    title: "Multi-Format Export",
    date: "Jan 20, 2026",
    summary:
      "Exports are available in Excel, CSV, JSON, XML, and MT940. That keeps the output useful for different accounting and treasury workflows.",
  },
  {
    id: "bulk-conversion",
    slug: "/blog/bulk-conversion",
    title: "Bulk Conversion",
    date: "Jan 28, 2026",
    summary:
      "Multiple statements can be processed in one session. Text PDFs use the deterministic path first; scanned files use OCR only where needed.",
  },
  {
    id: "privacy",
    slug: "/blog/privacy",
    title: "Privacy Handling",
    date: "Feb 7, 2026",
    summary:
      "Temporary uploads, session-only processing, and browser storage are handled separately so the data flow stays easier to understand.",
  },
  {
    id: "accuracy",
    slug: "/blog/accuracy",
    title: "OCR Accuracy",
    date: "Feb 10, 2026",
    summary:
      "Low-quality scans need cleaner input. The OCR path also checks balances and column alignment to reduce row shifts and missed values.",
  },
  {
    id: "launch",
    slug: "/blog/launch",
    title: "Product Overview",
    date: "Feb 12, 2026",
    summary:
      "Banklefy turns statement PDFs into structured exports for review, reconciliation, and accounting work.",
  },
  {
    id: "underwriting",
    slug: "/blog/underwriting",
    title: "Underwriting and Risk Analysis",
    date: "Feb 20, 2026",
    summary:
      "The app can surface ADB, FOIR, cashflow, and balance-dip signals from converted statements where the plan supports it.",
  },
  {
    id: "fraud-detection",
    slug: "/blog/fraud-detection",
    title: "Fraud Checks",
    date: "Mar 1, 2026",
    summary:
      "Balance continuity, duplicate entries, and formatting inconsistencies are checked to flag suspicious statements early.",
  },
];

const Blog = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AutoHideHeader as="nav" className="border-b border-primary/10 bg-ink/40 backdrop-blur-md p-4">
        <div className="container mx-auto flex flex-row items-center justify-between gap-3">
          <Logo />
          <Button variant="ghost" onClick={() => navigate("/")} className="back-pill">
            <ArrowLeft size={18} /> Back to Home
          </Button>
        </div>
      </AutoHideHeader>

      <main className="container mx-auto max-w-4xl px-4 sm:px-6 pt-24 pb-16 sm:pt-28 sm:pb-20">
        <section className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-primary">
            <PenSquare className="h-4 w-4" />
            Blog
          </div>
          <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white">
            Banklefy Blog
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Short notes about supported formats, conversion behavior, exports, and product updates.
          </p>
        </section>

        <section className="space-y-8">
          {posts.map((post) => (
            <article key={post.id} id={post.id} className="border-b border-primary/10 pb-8 last:border-b-0">
              <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{post.date}</div>
              <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-white">{post.title}</h2>
              <p className="mt-4 text-sm sm:text-base leading-relaxed text-muted-foreground">{post.summary}</p>
              <div className="mt-5">
                <Button variant="outline" className="border-primary/40 text-foreground" onClick={() => navigate(post.slug)}>
                  Read post
                </Button>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
};

export default Blog;
