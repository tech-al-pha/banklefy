import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Settings, Menu, Sparkles, CircleDollarSign, Gift } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import Logo from "@/components/Logo";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";
import { scrollToId } from "@/lib/scroll";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import AutoHideHeader from "@/components/AutoHideHeader";

const LandingPageContent = lazyWithRetry(() =>
  import("@/components/LandingPageContent").then((module) => ({ default: module.LandingPageContent })),
);

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const nextParam = searchParams.get("next");
  const { t } = useLanguage();

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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-surface-elevated focus:px-4 focus:py-2 focus:text-sm focus:text-foreground"
      >
        Skip to content
      </a>
      {/* Navigation */}
      <AutoHideHeader as="nav" className="bg-surface-elevated/60 backdrop-blur-lg border-b border-primary/20" aria-label="Primary">
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
                <SheetContent side="right" className="bg-black/95 border-primary/20 w-[320px]">
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
      </AutoHideHeader>

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
          <div className="mb-12 grid grid-cols-1 gap-10 md:grid-cols-[1.15fr_1fr] md:gap-16">
            <div className="space-y-4">
              <Logo />
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t('hero.subtitle')}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-12">
              <div className="space-y-4">
                <Link
                  to="/how-it-works"
                  className="block text-left text-sm font-medium text-white/84 transition-colors hover:text-white"
                >
                  {t('footer.howItWorks')}
                </Link>
                <Link
                  to="/security"
                  className="block text-left text-sm font-medium text-white/84 transition-colors hover:text-white"
                >
                  {t('footer.security')}
                </Link>
                <Link
                  to="/blog"
                  className="block text-left text-sm font-medium text-white/84 transition-colors hover:text-white"
                >
                  {t('footer.blog')}
                </Link>
                <Link
                  to="/faqs#help"
                  className="block text-left text-sm font-medium text-white/84 transition-colors hover:text-white"
                >
                  {t('footer.helpCenter')}
                </Link>
              </div>

              <div className="space-y-4">
                <Link
                  to="/sample-report"
                  className="block text-left text-sm font-medium text-white/84 transition-colors hover:text-white"
                >
                  {t('footer.sampleReport')}
                </Link>
                <Link
                  to="/about"
                  className="block text-left text-sm font-medium text-white/84 transition-colors hover:text-white"
                >
                  About & Contact
                </Link>
                <a
                  href="https://www.banklefy.site/privacy"
                  className="block text-left text-sm font-medium text-white/92 transition-colors hover:text-white"
                >
                  Privacy Policy
                </a>
              </div>

              <div className="space-y-4">
                <Link
                  to="/terms"
                  className="block text-left text-sm font-medium text-white/84 transition-colors hover:text-white"
                >
                  Terms of Use
                </Link>
                <Link
                  to="/cancellation-and-refund"
                  className="block text-left text-sm font-medium text-white/84 transition-colors hover:text-white"
                >
                  Refund Policy
                </Link>
                <Link
                  to="/shipping-and-exchange"
                  className="block text-left text-sm font-medium text-white/84 transition-colors hover:text-white"
                >
                  Delivery & Exchange
                </Link>
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


