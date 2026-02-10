import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, BadgeDollarSign, Clock, FileText, LifeBuoy, Lock, Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { useLanguage } from "@/contexts/LanguageContext";

const Help = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  useEffect(() => {
    if (!location.hash) {
      return;
    }
    const targetId = location.hash.replace("#", "");
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location.hash]);

  const helpCards = [
    {
      id: "files",
      icon: FileText,
      title: t("helpPage.sections.files.title"),
      desc: t("footer.help.item1"),
    },
    {
      id: "passwords",
      icon: Lock,
      title: t("helpPage.sections.password.title"),
      desc: t("footer.help.item2"),
    },
    {
      id: "limits",
      icon: Clock,
      title: t("helpPage.sections.limits.title"),
      desc: t("footer.help.item3"),
    },
    {
      id: "accuracy",
      icon: Sparkles,
      title: t("helpPage.sections.accuracy.title"),
      desc: t("footer.help.item4"),
    },
  ];

  return (
    <div className="min-h-screen bg-background text-white font-sans selection:bg-primary/30">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-primary/10 bg-ink/40 backdrop-blur-md p-4">
        <div className="container mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="back-pill w-full sm:w-auto"
          >
            <ArrowLeft size={18} /> {t("common.backToHome")}
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 sm:px-6 pt-24 pb-16 sm:pt-28 sm:pb-20 max-w-6xl">
        <section className="text-center mb-14 animate-in fade-in slide-in-from-bottom-5 duration-700">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-primary">
            <LifeBuoy className="h-4 w-4" />
            {t("footer.helpCenter")}
          </div>
          <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white">
            {t("helpPage.title")}
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("helpPage.subtitle")}
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          {helpCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.id} id={card.id} className="glass-card p-6 rounded-2xl border border-primary/10">
                <div className="flex items-start gap-4">
                  <div className="rounded-full bg-primary/10 p-3 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{card.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{card.desc}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <section
          id="refunds"
          className="mt-10 glass-card p-6 sm:p-8 rounded-2xl border border-primary/10"
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <BadgeDollarSign className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{t("helpPage.sections.refunds.title")}</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {t("helpPage.sections.refunds.desc")}
              </p>
            </div>
          </div>
        </section>

        <section
          id="contact"
          className="mt-10 flex flex-col items-start gap-4 rounded-2xl border border-primary/10 bg-surface/80 p-6 sm:p-8"
        >
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{t("helpPage.sections.contact.title")}</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {t("helpPage.sections.contact.desc")}
              </p>
            </div>
          </div>
          <Button
            className="bg-primary text-primary-foreground shadow-neon"
            asChild
          >
            <a href="mailto:inspirexali@gmail.com">{t("helpPage.cta.contact")}</a>
          </Button>
        </section>
      </main>
    </div>
  );
};

export default Help;
