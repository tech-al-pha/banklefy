import { Button } from "@/components/ui/button";
import { Shield, Lock, Eye, Trash2, FileCheck, Globe, Brain, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import { useLanguage } from "@/contexts/LanguageContext";

const Privacy = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const sections = [
    {
      icon: Trash2,
      titleKey: "privacyPage.sections.zeroRetention.title",
      contentKey: "privacyPage.sections.zeroRetention.desc",
    },
    {
      icon: Lock,
      titleKey: "privacyPage.sections.encryption.title",
      contentKey: "privacyPage.sections.encryption.desc",
    },
    {
      icon: Eye,
      titleKey: "privacyPage.sections.noTracking.title",
      contentKey: "privacyPage.sections.noTracking.desc",
    },
    {
      icon: Brain,
      titleKey: "privacyPage.sections.aiPowered.title",
      contentKey: "privacyPage.sections.aiPowered.desc",
    },
    {
      icon: Globe,
      titleKey: "privacyPage.sections.compliance.title",
      contentKey: "privacyPage.sections.compliance.desc",
    }
  ];

  return (
    <div className="min-h-screen bg-[#0A0502] text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#1a120b]/80 backdrop-blur-xl border-b border-primary/20">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Logo />
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')} 
              className="text-primary hover:bg-primary/10 gap-2 font-bold uppercase tracking-tighter"
            >
              <ArrowLeft size={18} /> {t('common.backToHome')}
            </Button>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="pt-32 pb-16 px-6">
        <div className="container mx-auto max-w-4xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/60 backdrop-blur-lg border border-primary/30 mb-4">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm text-foreground/80">{t('privacyPage.badge')}</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold">
            {t('privacyPage.title')}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('privacyPage.subtitle')}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('privacyPage.lastUpdated')}
          </p>
        </div>
      </section>

      {/* Privacy Sections */}
      <section className="py-12 px-6">
        <div className="container mx-auto max-w-4xl space-y-8">
          {sections.map((section, index) => (
            <div 
              key={index}
              className="bg-[#1a120b]/80 backdrop-blur-lg border border-primary/20 rounded-2xl p-8 space-y-4 hover:border-primary/40 transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center flex-shrink-0">
                  <section.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-foreground">
                    {t(section.titleKey)}
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {t(section.contentKey)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* About Section */}
      <section className="py-16 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-[#1a120b]/80 backdrop-blur-lg border border-primary/20 rounded-2xl p-8 space-y-6">
            <h2 className="text-3xl font-bold text-foreground">{t('privacyPage.aboutTitle')}</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                {t('privacyPage.aboutP1')}
              </p>
              <p>
                {t('privacyPage.aboutP2Prefix')} <strong className="text-foreground">Sayyed Faizan Rizvi</strong>{t('privacyPage.aboutP2Suffix')}
              </p>
              <div className="pt-4 space-y-2">
                <h3 className="text-xl font-bold text-foreground">{t('privacyPage.whatTitle')}</h3>
                <ul className="list-disc list-inside space-y-2">
                  <li>{t('privacyPage.whatItems.item1')}</li>
                  <li>{t('privacyPage.whatItems.item2')}</li>
                  <li>{t('privacyPage.whatItems.item3')}</li>
                  <li>{t('privacyPage.whatItems.item4')}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-16 px-6 mb-16">
        <div className="container mx-auto max-w-4xl text-center space-y-6">
          <h2 className="text-3xl font-bold">{t('privacyPage.contactTitle')}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t('privacyPage.contactDescPrefix')} <a href="mailto:inspirexali@gmail.com" className="text-primary hover:underline">inspirexali@gmail.com</a>
          </p>
          <Button 
            size="lg" 
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-neon"
            onClick={() => navigate('/')}
          >
            {t('common.backToHome')}
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-primary/20 py-8 px-6">
        <div className="container mx-auto text-center text-xs text-muted-foreground tracking-[0.2em] uppercase">
          <p>{t('privacyPage.footer')}</p>
        </div>
      </footer>
    </div>
  );
};

export default Privacy;
