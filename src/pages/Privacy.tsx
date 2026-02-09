import { Button } from "@/components/ui/button";
import { Shield, Lock, Eye, Trash2, FileCheck, Globe, Brain, ArrowLeft, CheckCircle, Database, AlertCircle, Users, Server, LockOpen, Mail } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import { useLanguage } from "@/contexts/LanguageContext";

const Privacy = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  type PrivacySection =
    | { icon: LucideIcon; titleKey: string; contentKey: string }
    | { icon: LucideIcon; title: string; content: string };

  const sections: PrivacySection[] = [
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
    },
    {
      icon: Database,
      title: "Data We Collect",
      content: "We may collect account details (like email), file metadata, and the files you upload to provide the service. We may also collect basic usage logs (IP address, timestamps, device/browser) for security and abuse prevention.",
    },
    {
      icon: Users,
      title: "Third-Party Services",
      content: "We use third-party providers such as Supabase (authentication and storage) and Google reCAPTCHA (abuse prevention). These providers may process data under their own policies. We do not sell your data.",
    },
    {
      icon: Shield,
      title: "Payment Processors",
      content: "Razorpay handles our billing and subscription payments. Razorpay temporarily sees the payment details you enter, and we only receive confirmation, transaction IDs, and invoices necessary to unlock paid features. Razorpay processes that data under their own Terms & Privacy Policy.",
    },
    {
      icon: Server,
      title: "Server Security",
      content: "We use reputable providers and reasonable security measures to protect data. No system is 100% secure, so please use the service with care.",
    },
    {
      icon: AlertCircle,
      title: "Data Breach Notification",
      content: "If we learn of a data breach, we will notify affected users and authorities as required by law and as soon as reasonably possible.",
    },
    {
      icon: LockOpen,
      title: "Your Rights",
      content: "You can access and update your account information. Files and results are deleted automatically after 24 hours and cannot be recovered after that.",
    },
    {
      icon: CheckCircle,
      title: "Cookie Policy",
      content: "We use essential cookies for sessions and security. Anti-abuse tools (like reCAPTCHA) may set additional cookies.",
    },
    {
      icon: Mail,
      title: "Contact & Data Requests",
      content: "For privacy questions, contact inspirexali@gmail.com. We aim to respond within a reasonable time.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-surface-elevated/80 backdrop-blur-xl border-b border-primary/20">
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Logo />
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')} 
              className="btn-glow text-primary gap-2 font-bold uppercase tracking-tighter w-full sm:w-auto"
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
              className="bg-surface-elevated/80 backdrop-blur-lg border border-primary/20 rounded-2xl p-8 space-y-4 hover:border-primary/40 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 duration-700"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center flex-shrink-0">
                  <section.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-foreground">
                    {'titleKey' in section ? t(section.titleKey) : section.title}
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {'contentKey' in section ? t(section.contentKey) : section.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
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
            className="bg-primary text-primary-foreground shadow-neon"
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
