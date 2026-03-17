import { ArrowLeft, HelpCircle, Lock, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import { useLanguage } from "@/contexts/LanguageContext";

const Faqs = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const faqs = [
    {
      icon: FileText,
      title: t("faqPage.items.formats.title"),
      desc: t("faqPage.items.formats.desc"),
    },
    {
      icon: Lock,
      title: t("faqPage.items.password.title"),
      desc: t("faqPage.items.password.desc"),
    },
    {
      icon: Clock,
      title: t("faqPage.items.timing.title"),
      desc: t("faqPage.items.timing.desc"),
    },
    {
      icon: HelpCircle,
      title: t("faqPage.items.refund.title"),
      desc: t("faqPage.items.refund.desc"),
    },
    {
      icon: HelpCircle,
      title: t("faqPage.items.storage.title"),
      desc: t("faqPage.items.storage.desc"),
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
            <HelpCircle className="w-4 h-4 text-primary" />
            <span className="text-sm text-foreground/80">{t("faqPage.badge")}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold">{t("faqPage.title")}</h1>
          <p className="text-lg text-muted-foreground">{t("faqPage.subtitle")}</p>
        </div>
      </section>

      <section className="pb-16 px-6">
        <div className="container mx-auto max-w-4xl space-y-5">
          {faqs.map((item) => (
            <Card
              key={item.title}
              className="rounded-2xl border border-primary/20 bg-[#141414] p-6 space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <item.icon className="h-4 w-4" />
                </div>
                <h2 className="text-lg font-semibold text-white">{item.title}</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Faqs;
