import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";

const PrivacyPost = () => {
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
            <Shield className="h-4 w-4" />
            Privacy
          </div>
          <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white">
            Privacy by Default: Session-Based Access and Secure Handling
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground">
            Feb 7, 2026 · 4 min read
          </p>
        </section>

        <article className="space-y-6 text-base sm:text-lg text-muted-foreground leading-relaxed">
          <p>
            We built Banklefy to handle sensitive financial data with care. Statements are processed to
            generate your export, and access is tied to your session and download links.
          </p>

          <h2 className="text-2xl font-bold text-white">How access works</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Files are available while your session is active and download links are visible.</li>
            <li>Exports are generated on-demand for your selected format.</li>
            <li>We do not sell or share your statement data.</li>
          </ul>

          <h2 className="text-2xl font-bold text-white">What you can do</h2>
          <p>
            For high‑sensitivity workflows, export the data you need, download it, and close the session
            once you are done. You stay in control of how long access remains available.
          </p>
        </article>

        <section className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center">
          <Button className="bg-primary text-primary-foreground shadow-neon" onClick={() => navigate("/privacy")}>
            Read Privacy Policy
          </Button>
          <Button variant="outline" className="border-primary/40 text-foreground" onClick={() => navigate("/")}>
            Try Banklefy
          </Button>
        </section>
      </main>
    </div>
  );
};

export default PrivacyPost;
