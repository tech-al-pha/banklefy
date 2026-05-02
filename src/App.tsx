import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { LuxuryCursor } from "@/components/LuxuryCursor";
import { Suspense } from "react";
import { Helmet, HelmetProvider } from "@dr.pogodin/react-helmet";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { RequireAuth, RequirePaid } from "@/components/RouteGuards";
import LoadingScreen from "@/components/LoadingScreen";

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
const ContactPage = lazyWithRetry(() => import("./pages/Contact"));
const FaqsPage = lazyWithRetry(() => import("./pages/Faqs"));
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

type RouteMeta = { title: string; description: string; image?: string };
type JsonLd = Record<string, unknown>;

const DEFAULT_META: RouteMeta = {
  title: "Bank Statement to Excel, CSV, MT940 & Tally in Seconds | Banklefy",
  description:
    "Convert bank statement PDFs into clean Excel, CSV, JSON, MT940 and Tally-ready exports with fast AI OCR and secure processing.",
  image: "https://www.banklefy.site/og-banklefy.jpg",
};

const META_BY_PATH: Record<string, RouteMeta> = {
  "/": DEFAULT_META,
  "/pricing": {
    title: "Pricing | Banklefy Bank Statement Converter",
    description:
      "Transparent INR pricing for AI bank statement conversion. Free trial and one-time credit packs with higher limits and premium exports.",
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
    title: "About | Banklefy",
    description:
      "Product notes for Banklefy, including text-PDF parsing, OCR for scanned pages, session-only processing, and support channels.",
  },
  "/sample-report": {
    title: "Sample Report | Banklefy",
    description:
      "Preview a clean, structured Excel report generated from a bank statement.",
  },
  "/privacy": {
    title: "Privacy Policy | Banklefy",
    description: "What Banklefy collects, how session-only processing works, and how deletion works.",
  },
  "/terms": {
    title: "Terms of Service | Banklefy",
    description: "The operating terms for using Banklefy, including files, limits, payments, and review responsibilities.",
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
    title: "FAQs & Help | Banklefy",
    description: "Direct help and FAQ notes for file types, passwords, limits, exports, and support.",
  },
  "/how-it-works": {
    title: "How It Works | Banklefy",
    description: "See how Banklefy converts bank statements into clean exports in three steps.",
  },
  "/security": {
    title: "Security | Banklefy",
    description: "How Banklefy handles data, encryption, access control, retention, and third-party dependencies.",
  },
  "/contact": {
    title: "Contact | Banklefy",
    description: "How to contact Banklefy support for conversion, billing, privacy, and account issues.",
  },
  "/faqs": {
    title: "FAQs & Help | Banklefy",
    description: "Direct answers and practical notes about file types, passwords, limits, retention, and exports.",
  },
  "/blog": {
    title: "Blog | Banklefy",
    description: "Short notes about supported formats, conversion behavior, exports, and product updates.",
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
    title: "Privacy by Default: Secure File Handling and Deletion Control",
    description: "How Banklefy handles temporary uploads, session-only processing, and privacy.",
  },
  "/blog/multi-format-export": {
    title: "Multi-Format Export: Excel, CSV, JSON, XML & MT940 | Banklefy",
    description: "Export bank statements to Excel, CSV, JSON, XML, and MT940 from a single upload for ERP and treasury systems.",
  },
  "/blog/bulk-conversion": {
    title: "Bulk Bank Statement Conversion: Multiple Files at Once | Banklefy",
    description: "Upload and convert multiple bank statements in one session with parallel processing and selective AI OCR.",
  },
  "/blog/underwriting": {
    title: "AI-Powered Underwriting & Risk Analysis from Bank Statements | Banklefy",
    description: "Get ADB, FOIR score, net cashflow, and balance dip analysis automatically from converted bank statements.",
  },
  "/blog/fraud-detection": {
    title: "Detecting Tampered Bank Statements with AI Fraud Alerts | Banklefy",
    description: "Automated fraud detection flags balance discontinuity, duplicate entries, and formatting inconsistencies in bank statements.",
  },
  "/blog/multi-language": {
    title: "Multi-Language Support: Use Banklefy in Your Preferred Language",
    description: "Banklefy supports Hindi, Marathi, Tamil, Telugu, and more for accessible bank statement conversion across India.",
  },
  "/blog/password-pdf": {
    title: "Convert Password-Protected Bank Statement PDFs | Banklefy",
    description: "Upload locked bank statement PDFs, enter the password, and convert to Excel or CSV in one step.",
  },
};

