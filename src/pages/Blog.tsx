import { useNavigate } from "react-router-dom";
import { ArrowLeft, PenSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";

const posts = [
  {
    id: "multi-language",
    slug: "/blog/multi-language",
    title: "Multi-Language Support: Use Banklefy in Your Preferred Language",
    date: "Nov 15, 2025",
    excerpt:
      "Banklefy now supports Hindi, Marathi, Tamil, Telugu, and more — making bank statement conversion accessible across India.",
    cta: "Read more",
  },
  {
    id: "password-pdf",
    slug: "/blog/password-pdf",
    title: "Convert Password-Protected Bank Statement PDFs with Ease",
    date: "Dec 5, 2025",
    excerpt:
      "Upload locked PDFs directly, enter the password, and convert in one step — no manual unlocking needed.",
    cta: "Read more",
  },
  {
    id: "multi-format-export",
    slug: "/blog/multi-format-export",
    title: "Multi-Format Export: Excel, CSV, JSON, XML & MT940",
    date: "Jan 20, 2026",
    excerpt:
      "Export bank statements to five formats from a single upload — Excel, CSV, JSON, XML, and MT940 for ERP and treasury systems.",
    cta: "Read more",
  },
  {
    id: "bulk-conversion",
    slug: "/blog/bulk-conversion",
    title: "Bulk Bank Statement Conversion: Process Multiple Files at Once",
    date: "Jan 28, 2026",
    excerpt:
      "Upload and convert multiple bank statements in one session. Text PDFs parse instantly, scanned files use selective AI OCR.",
    cta: "Read more",
  },
  {
    id: "privacy",
    slug: "/blog/privacy",
    title: "Privacy by Default: Secure File Handling and Deletion Control",
    date: "Feb 7, 2026",
    excerpt:
      "A short overview of how Banklefy handles temporary files, saved conversions, and sensitive financial data.",
    cta: "Read more",
  },
  {
    id: "accuracy",
    slug: "/blog/accuracy",
    title: "How We Improve OCR Accuracy on Low-Quality Scans",
    date: "Feb 10, 2026",
    excerpt:
      "Learn practical tips for clearer results, plus the AI checks we run to reduce errors in transaction tables.",
    cta: "Read more",
  },
  {
    id: "launch",
    slug: "/blog/launch",
    title: "Introducing Banklefy: Bank Statement to Excel in Minutes",
    date: "Feb 12, 2026",
    excerpt:
      "Banklefy converts bank statements into clean spreadsheets with AI OCR, built for speed, accuracy, and secure processing.",
    cta: "Read more",
  },
  {
    id: "underwriting",
    slug: "/blog/underwriting",
    title: "AI-Powered Underwriting & Risk Analysis from Bank Statements",
    date: "Feb 20, 2026",
    excerpt:
      "Get ADB, FOIR score, net cashflow, and balance dip analysis automatically from any converted bank statement.",
    cta: "Read more",
  },
  {
    id: "fraud-detection",
    slug: "/blog/fraud-detection",
    title: "Detecting Tampered Bank Statements with AI-Driven Fraud Alerts",
    date: "Mar 1, 2026",
    excerpt:
      "Automated checks for balance continuity, duplicate entries, and formatting inconsistencies flag tampered statements early.",
    cta: "Read more",
  },
];

const Blog = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-primary/10 bg-ink/40 backdrop-blur-md p-4">
        <div className="container mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="back-pill w-full sm:w-auto"
          >
            <ArrowLeft size={18} /> Back to Home
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 sm:px-6 pt-24 pb-16 sm:pt-28 sm:pb-20 max-w-5xl">
        <section className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-primary">
            <PenSquare className="h-4 w-4" />
            Blog
          </div>
          <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white">
            Banklefy Blog
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Updates, tutorials, and product announcements from the Banklefy team.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <Button className="bg-primary text-primary-foreground shadow-neon" onClick={() => navigate("/features")}>
              Explore Features
            </Button>
            <Button variant="outline" className="border-primary/40 text-foreground" onClick={() => navigate("/pricing")}>
              View Pricing
            </Button>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <article
              key={post.id}
              className="glass-card border border-primary/20 rounded-2xl p-6 flex flex-col gap-4"
            >
              <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                {post.date}
              </div>
              <h2 className="text-xl font-bold text-white">{post.title}</h2>
              <p className="text-sm text-muted-foreground">{post.excerpt}</p>
              <Button
                variant="outline"
                className="border-primary/40 text-foreground w-fit mt-auto"
                onClick={() => navigate(post.slug)}
              >
                {post.cta}
              </Button>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
};

export default Blog;
