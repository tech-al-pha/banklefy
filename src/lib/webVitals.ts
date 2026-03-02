type VitalsName = "LCP" | "CLS" | "INP";

type VitalsPayload = {
  name: VitalsName;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  page: string;
  ts: number;
};

const getRating = (name: VitalsName, value: number): VitalsPayload["rating"] => {
  switch (name) {
    case "LCP":
      if (value <= 2500) return "good";
      if (value <= 4000) return "needs-improvement";
      return "poor";
    case "CLS":
      if (value <= 0.1) return "good";
      if (value <= 0.25) return "needs-improvement";
      return "poor";
    case "INP":
      if (value <= 200) return "good";
      if (value <= 500) return "needs-improvement";
      return "poor";
    default:
      return "poor";
  }
};

const emitMetric = (name: VitalsName, value: number) => {
  const payload: VitalsPayload = {
    name,
    value: Number(value.toFixed(name === "CLS" ? 4 : 0)),
    rating: getRating(name, value),
    page: window.location.pathname,
    ts: Date.now(),
  };

  // Keep this lightweight and safe in production.
  console.info("[WEB_VITAL]", payload);

  if (navigator.sendBeacon && import.meta.env.VITE_WEB_VITALS_ENDPOINT) {
    try {
      const url = String(import.meta.env.VITE_WEB_VITALS_ENDPOINT);
      navigator.sendBeacon(url, JSON.stringify(payload));
    } catch {
      // Best-effort only.
    }
  }
};

export const startWebVitalsObserver = () => {
  if (typeof window === "undefined" || !("PerformanceObserver" in window)) return;

  let clsValue = 0;
  let lcpValue = 0;
  let inpValue = 0;

  try {
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        lcpValue = lastEntry.startTime;
      }
    });
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });

    const clsObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries() as PerformanceEntry[]) {
        const shift = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
        if (!shift.hadRecentInput && typeof shift.value === "number") {
          clsValue += shift.value;
        }
      }
    });
    clsObserver.observe({ type: "layout-shift", buffered: true });

    const inpObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries() as PerformanceEntry[]) {
        const perfEntry = entry as PerformanceEntry & { duration?: number };
        if (typeof perfEntry.duration === "number") {
          inpValue = Math.max(inpValue, perfEntry.duration);
        }
      }
    });
    inpObserver.observe({ type: "event", buffered: true, durationThreshold: 40 });

    const flush = () => {
      if (lcpValue > 0) emitMetric("LCP", lcpValue);
      emitMetric("CLS", clsValue);
      if (inpValue > 0) emitMetric("INP", inpValue);
    };

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        flush();
      }
    });
  } catch {
    // Ignore if browser doesn't support one of the observers.
  }
};

