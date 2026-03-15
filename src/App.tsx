import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { LuxuryCursor } from "@/components/LuxuryCursor";
import { Loader2 } from "lucide-react";
import { Suspense } from "react";
import { Helmet, HelmetProvider } from "@dr.pogodin/react-helmet";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { RequireAuth, RequirePaid } from "@/components/RouteGuards";

const Auth = lazyWithRetry(() => import("./pages/Auth"));
const Index = lazyWithRetry(() => import("./pages/Index"));
const Privacy = lazyWithRetry(() => import("./pages/Privacy"));
const Terms = lazyWithRetry(() => import("./pages/Terms"));
const ChatPage = lazyWithRetry(() => import("./pages/ChatPage"));
const About = lazyWithRetry(() => import("./pages/About"));
const FeaturesPage = lazyWithRetry(() => import("./pages/FeaturesPage"));
const BenefitsPage = lazyWithRetry(() => import("./pages/BenefitsPage"));
const Settings = lazyWithRetry(() => import("./pages/Settings"));
const PricingPage = lazyWithRetry(() => import("./pages/PricingPage"));
const SampleReport = lazyWithRetry(() => import("./pages/SampleReport"));
const Profile = lazyWithRetry(() => import("./pages/Profile"));
const Help = lazyWithRetry(() => import("./pages/Help"));
const Blog = lazyWithRetry(() => import("./pages/Blog"));
const BlogLaunch = lazyWithRetry(() => import("./pages/blog/LaunchPost"));
const BlogAccuracy = lazyWithRetry(() => import("./pages/blog/AccuracyPost"));
const BlogPrivacy = lazyWithRetry(() => import("./pages/blog/PrivacyPost"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

type RouteMeta = { title: string; description: string; image?: string };
type JsonLd = Record<string, unknown>;

const DEFAULT_META: RouteMeta = {
  title: "Bank Statement Converter to Excel & CSV | Fast AI OCR | Banklefy",
  description:
    "Convert bank statement PDFs to Excel or CSV in seconds. Accurate AI OCR, multi-bank support, secure processing, instant export.",
  image: "https://banklefy.vercel.app/og-banklefy.jpg",
};

const META_BY_PATH: Record<string, RouteMeta> = {
  "/": DEFAULT_META,
  "/pricing": {
    title: "Pricing | Banklefy Bank Statement Converter",
    description:
      "Transparent pricing for AI bank statement conversion. Free trials and paid plans with higher limits and premium exports.",
  },
  "/features": {
    title: "Features | Banklefy Bank Statement Converter",
    description:
      "Explore AI OCR, PDF to Excel/CSV, multilingual support, and secure processing for fast conversions.",
  },
  "/benefits": {
    title: "Benefits | Banklefy Statement Converter",
    description:
      "Reduce manual work, speed reconciliation, and improve accuracy with AI bank statement conversion.",
  },
  "/about": {
    title: "About Banklefy",
    description:
      "Banklefy delivers secure, accurate bank statement conversion with AI OCR and modern financial workflows.",
  },
  "/sample-report": {
    title: "Sample Report | Banklefy",
    description:
      "Preview a clean, structured Excel report generated from a bank statement.",
  },
  "/privacy": {
    title: "Privacy Policy | Banklefy",
    description: "Learn how Banklefy handles data privacy and document security.",
  },
  "/terms": {
    title: "Terms of Service | Banklefy",
    description: "Review the terms of service for using Banklefy.",
  },
  "/auth": {
    title: "Sign In | Banklefy",
    description: "Sign in or create an account to convert bank statements.",
  },
  "/dashboard": {
    title: "Dashboard | Banklefy",
    description: "Manage processed pages and download Excel exports.",
  },
  "/settings": {
    title: "Settings | Banklefy",
    description: "Manage your account settings and preferences.",
  },
  "/profile": {
    title: "Profile | Banklefy",
    description: "View your account details and recent page usage.",
  },
  "/help": {
    title: "Help Center | Banklefy",
    description:
      "Get help with supported formats, password-protected PDFs, daily limits, and refund requests.",
  },
  "/blog": {
    title: "Blog | Banklefy",
    description: "Product updates, tutorials, and announcements from Banklefy.",
  },
  "/blog/launch": {
    title: "Introducing Banklefy: Bank Statement to Excel in Minutes",
    description: "Meet Banklefy and see how it speeds up statement conversion with secure processing.",
  },
  "/blog/accuracy": {
    title: "How We Improve OCR Accuracy on Low-Quality Scans",
    description: "Learn the OCR safeguards and scanning tips that improve bank statement accuracy.",
  },
  "/blog/privacy": {
    title: "Privacy by Default: Session-Based Access and Secure Handling",
    description: "How Banklefy handles statement access, downloads, and privacy.",
  },
};

const NO_INDEX_PREFIXES = ["/dashboard", "/settings", "/profile", "/auth", "/chat"];

const normalizePathname = (pathname: string) =>
  pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

const getSiteUrl = () => {
  const configured = import.meta.env.VITE_SITE_URL as string | undefined;
  if (configured && configured.trim()) {
    return configured.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "https://banklefy.vercel.app";
};

const toAbsoluteUrl = (value: string, baseUrl: string) => {
  if (/^https?:\/\//i.test(value)) return value;
  const normalizedPath = value.startsWith("/") ? value : `/${value}`;
  return `${baseUrl}${normalizedPath}`;
};

const getStructuredDataByRoute = (
  pathname: string,
  canonical: string,
  siteUrl: string,
  meta: RouteMeta,
): JsonLd[] => {
  const schemas: JsonLd[] = [];

  const organizationSchema: JsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl}/#organization`,
    name: "Banklefy",
    url: siteUrl,
    logo: `${siteUrl}/favicon.svg`,
    sameAs: [
      "https://www.instagram.com/banklefy",
    ],
  };

  const websiteSchema: JsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    url: siteUrl,
    name: "Banklefy",
    publisher: { "@id": `${siteUrl}/#organization` },
    inLanguage: "en",
  };

  const softwareApplicationSchema: JsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Banklefy Bank Statement Converter",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web Browser",
    description: meta.description,
    url: canonical,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
      description: "Free trial available",
    },
  };

  const webPageSchema: JsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: meta.title,
    description: meta.description,
    url: canonical,
    inLanguage: "en",
    isPartOf: { "@id": `${siteUrl}/#website` },
  };

  if (pathname === "/") {
    schemas.push(organizationSchema, websiteSchema, softwareApplicationSchema);
    return schemas;
  }

  if (pathname === "/help") {
    const faqSchema: JsonLd = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Which file formats are supported?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Banklefy supports PDF, JPG, and PNG statements including scans and photos.",
          },
        },
        {
          "@type": "Question",
          name: "Do you support password-protected PDFs?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Enter the password in the unlock field before conversion.",
          },
        },
        {
          "@type": "Question",
          name: "How long does conversion take?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Most statements convert quickly; large or scanned files can take longer.",
          },
        },
      ],
    };
    schemas.push(webPageSchema, faqSchema);
    return schemas;
  }

  if (pathname === "/about") {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "AboutPage",
      name: meta.title,
      description: meta.description,
      url: canonical,
      isPartOf: { "@id": `${siteUrl}/#website` },
    });
    return schemas;
  }

  if (pathname === "/blog") {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: meta.title,
      description: meta.description,
      url: canonical,
      isPartOf: { "@id": `${siteUrl}/#website` },
    });
    return schemas;
  }

  if (pathname.startsWith("/blog/")) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: meta.title,
      description: meta.description,
      mainEntityOfPage: canonical,
      publisher: { "@id": `${siteUrl}/#organization` },
    });
    return schemas;
  }

  schemas.push(webPageSchema);
  return schemas;
};

