import { useNavigate } from "react-router-dom";
import { ArrowLeft, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";

const MultiLanguagePost = () => {
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
            <Globe className="h-4 w-4" />
            Multi-Language
          </div>
          <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white">
            Multi-Language Support: Use Banklefy in Your Preferred Language
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground">
            Nov 15, 2025 · 3 min read
          </p>
        </section>

        <article className="space-y-6 text-base sm:text-lg text-muted-foreground leading-relaxed">
          <p>
            Financial tools should speak your language. Banklefy now supports multiple languages
            across the entire interface, making bank statement conversion accessible to users
            across India and beyond.
          </p>

          <h2 className="text-2xl font-bold text-white">Supported languages</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>English, Hindi, Marathi, Gujarati, Tamil, Telugu, Kannada, Bengali, and more.</li>
            <li>UI labels, buttons, tooltips, and error messages are all translated.</li>
            <li>Language preference is saved automatically for returning users.</li>
          </ul>

          <h2 className="text-2xl font-bold text-white">Why it matters for teams</h2>
          <p>
            Accountants and finance staff in regional offices can now use Banklefy without needing
            English proficiency. This reduces onboarding friction and makes the tool usable across
            distributed teams with different language preferences.
          </p>

          <h2 className="text-2xl font-bold text-white">How to switch</h2>
          <p>
            Use the language selector in the navigation bar. Your choice applies instantly across
            all pages — no reload needed.
          </p>
        </article>

        <section className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center">
          <Button className="bg-primary text-primary-foreground shadow-neon" onClick={() => navigate("/")}>
            Try Banklefy
          </Button>
          <Button variant="outline" className="border-primary/40 text-foreground" onClick={() => navigate("/features")}>
            See All Features
          </Button>
        </section>
      </main>
    </div>
  );
};

export default MultiLanguagePost;
