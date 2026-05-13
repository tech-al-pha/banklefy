import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Logo from "@/components/Logo";
import { useLanguage } from "@/contexts/LanguageContext";
import AutoHideHeader from "@/components/AutoHideHeader";
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
  Award,
  Infinity as InfinityIcon,
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
    description: "Process documents faster with AI-powered analysis and automation.",
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
    title: "Secure Processing",
    description: "Encrypted in transit with access controls to protect sensitive documents.",
    category: "Security",
  },
  {
    icon: Lock,
    title: "Privacy First",
    description: "Your data stays yours. Files are processed securely and not kept after conversion.",
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
    description: "Excel-first exports with CSV, JSON, and MT940 available based on your plan.",
    category: "Flexibility",
  },
  {
    icon: Award,
    title: "Reliable Quality",
    description: "Built for professionals who need accurate and reliable analysis.",
    category: "Quality",
  },
  {
    icon: InfinityIcon,
    title: "Scales With You",
    description: "Handle growing workloads without slowing down your workflow.",
    category: "Scalability",
  },
];

const categories = [
  "Performance",
  "Security",
  "Accessibility",
  "Intelligence",
  "Flexibility",
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
    <div className="min-h-screen bg-background text-white font-sans selection:bg-primary/30">
      {/* Header Area */}
      <AutoHideHeader as="nav" className="border-b border-primary/10 bg-ink/40 backdrop-blur-md p-4">
        <div className="container mx-auto flex flex-row items-center justify-between gap-3">
          <Logo />
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="back-pill"
          >
            <ArrowLeft size={18} /> Back to Home
          </Button>
        </div>
      </AutoHideHeader>

      <main className="container mx-auto px-4 sm:px-6 pt-24 pb-12 sm:pt-28 sm:pb-16 max-w-6xl">
        {/* Header Section */}
        <section className="text-center mb-20 animate-in fade-in slide-in-from-bottom-5 duration-700">
          <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter text-primary uppercase mb-6">
            Why Choose Us
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Discover the benefits that make our platform a strong choice for document analysis
            and processing.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {categories.map((cat) => (
              <span
                key={cat}
                className="chip-muted px-4 py-1.5 rounded-full text-xs uppercase tracking-wider font-medium"
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
            <div className="grid grid-cols-2 gap-6">
              {categoryBenefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <div
                    key={index}
                    className="animate-in fade-in slide-in-from-bottom-5 duration-700"
                    style={{ animationDelay: `${catIdx * 50 + index * 50}ms` }}
                  >
                    <div className="glass-card h-full flex items-start gap-5 p-6 rounded-2xl transition-all hover:shadow-neon">
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
              className="border-primary/50 bg-[#141414] text-primary font-bold uppercase tracking-wider px-8 btn-target-glow"
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
