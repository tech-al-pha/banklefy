import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";

const PasswordPdfPost = () => {
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
            <Lock className="h-4 w-4" />
            PDF Security
          </div>
          <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white">
            Convert Password-Protected Bank Statement PDFs with Ease
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground">
            Dec 5, 2025 · 3 min read
          </p>
        </section>

        <article className="space-y-6 text-base sm:text-lg text-muted-foreground leading-relaxed">
          <p>
            Most banks deliver statements as password-protected PDFs. Previously, you had to
            unlock them manually before conversion. Banklefy now handles this directly — just
            enter the password and convert.
          </p>

          <h2 className="text-2xl font-bold text-white">How it works</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Upload your locked PDF as usual.</li>
            <li>A password field appears automatically when encryption is detected.</li>
            <li>Enter the password, and the statement unlocks and converts in one step.</li>
          </ul>

          <h2 className="text-2xl font-bold text-white">Common password formats</h2>
          <p>
            Indian banks typically use your date of birth (DDMMYYYY), customer ID, or account
            number as the PDF password. Check your bank's email or SMS for the exact format.
          </p>

          <h2 className="text-2xl font-bold text-white">Security</h2>
          <p>
            The password is used only to decrypt the PDF during processing. It is never stored,
            logged, or transmitted beyond the conversion session.
          </p>
        </article>

        <section className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center">
          <Button className="bg-primary text-primary-foreground shadow-neon" onClick={() => navigate("/")}>
            Upload Protected PDF
          </Button>
          <Button variant="outline" className="border-primary/40 text-foreground" onClick={() => navigate("/help")}>
            View Help Center
          </Button>
        </section>
      </main>
    </div>
  );
};

export default PasswordPdfPost;
