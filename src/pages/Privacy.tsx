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
      <AutoHideHeader as="nav" className="border-b border-primary/20 bg-surface-elevated/80 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-row items-center justify-between gap-3">
            <Logo />
            <Button variant="ghost" onClick={() => navigate("/")} className="back-pill">
              <ArrowLeft size={18} /> Back to Home
            </Button>
          </div>
        </div>
      </AutoHideHeader>

      <section className="px-6 pb-14 pt-32">
        <div className="container mx-auto max-w-4xl text-center space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-card/60 px-4 py-2 backdrop-blur-lg">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-sm text-foreground/80">Privacy Policy</span>
          </div>
          <h1 className="text-4xl font-bold md:text-6xl">Privacy Policy</h1>
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
            This page explains what information Banklefy receives when you use the app, why that information is needed, which service providers help run the platform, and how to contact us for privacy-related requests.
          </p>
          <p className="text-sm text-muted-foreground">Last updated: March 27, 2026</p>
        </div>
      </section>

      <section className="px-6 py-10">
        <div className="container mx-auto max-w-4xl space-y-6">
          {privacySections.map((section, index) => (
            <div
              key={section.title}
              className="animate-in slide-in-from-bottom-5 fade-in space-y-4 rounded-2xl border border-primary/20 bg-surface-elevated/80 p-8 backdrop-blur-lg duration-700"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-primary">
                  <section.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-foreground">{section.title}</h2>
                  <p className="leading-relaxed text-muted-foreground">{section.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-16 px-6 py-16">
        <div className="container mx-auto max-w-4xl text-center space-y-6">
          <h2 className="text-3xl font-bold">Questions about data handling?</h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Use the support form if you need help with a deletion request, account access, or a question about what data is retained and why.
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
            <Button size="lg" className="back-pill" onClick={() => navigate("/about#contact")}>
              About & Contact
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-primary/20 px-6 py-8">
        <div className="container mx-auto text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <p>© 2026 Banklefy</p>
        </div>
      </footer>
    </div>
  );
};

export default Privacy;
