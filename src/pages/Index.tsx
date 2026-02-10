import { LandingPageContent } from "@/components/LandingPageContent";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Shield, Settings, Menu, MessageCircle, Sparkles, CircleDollarSign, Gift } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Logo from "@/components/Logo";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";
import { scrollToId } from "@/lib/scroll";

const Index = () => {
  const { user } = useAuth();
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
      navigate('/profile');
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-surface-elevated focus:px-4 focus:py-2 focus:text-sm focus:text-foreground"
      >
        Skip to content
      </a>
      {/* Navigation */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 bg-surface-elevated/60 backdrop-blur-lg border-b border-primary/20"
        aria-label="Primary"
      >
        <div className="container mx-auto px-4 sm:px-6 py-1.5 sm:py-2.5">
          <div className="flex items-center justify-between">
          <div className="ml-6 sm:ml-8">
            <Logo />
          </div>
          <div className="hidden lg:flex items-center gap-3">
              
              {/* Pricing Button */}
              <button
                type="button"
                onClick={() => navigate('/pricing')}
                className="text-glow-link text-xs font-medium"
              >
                <CircleDollarSign className="h-3 w-3" />
                <span>{t('nav.pricing')}</span>
              </button>

              {/* Benefits Button */}
              <button
                type="button"
                onClick={() => navigate('/benefits')}
                className="text-glow-link text-xs font-medium"
              >
                <Gift className="h-3 w-3" />
                <span>{t('nav.benefits')}</span>
              </button>

              {/* Features Button */}
              <button
                type="button"
                onClick={() => navigate('/features')}
                className="text-glow-link text-xs font-medium"
              >
                <Sparkles className="h-3 w-3" />
                <span>{t('nav.features')}</span>
              </button>

              {user && (
                <button
                  type="button"
                  onClick={() => navigate('/chat')}
                  className="text-glow-link text-xs font-medium"
                >
                  <MessageCircle className="h-3 w-3" />
                  <span>{t('nav.chatAura')}</span>
                </button>
              )}

              {user && (
                <button
                  type="button"
                  onClick={() => navigate('/settings')}
                  className="text-glow-link text-xs font-medium"
                >
                  <Settings className="h-3 w-3" />
                  <span>{t('nav.settings')}</span>
                </button>
              )}

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => navigate('/admin')}
                  className="text-glow-link text-xs font-medium"
                >
                  <Shield className="h-3 w-3" />
                  <span>{t('nav.admin')}</span>
                </button>
              )}

              {/* Language Selector */}
              <LanguageSelector />

              <Button 
                variant="outline" 
                size="sm" 
                className="border-primary/50 text-foreground transition-colors"
                onClick={handleAuthClick}
              >
                {user ? "Profile" : t('nav.signIn')}
              </Button>

              <Button 
                size="sm" 
                className="bg-primary text-primary-foreground shadow-neon transition-transform active:scale-95"
                onClick={() => {
                  scrollToId("demo");
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
                <SheetContent side="right" className="bg-surface-elevated/95 border-primary/20 w-[320px]">
                  <div className="mt-10 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        {t('nav.menu')}
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
                        {t('nav.pricing')}
                      </Button>
                    </SheetClose>

                    <SheetClose asChild>
                      <Button
                        variant="ghost"
                        className="justify-start gap-2 text-muted-foreground"
                        onClick={() => navigate('/benefits')}
                      >
                        <Gift className="h-4 w-4" />
                        {t('nav.benefits')}
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

                    {user && (
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
                    )}

                    {user && (
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
                    )}

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
                          {user ? "Profile" : t('nav.signIn')}
                        </Button>
                      </SheetClose>

                      <SheetClose asChild>
                        <Button
                          className="bg-primary text-primary-foreground shadow-neon"
                          onClick={() => {
                            scrollToId("demo");
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

      <main id="main-content" tabIndex={-1}>
        <LandingPageContent />
      </main>

      {/* Footer */}
      <footer className="border-t border-primary/20 py-16 px-4 sm:px-6 bg-background">
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
                      className="text-glow-link text-left font-medium"
                    >
                      {t('footer.features')}
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => navigate('/help')}
                      className="text-glow-link text-left font-medium"
                    >
                      {t('footer.helpCenter')}
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => navigate('/blog')}
                      className="text-glow-link text-left font-medium"
                    >
                      {t('footer.blog')}
                    </button>
                  </li>
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
                      className="text-glow-link text-left font-medium"
                    >
                      {t('footer.about')}
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => navigate('/privacy')}
                      className="text-glow-link text-left font-medium"
                    >
                      {t('footer.privacy')}
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => navigate('/terms')}
                      className="text-glow-link text-left font-medium"
                    >
                      {t('footer.terms')}
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
            {t('footer.recaptcha.prefix')}{" "}
            <a
              href="https://policies.google.com/privacy"
              className="underline underline-offset-2 transition-colors"
              rel="noreferrer"
              target="_blank"
            >
              {t('footer.recaptcha.privacy')}
            </a>{" "}
            {t('footer.recaptcha.and')}{" "}
            <a
              href="https://policies.google.com/terms"
              className="underline underline-offset-2 transition-colors"
              rel="noreferrer"
              target="_blank"
            >
              {t('footer.recaptcha.terms')}
            </a>{" "}
            {t('footer.recaptcha.suffix')}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;


