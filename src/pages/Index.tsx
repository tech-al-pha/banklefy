import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { HowItWorks } from "@/components/HowItWorks";
import { Pricing } from "@/components/Pricing";
import { UploadDemo } from "@/components/UploadDemo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { LogOut, Shield, Settings, PlayCircle, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Logo from "@/components/Logo";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";

const Index = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const checkAdmin = async () => {
      if (user) {
        const { data } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });
        setIsAdmin(!!data);
      } else {
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, [user]);

  const handleAuthClick = () => {
    if (user) {
      signOut();
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-primary/10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Logo />
            <div className="hidden md:flex items-center gap-6">
              
              {/* Demo Button */}
              <Button 
                variant="ghost"
                size="sm" 
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-sm gap-2 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all duration-300 font-medium"
              >
                <PlayCircle className="h-4 w-4" />
                {t('nav.demo')}
              </Button>


              {/* Chat Aura Button */}
              <Button 
                variant="ghost"
                size="sm" 
                onClick={() => navigate('/dashboard')}
                className="text-sm gap-2 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all duration-300"
              >
                <MessageCircle className="h-4 w-4" />
                {t('nav.chatAura')}
              </Button>

              <Button 
                variant="ghost"
                size="sm" 
                onClick={() => navigate('/settings')}
                className="text-sm gap-2 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all duration-300"
              >
                <Settings className="h-4 w-4" />
                {t('nav.settings')}
              </Button>

              {isAdmin && (
                <Button 
                  variant="ghost"
                  size="sm" 
                  onClick={() => navigate('/admin')}
                  className="text-sm gap-1 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
                >
                  <Shield className="h-4 w-4" />
                  {t('nav.admin')}
                </Button>
              )}

              {/* Language Selector */}
              <LanguageSelector />

              <Button 
                variant="outline" 
                size="sm" 
                className="border-primary/50 text-foreground hover:bg-primary/10 transition-colors"
                onClick={handleAuthClick}
              >
                {user ? (
                  <>
                    <LogOut className="mr-2 h-4 w-4" />
                    {t('nav.signOut')}
                  </>
                ) : (
                  t('nav.signIn')
                )}
              </Button>

              <Button 
                size="sm" 
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-neon transition-transform active:scale-95"
                onClick={() => {
                  document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                {t('nav.getStarted')}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <Hero />
      <HowItWorks />

      <div id="features">
        <Features />
      </div>

      <div id="pricing">
        <Pricing />
      </div>

      <div id="demo">
        <UploadDemo />
      </div>

      {/* Footer CTA */}
      <section className="relative py-24 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-primary opacity-10" />
        <div className="container mx-auto text-center relative z-10 space-y-6">
          <h2 className="text-4xl md:text-5xl font-bold">
            {t('footer.cta.title')}
            <br />
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              {t('footer.cta.subtitle')}
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('footer.cta.desc')}
          </p>
          <button 
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-neon transition-all duration-300 hover:scale-105 px-8 py-3 rounded-md font-bold"
            onClick={() => {
              document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            {t('footer.cta.btn')}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-primary/10 py-16 px-6 bg-background">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
            <div className="space-y-4">
              <Logo />
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t('hero.subtitle')}
              </p>
            </div>
            
            <div className="flex flex-col md:items-center">
              <div>
                <h4 className="font-bold mb-6 text-foreground uppercase tracking-widest text-xs">{t('footer.product')}</h4>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li><a href="#features" className="hover:text-primary transition-colors">{t('footer.features')}</a></li>
                  <li><a href="#pricing" className="hover:text-primary transition-colors">{t('footer.pricing')}</a></li>
                  <li><a href="#demo" className="hover:text-primary transition-colors">{t('footer.howItWorks')}</a></li>
                </ul>
              </div>
            </div>
            
            <div className="flex flex-col md:items-end">
              <div className="w-full md:w-auto">
                <h4 className="font-bold mb-6 text-foreground uppercase tracking-widest text-xs">{t('footer.company')}</h4>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li>
                    <button 
                      onClick={() => navigate('/about')}
                      className="hover:text-primary transition-colors text-left font-medium"
                    >
                      {t('footer.about')}
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => navigate('/privacy')}
                      className="hover:text-primary transition-colors text-left font-medium"
                    >
                      {t('footer.privacy')}
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="pt-8 border-t border-primary/10 text-center text-xs text-muted-foreground tracking-[0.2em] uppercase">
            <p>{t('footer.copyright')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
