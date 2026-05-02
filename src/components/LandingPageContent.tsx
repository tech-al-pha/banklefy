import { Hero } from "@/components/Hero";
import { Suspense, useEffect, useRef, useState } from "react";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { useLanguage, type Language } from "@/contexts/LanguageContext";

const UploadDemo = lazyWithRetry(() =>
  import("@/components/UploadDemo").then((module) => ({ default: module.UploadDemo })),
);

export const LandingPageContent = () => {
  const { language } = useLanguage();
  const [shouldLoadUpload, setShouldLoadUpload] = useState(false);
  const demoRef = useRef<HTMLDivElement>(null);
  const loadingLabelByLanguage: Record<Language, string> = {
    en: "Loading converter...",
    ar: "جارٍ تحميل أداة التحويل...",
    zh: "正在加载转换器...",
    es: "Cargando convertidor...",
    hi: "कन्वर्टर लोड हो रहा है...",
  };
  const loadingLabel = loadingLabelByLanguage[language] ?? loadingLabelByLanguage.en;

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
      <div className="bg-background">
        <Hero />
      </div>

      <div id="demo" ref={demoRef}>
        {shouldLoadUpload ? (
          <Suspense
            fallback={
              <div className="bg-background py-12 text-center text-sm text-muted-foreground" role="status" aria-live="polite">
                {loadingLabel}
              </div>
            }
          >
            <UploadDemo />
          </Suspense>
        ) : (
          <div className="bg-background py-12 text-center text-sm text-muted-foreground" role="status" aria-live="polite">
            {loadingLabel}
          </div>
        )}
      </div>
    </>
  );
};
