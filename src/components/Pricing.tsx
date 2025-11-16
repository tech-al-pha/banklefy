import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Sparkles, Zap, Crown, Gift } from "lucide-react";

const plans = [
  {
    name: "Free",
    icon: Gift,
    price: "$0",
    period: "forever",
    description: "Get started with basic conversions",
    limit: "1 statement/week",
    features: [
      "Basic conversion",
      "Limited languages",
      "Standard processing",
      "Watermarked exports",
    ],
    cta: "Start Free",
    highlighted: false,
  },
  {
    name: "Daily Pass",
    icon: Zap,
    price: "$2",
    period: "per day",
    description: "Perfect for one-time needs",
    limit: "Unlimited for 24 hours",
    features: [
      "All formats supported",
      "50+ languages",
      "No watermarks",
      "Priority processing",
      "OCR for scanned PDFs",
    ],
    cta: "Get Daily Pass",
    highlighted: false,
  },
  {
    name: "Monthly Pro",
    icon: Sparkles,
    price: "$15",
    period: "per month",
    description: "Best for regular users",
    limit: "Unlimited conversions",
    features: [
      "Everything in Daily Pass",
      "Batch uploads",
      "Advanced OCR",
      "Email support",
      "Conversion history",
      "Export templates",
    ],
    cta: "Start Pro Trial",
    highlighted: true,
  },
  {
    name: "Yearly Elite",
    icon: Crown,
    price: "$120",
    period: "per year",
    description: "Maximum value + API access",
    limit: "Unlimited + API",
    features: [
      "Everything in Pro",
      "API integration",
      "Audit-grade formatting",
      "Custom templates",
      "Premium support",
      "Team access (5 users)",
    ],
    cta: "Go Elite",
    highlighted: false,
  },
];

export const Pricing = () => {
  return (
    <section className="relative py-24 px-6">
      <div className="container mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold">
            Choose Your
            <span className="bg-gradient-primary bg-clip-text text-transparent"> Perfect Plan</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            From free trials to enterprise solutions, we've got you covered
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {plans.map((plan, index) => {
            const Icon = plan.icon;
            return (
              <Card
                key={index}
                className={`relative p-6 bg-card/60 backdrop-blur-lg transition-all duration-300 ${
                  plan.highlighted
                    ? "border-primary shadow-neon scale-105 lg:scale-110"
                    : "border-primary/20 hover:border-primary/50 hover:shadow-card"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-primary rounded-full text-xs font-semibold text-primary-foreground">
                    MOST POPULAR
                  </div>
                )}

                <div className="space-y-6">
                  {/* Header */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-5 h-5 ${plan.highlighted ? "text-primary" : "text-secondary"}`} />
                      <h3 className="text-xl font-bold">{plan.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  </div>

                  {/* Price */}
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                      <span className="text-muted-foreground">/{plan.period}</span>
                    </div>
                    <p className="text-sm text-primary">{plan.limit}</p>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Button
                    className={`w-full ${
                      plan.highlighted
                        ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-neon"
                        : "bg-card hover:bg-muted border border-primary/30"
                    } transition-all duration-300`}
                  >
                    {plan.cta}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Enterprise CTA */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground mb-4">
            Need custom solutions for your enterprise?
          </p>
          <Button
            variant="outline"
            className="border-secondary/50 text-foreground hover:bg-secondary/10 backdrop-blur-lg"
          >
            Contact Sales
          </Button>
        </div>
      </div>
    </section>
  );
};
