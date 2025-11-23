import { Button } from "@/components/ui/button";
import { Shield, Lock, Eye, Trash2, FileCheck, Globe, Brain } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Privacy = () => {
  const navigate = useNavigate();

  const sections = [
    {
      icon: Trash2,
      title: "Zero Data Retention",
      content: "Your uploaded files are automatically deleted after conversion. We don't keep anything. Your data never stays on our servers beyond the processing time needed."
    },
    {
      icon: Lock,
      title: "End-to-End Encryption",
      content: "All file transfers are encrypted using the latest TLS 1.4 protocols. Your documents are protected with military-grade security during upload, processing, and download."
    },
    {
      icon: Eye,
      title: "No Tracking",
      content: "We don't use cookies to track you. No ads, no profiling, no hidden scripts. Your privacy is respected at every step."
    },
    {
      icon: Brain,
      title: "AI-Powered, Human-Free",
      content: "Your data is processed by secure AI systems — no human ever sees your files. Everything is automated, private, and confidential."
    },
    {
      icon: Globe,
      title: "Compliance-Ready",
      content: "Built with GDPR, CCPA, and future-forward privacy standards in mind. We're committed to protecting your rights and data in 2026 and beyond."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-dark text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-primary/10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div 
              className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent cursor-pointer"
              onClick={() => navigate('/')}
            >
              Akromeda
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-primary/50 hover:bg-primary/10"
              onClick={() => navigate('/')}
            >
              Back to Home
            </Button>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="pt-32 pb-16 px-6">
        <div className="container mx-auto max-w-4xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/60 backdrop-blur-lg border border-primary/30 mb-4">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm text-foreground/80">Your Privacy Matters</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold">
            Privacy Policy
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Your data is treated like gold — private, secure, and never stored
          </p>
          <p className="text-sm text-muted-foreground">
            Last updated: 2026
          </p>
        </div>
      </section>

      {/* Privacy Sections */}
      <section className="py-12 px-6">
        <div className="container mx-auto max-w-4xl space-y-8">
          {sections.map((section, index) => (
            <div 
              key={index}
              className="bg-card/40 backdrop-blur-lg border border-primary/20 rounded-2xl p-8 space-y-4 hover:border-primary/40 transition-all duration-300"
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

      {/* About Section */}
      <section className="py-16 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-card/40 backdrop-blur-lg border border-primary/20 rounded-2xl p-8 space-y-6">
            <h2 className="text-3xl font-bold text-foreground">About Akromeda</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                Akromeda is a smart, fast, and secure tool built to solve a very specific problem — converting bank statements from PDF to Excel with precision and ease.
              </p>
              <p>
                This platform was created by <strong className="text-foreground">Sayyed Faizan Rizvi</strong>, a cybersecurity student from Harvard University, based in Kota, Rajasthan, India. In 2026, at the age of 18, Faizan launched Akromeda to help individuals and businesses save time and effort when dealing with financial data.
              </p>
              <div className="pt-4 space-y-2">
                <h3 className="text-xl font-bold text-foreground">What Akromeda Does</h3>
                <ul className="list-disc list-inside space-y-2">
                  <li>Converts complex bank statement PDFs into clean, editable Excel sheets</li>
                  <li>Maintains formatting, columns, and transaction clarity</li>
                  <li>Works instantly — no software installation required</li>
                  <li>Designed with data privacy and security at its core</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-16 px-6 mb-16">
        <div className="container mx-auto max-w-4xl text-center space-y-6">
          <h2 className="text-3xl font-bold">Questions or Concerns?</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            You stay in control. Always. For any concerns, reach out at <a href="mailto:inspirexali@gmail.com" className="text-primary hover:underline">inspirexali@gmail.com</a>
          </p>
          <Button 
            size="lg" 
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-neon"
            onClick={() => navigate('/')}
          >
            Back to Home
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-primary/10 py-8 px-6">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>© 2025 Akromeda. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Privacy;
