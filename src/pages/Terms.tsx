import { Button } from "@/components/ui/button";
import { Shield, ArrowLeft, FileText, CheckCircle, AlertCircle, Scale, Zap, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";

const Terms = () => {
  const navigate = useNavigate();

  const sections = [
    {
      icon: FileText,
      title: "Acceptance of Terms",
      content: "By accessing and using Akromeda, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.",
    },
    {
      icon: CheckCircle,
      title: "Use License",
      content: "Permission is granted to temporarily download one copy of the materials (information or software) on Akromeda's website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not: modify the materials; use the materials for any commercial purpose or for any public display; attempt to decompile or reverse engineer any software contained on the website.",
    },
    {
      icon: AlertCircle,
      title: "Disclaimer",
      content: "The materials on Akromeda's website are provided on an 'as is' basis. Akromeda makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.",
    },
    {
      icon: Scale,
      title: "Limitations",
      content: "In no event shall Akromeda or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Akromeda's website, even if Akromeda or an authorized representative has been notified orally or in writing of the possibility of such damage.",
    },
    {
      icon: Shield,
      title: "Accuracy of Materials",
      content: "The materials appearing on Akromeda's website could include technical, typographical, or photographic errors. Akromeda does not warrant that any of the materials on the website are accurate, complete, or current. Akromeda may make changes to the materials contained on its website at any time without notice.",
    },
    {
      icon: Heart,
      title: "Links",
      content: "Akromeda has not reviewed all of the sites linked to its website and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by Akromeda of the site. Use of any such linked website is at the user's own risk.",
    },
    {
      icon: AlertCircle,
      title: "Modifications",
      content: "Akromeda may revise these terms of service for the website at any time without notice. By using this website, you are agreeing to be bound by the then current version of these terms of service.",
    },
    {
      icon: Scale,
      title: "Governing Law",
      content: "These terms and conditions are governed by and construed in accordance with the laws of India, and you irrevocably submit to the exclusive jurisdiction of the courts in that location.",
    },
    {
      icon: Zap,
      title: "User Responsibilities",
      content: "You agree not to use Akromeda for any unlawful purpose or in any way that could damage, disable, or impair our systems. You are responsible for maintaining the confidentiality of your account information and password, and for all activities that occur under your account.",
    },
    {
      icon: FileText,
      title: "Intellectual Property",
      content: "All materials on Akromeda, including but not limited to text, graphics, logos, images, and software, are the property of Akromeda or its content suppliers and are protected by international copyright laws.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0A0502] text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#1a120b]/80 backdrop-blur-xl border-b border-primary/20">
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Logo />
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')} 
              className="btn-glow text-primary gap-2 font-bold uppercase tracking-tighter w-full sm:w-auto"
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
            Please read these terms and conditions carefully before using Akromeda.
          </p>
          <p className="text-sm text-muted-foreground">
            Last updated: February 2026
          </p>
        </div>
      </section>

      {/* Terms Sections */}
      <section className="py-12 px-6">
        <div className="container mx-auto max-w-4xl space-y-8">
          {sections.map((section, index) => (
            <div 
              key={index}
              className="bg-[#1a120b]/80 backdrop-blur-lg border border-primary/20 rounded-2xl p-8 space-y-4 hover:border-primary/40 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 duration-700"
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
            If you have any questions about our Terms of Service, please contact us at{' '}
            <a href="mailto:inspirexali@gmail.com" className="text-primary hover:underline">
              inspirexali@gmail.com
            </a>
          </p>
          <Button 
            size="lg" 
            className="bg-primary text-primary-foreground shadow-neon"
            onClick={() => navigate('/')}
          >
            Back to Home
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-primary/20 py-8 px-6">
        <div className="container mx-auto text-center text-xs text-muted-foreground tracking-[0.2em] uppercase">
          <p>© 2026 Akromeda | All rights reserved</p>
        </div>
      </footer>
    </div>
  );
};

export default Terms;
