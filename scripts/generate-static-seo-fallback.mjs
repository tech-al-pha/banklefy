import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const distDir = path.resolve(repoRoot, "dist");
const siteUrl = (process.env.PRERENDER_ORIGIN || "https://www.banklefy.site").replace(/\/+$/, "");

const routes = [
  {
    path: "/",
    title: "Bank Statement to Excel, CSV, MT940 & Tally in Seconds | Banklefy",
    description:
      "Banklefy is a bank statement converter, PDF to Excel and CSV tool, and edited PDF detector for FOIR, EMI, loan, fraud, and statement analysis with fast AI OCR.",
    heading: "Convert bank statements into clean exports in minutes",
    sections: [
      "Upload bank statement PDFs, scanned pages, or mobile captures and convert them into structured Excel, CSV, JSON, XML, and MT940 outputs.",
      "Banklefy combines deterministic parsing for text PDFs with OCR only when needed so finance teams can reconcile faster and reduce manual copy-paste work.",
      "Use Banklefy when you need a bank statement converter, PDF to Excel tool, PDF to CSV export, edited PDF detection, FOIR checks, EMI checks, or loan analysis.",
    ],
    schemaType: "SoftwareApplication",
  },
  {
    path: "/pricing",
    title: "Pricing | Banklefy Bank Statement Converter",
    description:
      "Transparent INR pricing for AI bank statement conversion. Free trial and one-time credit packs with higher limits and premium exports.",
    heading: "Transparent pricing for bank statement conversion",
    sections: [
      "Review one-time conversion pricing, page limits, and export availability before choosing a plan.",
      "Plans are designed for single-use conversions as well as higher-volume teams that need more pages and premium export formats.",
    ],
  },
  {
    path: "/features",
    title: "Features | Banklefy Bank Statement Converter",
    description:
      "Explore AI OCR, PDF to Excel/CSV, multilingual support, edited PDF detection, FOIR analysis, EMI checker insights, and secure processing for fast conversions.",
    heading: "Features built for statement extraction accuracy",
    sections: [
      "Banklefy supports PDF, image, and scanned bank statements with conversion into spreadsheet-ready outputs.",
      "Core features include OCR when required, deterministic parsing for text PDFs, multiple export formats, edited PDF signals, FOIR support, EMI support, and secure processing controls.",
    ],
  },
  {
    path: "/benefits",
    title: "Benefits | Banklefy Statement Converter",
    description:
      "Reduce manual work, speed reconciliation, and improve accuracy with AI bank statement conversion, fraud review, and statement analysis.",
    heading: "Why teams switch from manual copy-paste",
    sections: [
      "Automation reduces time spent retyping statements and helps teams move faster on reconciliation, audit prep, and underwriting.",
      "Structured exports improve consistency across workflows while reducing spreadsheet cleanup and formatting effort.",
    ],
  },
  {
    path: "/how-it-works",
    title: "How It Works | Banklefy",
    description: "See how Banklefy converts bank statements into clean exports in three steps, with OCR, edited PDF detection, and accurate transaction extraction.",
    heading: "How the conversion flow works",
    sections: [
      "Upload your statement, let Banklefy detect the best extraction path, then download a clean export once processing is complete.",
      "The workflow is designed to keep inputs simple while producing structured outputs suitable for accounting, finance, operations teams, FOIR review, EMI review, and fraud analysis.",
    ],
    schemaType: "HowTo",
  },
  {
    path: "/security",
    title: "Security | Banklefy",
    description:
      "How Banklefy handles data, encryption, access control, retention, edited PDF detection, and third-party dependencies.",
    heading: "Security and data handling",
    sections: [
      "This page explains how Banklefy approaches file handling, session access, deletion flow, and operational safeguards.",
      "It is intended for teams that need clarity on privacy, access, and secure processing before uploading financial documents.",
    ],
  },
  {
    path: "/faqs",
    title: "FAQs & Help | Banklefy",
    description:
      "Direct answers and practical notes about file types, passwords, limits, retention, exports, edited PDF detection, FOIR, EMI, and support.",
    heading: "Frequently asked questions",
    sections: [
      "Find practical answers about supported formats, password-protected PDFs, processing limits, and export options.",
      "The FAQ section helps users understand how the converter behaves before they start a session, including edited PDF detection and underwriting-style analysis signals.",
    ],
    schemaType: "FAQPage",
  },
  {
    path: "/about",
    title: "About | Banklefy",
    description:
      "Product notes for Banklefy, including text-PDF parsing, OCR for scanned pages, edited PDF detection, FOIR and EMI analysis, session-only processing, and support channels.",
    heading: "About Banklefy",
    sections: [
      "Banklefy is built to turn bank statements into structured files that are easier to review, reconcile, and import into downstream systems.",
      "The product focuses on practical extraction accuracy, predictable exports, edited PDF review, and workflows that reduce manual finance operations work.",
    ],
  },
  {
    path: "/contact",
    title: "Contact | Banklefy",
    description:
      "Contact Banklefy support for bank statement conversion issues, billing questions, privacy requests, account access help, edited PDF detection, FOIR checks, and EMI checks.",
    heading: "Contact Banklefy support",
    sections: [
      "Use the contact page when you need help with bank statement conversion errors, account access, payment questions, refunds, or privacy-related requests.",
      "Include your file name, conversion ID, order reference, and a screenshot when possible so support can resolve issues faster.",
    ],
    schemaType: "ContactPage",
  },
  {
    path: "/sample-data",
    title: "Sample Data | Banklefy Bank Statement Converter",
    description: "Preview sample bank statement data and download clean Excel, CSV, JSON, XML, PDF, and MT940 outputs from Banklefy.",
    heading: "Preview sample bank statement data",
    sections: [
      "See how statement rows are cleaned, categorized, and organized before export into spreadsheet and reconciliation workflows.",
      "The sample data page helps users evaluate output structure, downloadable formats, and conversion quality before purchase.",
    ],
  },
  {
    path: "/privacy",
    title: "Privacy Policy | Banklefy",
    description:
      "What Banklefy collects, how session-only processing works, and how deletion works.",
    heading: "Privacy policy",
    sections: [
      "Review what information is processed during a conversion session and how file handling is scoped.",
      "This page explains retention expectations, deletion behavior, and how users can contact support for privacy-related questions.",
    ],
  },
  {
    path: "/terms",
    title: "Terms of Service | Banklefy",
    description:
      "The operating terms for using Banklefy, including files, limits, payments, and review responsibilities.",
    heading: "Terms of service",
    sections: [
      "The terms page covers use of the platform, payment rules, conversion expectations, and customer responsibilities.",
      "It is intended to clarify access, usage boundaries, and the conditions attached to paid and free workflows.",
    ],
  },
  {
    path: "/cancellation-and-refund",
    title: "Cancellation & Refund Policy | Banklefy",
    description: "Refund timelines and how to request a refund for eligible purchases.",
    heading: "Cancellation and refund policy",
    sections: [
      "Learn how refund requests are handled, what timelines apply, and where to contact support for billing issues.",
      "This policy page gives users a clear reference before they purchase or request a refund.",
    ],
  },
  {
    path: "/shipping-and-exchange",
    title: "Shipping & Exchange Policy | Banklefy",
    description: "Banklefy is a digital service. No physical goods are shipped.",
    heading: "Shipping and exchange policy",
    sections: [
      "Banklefy is a digital service and does not ship physical products.",
      "This page exists to clarify fulfillment expectations and explain that exchanges do not apply in the same way as physical goods.",
    ],
  },
  {
    path: "/blog",
    title: "Blog | Banklefy",
    description:
      "Short notes about supported formats, conversion behavior, exports, and product updates.",
    heading: "Banklefy blog",
    sections: [
      "Read practical product notes covering exports, OCR behavior, privacy, fraud checks, and release updates.",
      "The blog is meant to help users understand how Banklefy fits into finance and operations workflows.",
    ],
    schemaType: "CollectionPage",
  },
  {
    path: "/blog/launch",
    title: "Introducing Banklefy: Bank Statement to Excel in Minutes",
    description: "Meet Banklefy and see how it speeds up statement conversion with secure processing, OCR, and accurate extraction.",
    heading: "Introducing Banklefy",
    sections: [
      "This launch note explains who Banklefy is built for and how it reduces time spent manually retyping statement data.",
      "It covers the product goal of secure, structured conversion for accounting, reconciliation, and finance review work.",
    ],
    schemaType: "Article",
  },
  {
    path: "/blog/accuracy",
    title: "How We Improve OCR Accuracy on Low-Quality Scans",
    description: "Learn the OCR safeguards and scanning tips that improve bank statement accuracy and OCR reliability.",
    heading: "Improving OCR accuracy on low-quality scans",
    sections: [
      "This article explains the safeguards Banklefy uses when statements are blurry, skewed, or captured from mobile photos.",
      "It also outlines scanning considerations that help improve recognition quality before conversion begins.",
    ],
    schemaType: "Article",
  },
  {
    path: "/blog/privacy",
    title: "Privacy by Default: Secure File Handling and Deletion Control",
    description: "How Banklefy handles temporary uploads, session-only processing, and privacy.",
    heading: "Privacy by default",
    sections: [
      "This post describes how file handling is kept tightly scoped and why session-oriented processing matters for sensitive financial documents.",
      "It helps customers understand what privacy controls exist before they upload bank statements.",
    ],
    schemaType: "Article",
  },
  {
    path: "/blog/multi-format-export",
    title: "Multi-Format Export: Excel, CSV, JSON, XML & MT940 | Banklefy",
    description:
      "Export bank statements to Excel, CSV, JSON, XML, and MT940 from a single upload for ERP and treasury systems.",
    heading: "Multi-format export from one upload",
    sections: [
      "This article covers how a single conversion can produce multiple formats for spreadsheet, accounting, treasury, and integration workflows.",
      "It is useful for teams that need the same source statement in different downstream systems without repeating manual work.",
    ],
    schemaType: "Article",
  },
  {
    path: "/blog/bulk-conversion",
    title: "Bulk Bank Statement Conversion: Multiple Files at Once | Banklefy",
    description:
      "Upload and convert multiple bank statements in one session with parallel processing and selective AI OCR.",
    heading: "Bulk bank statement conversion",
    sections: [
      "This article explains how teams can process multiple files in one session while keeping conversion flow organized.",
      "It focuses on time savings for larger finance operations and repeated reconciliation workloads.",
    ],
    schemaType: "Article",
  },
  {
    path: "/blog/underwriting",
    title: "AI-Powered Underwriting & Risk Analysis from Bank Statements | Banklefy",
    description:
      "Get ADB, FOIR score, EMI analysis, net cashflow, and balance dip analysis automatically from converted bank statements.",
    heading: "Underwriting and risk analysis",
    sections: [
      "This note explains how structured statement data supports underwriting and risk review workflows with derived financial indicators.",
      "It is intended for teams that want statement extraction to feed lending and credit evaluation processes.",
    ],
    schemaType: "Article",
  },
  {
    path: "/blog/fraud-detection",
    title: "Detecting Tampered Bank Statements with AI Fraud Alerts | Banklefy",
    description:
      "Automated fraud detection flags balance discontinuity, duplicate entries, formatting inconsistencies, and edited PDF signals in bank statements.",
    heading: "Detecting tampered statements",
    sections: [
      "This article describes the kinds of anomalies that can be highlighted when reviewing bank statements for edits or irregularities.",
      "It is useful for teams that need extra review signals before accepting statement data as trustworthy.",
    ],
    schemaType: "Article",
  },
  {
    path: "/blog/multi-language",
    title: "Multi-Language Support: Use Banklefy in Your Preferred Language",
    description:
      "Banklefy supports Hindi, Marathi, Tamil, Telugu, and more for accessible bank statement conversion across India.",
    heading: "Multi-language support",
    sections: [
      "This article covers how localized interface support helps more users work comfortably with the converter across India.",
      "It focuses on accessibility and product usability for teams with different preferred languages.",
    ],
    schemaType: "Article",
  },
  {
    path: "/blog/password-pdf",
    title: "Convert Password-Protected Bank Statement PDFs | Banklefy",
    description:
      "Upload locked bank statement PDFs, enter the password, and convert to Excel or CSV in one step.",
    heading: "Password-protected PDF conversion",
    sections: [
      "This post explains how encrypted statement PDFs can still be handled when the correct password is supplied during conversion.",
      "It helps users understand what to expect before uploading protected financial documents.",
    ],
    schemaType: "Article",
  },
];

