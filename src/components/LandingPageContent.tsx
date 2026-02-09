import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { useLanguage } from "@/contexts/LanguageContext";
import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { scrollToId } from "@/lib/scroll";

const UploadDemo = lazy(() =>
  import("@/components/UploadDemo").then((module) => ({ default: module.UploadDemo })),
);

export const LandingPageContent = () => {
  const { t } = useLanguage();
  const [shouldLoadUpload, setShouldLoadUpload] = useState(false);
  const demoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (shouldLoadUpload) return;
    if (typeof window === "undefined") return;
    if (!("IntersectionObserver" in window)) {
      setShouldLoadUpload(true);
      return;
    }

    const node = demoRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting || entry.intersectionRatio > 0) {
          setShouldLoadUpload(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [shouldLoadUpload]);

  useEffect(() => {
    if (shouldLoadUpload) return;
    if (typeof window === "undefined") return;
    const win = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (!win.requestIdleCallback) return;

    const id = win.requestIdleCallback(() => {
      void import("@/components/UploadDemo");
    }, { timeout: 2500 });

    return () => win.cancelIdleCallback?.(id);
  }, [shouldLoadUpload]);

  return (
    <>
      <div className="bg-[#0A0502]">
        <Hero />
        <HowItWorks />
      </div>

      <div id="demo" ref={demoRef}>
        {shouldLoadUpload ? (
          <Suspense
            fallback={
              <div className="bg-[#0A0502] py-12 text-center text-sm text-muted-foreground" role="status" aria-live="polite">
                Loading converter...
              </div>
            }
          >
            <UploadDemo />
          </Suspense>
        ) : (
          <div className="bg-[#0A0502] py-12 text-center text-sm text-muted-foreground" role="status" aria-live="polite">
            Loading converter...
          </div>
        )}
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
            type="button"
            className="bg-primary text-primary-foreground shadow-neon transition-all duration-300 hover:scale-105 px-8 py-4 rounded-lg font-bold text-lg"
            onClick={() => {
              scrollToId("demo");
            }}
          >
            {t('footer.cta.btn')}
          </button>
        </div>
      </section>
    </>
  );
};
