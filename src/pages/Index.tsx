import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Settings, Menu, MessageCircle, Sparkles, CircleDollarSign, Gift, Lock } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import Logo from "@/components/Logo";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";
import { scrollToId } from "@/lib/scroll";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { hasAdminAccess } from "@/lib/adminAccess";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";

const LandingPageContent = lazyWithRetry(() =>
  import("@/components/LandingPageContent").then((module) => ({ default: module.LandingPageContent })),
);

const CHAT_AURA_TEMP_UNAVAILABLE = false;

const Index = () => {
  const { user } = useAuth();
  const { hasChatAuraAccess, loading: subscriptionLoading } = useSubscriptionTier();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const nextParam = searchParams.get("next");
  const [isAdmin, setIsAdmin] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const checkAdmin = async () => {
      if (user) {
        const nextIsAdmin = await hasAdminAccess(user);
        setIsAdmin(nextIsAdmin);
      } else {
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, [user]);

  useEffect(() => {
    if (nextParam !== "demo") return;

    let attempts = 0;
    const maxAttempts = 20;

    const scrollToDemo = () => {
      attempts += 1;

      if (document.getElementById("demo")) {
        scrollToId("demo");
        const params = new URLSearchParams(window.location.search);
        params.delete("next");
        setSearchParams(params, { replace: true });
        return;
      }

      if (attempts < maxAttempts) {
        window.setTimeout(scrollToDemo, 120);
        return;
      }

      const params = new URLSearchParams(window.location.search);
      params.delete("next");
      setSearchParams(params, { replace: true });
    };

    scrollToDemo();
  }, [nextParam, setSearchParams]);

  const handleAuthClick = () => {
    if (user) {
      navigate('/profile');
    } else {
      navigate('/auth');
    }
  };

  const handleChatAuraClick = () => {
    if (subscriptionLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!hasChatAuraAccess) {
      navigate('/pricing');
      return;
    }
    navigate('/chat');
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
            <div className="ml-1 sm:ml-0">
              <Logo />
            </div>
          <div className="hidden lg:flex items-center gap-3">
              
              {/* Pricing Button */}
              <Link
                to="/pricing"
                className="text-glow-link text-xs font-medium"
              >
                <CircleDollarSign className="h-3 w-3" />
                <span>{t('nav.pricing')}</span>
              </Link>

              {/* Benefits Button */}
              <Link
                to="/benefits"
                className="text-glow-link text-xs font-medium"
              >
                <Gift className="h-3 w-3" />
                <span>{t('nav.benefits')}</span>
              </Link>

              {/* Features Button */}
              <Link
                to="/features"
                className="text-glow-link text-xs font-medium"
              >
                <Sparkles className="h-3 w-3" />
                <span>{t('nav.features')}</span>
              </Link>

              {!CHAT_AURA_TEMP_UNAVAILABLE && (
                <button
                  type="button"
                  onClick={handleChatAuraClick}
                  disabled={subscriptionLoading}
                  className="text-glow-link text-xs font-medium disabled:opacity-70"
                >
                  <MessageCircle className="h-3 w-3" />
                  <span>{t('nav.chatAura')}</span>
                  {(!user || !hasChatAuraAccess) && <Lock className="h-3 w-3" />}
                </button>
              )}

              {user && (
                <Link
                  to="/settings"
                  className="text-glow-link text-xs font-medium"
                >
                  <Settings className="h-3 w-3" />
                  <span>{t('nav.settings')}</span>
                </Link>
              )}

              {/* Language Selector */}
              <LanguageSelector />

              <Button
                variant="outline"
                size="sm"
                className="border-primary/50 bg-[#141414] text-foreground transition-colors btn-target-glow"
                onClick={handleAuthClick}
              >
                {user ? (isAdmin ? "Admin" : "Profile") : t('nav.signIn')}
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
                  <SheetHeader className="sr-only">
                    <SheetTitle>Navigation</SheetTitle>
                    <SheetDescription>Mobile menu</SheetDescription>
                  </SheetHeader>
                  <div className="mt-10 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        {t('nav.menu')}
                      </span>
                      <LanguageSelector />
                    </div>

                    <SheetClose asChild>
                      <Button
                        asChild
                        variant="ghost"
                        className="justify-start gap-2 text-muted-foreground"
                      >
                        <Link to="/pricing">
                          <CircleDollarSign className="h-4 w-4" />
                          {t('nav.pricing')}
                        </Link>
                      </Button>
                    </SheetClose>

                    <SheetClose asChild>
                      <Button
                        asChild
                        variant="ghost"
                        className="justify-start gap-2 text-muted-foreground"
                      >
                        <Link to="/benefits">
                          <Gift className="h-4 w-4" />
                          {t('nav.benefits')}
                        </Link>
                      </Button>
                    </SheetClose>

                    <SheetClose asChild>
                      <Button
                        asChild
                        variant="ghost"
                        className="justify-start gap-2 text-muted-foreground"
                      >
                        <Link to="/features">
                          <Sparkles className="h-4 w-4" />
                          {t('nav.features')}
                        </Link>
                      </Button>
                    </SheetClose>

                    {!CHAT_AURA_TEMP_UNAVAILABLE && (
                      <SheetClose asChild>
                        <Button
                          variant="ghost"
                          className="justify-start gap-2 text-muted-foreground"
                          onClick={handleChatAuraClick}
                          disabled={subscriptionLoading}
                        >
                          <MessageCircle className="h-4 w-4" />
                          {t('nav.chatAura')}
                          {(!user || !hasChatAuraAccess) && <Lock className="h-4 w-4" />}
                        </Button>
                      </SheetClose>
                    )}

                    {user && (
                      <SheetClose asChild>
                        <Button
                          asChild
                          variant="ghost"
                          className="justify-start gap-2 text-muted-foreground"
                        >
                          <Link to="/settings">
                            <Settings className="h-4 w-4" />
                            {t('nav.settings')}
                          </Link>
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
                          {user ? (isAdmin ? "Admin" : "Profile") : t('nav.signIn')}
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
        <Suspense
          fallback={
            <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">
              <span className="text-sm">Loading content?</span>
            </div>
          }
        >
          <LandingPageContent />
        </Suspense>
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
                    <Link
                      to="/features"
                      className="text-glow-link text-left font-medium"
                    >
                      {t('footer.features')}
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/help"
                      className="text-glow-link text-left font-medium"
                    >
                      {t('footer.helpCenter')}
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/blog"
                      className="text-glow-link text-left font-medium"
                    >
                      {t('footer.blog')}
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="flex flex-col md:items-end">
              <div className="w-full md:w-auto">
                <h4 className="font-bold mb-6 text-foreground uppercase tracking-widest text-xs">{t('footer.company')}</h4>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li>
                    <Link
                      to="/about"
                      className="text-glow-link text-left font-medium"
                    >
                      {t('footer.about')}
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/privacy"
                      className="text-glow-link text-left font-medium"
                    >
                      {t('footer.privacy')}
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/terms"
                      className="text-glow-link text-left font-medium"
                    >
                      {t('footer.terms')}
                    </Link>
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