const escapeHtml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const escapeJsonLd = (value) => value.replaceAll("<", "\\u003c");

const buildCanonical = (routePath) => `${siteUrl}${routePath === "/" ? "/" : routePath}`;

const buildStructuredData = (route) => {
  const canonical = buildCanonical(route.path);
  const base = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "Banklefy",
      url: siteUrl,
      logo: `${siteUrl}/favicon.svg`,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "Banklefy",
      publisher: { "@id": `${siteUrl}/#organization` },
      inLanguage: "en",
    },
  ];

  if (route.schemaType === "SoftwareApplication") {
    base.push({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Banklefy Bank Statement Converter",
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web Browser",
      description: route.description,
      url: canonical,
      keywords: "bank statement converter, pdf to excel, pdf to csv, edited pdf detector, FOIR checker, EMI checker, loan checker, fraud detection, bank statement analysis",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "INR",
        description: "Free trial available",
      },
    });
    return base;
  }

  if (route.schemaType === "HowTo") {
    base.push({
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: route.title,
      description: route.description,
      step: route.sections.map((text, index) => ({
        "@type": "HowToStep",
        position: index + 1,
        text,
      })),
    });
    return base;
  }

  if (route.schemaType === "FAQPage") {
    base.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: route.sections.map((text, index) => ({
        "@type": "Question",
        name: index === 0 ? "What does this FAQ page cover?" : "How does Banklefy help before conversion?",
        acceptedAnswer: {
          "@type": "Answer",
          text,
        },
      })),
    });
    return base;
  }

  if (route.schemaType === "CollectionPage") {
    base.push({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: route.title,
      description: route.description,
      url: canonical,
      isPartOf: { "@id": `${siteUrl}/#website` },
    });
    return base;
  }

  if (route.schemaType === "ContactPage") {
    base.push({
      "@context": "https://schema.org",
      "@type": "ContactPage",
      name: route.title,
      description: route.description,
      url: canonical,
      isPartOf: { "@id": `${siteUrl}/#website` },
      mainEntity: {
        "@type": "Organization",
        name: "Banklefy",
        url: siteUrl,
        email: "banklefy@gmail.com",
      },
    });
    return base;
  }

  if (route.schemaType === "Article") {
    base.push({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: route.title,
      description: route.description,
      mainEntityOfPage: canonical,
      publisher: { "@id": `${siteUrl}/#organization` },
    });
    return base;
  }

  base.push({
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: route.title,
    description: route.description,
    url: canonical,
    inLanguage: "en",
    isPartOf: { "@id": `${siteUrl}/#website` },
  });
  return base;
};

