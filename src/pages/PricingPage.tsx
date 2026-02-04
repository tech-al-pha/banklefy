import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import Logo from "@/components/Logo";

type Plan = {
  name: string;
  price: string;
  unit: string;
  description: string;
  statements: string;
  features: string[];
  savings?: string;
  highlighted?: boolean;
};

const monthlyPlans: Plan[] = [
  {
    name: "Monthly Basic",
    price: "$9",
    unit: "/month",
    description: "Perfect for regular analysis",
    statements: "300 Pages/month",
    features: ["Download in 4 Formats", "Free Analyzed PDF Report", "AI Chat Aura"],
  },
  {
    name: "Monthly Pro",
    price: "$19",
    unit: "/month",
    description: "Most popular for professionals",
    statements: "1000 Pages/month",
    features: ["Download in 4 Formats", "Free Analyzed PDF Report", "AI Chat Aura"],
    highlighted: true,
  },
  {
    name: "Monthly Enterprise",
    price: "$39",
    unit: "/month",
    description: "For heavy users and teams",
    statements: "4500 Pages/month",
    features: ["Download in 4 Formats", "Free Analyzed PDF Report", "AI Chat Aura"],
  },
];

const yearlyPlans: Plan[] = [
  {
    name: "Yearly Lite",
    price: "$99",
    unit: "/year",
    description: "Great for regular users",
    statements: "5000 Pages/year",
    savings: "Save 8% vs Monthly",
    features: ["Download in 4 Formats", "Free Analyzed PDF Report", "AI Chat Aura"],
  },
  {
    name: "Yearly Full",
    price: "$199",
    unit: "/year",
    description: "Best value for professionals",
    statements: "15,000 Pages/year",
    savings: "Save 13% vs Monthly",
    features: ["Download in 4 Formats", "Free Analyzed PDF Report", "AI Chat Aura"],
    highlighted: true,
  },
  {
    name: "Yearly Pro",
    price: "$399",
    unit: "/year",
    description: "Maximum savings for power users",
    statements: "65,000 Pages/year",
    savings: "Save 15% vs Monthly",
    features: ["Download in 4 Formats", "Free Analyzed PDF Report", "AI Chat Aura"],
  },
];

const perPagePlans: Plan[] = [
  {
    name: "Lite",
    price: "$1",
    unit: "/conversion",
    description: "Quick single conversion",
    statements: "10 Pages",
    features: ["Analyzed PDF Report", "Download in 4 Formats"],
  },
  {
    name: "Standard",
    price: "$2",
    unit: "/conversion",
    description: "Popular for small batches",
    statements: "25 Pages",
    features: ["Analyzed PDF Report", "Download in 4 Formats"],
    highlighted: true,
  },
  {
    name: "Power",
    price: "$3",
    unit: "/conversion",
    description: "For larger batches",
    statements: "50 Pages",
    features: ["Analyzed PDF Report", "Download in 4 Formats"],
  },
];

const renderPlanCard = (plan: Plan) => (
  <Card
    key={plan.name}
    className={`relative p-8 bg-[#1a120b]/80 backdrop-blur-xl transition-all duration-300 rounded-2xl ${
      plan.highlighted
        ? "border-2 border-primary shadow-neon scale-105"
        : "border border-primary/20 hover:border-primary/40 hover:shadow-card"
    }`}
  >
    {plan.highlighted && (
      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground border-0 font-bold px-4 py-1 uppercase tracking-wider text-xs">
        Most Popular
      </Badge>
    )}

    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
        <p className="text-sm text-muted-foreground">{plan.description}</p>
      </div>

      <div className="space-y-1">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl md:text-5xl font-black text-white tracking-tighter">
            {plan.price}
          </span>
          {plan.unit && (
            <span className="text-muted-foreground font-medium">{plan.unit}</span>
          )}
        </div>
      </div>

      {plan.statements && (
        <div className="py-3 px-4 bg-primary/10 border border-primary/20 rounded-lg">
          <p className="text-sm font-semibold text-primary">{plan.statements}</p>
        </div>
      )}

      {plan.savings && (
        <div className="py-2 px-4 bg-green-500/10 border border-green-500/20 rounded-lg">
          <p className="text-sm font-bold text-green-400">{plan.savings}</p>
        </div>
      )}

      {plan.features && plan.features.length > 0 && (
        <ul className="space-y-2">
          {plan.features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <span className="text-sm text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>
      )}

      <Button
        className={`w-full h-12 text-base font-bold uppercase tracking-wider rounded-lg ${
          plan.highlighted
            ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-neon"
            : "bg-[#1a120b] hover:bg-[#251a10] border border-primary/30 text-primary"
        } transition-all duration-300`}
      >
        Choose Plan
      </Button>
    </div>
  </Card>
);

const PricingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0A0502] text-foreground">
      {/* Header */}
      <header className="border-b border-primary/10 bg-black/40 backdrop-blur-md p-4 sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between">
          <Logo />
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="text-primary hover:bg-primary/10 gap-2 font-bold uppercase tracking-tighter"
          >
            Back to Home
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-16 max-w-6xl">
        <section className="text-center mb-16 space-y-4">
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-tight">
            Flexible pricing for
            <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              {" "}
              every workflow
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose your perfect plan. One-time conversions, monthly subscriptions, or yearly savings.
          </p>
        </section>

        {/* One-time plans */}
        <section className="mb-12 space-y-4">
          <h2 className="text-xl md:text-2xl font-bold text-white">One-time plans</h2>
          <p className="text-sm text-muted-foreground">
            Quick conversion with no commitments.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {perPagePlans.map(renderPlanCard)}
          </div>
        </section>

        {/* Monthly plans */}
        <section className="mb-12 space-y-4">
          <h2 className="text-xl md:text-2xl font-bold text-white">Monthly plans</h2>
          <p className="text-sm text-muted-foreground">
            Perfect for regular analysis with AI power.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {monthlyPlans.map(renderPlanCard)}
          </div>
        </section>

        {/* Yearly plans */}
        <section className="mb-12 space-y-4">
          <h2 className="text-xl md:text-2xl font-bold text-white">Yearly plans</h2>
          <p className="text-sm text-muted-foreground">
            Maximum savings for heavy users.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {yearlyPlans.map(renderPlanCard)}
          </div>
        </section>

        {/* Custom / Enterprise CTA (matches screenshot style) */}
        <section className="mt-20 text-center">
          <div className="inline-block p-1 rounded-full bg-white/5 border border-white/10 mb-6">
            <div className="px-6 py-2 rounded-full bg-card/60 backdrop-blur-sm">
              <p className="text-muted-foreground text-sm font-medium">
                Need a custom solution for your large organization?
              </p>
            </div>
          </div>
          <br />
          <a
            href="https://mail.google.com/mail/?view=cm&fs=1&to=inspirexali@gmail.com&su=Akromeda%20Enterprise%20Pricing"
            target="_blank"
            rel="noreferrer"
          >
            <Button
              variant="outline"
              size="lg"
              className="border-primary/40 text-white hover:bg-primary/10 backdrop-blur-lg px-10 h-14 font-black uppercase tracking-widest"
            >
              Contact Sales
            </Button>
          </a>
        </section>
      </main>
    </div>
  );
};

export default PricingPage;

