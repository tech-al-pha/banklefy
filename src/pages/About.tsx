import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Mail, Instagram, MapPin, ArrowLeft, ShieldCheck, Zap, Award, MessageCircle, X } from "lucide-react";
import Logo from "@/components/Logo";
import { useLanguage } from "@/contexts/LanguageContext";

const AboutPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-[#0A0502] text-white font-sans selection:bg-primary/30">
      {/* Header Area */}
      <nav className="border-b border-primary/10 bg-black/40 backdrop-blur-md p-4 sticky top-0 z-50">
        <div className="container mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')} 
            className="btn-glow text-primary gap-2 font-bold uppercase tracking-tighter w-full sm:w-auto"
          >
            <ArrowLeft size={18} /> {t('common.backToHome')}
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 max-w-4xl">
        {/* About Section - Upgraded with Harvard/Cybersecurity details */}
        <section className="space-y-8 mb-20 animate-in fade-in slide-in-from-bottom-5 duration-700">
          <div className="space-y-2">
            <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter text-primary uppercase">
              {t('aboutPage.visionTitle')}
            </h1>
            <p className="text-xl md:text-2xl font-bold text-white/80 italic tracking-tight">
              {t('aboutPage.visionSubtitle')}
            </p>
          </div>
          
          <div className="space-y-8 text-lg text-muted-foreground leading-relaxed italic">
            <p>{t('aboutPage.visionP1')}</p>

            <div className="p-8 bg-gradient-to-r from-primary/10 to-transparent border-l-4 border-primary rounded-r-[2rem] space-y-4">
              <p className="text-white font-medium text-xl not-italic">
                {t('aboutPage.brainchildPrefix')}{" "}
                <span className="text-primary underline decoration-2 underline-offset-4">Mr. Faizan Rizvi</span>
              </p>
              <p className="text-muted-foreground">
                {t('aboutPage.brainchildP1')}
              </p>
              <p className="text-muted-foreground">
                {t('aboutPage.brainchildP2')}
              </p>
            </div>
          </div>
        </section>

        {/* Value Props - Extra "Badha-chadha" points for impact */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-24">
          <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-2">
            <ShieldCheck className="text-primary" size={32} />
            <h3 className="font-bold text-white uppercase text-sm tracking-widest">{t('aboutPage.valueProps.cyberSafe.title')}</h3>
            <p className="text-xs text-muted-foreground italic">{t('aboutPage.valueProps.cyberSafe.desc')}</p>
          </div>
          <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-2">
            <Zap className="text-primary" size={32} />
            <h3 className="font-bold text-white uppercase text-sm tracking-widest">{t('aboutPage.valueProps.instantFlux.title')}</h3>
            <p className="text-xs text-muted-foreground italic">{t('aboutPage.valueProps.instantFlux.desc')}</p>
          </div>
          <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-2">
            <Award className="text-primary" size={32} />
            <h3 className="font-bold text-white uppercase text-sm tracking-widest">{t('aboutPage.valueProps.accuracy.title')}</h3>
            <p className="text-xs text-muted-foreground italic">{t('aboutPage.valueProps.accuracy.desc')}</p>
          </div>
        </div>

        {/* Contact Grid - Clean Footer Info */}
        <section className="space-y-10">
          <h2 className="text-2xl font-black uppercase tracking-widest border-b border-white/10 pb-4">
            {t('aboutPage.connectTitle')}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a href="https://t.me/n3x4z" target="_blank" rel="noopener noreferrer" className="group p-8 bg-[#1A100B] border border-primary/20 rounded-[2rem] flex items-center gap-6 transition-all hover:border-primary hover:shadow-neon">
              <div className="bg-primary/10 p-4 rounded-full text-primary group-hover:scale-110 transition-transform"><MessageCircle size={24} /></div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Telegram</p>
                <p className="text-xl font-bold">@n3x4z</p>
              </div>
            </a>

            <a href="https://x.com/inspirexali" target="_blank" rel="noopener noreferrer" className="group p-8 bg-[#1A100B] border border-primary/20 rounded-[2rem] flex items-center gap-6 transition-all hover:border-primary hover:shadow-neon">
              <div className="bg-primary/10 p-4 rounded-full text-primary group-hover:scale-110 transition-transform"><X size={24} /></div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">X (Twitter)</p>
                <p className="text-xl font-bold">@inspirexali</p>
              </div>
            </a>

            <a href="mailto:inspirexali@gmail.com" className="group p-8 bg-[#1A100B] border border-primary/20 rounded-[2rem] flex items-center gap-6 transition-all hover:border-primary hover:shadow-neon">
              <div className="bg-primary/10 p-4 rounded-full text-primary group-hover:scale-110 transition-transform"><Mail size={24} /></div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('aboutPage.contact.mail')}</p>
                <p className="text-xl font-bold">inspirexali@gmail.com</p>
              </div>
            </a>

            <a href="https://instagram.com/inspirexali" target="_blank" rel="noopener noreferrer" className="group p-8 bg-[#1A100B] border border-primary/20 rounded-[2rem] flex items-center gap-6 transition-all hover:border-primary hover:shadow-neon">
              <div className="bg-primary/10 p-4 rounded-full text-primary group-hover:scale-110 transition-transform"><Instagram size={24} /></div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('aboutPage.contact.social')}</p>
                <p className="text-xl font-bold">@inspirexali</p>
              </div>
            </a>

            <div className="group p-8 bg-[#1A100B] border border-primary/20 rounded-[2rem] flex items-center gap-6 md:col-span-2">
              <div className="bg-primary/10 p-4 rounded-full text-primary"><MapPin size={24} /></div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('aboutPage.contact.hq')}</p>
                <p className="text-xl font-bold italic text-white/80 uppercase">{t('aboutPage.contact.hqValue')}</p>
              </div>
            </div>
          </div>
        </section>

        <footer className="mt-20 pt-8 border-t border-white/5 text-center text-xs text-muted-foreground tracking-[0.3em] uppercase">
          {t('aboutPage.footer')}
        </footer>
      </main>
    </div>
  );
};

export default AboutPage;