const buildHtml = (template, route) => {
  const canonical = buildCanonical(route.path);
  const title = escapeHtml(route.title);
  const description = escapeHtml(route.description);
  const heading = escapeHtml(route.heading);
  const sections = route.sections
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join("");
  const jsonLd = buildStructuredData(route)
    .map((schema) => `<script type="application/ld+json">${escapeJsonLd(JSON.stringify(schema))}</script>`)
    .join("");

  return template
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`)
    .replace(/<meta\s+name="description"[\s\S]*?>/i, `<meta name="description" content="${description}" />`)
    .replace(/<meta\s+property="og:title"[\s\S]*?>/i, `<meta property="og:title" content="${title}" />`)
    .replace(/<meta\s+property="og:description"[\s\S]*?>/i, `<meta property="og:description" content="${description}" />`)
    .replace(/<meta\s+property="og:url"[\s\S]*?>/i, `<meta property="og:url" content="${canonical}" />`)
    .replace(/<meta\s+name="twitter:title"[\s\S]*?>/i, `<meta name="twitter:title" content="${title}" />`)
    .replace(/<meta\s+name="twitter:description"[\s\S]*?>/i, `<meta name="twitter:description" content="${description}" />`)
    .replace(
      /<meta\s+name="twitter:image"[\s\S]*?>/i,
      `<meta name="twitter:url" content="${canonical}" /><meta name="twitter:image" content="https://www.banklefy.site/og-banklefy.jpg" />`,
    )
    .replace(
      /<\/head>/i,
      [
        `<link rel="canonical" href="${canonical}" />`,
        `<link rel="alternate" hrefLang="x-default" href="${canonical}" />`,
        `<link rel="alternate" hrefLang="en" href="${canonical}" />`,
        `<script>document.documentElement.classList.add('js')</script>`,
        `<style>.js [data-seo-static]{display:none}.seo-static{max-width:900px;margin:40px auto;padding:0 16px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.6;color:#111827}.seo-static h1{margin:0 0 12px;font-size:clamp(2rem,5vw,3.25rem);line-height:1.1}.seo-static p{margin:0 0 14px}.seo-static a{color:#0f766e;text-decoration:none}.seo-static a:hover{text-decoration:underline}.seo-static ul{margin:18px 0 0;padding-left:18px}</style>`,
        jsonLd,
        `</head>`,
      ].join(""),
    )
    .replace(
      /<div id="root"><\/div>/i,
      `<main data-seo-static class="seo-static"><h1>${heading}</h1><p>${description}</p>${sections}<ul><li><a href="/">Home</a></li><li><a href="/features">Features</a></li><li><a href="/pricing">Pricing</a></li><li><a href="/about">About</a></li><li><a href="/contact">Contact</a></li><li><a href="/privacy">Privacy Policy</a></li><li><a href="/sample-data">Sample Data</a></li></ul></main><div id="root"></div>`,
    );
};

