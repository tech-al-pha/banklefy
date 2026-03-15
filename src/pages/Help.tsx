import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeDollarSign,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  FileSpreadsheet,
  LifeBuoy,
  Lock,
  Mail,
  MessageCircle,
  Monitor,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { useLanguage } from "@/contexts/LanguageContext";
import SupportContactDialog from "@/components/SupportContactDialog";

const Help = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  useEffect(() => {
    if (!location.hash) {
      return;
    }
    const targetId = location.hash.replace("#", "");
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location.hash]);

  const helpSections = [
    {
      id: "getting-started",
      icon: Sparkles,
      title: "Getting Started",
      items: [
        "Go to the home page and click the upload button or scroll to the demo.",
        "Upload a clear statement file and wait for processing to complete.",
        "Review the preview and download the results in your chosen format.",
        "Use the Sample Report page to understand what the final output looks like.",
        "Create an account to get higher daily limits and access your dashboard.",
        "Keep the tab open until processing finishes.",
      ],
    },
    {
      id: "supported-files",
      icon: FileText,
      title: "Supported Files",
      items: [
        "PDF, JPG, and PNG files are supported (scans and photos).",
        "Multi-page PDFs are supported. Keep pages in the correct order.",
        "If a file fails to upload, try re-exporting or splitting large PDFs.",
        "Avoid extremely low-resolution images; they reduce extraction quality.",
        "Screenshots with UI overlays or notifications can reduce accuracy.",
        "If the statement has very small text, use a higher-resolution scan.",
      ],
    },
    {
      id: "upload-tips",
      icon: CheckCircle2,
      title: "Upload Tips",
      items: [
        "Use flat, well-lit scans without shadows or glare.",
        "Make sure all transaction tables are visible in the image.",
        "Keep text upright; rotate pages before upload if needed.",
        "Avoid cropping the header or footer where balances appear.",
        "Use the original statement file whenever possible.",
        "If a scan is faint, increase contrast before uploading.",
      ],
    },
    {
      id: "password-pdfs",
      icon: Lock,
      title: "Password-Protected PDFs",
      items: [
        "Enter the password before conversion to unlock the preview.",
        "If the password is incorrect, you will be prompted to retry.",
        "We do not store your PDF password.",
        "If you do not know the password, export an unlocked copy first.",
        "Bank statements with owner-level restrictions cannot be bypassed.",
      ],
    },
    {
      id: "preview",
      icon: Eye,
      title: "Preview and Page Selection",
      items: [
        "A preview is shown to confirm the file loaded correctly.",
        "Use the page selector to confirm each page is readable.",
        "If preview is blank, the file may be corrupted or unsupported.",
        "Try a different PDF export if preview fails to render.",
      ],
    },
    {
      id: "processing",
      icon: Clock,
      title: "Processing Time",
      items: [
        "Most files are processed quickly, but large files may take longer.",
        "Keep the page open while conversion runs.",
        "Slow networks can delay uploads; try a stable connection.",
        "If processing stalls, refresh and try again with the same file.",
        "Large multi-page statements may take extra time to finish.",
      ],
    },
    {
      id: "exports",
      icon: Download,
      title: "Exports and Downloads",
      items: [
        "Export to Excel (.xlsx), CSV, JSON, MT940, and PDF reports.",
        "Download files during your active session.",
        "If a download fails, refresh the page and retry the export.",
        "For accounting tools, Excel or CSV is recommended.",
        "PDF reports are best for sharing, Excel/CSV are best for analysis.",
        "If files look empty, re-check the statement quality and retry.",
      ],
    },
    {
      id: "output-verification",
      icon: FileSpreadsheet,
      title: "Output Verification",
      items: [
        "Verify opening and closing balances first.",
        "Compare total credits, debits, and net flow with the statement.",
        "Check for duplicate rows if the statement has repeated headers.",
        "If a value looks wrong, confirm the original page is readable.",
        "For critical workflows, always review before submitting.",
      ],
    },
    {
      id: "accuracy",
      icon: CheckCircle2,
      title: "Accuracy Tips",
      items: [
        "Upload full pages with minimal blur or compression artifacts.",
        "Prefer scans over photos when possible.",
        "Keep page order correct for multi-page statements.",
        "If totals look off, recheck the input file for missing pages.",
        "If amounts are merged into one column, try a cleaner export.",
        "Handwritten or stamped text may reduce accuracy.",
      ],
    },
    {
      id: "data-formatting",
      icon: FileText,
      title: "Data Formatting",
      items: [
        "Dates and amounts are extracted from visible statement tables.",
        "If your bank uses unusual layouts, verify column alignment.",
        "Merged rows or split descriptions may need manual review.",
        "Use the PDF report for summaries and the Excel/CSV for raw data.",
        "Debit and credit columns follow the statement layout when possible.",
        "Negative values are preserved as they appear in the statement.",
      ],
    },
    {
      id: "errors",
      icon: AlertTriangle,
      title: "Errors and Troubleshooting",
      items: [
        'If you see "CAPTCHA not ready," refresh and try again.',
        "If the PDF fails to load, the file may be corrupted. Re-export and retry.",
        "If no transactions appear, check that the statement is readable and not rotated.",
        "If you get a network error, retry after a few minutes.",
        "If you hit a daily limit, sign in or wait for reset.",
        "If preview loads but export fails, refresh and re-export.",
      ],
    },
    {
      id: "limits",
      icon: Clock,
      title: "Daily Limits and Usage",
      items: [
        "Anonymous users get 2 pages per day.",
        "Signed-in users get 5 pages per day.",
        "Paid plans increase your limits based on the plan.",
        "Free and anonymous limits reset at midnight in your local time zone. Paid plans reset with their billing cycle.",
        "If you need more, upgrade on the Pricing page.",
      ],
    },
    {
      id: "account",
      icon: ShieldCheck,
      title: "Account and Sign In",
      items: [
        "Create an account to track usage and unlock higher limits.",
        "Use the Forgot Password option if you cannot sign in.",
        "Keep your email address accurate for receipts and support.",
        "Sign out from the profile menu if using a shared device.",
        "If login fails, double-check your email and password.",
      ],
    },
    {
      id: "billing",
      icon: BadgeDollarSign,
      title: "Billing and Plans",
      items: [
        "One-time, monthly, and yearly plans are available on the Pricing page.",
        "Payments are processed securely via Razorpay.",
        "Refund details and requests are handled from the Pricing page.",
        "Keep your order ID for faster support.",
        "If payment fails, retry after a minute or use a different method.",
      ],
    },
    {
      id: "security",
      icon: ShieldCheck,
      title: "Security and Privacy",
      items: [
        "Data is encrypted in transit.",
        "Files and results are available while your session is active.",
        "reCAPTCHA is used to prevent abuse.",
        "Do not upload credentials or passwords, only statements.",
        "Sensitive data should be reviewed before sharing outputs.",
      ],
    },
    {
      id: "chat-aura",
      icon: MessageCircle,
      title: "Chat Aura",
      items: [
        "Ask questions about your statement and get quick insights.",
        "Guests get 1 chat interaction per session. Sign in for more.",
        "Best results when a statement is uploaded first.",
        "If responses look off, re-check the statement quality.",
        "Use specific questions like totals, categories, or unusual debits.",
      ],
    },
    {
      id: "browser",
      icon: Monitor,
      title: "Browser and Device Tips",
      items: [
        "Use the latest version of Chrome, Edge, or Firefox.",
        "Enable JavaScript and allow cookies for the app to work.",
        "Desktop browsers are best for very large PDFs.",
        "Mobile works for quick page processing but large files may be slower.",
      ],
    },
    {
      id: "mobile",
      icon: Smartphone,
      title: "Mobile Scans",
      items: [
        "Use a scanning app for clearer results than camera photos.",
        "Hold the phone steady and keep the page flat.",
        "Avoid reflections on glossy paper.",
        "Check that all corners are visible before upload.",
      ],
    },
    {
      id: "support",
      icon: LifeBuoy,
      title: "Contact Support",
      items: [
        "Email support for account, billing, or conversion issues.",
        "Include your order ID and file name when possible.",
        "Describe the issue and attach a screenshot if relevant.",
        "We reply as quickly as possible during business hours.",
        "Add your browser and device details for faster troubleshooting.",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background text-white font-sans selection:bg-primary/30">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-primary/10 bg-ink/40 backdrop-blur-md p-4">
        <div className="container mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="back-pill w-full sm:w-auto"
          >
            <ArrowLeft size={18} /> {t("common.backToHome")}
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 sm:px-6 pt-24 pb-16 sm:pt-28 sm:pb-20 max-w-6xl">
        <section className="text-center mb-14 animate-in fade-in slide-in-from-bottom-5 duration-700">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-primary">
            <LifeBuoy className="h-4 w-4" />
            {t("footer.helpCenter")}
          </div>
          <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white">
            {t("helpPage.title")}
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("helpPage.subtitle")}
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          {helpSections.map((section) => {
            const Icon = section.icon;
            return (
              <div
                key={section.id}
                id={section.id}
                className="glass-card p-6 rounded-2xl border border-primary/10"
              >
                <div className="flex items-start gap-4">
                  <div className="rounded-full bg-primary/10 p-3 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{section.title}</h3>
                    <ul className="mt-3 space-y-2 text-sm text-muted-foreground leading-relaxed">
                      {section.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <section
          id="contact"
          className="mt-10 flex flex-col items-start gap-4 rounded-2xl border border-primary/10 bg-surface/80 p-6 sm:p-8"
        >
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{t("helpPage.sections.contact.title")}</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {t("helpPage.sections.contact.desc")}
              </p>
            </div>
          </div>
          <SupportContactDialog
            source="help_page"
            trigger={
              <Button className="bg-primary text-primary-foreground shadow-neon">
                {t("helpPage.cta.contact")}
              </Button>
            }
          />
        </section>
      </main>
    </div>
  );
};

export default Help;
