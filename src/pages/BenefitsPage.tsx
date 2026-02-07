import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Logo from "@/components/Logo";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  TrendingUp,
  Zap,
  Shield,
  Smartphone,
  BarChart3,
  FileText,
  Lock,
  Clock,
  Lightbulb,
  Users,
  Award,
  Infinity,
} from "lucide-react";

interface Benefit {
  icon: React.ComponentType<{ size: number; className: string }>;
  title: string;
  description: string;
  category: string;
}

const benefits: Benefit[] = [
  {
    icon: TrendingUp,
    title: "Increased Efficiency",
    description: "Process documents 10x faster with AI-powered analysis and automation.",
    category: "Performance",
  },
  {
    icon: Zap,
    title: "Lightning Fast Processing",
    description: "Get instant results and analysis without waiting for manual reviews.",
    category: "Performance",
  },
  {
    icon: Shield,
    title: "Maximum Security",
    description: "Enterprise-grade encryption ensures your sensitive documents stay protected.",
    category: "Security",
  },
  {
    icon: Lock,
    title: "Privacy First",
    description: "Your data is yours. We never store or share your documents without consent.",
    category: "Security",
  },
  {
    icon: Smartphone,
    title: "Mobile Friendly",
    description: "Access your documents and analysis from any device, anywhere, anytime.",
    category: "Accessibility",
  },
  {
    icon: Clock,
    title: "24/7 Availability",
    description: "Our AI works around the clock to process and analyze your documents.",
    category: "Accessibility",
  },
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    description: "Get detailed insights and metrics about your documents with visual dashboards.",
    category: "Intelligence",
  },
  {
    icon: Lightbulb,
    title: "AI-Powered Insights",
    description: "Leverage cutting-edge AI to uncover hidden patterns and opportunities in data.",
    category: "Intelligence",
  },
  {
    icon: FileText,
    title: "Multiple Format Support",
    description: "Download results in PDF, Excel, XML, or JSON format for seamless integration.",
    category: "Flexibility",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Coming Soon - Share analysis with team members and collaborate in real-time.",
    category: "Collaboration",
  },
  {
    icon: Award,
    title: "Industry Leading Quality",
    description: "Trusted by thousands of professionals for accurate and reliable analysis.",
    category: "Quality",
  },
  {
    icon: Infinity,
    title: "Unlimited Scalability",
    description: "Handle projects of any size without performance degradation.",
    category: "Scalability",
  },
];

const categories = [
  "Performance",
  "Security",
  "Accessibility",
  "Intelligence",
  "Flexibility",
  "Collaboration",
  "Quality",
  "Scalability",
];

const BenefitsPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const groupedBenefits = categories.reduce((acc, category) => {
    acc[category] = benefits.filter((b) => b.category === category);
    return acc;
  }, {} as Record<string, Benefit[]>);

  return (
    <div className="min-h-screen bg-[#0A0502] text-white font-sans selection:bg-primary/30">
      {/* Header Area */}
      <nav className="border-b border-primary/10 bg-black/40 backdrop-blur-md p-4 sticky top-0 z-50">
        <div className="container mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="btn-glow text-primary gap-2 font-bold uppercase tracking-tighter w-full sm:w-auto"
          >
            <ArrowLeft size={18} /> Back to Home
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 max-w-6xl">
        {/* Header Section */}
        <section className="text-center mb-20 animate-in fade-in slide-in-from-bottom-5 duration-700">
          <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter text-primary uppercase mb-6">
            Why Choose Us
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Discover the powerful benefits that make our platform the trusted choice for document
            analysis and processing.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {categories.map((cat) => (
              <span
                key={cat}
                className="px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-xs text-primary uppercase tracking-wider font-medium"
              >
                {cat}
              </span>
            ))}
          </div>
        </section>

        {/* Benefits by Category */}
        {Object.entries(groupedBenefits).map(([category, categoryBenefits], catIdx) => (
          <section key={category} className="mb-16">
            <h2 className="text-2xl font-black text-primary uppercase tracking-widest mb-8 border-b border-primary/20 pb-4">
              {category}
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              {categoryBenefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <div
                    key={index}
                    className="animate-in fade-in slide-in-from-bottom-5 duration-700"
                    style={{ animationDelay: `${catIdx * 50 + index * 50}ms` }}
                  >
                    <div className="h-full flex items-start gap-5 p-6 bg-[#1A100B] border border-primary/20 rounded-2xl transition-all hover:border-primary hover:shadow-neon">
                      <div className="bg-primary/10 p-3 rounded-full text-primary flex-shrink-0">
                        <Icon size={24} className="text-primary" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg font-black text-white uppercase tracking-wide">
                          {benefit.title}
                        </h3>
                        <p className="text-muted-foreground leading-relaxed text-sm">
                          {benefit.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {/* CTA Section */}
        <section className="mt-20 text-center p-8 bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 rounded-3xl animate-in fade-in slide-in-from-bottom-5 duration-700">
          <h2 className="text-3xl font-black text-white uppercase tracking-wider mb-4">
            Ready to Experience the Benefits?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Start using our platform today and transform how you process and analyze documents.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button
              onClick={() => navigate("/auth")}
              className="bg-primary text-black font-bold uppercase tracking-wider px-8"
            >
              Get Started
            </Button>
            <Button
              onClick={() => navigate("/pricing")}
              variant="outline"
              className="border-primary/50 text-primary font-bold uppercase tracking-wider px-8"
            >
              View Pricing
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default BenefitsPage;
