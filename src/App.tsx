import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { Suspense, useEffect } from "react";
import { HelmetProvider } from "@dr.pogodin/react-helmet";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { RequireAuth, RequirePaid } from "@/components/RouteGuards";
import LoadingScreen from "@/components/LoadingScreen";
import { LuxuryCursor } from "@/components/LuxuryCursor";
import { SEOManager } from "@/components/SEOManager";

const Auth = lazyWithRetry(() => import("./pages/Auth"));
const Index = lazyWithRetry(() => import("./pages/Index"));
const Privacy = lazyWithRetry(() => import("./pages/Privacy"));
const Terms = lazyWithRetry(() => import("./pages/Terms"));
const About = lazyWithRetry(() => import("./pages/About"));
const FeaturesPage = lazyWithRetry(() => import("./pages/FeaturesPage"));
const BenefitsPage = lazyWithRetry(() => import("./pages/BenefitsPage"));
const Settings = lazyWithRetry(() => import("./pages/Settings"));
const PricingPage = lazyWithRetry(() => import("./pages/PricingPage"));
const SampleReport = lazyWithRetry(() => import("./pages/SampleReport"));
const Profile = lazyWithRetry(() => import("./pages/Profile"));
const Blog = lazyWithRetry(() => import("./pages/Blog"));
const HowItWorksPage = lazyWithRetry(() => import("./pages/HowItWorksPage"));
const SecurityPage = lazyWithRetry(() => import("./pages/Security"));
const FaqsPage = lazyWithRetry(() => import("./pages/Faqs"));
const CancellationRefundPage = lazyWithRetry(() => import("./pages/CancellationRefund"));
const ShippingExchangePage = lazyWithRetry(() => import("./pages/ShippingExchange"));
const BlogLaunch = lazyWithRetry(() => import("./pages/blog/LaunchPost"));
const BlogAccuracy = lazyWithRetry(() => import("./pages/blog/AccuracyPost"));
const BlogPrivacy = lazyWithRetry(() => import("./pages/blog/PrivacyPost"));
const BlogMultiFormat = lazyWithRetry(() => import("./pages/blog/MultiFormatExportPost"));
const BlogBulk = lazyWithRetry(() => import("./pages/blog/BulkConversionPost"));
const BlogUnderwriting = lazyWithRetry(() => import("./pages/blog/UnderwritingPost"));
const BlogFraudDetection = lazyWithRetry(() => import("./pages/blog/FraudDetectionPost"));
const BlogMultiLanguage = lazyWithRetry(() => import("./pages/blog/MultiLanguagePost"));
const BlogPasswordPdf = lazyWithRetry(() => import("./pages/blog/PasswordPdfPost"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const AppRoutes = () => {
  const location = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const preferredHost = "www.banklefy.site";
    const currentUrl = new URL(window.location.href);

    if (currentUrl.hostname === "banklefy.site") {
      currentUrl.hostname = preferredHost;
      window.location.replace(currentUrl.toString());
    }
  }, [location.pathname, location.search, location.hash]);

  return (
    <ErrorBoundary resetKey={location.pathname}>
      <SEOManager />

      <Suspense
        fallback={
          <LoadingScreen />
        }
      >
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<RequireAuth><Navigate to="/?next=demo" replace /></RequireAuth>} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/about" element={<About />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/benefits" element={<BenefitsPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/sample-report" element={<SampleReport />} />
          <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
          <Route path="/help" element={<Navigate to="/faqs#help" replace />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/security" element={<SecurityPage />} />
          <Route path="/contact" element={<Navigate to="/about#contact" replace />} />
          <Route path="/cookie-policy" element={<Navigate to="/privacy" replace />} />
          <Route path="/documentation" element={<Navigate to="/faqs#help" replace />} />
          <Route path="/cancellation-and-refund" element={<CancellationRefundPage />} />
          <Route path="/shipping-and-exchange" element={<ShippingExchangePage />} />
          <Route path="/faqs" element={<FaqsPage />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/launch" element={<BlogLaunch />} />
          <Route path="/blog/accuracy" element={<BlogAccuracy />} />
          <Route path="/blog/privacy" element={<BlogPrivacy />} />
          <Route path="/blog/multi-format-export" element={<BlogMultiFormat />} />
          <Route path="/blog/bulk-conversion" element={<BlogBulk />} />
          <Route path="/blog/underwriting" element={<BlogUnderwriting />} />
          <Route path="/blog/fraud-detection" element={<BlogFraudDetection />} />
          <Route path="/blog/multi-language" element={<BlogMultiLanguage />} />
          <Route path="/blog/password-pdf" element={<BlogPasswordPdf />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
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
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
