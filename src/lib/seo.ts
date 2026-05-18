export type RouteMeta = { title: string; description: string; image?: string };
export type JsonLd = Record<string, unknown>;

export const DEFAULT_META: RouteMeta = {
  title: "Bank Statement to Excel, CSV, MT940 & Tally in Seconds | Banklefy",
  description:
    "Convert bank statement PDFs into clean Excel, CSV, JSON, MT940 and Tally-ready exports with fast AI OCR and secure processing.",
  image: "https://www.banklefy.site/og-banklefy.jpg",
};

export const META_BY_PATH: Record<string, RouteMeta> = {
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
  "/sample-data": {
    title: "Sample Data | Banklefy Bank Statement Converter",
    description:
      "Preview sample bank statement data and download clean Excel, CSV, JSON, XML, PDF, and MT940 outputs from Banklefy.",
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
  "/cancellation-and-refund": {
    title: "Cancellation & Refund Policy | Banklefy",
    description: "Refund timelines and how to request a refund for eligible purchases.",
  },
  "/shipping-and-exchange": {
    title: "Shipping & Exchange Policy | Banklefy",
    description: "Banklefy is a digital service. No physical goods are shipped.",
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

export const NO_INDEX_PREFIXES = ["/dashboard", "/settings", "/profile", "/auth", "/help", "/documentation", "/cookie-policy"];

export const normalizePathname = (pathname: string) =>
  pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

export const getSiteUrl = () => {
  const configured = import.meta.env.VITE_SITE_URL as string | undefined;
  if (configured && configured.trim()) {
    return configured.replace(/\/+$/, "");
  }
  return "https://www.banklefy.site";
};

const getPublicContactSignals = () => {
  const supportEmail = (import.meta.env.VITE_PUBLIC_SUPPORT_EMAIL as string | undefined)?.trim();
  const securityEmail = (import.meta.env.VITE_PUBLIC_SECURITY_EMAIL as string | undefined)?.trim();
  const instagramUrl = (import.meta.env.VITE_PUBLIC_INSTAGRAM_URL as string | undefined)?.trim();
  return {
    supportEmail: supportEmail && supportEmail.includes("@") ? supportEmail : null,
    securityEmail: securityEmail && securityEmail.includes("@") ? securityEmail : null,
    instagramUrl: instagramUrl && /^https?:\/\//i.test(instagramUrl) ? instagramUrl : null,
  };
};

export const toAbsoluteUrl = (value: string, baseUrl: string) => {
  if (/^https?:\/\//i.test(value)) return value;
  const normalizedPath = value.startsWith("/") ? value : `/${value}`;
  return `${baseUrl}${normalizedPath}`;
};

export const getStructuredDataByRoute = (
  pathname: string,
  canonical: string,
  siteUrl: string,
  meta: RouteMeta,
): JsonLd[] => {
  const schemas: JsonLd[] = [];
  const contactSignals = getPublicContactSignals();

  const organizationSchema: JsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl}/#organization`,
    name: "Banklefy",
    url: siteUrl,
    logo: `${siteUrl}/favicon.svg`,
    ...(contactSignals.supportEmail ? { email: contactSignals.supportEmail } : {}),
    ...(contactSignals.supportEmail || contactSignals.securityEmail
      ? {
          contactPoint: [
            ...(contactSignals.supportEmail
              ? [
                  {
                    "@type": "ContactPoint",
                    contactType: "customer support",
                    email: contactSignals.supportEmail,
                  },
                ]
              : []),
            ...(contactSignals.securityEmail
              ? [
                  {
                    "@type": "ContactPoint",
                    contactType: "security",
                    email: contactSignals.securityEmail,
                  },
                ]
              : []),
          ],
        }
      : {}),
    ...(contactSignals.instagramUrl ? { sameAs: [contactSignals.instagramUrl] } : {}),
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
            text: "14-day full refund. Requests are handled through support.",
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

  if (pathname === "/contact") {
    schemas.push(...baseSchemas, {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      name: meta.title,
      description: meta.description,
      url: canonical,
      isPartOf: { "@id": `${siteUrl}/#website` },
      ...(contactSignals.supportEmail
        ? {
            mainEntity: {
              "@type": "Organization",
              name: "Banklefy",
              email: contactSignals.supportEmail,
              url: siteUrl,
            },
          }
        : {}),
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

  if (pathname !== "/") {
    const breadcrumbItems = pathname
      .split("/")
      .filter(Boolean)
      .map((segment, index, segments) => {
        const path = `/${segments.slice(0, index + 1).join("/")}`;
        const itemUrl = `${siteUrl}${path}`;
        const itemMeta = META_BY_PATH[path] || DEFAULT_META;
        return {
          "@type": "ListItem",
          position: index + 2,
          name: itemMeta.title,
          item: itemUrl,
        };
      });

    schemas.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: DEFAULT_META.title,
          item: `${siteUrl}/`,
        },
        ...breadcrumbItems,
      ],
    });
  }

  schemas.push(...baseSchemas);
  return schemas;
};