const AppRoutes = () => {
  const location = useLocation();
  const normalizedPathname = normalizePathname(location.pathname);
  const meta = META_BY_PATH[normalizedPathname] || DEFAULT_META;
  const siteUrl = getSiteUrl();
  const canonical = `${siteUrl}${normalizedPathname === "/" ? "/" : normalizedPathname}`;
  const imageUrl = toAbsoluteUrl(meta.image || DEFAULT_META.image || "/og-banklefy.jpg", siteUrl);
  const shouldNoIndex = NO_INDEX_PREFIXES.some((path) => normalizedPathname.startsWith(path));
  const structuredData = getStructuredDataByRoute(normalizedPathname, canonical, siteUrl, meta);

  return (
    <ErrorBoundary resetKey={location.pathname}>
      <Helmet>
        <title>{meta.title}</title>
        <link rel="canonical" href={canonical} />

        <meta name="description" content={meta.description} />
        <meta name="robots" content={shouldNoIndex ? "noindex, nofollow" : "index, follow"} />

        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Banklefy" />
        <meta property="og:title" content={meta.title} />
        <meta property="og:description" content={meta.description} />
        <meta property="og:url" content={canonical} />
        <meta property="og:image" content={imageUrl} />
        <meta property="og:image:secure_url" content={imageUrl} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Banklefy bank statement converter preview" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={meta.title} />
        <meta name="twitter:description" content={meta.description} />
        <meta name="twitter:url" content={canonical} />
        <meta name="twitter:image" content={imageUrl} />
        <meta name="twitter:image:alt" content="Banklefy bank statement converter preview" />

        {structuredData.map((schema, index) => (
          <script key={`jsonld-${index}`} type="application/ld+json">
            {JSON.stringify(schema)}
          </script>
        ))}
      </Helmet>

      <Suspense
        fallback={
          <div className="min-h-screen bg-background flex items-center justify-center" role="status" aria-live="polite">
            <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
            <span className="sr-only">Loading page</span>
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<RequireAuth><Navigate to="/?next=demo" replace /></RequireAuth>} />
          <Route path="/chat" element={<RequirePaid><ChatPage /></RequirePaid>} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/about" element={<About />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/benefits" element={<BenefitsPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/sample-report" element={<SampleReport />} />
          <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
          <Route path="/help" element={<Help />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/launch" element={<BlogLaunch />} />
          <Route path="/blog/accuracy" element={<BlogAccuracy />} />
          <Route path="/blog/privacy" element={<BlogPrivacy />} />
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
