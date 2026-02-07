import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { UploadDemo } from "@/components/UploadDemo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { LogOut, Shield, Settings, Menu, MessageCircle, Sparkles, CircleDollarSign, Gift } from "lucide-react";
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
    <div className="min-h-screen bg-[#0A0502] text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#1a120b]/60 backdrop-blur-lg border-b border-primary/20">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
          <Logo />
          <div className="hidden lg:flex items-center gap-3">
              
              {/* Pricing Button */}
              <Button 
                variant="ghost"
                size="sm" 
                onClick={() => navigate('/pricing')}
                className="text-xs gap-1 text-muted-foreground transition-all duration-300 font-medium px-2 py-1"
              >
                <CircleDollarSign className="h-3 w-3" />
                <span>Pricing</span>
              </Button>

              {/* Benefits Button */}
              <Button 
                variant="ghost"
                size="sm" 
                onClick={() => navigate('/benefits')}
                className="text-xs gap-1 text-muted-foreground transition-all duration-300 font-medium px-2 py-1"
              >
                <Gift className="h-3 w-3" />
                <span>Benefits</span>
              </Button>

              {/* Features Button */}
              <Button 
                variant="ghost"
                size="sm" 
                onClick={() => navigate('/features')}
                className="text-xs gap-1 text-muted-foreground transition-all duration-300 font-medium px-2 py-1"
              >
                <Sparkles className="h-3 w-3" />
                {t('nav.features')}
              </Button>

              {/* Chat Aura Button */}
              <Button 
                variant="ghost"
                size="sm" 
                onClick={() => navigate('/chat')}
                className="text-xs gap-1 text-muted-foreground transition-all duration-300 px-2 py-1"
              >
                <MessageCircle className="h-3 w-3" />
                {t('nav.chatAura')}
              </Button>

              <Button 
                variant="ghost"
                size="sm" 
                onClick={() => navigate('/settings')}
                className="text-xs gap-1 text-muted-foreground transition-all duration-300 px-2 py-1"
              >
                <Settings className="h-3 w-3" />
                {t('nav.settings')}
              </Button>

              {isAdmin && (
                <Button 
                  variant="ghost"
                  size="sm" 
                  onClick={() => navigate('/admin')}
                  className="text-xs gap-1 text-muted-foreground transition-all px-2 py-1"
                >
                  <Shield className="h-3 w-3" />
                  {t('nav.admin')}
                </Button>
              )}

              {/* Language Selector */}
              <LanguageSelector />

              <Button 
                variant="outline" 
                size="sm" 
                className="border-primary/50 text-foreground transition-colors"
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
                className="bg-primary text-primary-foreground shadow-neon transition-transform active:scale-95"
                onClick={() => {
                  document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                {t('nav.getStarted')}
              </Button>
            </div>

            {/* Mobile / Tablet Menu */}
            <div className="lg:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground"
                    aria-label="Open menu"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="bg-[#1a120b]/95 border-primary/20 w-[320px]">
                  <div className="mt-10 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Menu
                      </span>
                      <LanguageSelector />
                    </div>

                    <SheetClose asChild>
                      <Button
                        variant="ghost"
                        className="justify-start gap-2 text-muted-foreground"
                        onClick={() => navigate('/pricing')}
                      >
                        <CircleDollarSign className="h-4 w-4" />
                        Pricing
                      </Button>
                    </SheetClose>

                    <SheetClose asChild>
                      <Button
                        variant="ghost"
                        className="justify-start gap-2 text-muted-foreground"
                        onClick={() => navigate('/benefits')}
                      >
                        <Gift className="h-4 w-4" />
                        Benefits
                      </Button>
                    </SheetClose>

                    <SheetClose asChild>
                      <Button
                        variant="ghost"
                        className="justify-start gap-2 text-muted-foreground"
                        onClick={() => navigate('/features')}
                      >
                        <Sparkles className="h-4 w-4" />
                        {t('nav.features')}
                      </Button>
                    </SheetClose>

                    <SheetClose asChild>
                      <Button
                        variant="ghost"
                        className="justify-start gap-2 text-muted-foreground"
                        onClick={() => navigate('/chat')}
                      >
                        <MessageCircle className="h-4 w-4" />
                        {t('nav.chatAura')}
                      </Button>
                    </SheetClose>

                    <SheetClose asChild>
                      <Button
                        variant="ghost"
                        className="justify-start gap-2 text-muted-foreground"
                        onClick={() => navigate('/settings')}
                      >
                        <Settings className="h-4 w-4" />
                        {t('nav.settings')}
                      </Button>
                    </SheetClose>

                    {isAdmin && (
                      <SheetClose asChild>
                        <Button
                          variant="ghost"
                          className="justify-start gap-2 text-muted-foreground"
                          onClick={() => navigate('/admin')}
                        >
                          <Shield className="h-4 w-4" />
                          {t('nav.admin')}
                        </Button>
                      </SheetClose>
                    )}

                    <div className="border-t border-primary/10 pt-3 flex flex-col gap-3">
                      <SheetClose asChild>
                        <Button
                          variant="outline"
                          className="border-primary/40 text-foreground"
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
                      </SheetClose>

                      <SheetClose asChild>
                        <Button
                          className="bg-primary text-primary-foreground shadow-neon"
                          onClick={() => {
                            document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' });
                          }}
                        >
                          {t('nav.getStarted')}
                        </Button>
                      </SheetClose>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>

      <Hero />
      <HowItWorks />

      <div id="demo">
        <UploadDemo />
      </div>

      {/* Footer CTA */}
      <section className="relative py-12 px-4 sm:px-6 overflow-hidden bg-[#0A0502]">
        <div className="container mx-auto text-center relative z-10 space-y-6">
          <h2 className="text-4xl md:text-5xl font-bold italic">
            {t('footer.cta.title')}
            <br />
            <span className="text-primary">
              {t('footer.cta.subtitle')}
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('footer.cta.desc')}
          </p>
          <button 
            className="bg-primary text-primary-foreground shadow-neon transition-all duration-300 hover:scale-105 px-8 py-4 rounded-lg font-bold text-lg"
            onClick={() => {
              document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            {t('footer.cta.btn')}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-primary/20 py-16 px-4 sm:px-6 bg-[#0A0502]">
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
                  <li>
                    <button 
                      onClick={() => navigate('/features')}
                      className="transition-colors text-left font-medium"
                    >
                      {t('footer.features')}
                    </button>
                  </li>
                  <li><a href="#demo" className="transition-colors">{t('footer.howItWorks')}</a></li>
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
                      className="transition-colors text-left font-medium"
                    >
                      {t('footer.about')}
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => navigate('/privacy')}
                      className="transition-colors text-left font-medium"
                    >
                      {t('footer.privacy')}
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => navigate('/terms')}
                      className="transition-colors text-left font-medium"
                    >
                      Terms & Conditions
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="pt-8 border-t border-primary/10 text-center text-xs text-muted-foreground tracking-[0.2em] uppercase">
            <p>{t('footer.copyright')}</p>
          </div>
          <div className="mt-4 text-center text-xs text-muted-foreground">
            This site is protected by reCAPTCHA and the Google{" "}
            <a
              href="https://policies.google.com/privacy"
              className="underline underline-offset-2 transition-colors"
              rel="noreferrer"
              target="_blank"
            >
              Privacy Policy
            </a>{" "}
            and{" "}
            <a
              href="https://policies.google.com/terms"
              className="underline underline-offset-2 transition-colors"
              rel="noreferrer"
              target="_blank"
            >
              Terms of Service
            </a>{" "}
            apply.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;


