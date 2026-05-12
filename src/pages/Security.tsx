import { ArrowLeft, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { securitySections } from "@/content/footerPages";
import AutoHideHeader from "@/components/AutoHideHeader";

const Security = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
      <AutoHideHeader as="nav" className="border-b border-primary/20 bg-surface-elevated/80 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Logo />
          <Button variant="ghost" onClick={() => navigate("/")} className="back-pill">
            <ArrowLeft size={18} /> Back to Home
          </Button>
        </div>
      </AutoHideHeader>

      <section className="px-6 pb-14 pt-32">
        <div className="container mx-auto max-w-4xl space-y-5 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-card/60 px-4 py-2 backdrop-blur-lg">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-sm text-foreground/80">Security</span>
          </div>
          <h1 className="text-4xl font-bold md:text-6xl">Security</h1>
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
            This page explains the practical controls around transport security, session handling, retention, and the third-party services used to operate the platform.
          </p>
          <p className="text-sm text-muted-foreground">Last updated: March 27, 2026</p>
        </div>
      </section>

      <section className="px-6 pb-16">
        <div className="container mx-auto max-w-4xl space-y-6">
          {securitySections.map((section) => (
            <div
              key={section.title}
              className="glass-card flex gap-4 rounded-2xl p-6 transition-all hover:shadow-neon"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <section.icon className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-white">{section.title}</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">{section.content}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Security;
