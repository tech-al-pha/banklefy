import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  BadgeDollarSign,
  Brain,
  Clock,
  Cookie,
  Database,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Globe,
  LifeBuoy,
  Lock,
  LockOpen,
  Mail,
  MapPin,
  Scale,
  Shield,
  ShieldCheck,
  Users,
} from "lucide-react";

export type InfoCard = {
  icon: LucideIcon;
  title: string;
  content: string;
};

export type BulletCard = {
  icon: LucideIcon;
  title: string;
  items: string[];
};

export type HelpSection = BulletCard & {
  id: string;
};

export type ContactCard = {
  icon: LucideIcon;
  title: string;
  content: string;
  href?: string;
  external?: boolean;
  actionLabel?: string;
};

export const termsSections: InfoCard[] = [
  {
    icon: FileText,
    title: "What the service does",
    content:
      "Banklefy converts uploaded bank statements into structured outputs such as Excel, CSV, JSON, MT940, and other export formats shown inside the app. Text-based PDFs are parsed directly. Scanned or image-based pages may use OCR.",
  },
  {
    icon: ShieldCheck,
    title: "Your responsibility",
    content:
      "You are responsible for the files you upload, the accuracy of the information you provide, and the way you use the results. Review every output before relying on it for accounting, lending, tax, or compliance work.",
  },
  {
    icon: Database,
    title: "File handling",
    content:
      "Uploaded files are processed to generate conversions and analysis. If you need a copy of the output, download it before ending your session. Temporary processing files may be removed after the job finishes or fails.",
  },
  {
    icon: Clock,
    title: "Usage limits",
    content:
      "The service applies free and paid usage limits. Do not try to bypass quotas, authentication checks, rate limits, or payment enforcement.",
  },
  {
    icon: BadgeDollarSign,
    title: "Payments and plans",
    content:
      "One-time packs and any applicable free usage are sold as shown on the Pricing page. Payments are processed through Razorpay. We store the payment references needed to unlock features and support billing questions.",
  },
  {
    icon: Users,
    title: "Third-party services",
    content:
      "The service uses Supabase for authentication and storage, Google reCAPTCHA for abuse prevention, and OCR providers when OCR is needed. Those providers have their own terms and privacy policies.",
  },
  {
    icon: AlertCircle,
    title: "Accuracy and review",
    content:
      "Results should be reviewed before you use them for accounting, lending, tax, audit, or compliance work. Output quality can depend on scan quality, statement layout, and source file quality.",
  },
  {
    icon: Scale,
    title: "Liability and law",
    content:
      "The service is provided on an as-is and as-available basis. To the maximum extent allowed by law, liability is limited as described in the full terms. These terms are governed by the laws of India.",
  },
];

export const privacySections: InfoCard[] = [
  {
    icon: Database,
    title: "Data we collect",
    content:
      "We collect account details such as your email address, usage counters, billing references, and support messages. We also receive technical data such as IP address, browser type, device information, and timestamps for security, fraud prevention, and troubleshooting.",
  },
  {
    icon: Eye,
    title: "How we use data",
    content:
      "We use data to authenticate users, convert statements, generate exports, track usage limits, provide support, process payments, and prevent abuse. We do not use the service to sell advertising or build consumer ad profiles.",
  },
  {
    icon: Users,
    title: "When data is shared",
    content:
      "We share data only with the providers that help run the service, including Supabase for authentication and storage, Google reCAPTCHA for abuse prevention, OCR providers when OCR is used, and Razorpay for payment processing. We do not sell personal data.",
  },
  {
    icon: Clock,
    title: "Storage and retention",
    content:
      "Uploaded files are used to process your request. Temporary files may remain available during processing and may be cleaned up after the job finishes or fails. Account records such as plan activation, support history, and usage limits can remain associated with your account until they are deleted or no longer needed.",
  },
  {
    icon: Shield,
    title: "Security controls",
    content:
      "Traffic between your browser and the service is protected with HTTPS/TLS. Access to backend systems is controlled through service credentials and platform access controls. No internet service can promise perfect security, but we try to limit access and collect only what we need to operate the app.",
  },
  {
    icon: LockOpen,
    title: "Your choices",
    content:
      "You can sign out, clear browser storage, and contact support about account or data-related requests. If you are using a shared device, sign out when you finish and remove downloaded files from that device if needed.",
  },
  {
    icon: Mail,
    title: "Contact and requests",
    content:
      "For privacy questions, deletion requests, or access requests, contact support using the support form or the email shown on the About page.",
  },
  {
    icon: Cookie,
    title: "Cookies and browser storage",
    content:
      "Banklefy uses browser storage and a small number of first-party settings to keep the app working, such as session state and interface preferences. Third-party providers used by the app, including reCAPTCHA, may also place cookies or collect browser signals.",
  },
  {
    icon: BadgeDollarSign,
    title: "Refunds",
    content:
      "Refunds are handled according to the policy shown on the cancellation and refund page. If you have a billing question, contact support and include your order reference.",
  },
];

