import { ArrowLeft, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import { useLanguage } from "@/contexts/LanguageContext";
import SupportContactDialog from "@/components/SupportContactDialog";

const CONTACT_EMAIL = "banklefy@gmail.com";

const Contact = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

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

      <section className="pt-32 pb-12 px-6">
        <div className="container mx-auto max-w-4xl text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/60 backdrop-blur-lg border border-primary/30">
            <Mail className="w-4 h-4 text-primary" />
            <span className="text-sm text-foreground/80">{t("contactPage.badge")}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold">{t("contactPage.title")}</h1>
          <p className="text-lg text-muted-foreground">{t("contactPage.subtitle")}</p>
          <p className="text-xs text-muted-foreground">{t("contactPage.responseNote")}</p>
        </div>
      </section>

      <section className="pb-16 px-6">
        <div className="container mx-auto max-w-3xl grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-primary/20 bg-[#141414] p-6 space-y-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <MessageCircle className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-white">{t("contactPage.support.title")}</h2>
            <p className="text-sm text-muted-foreground">{t("contactPage.support.desc")}</p>
            <SupportContactDialog
              source="contact_page"
              trigger={
                <Button className="bg-primary text-primary-foreground shadow-neon">
                  {t("contactPage.support.button")}
                </Button>
              }
            />
          </div>

          <div className="rounded-2xl border border-primary/20 bg-[#141414] p-6 space-y-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Mail className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-white">{t("contactPage.email.title")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("contactPage.email.desc")}{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="underline underline-offset-4 text-primary"
              >
                {CONTACT_EMAIL}
              </a>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
