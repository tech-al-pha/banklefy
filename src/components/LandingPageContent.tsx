import { Hero } from "@/components/Hero";
import { Suspense, useEffect, useRef, useState } from "react";
import { lazyWithRetry } from "@/lib/lazyWithRetry";

const UploadDemo = lazyWithRetry(() =>
  import("@/components/UploadDemo").then((module) => ({ default: module.UploadDemo })),
);

export const LandingPageContent = () => {
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
      <div className="bg-background">
        <Hero />
      </div>

      <div id="demo" ref={demoRef}>
        {shouldLoadUpload ? (
          <Suspense
            fallback={
              <div className="bg-background py-12 text-center text-sm text-muted-foreground" role="status" aria-live="polite">
                Loading converter...
              </div>
            }
          >
            <UploadDemo />
          </Suspense>
        ) : (
          <div className="bg-background py-12 text-center text-sm text-muted-foreground" role="status" aria-live="polite">
            Loading converter...
          </div>
        )}
      </div>
    </>
  );
};