export const securitySections: InfoCard[] = [
  {
    icon: Shield,
    title: "Data handling",
    content:
      "Files are processed to generate exports and analysis. Temporary processing files can exist while a job is running and are removed after processing or after a failed run.",
  },
  {
    icon: Lock,
    title: "Encryption",
    content:
      "Traffic between your browser and the service uses HTTPS/TLS. Third-party providers used by the platform also communicate over encrypted connections.",
  },
  {
    icon: ShieldCheck,
    title: "Access control",
    content:
      "You should sign in to keep higher limits and keep your data tied to your account. Shared-device users should sign out after use.",
  },
  {
    icon: Database,
    title: "Retention and deletion",
    content:
      "Account records such as usage counters, billing references, and support requests can remain tied to your account. Temporary processing files may be cleaned up after processing or after failed jobs.",
  },
  {
    icon: Globe,
    title: "Third-party dependencies",
    content:
      "The service relies on Supabase, Google reCAPTCHA, Razorpay, and OCR providers. Their availability and policies can affect service behavior.",
  },
  {
    icon: AlertCircle,
    title: "Incident response",
    content:
      "If we detect a security issue, we investigate and take corrective action. When notification is required by law, affected users will be informed as required.",
  },
];

export const contactCards: ContactCard[] = [
  {
    icon: LifeBuoy,
    title: "Support form",
    content:
      "Use the support form for conversion issues, account access, billing questions, or export problems. Include the file name, conversion ID, and a screenshot if possible.",
    actionLabel: "Open Support",
  },
  {
    icon: Mail,
    title: "Email",
    content: "Prefer email? Send the same details to banklefy@gmail.com.",
    href: "mailto:banklefy@gmail.com",
    actionLabel: "Email Support",
  },
];

export const faqSections: InfoCard[] = [
  {
    icon: FileText,
    title: "Which files are supported?",
    content:
      "PDF, JPG, and PNG files are supported. Text-based PDFs use the code path first. Scanned or image-based statements use OCR only where it is needed.",
  },
  {
    icon: Lock,
    title: "Do you support password-protected PDFs?",
    content:
      "Yes. Enter the statement password in the unlock field before conversion. Password protection alone does not mean the file must use OCR.",
  },
  {
    icon: Clock,
    title: "How long does conversion take?",
    content:
      "Timing depends on file size, page count, scan quality, and whether OCR is needed. Large files can still take time even when they are text-based.",
  },
  {
    icon: Database,
    title: "Do you store my files?",
    content:
      "Files stay available only during the active session. Temporary uploads may be cleaned up after processing or a failed run.",
  },
  {
    icon: BadgeDollarSign,
    title: "How do refunds work?",
    content:
      "Refunds are handled according to the cancellation and refund policy linked from the footer. Contact support with your order details if you need help.",
  },
];