const writeRouteHtml = async (routePath, html) => {
  const targetDir = routePath === "/" ? distDir : path.join(distDir, routePath.replace(/^\//, ""));
  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(path.join(targetDir, "index.html"), html, "utf8");
};

const extractBuiltAssets = (builtHtml) => {
  const stylesheet = builtHtml.match(/<link rel="stylesheet"[^>]+href="[^"]+"[^>]*>/i)?.[0] ?? "";
  const moduleScript = builtHtml.match(/<script type="module"[^>]+src="[^"]+"[^>]*><\/script>/i)?.[0] ?? "";
  return [stylesheet, moduleScript].filter(Boolean).join("\n    ");
};

const main = async () => {
  const sourceTemplate = await fs.readFile(path.join(repoRoot, "index.html"), "utf8");
  const builtTemplate = await fs.readFile(path.join(distDir, "index.html"), "utf8");
  const builtAssets = extractBuiltAssets(builtTemplate);
  const template = sourceTemplate.replace(
    /<script type="module" src="\/src\/main\.tsx"><\/script>\s*<script src="https:\/\/checkout\.razorpay\.com\/v1\/checkout\.js" defer><\/script>/i,
    `${builtAssets}\n      <script src="https://checkout.razorpay.com/v1/checkout.js" defer></script>`,
  );

  for (const route of routes) {
    const html = buildHtml(template, route);
    await writeRouteHtml(route.path, html);
  }

  console.log(`[seo] Generated ${routes.length} static fallback pages.`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
