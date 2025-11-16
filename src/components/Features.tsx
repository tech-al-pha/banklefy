import { Globe, Lock, Zap, FileSpreadsheet, Brain, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";

const features = [
  {
    icon: Globe,
    title: "Multilingual Support",
    description: "Support for 50+ languages including Hindi, Arabic, Mandarin, French, Spanish, and more",
  },
  {
    icon: Brain,
    title: "AI-Powered OCR",
    description: "Advanced OCR technology handles even scanned and low-quality bank statements",
  },
  {
    icon: Zap,
    title: "Instant Processing",
    description: "Lightning-fast conversion with results delivered in seconds, not hours",
  },
  {
    icon: FileSpreadsheet,
    title: "Excel Compatible",
    description: "Clean, audit-grade Excel files compatible with all accounting software",
  },
  {
    icon: Lock,
    title: "Bank-Level Security",
    description: "End-to-end encryption ensures your financial data stays private and secure",
  },
  {
    icon: Clock,
    title: "Batch Processing",
    description: "Upload multiple statements at once and process them in parallel",
  },
];

export const Features = () => {
  return (
    <section className="relative py-24 px-6">
      <div className="container mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold">
            Powerful Features for
            <span className="bg-gradient-primary bg-clip-text text-transparent"> Global Finance</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to convert and manage bank statements from anywhere in the world
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className="relative group p-6 bg-card/60 backdrop-blur-lg border-primary/20 hover:border-primary/50 transition-all duration-300 hover:shadow-neon"
              >
                <div className="absolute inset-0 bg-gradient-glow opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg" />
                <div className="relative space-y-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
