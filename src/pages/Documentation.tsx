import { ArrowLeft, FileText, Layers, ShieldCheck, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import { useLanguage } from "@/contexts/LanguageContext";

const Documentation = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const sections = [
    {
      icon: FileText,
      title: t("docsPage.sections.gettingStarted.title"),
      desc: t("docsPage.sections.gettingStarted.desc"),
    },
    {
      icon: Layers,
      title: t("docsPage.sections.formats.title"),
      desc: t("docsPage.sections.formats.desc"),
    },
    {
      icon: Gauge,
      title: t("docsPage.sections.limits.title"),
      desc: t("docsPage.sections.limits.desc"),
    },
    {
      icon: ShieldCheck,
      title: t("docsPage.sections.security.title"),
      desc: t("docsPage.sections.security.desc"),
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
            <FileText className="w-4 h-4 text-primary" />
            <span className="text-sm text-foreground/80">{t("docsPage.badge")}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold">{t("docsPage.title")}</h1>
          <p className="text-lg text-muted-foreground">{t("docsPage.subtitle")}</p>
        </div>
      </section>

      <section className="pb-16 px-6">
        <div className="container mx-auto max-w-4xl grid gap-6 md:grid-cols-2">
          {sections.map((section) => (
            <Card
              key={section.title}
              className="rounded-2xl border border-primary/20 bg-[#141414] p-6 space-y-3"
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <section.icon className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold text-white">{section.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{section.desc}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Documentation;
