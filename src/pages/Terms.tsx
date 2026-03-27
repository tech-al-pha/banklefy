import { ArrowLeft, Scale } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import SupportContactDialog from "@/components/SupportContactDialog";
import { termsSections } from "@/content/footerPages";

const Terms = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-surface-elevated/80 backdrop-blur-xl border-b border-primary/20">
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Logo />
            <Button variant="ghost" onClick={() => navigate("/")} className="back-pill w-full sm:w-auto">
              <ArrowLeft size={18} /> Back to Home
            </Button>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-14 px-6">
        <div className="container mx-auto max-w-4xl text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/60 backdrop-blur-lg border border-primary/30">
            <Scale className="w-4 h-4 text-primary" />
            <span className="text-sm text-foreground/80">Terms of Service</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold">Terms of Service</h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            These terms describe how Banklefy works, how files are processed, what the service stores,
            and what you are responsible for when using it.
          </p>
          <p className="text-sm text-muted-foreground">Last updated: March 27, 2026</p>
        </div>
      </section>

      <section className="py-10 px-6">
        <div className="container mx-auto max-w-4xl space-y-6">
          {termsSections.map((section, index) => (
            <div
              key={section.title}
              className="bg-surface-elevated/80 backdrop-blur-lg border border-primary/20 rounded-2xl p-8 space-y-4 animate-in fade-in slide-in-from-bottom-5 duration-700"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center flex-shrink-0">
                  <section.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-foreground">{section.title}</h2>
                  <p className="text-muted-foreground leading-relaxed">{section.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 px-6 mb-16">
        <div className="container mx-auto max-w-4xl text-center space-y-6">
          <h2 className="text-3xl font-bold">Questions about these terms?</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Contact support if you need clarification on usage limits, payments, file handling, or account access.
          </p>
          <SupportContactDialog
            source="terms_page"
            trigger={
              <Button size="lg" className="bg-primary text-primary-foreground shadow-neon">
                Contact Support
              </Button>
            }
          />
          <Button size="lg" className="back-pill" onClick={() => navigate("/")}>
            Back to Home
          </Button>
        </div>
      </section>

      <footer className="border-t border-primary/20 py-8 px-6">
        <div className="container mx-auto text-center text-xs text-muted-foreground tracking-[0.2em] uppercase">
          <p>© 2026 Banklefy</p>
        </div>
      </footer>
    </div>
  );
};

export default Terms;
