import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Linkedin, Mail, MapPin, MessageCircle, ShieldCheck, X, Zap } from "lucide-react";
import Logo from "@/components/Logo";
import SupportContactDialog from "@/components/SupportContactDialog";
import AutoHideHeader from "@/components/AutoHideHeader";

const productPoints = [
  "Converts bank statements into reviewable exports such as Excel, CSV, JSON, MT940, and other supported formats.",
  "Uses direct parsing for text PDFs and OCR only for scans or image-based pages that need it.",
  "Helps users review balances, transactions, and export-ready data more quickly than manual copy-paste.",
];

const principles = [
  "Keep the workflow simple enough for accountants, finance teams, and small businesses.",
  "Prefer deterministic parsing before OCR where the source file allows it.",
  "Show usage limits, pricing, and billing flow clearly inside the app.",
  "Avoid claiming outcomes that depend on source quality or user review.",
];

const supportItems = [
  "Conversion issues or missing rows",
  "Billing, refunds, and plan activation",
  "Privacy or account-related requests",
  "General product questions",
];

const AboutPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-white selection:bg-primary/30">
      <AutoHideHeader as="nav" className="border-b border-primary/10 bg-ink/40 p-4 backdrop-blur-md">
        <div className="container mx-auto flex flex-row items-center justify-between gap-3">
          <Logo />
          <Button variant="ghost" onClick={() => navigate("/")} className="back-pill">
            <ArrowLeft size={18} /> Back to Home
          </Button>
        </div>
      </AutoHideHeader>

      <main className="container mx-auto max-w-5xl px-4 pb-16 pt-24 sm:px-6 sm:pt-28">
        <section className="mb-16 space-y-6">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.3em] text-primary/80">About Banklefy</p>
            <h1
              className="text-3xl md:text-5xl font-black uppercase tracking-tight leading-[1.05]"
              style={{ fontFamily: '"DM Serif Display", "Cormorant Garamond", "Noir", serif' }}
            >
              A bank statement conversion tool
              <span className="block text-white/90">built for practical review work.</span>
            </h1>
            <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
              Banklefy is designed to help users turn bank statements into structured outputs that are easier to inspect, export, and work with. It is a processing tool, not a bank, an accounting system, or a substitute for human review.
            </p>
          </div>
        </section>

        <section className="mb-16 grid grid-cols-3 gap-6">
          <div className="glass-card space-y-3 rounded-2xl p-6 transition-all hover:shadow-neon">
            <ShieldCheck className="text-primary" size={30} />
            <h2 className="text-sm uppercase tracking-[0.25em] text-white/90">What It Does</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Converts statements into structured outputs for review, analysis, and downstream accounting workflows.
            </p>
          </div>
          <div className="glass-card space-y-3 rounded-2xl p-6 transition-all hover:shadow-neon">
            <Zap className="text-primary" size={30} />
            <h2 className="text-sm uppercase tracking-[0.25em] text-white/90">How It Works</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Text PDFs are parsed directly when possible. OCR is used for scanned or image-based pages where direct parsing is not enough.
            </p>
          </div>
          <div className="glass-card space-y-3 rounded-2xl p-6 transition-all hover:shadow-neon">
            <Mail className="text-primary" size={30} />
            <h2 className="text-sm uppercase tracking-[0.25em] text-white/90">Support</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Users can reach support for conversion issues, billing questions, privacy requests, and account help.
            </p>
          </div>
        </section>

        <section className="mb-16 grid grid-cols-2 gap-8">
          <div className="space-y-4">
            <h2 className="border-b border-white/10 pb-4 text-2xl tracking-wide">Product summary</h2>
            <ul className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              {productPoints.map((point) => (
                <li key={point} className="glass-card rounded-2xl p-4">
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="border-b border-white/10 pb-4 text-2xl tracking-wide">Operating principles</h2>
            <ul className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              {principles.map((point) => (
                <li key={point} className="glass-card rounded-2xl p-4">
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="contact" className="scroll-mt-28 space-y-8">
          <div className="space-y-3">
            <h2 className="border-b border-white/10 pb-4 text-2xl tracking-wide">About & Contact</h2>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              This section handles both company information and support contact details. If you are reporting a problem, include the file name, conversion ID, order ID for billing issues, and a screenshot when possible.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 transition-all hover:shadow-neon">
            <h3 className="text-lg font-semibold text-white">Common reasons to contact support</h3>
            <ul className="mt-4 grid grid-cols-2 gap-3 text-sm text-muted-foreground">
              {supportItems.map((item) => (
                <li key={item} className="glass-card rounded-xl p-4">
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <a
              href="https://t.me/n3x4z"
              target="_blank"
              rel="noopener noreferrer"
              className="glass-card group flex items-center gap-6 rounded-[2rem] p-8 transition-all hover:shadow-neon"
            >
              <div className="rounded-full bg-primary/10 p-4 text-primary transition-transform group-hover:scale-110">
                <MessageCircle size={24} />
              </div>
              <div>
                <p className="text-xs tracking-widest text-muted-foreground">Telegram</p>
                <p className="text-xl">@n3x4z</p>
              </div>
            </a>

            <a
              href="https://www.linkedin.com/in/faizan-rizvi-8589a93a8"
              target="_blank"
              rel="noopener noreferrer"
              className="glass-card group flex items-center gap-6 rounded-[2rem] p-8 transition-all hover:shadow-neon"
            >
              <div className="rounded-full bg-primary/10 p-4 text-primary transition-transform group-hover:scale-110">
                <Linkedin size={24} />
              </div>
              <div>
                <p className="text-xs tracking-widest text-muted-foreground">LinkedIn</p>
                <p className="text-xl">Faizan Rizvi</p>
              </div>
            </a>

            <a
              href="https://x.com/inspirexali"
              target="_blank"
              rel="noopener noreferrer"
              className="glass-card group flex items-center gap-6 rounded-[2rem] p-8 transition-all hover:shadow-neon"
            >
              <div className="rounded-full bg-primary/10 p-4 text-primary transition-transform group-hover:scale-110">
                <X size={24} />
              </div>
              <div>
                <p className="text-xs tracking-widest text-muted-foreground">X</p>
                <p className="text-xl">@inspirexali</p>
              </div>
            </a>

            <SupportContactDialog
              source="about_page"
              trigger={
                <div className="glass-card group flex cursor-pointer items-center gap-6 rounded-[2rem] p-8 transition-all hover:shadow-neon">
                  <div className="rounded-full bg-primary/10 p-4 text-primary transition-transform group-hover:scale-110">
                    <Mail size={24} />
                  </div>
                  <div>
                    <p className="text-xs tracking-widest text-muted-foreground">Support form</p>
                    <p className="text-xl">Contact Support</p>
                  </div>
                </div>
              }
            />

            <a
              href="https://maps.google.com/?q=Prem%20Nagar%201%2C%20Kota%2C%20Rajasthan%20324004%2C%20India"
              target="_blank"
              rel="noopener noreferrer"
              className="glass-card group flex items-center gap-6 rounded-[2rem] p-8 transition-all hover:shadow-neon md:col-span-2"
            >
              <div className="rounded-full bg-primary/10 p-4 text-primary">
                <MapPin size={24} />
              </div>
              <div>
                <p className="text-xs tracking-widest text-muted-foreground">Location</p>
                <p className="text-xl text-white/85">Prem Nagar 1, Kota, Rajasthan 324004, India</p>
              </div>
            </a>
          </div>
        </section>

        <footer className="mt-20 border-t border-white/5 pt-8 text-center text-xs tracking-[0.3em] text-muted-foreground">
          © 2026 Banklefy
        </footer>
      </main>
    </div>
  );
};

export default AboutPage;
