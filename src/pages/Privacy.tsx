import { Button } from "@/components/ui/button";
import { Shield, Lock, Eye, Trash2, FileCheck, Globe, Brain, ArrowLeft, CheckCircle, Database, AlertCircle, Users, Server, LockOpen, Mail } from "lucide-react";
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
    },
    {
      icon: Database,
      title: "Data We Collect",
      content: "We only collect essential information: your email, account preferences, and file metadata (filename, upload date). We never store financial data from your documents.",
    },
    {
      icon: Users,
      title: "Third-Party Services",
      content: "We use Supabase for authentication and storage. All data is encrypted in transit and at rest. We do not sell your data to any third party.",
    },
    {
      icon: Server,
      title: "Server Security",
      content: "Our servers are hosted on Supabase infrastructure with 99.9% uptime guarantee. All communications use HTTPS/TLS encryption. Regular security audits ensure compliance.",
    },
    {
      icon: AlertCircle,
      title: "Data Breach Notification",
      content: "In the unlikely event of a data breach, we will notify all affected users within 24 hours via email with details and recommended actions.",
    },
    {
      icon: LockOpen,
      title: "Your Rights",
      content: "You have the right to access, modify, or delete your personal data at any time. Request these actions by emailing us, and we'll comply within 7 business days.",
    },
    {
      icon: CheckCircle,
      title: "Cookie Policy",
      content: "We use minimal cookies only for session management and user preference storage. No tracking cookies or third-party advertising cookies are used.",
    },
    {
      icon: Mail,
      title: "Contact & Data Requests",
      content: "For privacy concerns, data access requests, or deletion requests, contact inspirexali@gmail.com. We respond to all inquiries within 48 hours.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0A0502] text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#1a120b]/80 backdrop-blur-xl border-b border-primary/20">
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Logo />
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')} 
              className="text-primary hover:bg-primary/10 gap-2 font-bold uppercase tracking-tighter w-full sm:w-auto"
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
              className="bg-[#1a120b]/80 backdrop-blur-lg border border-primary/20 rounded-2xl p-8 space-y-4 hover:border-primary/40 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 duration-700"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center flex-shrink-0">
                  <section.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-foreground">
                    {(section as any).titleKey ? t((section as any).titleKey) : (section as any).title}
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {(section as any).contentKey ? t((section as any).contentKey) : (section as any).content}
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
