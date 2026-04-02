import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Mail, MapPin, ArrowLeft, ShieldCheck, Zap, Award, MessageCircle, X, Linkedin } from "lucide-react";
import Logo from "@/components/Logo";
import { useLanguage } from "@/contexts/LanguageContext";
import SupportContactDialog from "@/components/SupportContactDialog";

const AboutPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const problemBullets = [
    t('aboutPage.problemBullets.one'),
    t('aboutPage.problemBullets.two'),
    t('aboutPage.problemBullets.three'),
    t('aboutPage.problemBullets.four'),
  ];
  const solutionBullets = [
    t('aboutPage.solutionBullets.one'),
    t('aboutPage.solutionBullets.two'),
    t('aboutPage.solutionBullets.three'),
    t('aboutPage.solutionBullets.four'),
    t('aboutPage.solutionBullets.five'),
  ];
  const audienceBullets = [
    t('aboutPage.audienceBullets.one'),
    t('aboutPage.audienceBullets.two'),
    t('aboutPage.audienceBullets.three'),
    t('aboutPage.audienceBullets.four'),
  ];
  const principlesBullets = [
    t('aboutPage.principlesBullets.one'),
    t('aboutPage.principlesBullets.two'),
    t('aboutPage.principlesBullets.three'),
    t('aboutPage.principlesBullets.four'),
  ];
  const roadmapBullets = [
    t('aboutPage.roadmapBullets.one'),
    t('aboutPage.roadmapBullets.two'),
    t('aboutPage.roadmapBullets.three'),
    t('aboutPage.roadmapBullets.four'),
  ];

  return (
    <div className="min-h-screen bg-background text-white selection:bg-primary/30">
      {/* Header Area */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-primary/10 bg-ink/40 backdrop-blur-md p-4">
        <div className="container mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')} 
            className="back-pill w-full sm:w-auto"
          >
            <ArrowLeft size={18} /> {t('common.backToHome')}
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 sm:px-6 pt-24 pb-12 sm:pt-28 sm:pb-16 max-w-5xl">
        {/* About Section - Upgraded with Harvard/Cybersecurity details */}
        <section className="space-y-8 mb-20 animate-in fade-in slide-in-from-bottom-5 duration-700">
          <div className="space-y-2">
            <h1 className="text-5xl md:text-7xl font-normal italic tracking-tighter text-primary uppercase">
              {t('aboutPage.visionTitle')}
            </h1>
            <p className="text-xl md:text-2xl font-normal text-white/80 italic tracking-tight">
              {t('aboutPage.visionSubtitle')}
            </p>
          </div>
          
          <div className="space-y-8 text-lg text-muted-foreground leading-relaxed italic">
            <p>{t('aboutPage.visionP1')}</p>

            <div className="p-8 bg-gradient-to-r from-primary/10 to-transparent border-l-4 border-primary rounded-r-[2rem] space-y-4">
              <p className="text-white font-medium text-2xl not-italic">
                {t('aboutPage.brainchildPrefix')}{" "}
                <span className="text-primary underline decoration-2 underline-offset-4">Faizan Rizvi</span>
              </p>
              <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
                {t('aboutPage.brainchildP1')}
              </p>
              <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
                {t('aboutPage.brainchildP2')}
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-10 mb-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-2">
              <ShieldCheck className="text-primary" size={32} />
              <h3 className="font-normal text-white text-sm tracking-widest uppercase">{t('aboutPage.valueProps.cyberSafe.title')}</h3>
              <p className="text-xs text-muted-foreground italic">{t('aboutPage.valueProps.cyberSafe.desc')}</p>
            </div>
            <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-2">
              <Zap className="text-primary" size={32} />
              <h3 className="font-normal text-white text-sm tracking-widest uppercase">{t('aboutPage.valueProps.instantFlux.title')}</h3>
              <p className="text-xs text-muted-foreground italic">{t('aboutPage.valueProps.instantFlux.desc')}</p>
            </div>
            <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-2">
              <Award className="text-primary" size={32} />
              <h3 className="font-normal text-white text-sm tracking-widest uppercase">{t('aboutPage.valueProps.accuracy.title')}</h3>
              <p className="text-xs text-muted-foreground italic">{t('aboutPage.valueProps.accuracy.desc')}</p>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-normal tracking-widest text-white">
              {t('aboutPage.problemTitle')}
            </h2>
            <p className="text-sm text-muted-foreground italic">{t('aboutPage.problemIntro')}</p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2">
              {problemBullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-normal tracking-widest text-white">
              {t('aboutPage.solutionTitle')}
            </h2>
            <p className="text-sm text-muted-foreground italic">{t('aboutPage.solutionIntro')}</p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2">
              {solutionBullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-normal tracking-widest text-white">
              {t('aboutPage.audienceTitle')}
            </h2>
            <p className="text-sm text-muted-foreground italic">{t('aboutPage.audienceIntro')}</p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2">
              {audienceBullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-normal tracking-widest text-white">
              {t('aboutPage.principlesTitle')}
            </h2>
            <p className="text-sm text-muted-foreground italic">{t('aboutPage.principlesIntro')}</p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2">
              {principlesBullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="space-y-4 mb-20">
          <h2 className="text-2xl font-normal tracking-widest border-b border-white/10 pb-4">
            {t('aboutPage.roadmapTitle')}
          </h2>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2">
            {roadmapBullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </section>

        {/* Contact Grid - Clean Footer Info */}
        <section className="space-y-10">
          <h2 className="text-2xl font-normal tracking-widest border-b border-white/10 pb-4">
            {t('aboutPage.connectTitle')}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a href="https://t.me/n3x4z" target="_blank" rel="noopener noreferrer" className="group p-8 glass-card border border-primary/20 rounded-[2rem] flex items-center gap-6 transition-all hover:border-primary hover:shadow-neon">
              <div className="bg-primary/10 p-4 rounded-full text-primary group-hover:scale-110 transition-transform"><MessageCircle size={24} /></div>
              <div>
                <p className="text-xs font-normal text-muted-foreground tracking-widest">Telegram</p>
                <p className="text-xl font-normal">@n3x4z</p>
              </div>
            </a>

            <a
              href="https://www.linkedin.com/in/faizan-rizvi-8589a93a8"
              target="_blank"
              rel="noopener noreferrer"
              className="group p-8 glass-card border border-primary/20 rounded-[2rem] flex items-center gap-6 transition-all hover:border-primary hover:shadow-neon"
            >
              <div className="bg-primary/10 p-4 rounded-full text-primary group-hover:scale-110 transition-transform">
                <Linkedin size={24} />
              </div>
              <div>
                <p className="text-xs font-normal text-muted-foreground tracking-widest">LinkedIn</p>
                <p className="text-xl font-normal">Faizan Rizvi</p>
              </div>
            </a>

            <a href="https://x.com/inspirexali" target="_blank" rel="noopener noreferrer" className="group p-8 glass-card border border-primary/20 rounded-[2rem] flex items-center gap-6 transition-all hover:border-primary hover:shadow-neon">
              <div className="bg-primary/10 p-4 rounded-full text-primary group-hover:scale-110 transition-transform"><X size={24} /></div>
              <div>
                <p className="text-xs font-normal text-muted-foreground tracking-widest">X (Twitter)</p>
                <p className="text-xl font-normal">@inspirexali</p>
              </div>
            </a>

            <SupportContactDialog
              source="about_page"
              trigger={
                <div className="group p-8 glass-card border border-primary/20 rounded-[2rem] flex items-center gap-6 transition-all hover:border-primary hover:shadow-neon cursor-pointer">
                  <div className="bg-primary/10 p-4 rounded-full text-primary group-hover:scale-110 transition-transform">
                    <Mail size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-normal text-muted-foreground tracking-widest">{t('aboutPage.contact.mail')}</p>
                    <p className="text-xl font-normal">Contact Support</p>
                  </div>
                </div>
              }
            />

            <a
              href="https://maps.google.com/?q=Prem%20Nagar%201%2C%20Kota%2C%20Rajasthan%20324004%2C%20India"
              target="_blank"
              rel="noopener noreferrer"
              className="group p-8 glass-card border border-primary/20 rounded-[2rem] flex items-center gap-6 md:col-span-2 transition-all hover:border-primary hover:shadow-neon"
            >
              <div className="bg-primary/10 p-4 rounded-full text-primary"><MapPin size={24} /></div>
              <div>
                <p className="text-xs font-normal text-muted-foreground tracking-widest">{t('aboutPage.contact.hq')}</p>
                <p className="text-xl font-normal italic text-white/80">{t('aboutPage.contact.hqValue')}</p>
              </div>
            </a>
          </div>

        </section>

        <footer className="mt-20 pt-8 border-t border-white/5 text-center text-xs text-muted-foreground tracking-[0.3em]">
          {t('aboutPage.footer')}
        </footer>
      </main>
    </div>
  );
};

export default AboutPage;
