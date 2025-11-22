import { Button } from "@/components/ui/button";
import { Shield, Lock, Eye, Trash2, FileCheck, Globe, Brain } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Privacy = () => {
  const navigate = useNavigate();

  const sections = [
    {
      icon: FileCheck,
      title: "Data Collection",
      content: "We collect only the data necessary to provide our service. During document upload and processing, we temporarily access your bank statement files. No personal banking credentials are ever requested or stored. We may collect basic usage analytics to improve our service."
    },
    {
      icon: Brain,
      title: "AI Processing",
      content: "Your documents are processed using secure AI and OCR technology. All processing happens in encrypted, isolated environments. Our AI models extract transaction data without human intervention. Documents are never used to train our AI models or shared with third parties."
    },
    {
      icon: Lock,
      title: "End-to-End Encryption",
      content: "All data transfers use bank-level 256-bit SSL/TLS encryption. Your uploaded files are encrypted at rest and in transit. Processing occurs in secure, compliant cloud infrastructure with multi-layer security protocols that meet international banking standards."
    },
    {
      icon: Trash2,
      title: "Data Retention",
      content: "Your uploaded documents are automatically deleted from our servers immediately after processing is complete. Processed Excel files are stored temporarily (24 hours maximum) to allow you to download them. You can request immediate deletion of all your data at any time."
    },
    {
      icon: Eye,
      title: "No Data Sharing",
      content: "We never sell, rent, or share your financial data with third parties. Your documents and extracted data remain completely private. We do not use your information for marketing purposes. No third-party analytics or advertising trackers are used on sensitive pages."
    },
    {
      icon: Globe,
      title: "Compliance",
      content: "We comply with GDPR (Europe), CCPA (California), and other global privacy regulations. Our service adheres to PCI DSS standards for financial data handling. Regular security audits ensure continuous compliance. We maintain SOC 2 Type II certification."
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
            Complete transparency about how we protect and handle your financial data
          </p>
          <p className="text-sm text-muted-foreground">
            Last updated: January 2025
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

      {/* User Rights */}
      <section className="py-16 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-card/40 backdrop-blur-lg border border-primary/20 rounded-2xl p-8 space-y-6">
            <h2 className="text-3xl font-bold text-foreground">Your Rights</h2>
            <div className="space-y-4 text-muted-foreground">
              <p><strong className="text-foreground">Access:</strong> You have the right to request a copy of all personal data we hold about you.</p>
              <p><strong className="text-foreground">Deletion:</strong> You can request immediate deletion of your data at any time through your account settings.</p>
              <p><strong className="text-foreground">Correction:</strong> You have the right to correct any inaccurate personal information.</p>
              <p><strong className="text-foreground">Portability:</strong> You can request your data in a machine-readable format for transfer to another service.</p>
              <p><strong className="text-foreground">Consent Withdrawal:</strong> You can withdraw consent for data processing at any time without affecting the lawfulness of previous processing.</p>
              <p><strong className="text-foreground">Objection:</strong> You have the right to object to processing of your personal data for specific purposes.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-16 px-6 mb-16">
        <div className="container mx-auto max-w-4xl text-center space-y-6">
          <h2 className="text-3xl font-bold">Questions About Privacy?</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            We're committed to transparency. If you have any questions or concerns about how we handle your data, 
            please contact our privacy team at <a href="mailto:privacy@akromeda.com" className="text-primary hover:underline">privacy@akromeda.com</a>
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
