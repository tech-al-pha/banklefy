import { ArrowLeft, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { securitySections } from "@/content/footerPages";

const Security = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-surface-elevated/80 backdrop-blur-xl border-b border-primary/20">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Logo />
          <Button variant="ghost" onClick={() => navigate("/")} className="back-pill">
            <ArrowLeft size={18} /> Back to Home
          </Button>
        </div>
      </nav>

      <section className="pt-32 pb-14 px-6">
        <div className="container mx-auto max-w-4xl text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/60 backdrop-blur-lg border border-primary/30">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm text-foreground/80">Security</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold">Security</h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            This page explains how Banklefy protects data in transit, how access is controlled, what is retained, and where third-party dependencies are involved.
          </p>
          <p className="text-sm text-muted-foreground">Last updated: March 27, 2026</p>
        </div>
      </section>

      <section className="pb-16 px-6">
        <div className="container mx-auto max-w-4xl space-y-6">
          {securitySections.map((section) => (
            <div
              key={section.title}
              className="rounded-2xl border border-primary/20 bg-[#141414] p-6 flex gap-4"
            >
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <section.icon className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-white">{section.title}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{section.content}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Security;
