import { Button } from "@/components/ui/button";
import { Shield, ArrowLeft, FileText, CheckCircle, AlertCircle, Scale, Zap, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import SupportContactDialog from "@/components/SupportContactDialog";

const Terms = () => {
  const navigate = useNavigate();

  const sections = [
    {
      icon: FileText,
      title: "Acceptance of Terms",
      content: "By accessing or using Banklefy, you agree to these Terms. If you do not agree, do not use the service.",
    },
    {
      icon: CheckCircle,
      title: "Accounts & Security",
      content: "If you create an account, provide accurate information and keep your credentials secure. You are responsible for activity that occurs under your account.",
    },
    {
      icon: Heart,
      title: "Your Content & License",
      content: "You retain ownership of your files. You grant us a limited license to process, store, and transmit your files and results solely to provide and support the service. Download access remains available while your session is active and while your files remain in your account.",
    },
    {
      icon: AlertCircle,
      title: "Acceptable Use",
      content: "Do not use the service for unlawful, harmful, or abusive activities. Do not upload malware or infringe the rights of others. Do not attempt to reverse engineer or disrupt the service.",
    },
    {
      icon: Zap,
      title: "Service Availability & Changes",
      content: "We may change, suspend, or discontinue parts of the service at any time. We may impose usage limits to protect the service and users.",
    },
    {
      icon: Scale,
      title: "Fees & Billing",
      content: "Some features may require payment. Prices and plans may change over time. Refunds, if any, are handled per our policies or as required by law.",
    },
    {
      icon: AlertCircle,
      title: "Refunds & Abuse Prevention",
      content: "Eligible refunds are processed within 14 days, subject to usage-based eligibility and review. Excessive or abusive refund requests may lead to account restrictions to protect the platform.",
    },
    {
      icon: Shield,
      title: "Third-Party Services",
      content: "We rely on third-party providers (such as Supabase, reCAPTCHA, and Razorpay) to operate the service. Your use of those services may be subject to their terms and privacy policies.",
    },
    {
      icon: FileText,
      title: "Disclaimer of Warranties",
      content: "The service is provided on an \"as-is\" and \"as-available\" basis. We do not guarantee accuracy, availability, or fitness for a particular purpose. You should verify outputs before relying on them and use the service at your own risk.",
    },
    {
      icon: Scale,
      title: "Limitation of Liability",
      content: "To the maximum extent permitted by law, Banklefy is not liable for indirect, incidental, or consequential damages, or for loss of data or profits. If liability is found, it will be limited to the amount you paid for the service in the 12 months before the claim, if any.",
    },
    {
      icon: Scale,
      title: "Governing Law",
      content: "These terms are governed by the laws of India, and you submit to the exclusive jurisdiction of the courts located there.",
    },
    {
      icon: FileText,
      title: "Payment Processing",
      content: "Payments and subscriptions are handled through Razorpay. Your payment information is sent directly to Razorpay and processed under their Terms & Conditions and Privacy Policy; we only store invoices and confirmation tokens needed to grant access to premium features.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-surface-elevated/80 backdrop-blur-xl border-b border-primary/20">
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Logo />
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')} 
              className="back-pill w-full sm:w-auto"
            >
              <ArrowLeft size={18} /> Back to Home
            </Button>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="pt-32 pb-16 px-6">
        <div className="container mx-auto max-w-4xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/60 backdrop-blur-lg border border-primary/30 mb-4">
            <Scale className="w-4 h-4 text-primary" />
            <span className="text-sm text-foreground/80">Terms & Conditions</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold">
            Terms of Service
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Please read these terms and conditions carefully before using Banklefy.
          </p>
          <p className="text-sm text-muted-foreground">
            Please review our <Button variant="link" className="px-1 text-primary" onClick={() => navigate('/privacy')}>Privacy Policy</Button>.
          </p>
          <p className="text-sm text-muted-foreground">
            Last updated: March 15, 2026
          </p>
        </div>
      </section>

      {/* Terms Sections */}
      <section className="py-12 px-6">
        <div className="container mx-auto max-w-4xl space-y-8">
          {sections.map((section, index) => (
            <div 
              key={index}
              className="bg-surface-elevated/80 backdrop-blur-lg border border-primary/20 rounded-2xl p-8 space-y-4 hover:border-primary/40 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 duration-700"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center flex-shrink-0">
                  <section.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-foreground">
                    {section.title}
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {section.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 px-6 mb-16">
        <div className="container mx-auto max-w-4xl text-center space-y-6">
          <h2 className="text-3xl font-bold">Questions About These Terms?</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            If you have any questions about our Terms of Service, please contact support.
          </p>
          <SupportContactDialog
            source="terms_page"
            trigger={
              <Button
                size="lg"
                className="bg-primary text-primary-foreground shadow-neon"
              >
                Contact Support
              </Button>
            }
          />
          <Button
            size="lg"
            className="back-pill"
            onClick={() => navigate('/')}
          >
            Back to Home
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-primary/20 py-8 px-6">
        <div className="container mx-auto text-center text-xs text-muted-foreground tracking-[0.2em] uppercase">
          <p>© 2026 Banklefy | All rights reserved</p>
        </div>
      </footer>
    </div>
  );
};

export default Terms;
