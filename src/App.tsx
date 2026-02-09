import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { LuxuryCursor } from "@/components/LuxuryCursor";
import { Loader2 } from "lucide-react";
import { lazy, Suspense, useEffect } from "react";
import Index from "./pages/Index";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const Admin = lazy(() => import("./pages/Admin"));
const About = lazy(() => import("./pages/About"));
const FeaturesPage = lazy(() => import("./pages/FeaturesPage"));
const BenefitsPage = lazy(() => import("./pages/BenefitsPage"));
const Settings = lazy(() => import("./pages/Settings"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const SampleReport = lazy(() => import("./pages/SampleReport"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const AppRoutes = () => {
  const location = useLocation();

  useEffect(() => {
    const defaultMeta = {
      title: "Bank Statement Converter to Excel | AI OCR Parser | Akromeda",
      description:
        "Convert bank statements to Excel with AI-powered OCR. Support for 50+ languages, PDF & scanned documents. Fast, secure, accurate bank statement parser.",
    };

    const metaByPath: Record<string, { title: string; description: string }> = {
      "/": defaultMeta,
      "/pricing": {
        title: "Pricing | Akromeda Bank Statement Converter",
        description:
          "Simple pricing for AI bank statement conversion. Free and paid plans with higher limits and premium exports.",
      },
      "/features": {
        title: "Features | Akromeda Bank Statement Converter",
        description:
          "Explore AI OCR, multilingual support, and bank-level security features for fast statement-to-Excel conversion.",
      },
      "/benefits": {
        title: "Benefits | Akromeda Statement Converter",
        description:
          "See how Akromeda reduces manual work, speeds reconciliation, and improves accuracy for finance teams.",
      },
      "/about": {
        title: "About Akromeda",
        description:
          "Akromeda delivers secure, accurate bank statement conversion with AI OCR and modern financial workflows.",
      },
      "/sample-report": {
        title: "Sample Report | Akromeda",
        description:
          "Preview a clean, structured Excel report generated from a bank statement.",
      },
      "/privacy": {
        title: "Privacy Policy | Akromeda",
        description: "Learn how Akromeda handles data privacy and document security.",
      },
      "/terms": {
        title: "Terms of Service | Akromeda",
        description: "Review the terms of service for using Akromeda.",
      },
      "/auth": {
        title: "Sign In | Akromeda",
        description: "Sign in or create an account to convert bank statements.",
      },
      "/dashboard": {
        title: "Dashboard | Akromeda",
        description: "Manage conversions and download Excel exports.",
      },
      "/settings": {
        title: "Settings | Akromeda",
        description: "Manage your account settings and preferences.",
      },
      "/admin": {
        title: "Admin Console | Akromeda",
        description: "Administrative dashboard for system status and operations.",
      },
    };

    const pathname = location.pathname;
    const meta = metaByPath[pathname] || defaultMeta;

    document.title = meta.title;

    const setMeta = (attr: "name" | "property", key: string, content: string) => {
      let tag = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attr, key);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    };

    setMeta("name", "description", meta.description);
    setMeta("property", "og:title", meta.title);
    setMeta("property", "og:description", meta.description);
    setMeta("name", "twitter:title", meta.title);
    setMeta("name", "twitter:description", meta.description);

    const canonical = `${window.location.origin}${pathname}`;
    let canonicalTag = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonicalTag) {
      canonicalTag = document.createElement("link");
      canonicalTag.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalTag);
    }
    canonicalTag.setAttribute("href", canonical);

    setMeta("property", "og:url", canonical);
    setMeta("name", "twitter:url", canonical);

    const noIndexPaths = ["/admin", "/dashboard", "/settings", "/auth", "/chat"];
    const shouldNoIndex = noIndexPaths.some((path) => pathname.startsWith(path));
    setMeta("name", "robots", shouldNoIndex ? "noindex, nofollow" : "index, follow");
  }, [location.pathname]);

  return (
    <ErrorBoundary resetKey={location.pathname}>
      <Suspense
        fallback={
          <div className="min-h-screen bg-[#0A0502] flex items-center justify-center" role="status" aria-live="polite">
            <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
            <span className="sr-only">Loading page</span>
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/about" element={<About />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/benefits" element={<BenefitsPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/sample-report" element={<SampleReport />} />
          <Route path="/settings" element={<Settings />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <TooltipProvider>
          <LuxuryCursor />
          <Toaster />
          <Sonner />
          <AppRoutes />
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