const NO_INDEX_PREFIXES = ["/dashboard", "/settings", "/profile", "/auth", "/help", "/documentation", "/cookie-policy"];

const normalizePathname = (pathname: string) =>
  pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

const getSiteUrl = () => {
  const configured = import.meta.env.VITE_SITE_URL as string | undefined;
  if (configured && configured.trim()) {
    return configured.replace(/\/+$/, "");
  }
  return "https://www.banklefy.site";
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

  const baseSchemas = [organizationSchema, websiteSchema, webPageSchema];

  if (pathname === "/") {
    schemas.push(organizationSchema, websiteSchema, softwareApplicationSchema);
    return schemas;
  }

  if (pathname === "/help") {
    schemas.push(...baseSchemas);
    return schemas;
  }

  if (pathname === "/faqs") {
    const faqSchema: JsonLd = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Which file formats are supported?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Banklefy supports PDF, JPG, and PNG files. Text PDFs are parsed directly; scanned pages use OCR only where needed.",
          },
        },
        {
          "@type": "Question",
          name: "Do you support password-protected PDFs?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Enter the password in the unlock field before conversion. Password protection alone does not force OCR.",
          },
        },
        {
          "@type": "Question",
          name: "How long does conversion take?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Timing depends on file size, page count, scan quality, and whether OCR is needed. Large files can still take time when they are text-based.",
          },
        },
        {
          "@type": "Question",
          name: "Do you store my files?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Files are processed for the active session only. Download what you need before refreshing or closing the session.",
          },
        },
        {
          "@type": "Question",
          name: "How do refunds work?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Refunds for eligible one-time packs are processed within 14 days. Refunds are not available if 35% or more of the usage has been consumed. The same terms are listed in the Privacy Policy and handled through support.",
          },
        },
      ],
    };
    schemas.push(...baseSchemas, faqSchema);
    return schemas;
  }

  if (pathname === "/how-it-works") {
    const howToSchema: JsonLd = {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: "How Banklefy works",
      description: "Upload, convert, and download clean bank statement exports.",
      step: [
        {
          "@type": "HowToStep",
          name: "Upload your statement",
          text: "Upload a PDF, JPG, or PNG bank statement.",
        },
        {
          "@type": "HowToStep",
          name: "Convert with Banklefy",
          text: "We parse text PDFs deterministically or run OCR for scanned files.",
        },
        {
          "@type": "HowToStep",
          name: "Download exports",
          text: "Download Excel or CSV outputs in seconds.",
        },
      ],
    };
    schemas.push(...baseSchemas, howToSchema);
    return schemas;
  }

  if (pathname === "/pricing") {
    const pricingSchema: JsonLd = {
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
        description: "Free plan available with paid upgrades.",
      },
    };
    schemas.push(...baseSchemas, pricingSchema);
    return schemas;
  }

  if (pathname === "/about") {
    schemas.push(...baseSchemas, {
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
    schemas.push(...baseSchemas, {
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
    schemas.push(...baseSchemas, {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: meta.title,
      description: meta.description,
      mainEntityOfPage: canonical,
      publisher: { "@id": `${siteUrl}/#organization` },
    });
    return schemas;
  }

  schemas.push(...baseSchemas);
  return schemas;
};

const AppRoutes = () => {
  const location = useLocation();
  const normalizedPathname = normalizePathname(location.pathname);
  const meta = META_BY_PATH[normalizedPathname] || DEFAULT_META;
  const siteUrl = getSiteUrl();
  const currentOrigin =
    typeof window !== "undefined" ? window.location.origin.replace(/\/+$/, "") : null;
  const canonical = `${siteUrl}${normalizedPathname === "/" ? "/" : normalizedPathname}`;
  const imageUrl = toAbsoluteUrl(meta.image || DEFAULT_META.image || "/og-banklefy.jpg", siteUrl);
  const shouldNoIndex =
    NO_INDEX_PREFIXES.some((path) => normalizedPathname.startsWith(path)) ||
    (currentOrigin ? currentOrigin !== siteUrl : false);
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
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/cookie-policy" element={<Navigate to="/privacy" replace />} />
          <Route path="/documentation" element={<Navigate to="/faqs#help" replace />} />
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