export const helpSections: HelpSection[] = [
  {
    id: "supported-files",
    icon: FileText,
    title: "Supported files",
    items: [
      "PDF, JPG, and PNG files are supported.",
      "Text-based PDFs are parsed directly before OCR is considered.",
      "Scanned or image-based files use OCR only for the pages that need it.",
      "Keep multi-page files in the correct order.",
    ],
  },
  {
    id: "upload-tips",
    icon: ShieldCheck,
    title: "Upload tips",
    items: [
      "Use the original statement file when possible.",
      "Keep pages in order and avoid cropping the header or footer.",
      "Scans should be flat, upright, and readable.",
      "If a file is blurry or incomplete, re-export it from the bank portal first.",
    ],
  },
  {
    id: "password-pdfs",
    icon: Lock,
    title: "Password-protected PDFs",
    items: [
      "Enter the password before conversion.",
      "If the password is wrong, the app will ask you to try again.",
      "We do not store your PDF password.",
    ],
  },
  {
    id: "processing-time",
    icon: Clock,
    title: "Processing time",
    items: [
      "Text PDFs are usually faster.",
      "Large PDFs and scanned pages can take longer.",
      "Keep the tab open until processing finishes.",
    ],
  },
  {
    id: "exports",
    icon: Download,
    title: "Exports",
    items: [
      "You can download Excel, CSV, JSON, MT940, and PDF outputs.",
      "Use Excel or CSV for analysis and accounting workflows.",
      "Use the sample report to see the final output format.",
    ],
  },
  {
    id: "output-checks",
    icon: FileSpreadsheet,
    title: "Output checks",
    items: [
      "Check opening and closing balances first.",
      "Verify debit, credit, and balance columns against the source page.",
      "If a row looks wrong, recheck the original page quality.",
    ],
  },
  {
    id: "common-issues",
    icon: AlertCircle,
    title: "Common issues",
    items: [
      "If a file fails, re-export it from the bank portal or use a cleaner scan.",
      "If preview is blank, the file may be corrupted or unsupported.",
      "If no rows appear, confirm that the source page is readable and complete.",
    ],
  },
  {
    id: "limits-billing",
    icon: BadgeDollarSign,
    title: "Limits and billing",
    items: [
      "Anonymous sessions have lower limits than signed-in free accounts.",
      "Paid packs raise the page limit shown on the Pricing page.",
      "Billing and plan activation use Razorpay.",
    ],
  },
  {
    id: "security",
    icon: ShieldCheck,
    title: "Security",
    items: [
      "Keep your account signed out on shared devices.",
      "Do not upload passwords or credentials unless they are part of the statement password flow.",
      "Use the About page for privacy or security questions.",
    ],
  },
  {
    id: "usage-limits",
    icon: BadgeDollarSign,
    title: "Usage limits",
    items: [
      "Anonymous sessions default to 2 pages per day.",
      "Signed-in free accounts default to 5 pages per day.",
      "Current limits are shown on the Pricing page and in your dashboard.",
      "Paid packs raise the page limit that is applied to your account.",
    ],
  },
  {
    id: "support",
    icon: LifeBuoy,
    title: "Support",
    items: [
      "Use the support form if you need help with a file, billing, or a conversion result.",
      "Include the file name and conversion ID if available.",
    ],
  },
];

export const aboutHighlights: InfoCard[] = [
  {
    icon: FileText,
    title: "What Banklefy does",
    content:
      "Banklefy converts bank statements into structured outputs for review, reconciliation, reporting, and downstream accounting work.",
  },
  {
    icon: Brain,
    title: "How it works",
    content:
      "Text PDFs are handled with deterministic parsing first. Scanned or image-based files use OCR only where the page needs it.",
  },
  {
    icon: Database,
    title: "What it stores",
    content:
      "Usage history and billing references can remain in your account, but uploaded files and exports are intended for active-session access only.",
  },
  {
    icon: Scale,
    title: "What it is not",
    content:
      "Banklefy is not a bank, a ledger, or a source of truth. It is a processing tool. You still need to verify the result before using it in production work.",
  },
];

export const aboutPrinciples: BulletCard[] = [
  {
    icon: ShieldCheck,
    title: "Operating principles",
    items: [
      "Deterministic parsing first for text PDFs.",
      "OCR only for scanned or image-based pages that need it.",
      "Balance checks to reduce silent debit and credit mistakes.",
      "Minimal retention and clear deletion paths.",
    ],
  },
  {
    icon: Users,
    title: "Designed for",
    items: [
      "Accountants and tax professionals.",
      "Finance teams and bookkeepers.",
      "Founders or operators who need quick reviewable exports.",
    ],
  },
];

export const aboutContacts: ContactCard[] = [
  {
    icon: LifeBuoy,
    title: "Support",
    content:
      "Use the support form for conversion, billing, account, or privacy questions.",
    actionLabel: "Contact Support",
  },
  {
    icon: Mail,
    title: "Email",
    content: "banklefy@gmail.com",
    href: "mailto:banklefy@gmail.com",
    actionLabel: "Send Email",
  },
  {
    icon: MapPin,
    title: "HQ",
    content: "Prem Nagar, Kota, Rajasthan 324004",
    href: "https://www.google.com/maps/search/?api=1&query=Prem%20Nagar%2C%20Kota%2C%20Rajasthan%2C%20India",
    external: true,
    actionLabel: "Open Map",
  },
];
