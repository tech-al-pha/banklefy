import { ArrowLeft, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import SupportContactDialog from "@/components/SupportContactDialog";
import { privacySections } from "@/content/footerPages";
import AutoHideHeader from "@/components/AutoHideHeader";

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AutoHideHeader as="nav" className="bg-surface-elevated/80 backdrop-blur-xl border-b border-primary/20">
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Logo />
            <Button variant="ghost" onClick={() => navigate("/")} className="back-pill w-full sm:w-auto">
              <ArrowLeft size={18} /> Back to Home
            </Button>
          </div>
        </div>
      </AutoHideHeader>

      <section className="pt-32 pb-14 px-6">
        <div className="container mx-auto max-w-4xl text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/60 backdrop-blur-lg border border-primary/30">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm text-foreground/80">Privacy Policy</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold">Privacy Policy</h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            This policy explains what data Banklefy processes, who receives it when the service runs,
            how long saved data can remain, how cookies are used, and how refunds work for eligible packs.
          </p>
          <p className="text-sm text-muted-foreground">Last updated: March 27, 2026</p>
        </div>
      </section>

      <section className="py-10 px-6">
        <div className="container mx-auto max-w-4xl space-y-6">
          {privacySections.map((section, index) => (
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
          <h2 className="text-3xl font-bold">Questions about data handling?</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Use the support form if you need a deletion request, account help, or clarification about what is stored and for how long.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <SupportContactDialog
              source="privacy_page"
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

export default Privacy;
