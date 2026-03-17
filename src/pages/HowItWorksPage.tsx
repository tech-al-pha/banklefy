import { ArrowLeft, Upload, Sparkles, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import { useLanguage } from "@/contexts/LanguageContext";

const HowItWorksPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const steps = [
    {
      icon: Upload,
      title: t("howItWorks.step1.title"),
      desc: t("howItWorks.step1.desc"),
    },
    {
      icon: Sparkles,
      title: t("howItWorks.step2.title"),
      desc: t("howItWorks.step2.desc"),
    },
    {
      icon: Download,
      title: t("howItWorks.step3.title"),
      desc: t("howItWorks.step3.desc"),
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

      <section className="pt-32 pb-14 px-6">
        <div className="container mx-auto max-w-4xl text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold">{t("howItWorks.title")}</h1>
          <p className="text-lg text-muted-foreground">{t("howItWorks.subtitle")}</p>
        </div>
      </section>

      <section className="pb-16 px-6">
        <div className="container mx-auto max-w-5xl grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <Card
              key={step.title}
              className="rounded-2xl border border-primary/20 bg-[#141414] p-6 space-y-4"
            >
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <step.icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-white">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
};

export default HowItWorksPage;
