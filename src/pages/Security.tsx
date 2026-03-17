import { ArrowLeft, Shield, Lock, UserCheck, Database, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import { useLanguage } from "@/contexts/LanguageContext";

const Security = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const sections = [
    {
      icon: Database,
      title: t("securityPage.sections.dataHandling.title"),
      desc: t("securityPage.sections.dataHandling.desc"),
    },
    {
      icon: Lock,
      title: t("securityPage.sections.encryption.title"),
      desc: t("securityPage.sections.encryption.desc"),
    },
    {
      icon: UserCheck,
      title: t("securityPage.sections.access.title"),
      desc: t("securityPage.sections.access.desc"),
    },
    {
      icon: Shield,
      title: t("securityPage.sections.retention.title"),
      desc: t("securityPage.sections.retention.desc"),
    },
    {
      icon: AlertTriangle,
      title: t("securityPage.sections.incident.title"),
      desc: t("securityPage.sections.incident.desc"),
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-surface-elevated/80 backdrop-blur-xl border-b border-primary/20">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Logo />
          <Button variant="ghost" onClick={() => navigate("/")} className="back-pill">
            <ArrowLeft size={18} /> {t("common.backToHome")}
          </Button>
        </div>
      </nav>

      <section className="pt-32 pb-10 px-6">
        <div className="container mx-auto max-w-4xl text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/60 backdrop-blur-lg border border-primary/30">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm text-foreground/80">{t("securityPage.badge")}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold">{t("securityPage.title")}</h1>
          <p className="text-lg text-muted-foreground">{t("securityPage.subtitle")}</p>
          <p className="text-xs text-muted-foreground">{t("securityPage.lastUpdated")}</p>
        </div>
      </section>

      <section className="pb-16 px-6">
        <div className="container mx-auto max-w-4xl space-y-6">
          {sections.map((section) => (
            <div
              key={section.title}
              className="rounded-2xl border border-primary/20 bg-[#141414] p-6 flex gap-4"
            >
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <section.icon className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-white">{section.title}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{section.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Security;
