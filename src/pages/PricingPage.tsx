import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Logo from "@/components/Logo";

type Plan = {
  name: string;
  price: string;
  unit: string;
  description: string;
  highlighted?: boolean;
};

const dailyPlans: Plan[] = [
  {
    name: "Daily Lite",
    price: "₹99",
    unit: "/day",
    description: "Quick checks and one-off analyses",
  },
  {
    name: "Daily Pro",
    price: "₹199",
    unit: "/day",
    description: "For underwriters and CA firms",
    highlighted: true,
  },
  {
    name: "Daily Team",
    price: "₹399",
    unit: "/day",
    description: "Short-term, high-volume reviews",
  },
];

const weeklyPlans: Plan[] = [
  {
    name: "Weekly Lite",
    price: "₹399",
    unit: "/week",
    description: "For small teams and pilots",
  },
  {
    name: "Weekly Pro",
    price: "₹799",
    unit: "/week",
    description: "For lending teams and NBFCs",
    highlighted: true,
  },
  {
    name: "Weekly Team",
    price: "₹1,499",
    unit: "/week",
    description: "High‑volume weekly underwriting",
  },
];

const monthlyPlans: Plan[] = [
  {
    name: "Starter",
    price: "₹1,499",
    unit: "/month",
    description: "Freelancers and independent CAs",
  },
  {
    name: "Growth",
    price: "₹3,499",
    unit: "/month",
    description: "Most popular for small teams",
    highlighted: true,
  },
  {
    name: "Scale",
    price: "₹7,499",
    unit: "/month",
    description: "Banks, NBFCs and fin‑techs",
  },
];

const yearlyPlans: Plan[] = [
  {
    name: "Starter Yearly",
    price: "₹14,990",
    unit: "/year",
    description: "Save vs monthly Starter",
  },
  {
    name: "Growth Yearly",
    price: "₹34,990",
    unit: "/year",
    description: "Best value for growing teams",
    highlighted: true,
  },
  {
    name: "Scale Yearly",
    price: "₹74,990",
    unit: "/year",
    description: "Predictable cost for enterprises",
  },
];

const perPagePlans: Plan[] = [
  {
    name: "Pay‑as‑you‑go",
    price: "₹5",
    unit: "/page",
    description: "No commitment, perfect for trials",
  },
  {
    name: "Volume",
    price: "₹3",
    unit: "/page",
    description: "Prepay for better per‑page rates",
    highlighted: true,
  },
  {
    name: "Bulk",
    price: "Custom",
    unit: "",
    description: "Large‑volume, negotiated pricing",
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
            Choose how you want to use Akromeda: per‑day, per‑week, monthly, yearly or pure
            pay‑per‑page. Upgrade anytime as your volume grows.
          </p>
        </section>

        {/* Daily plans */}
        <section className="mb-12 space-y-4">
          <h2 className="text-xl md:text-2xl font-bold text-white">Daily plans</h2>
          <p className="text-sm text-muted-foreground">
            Perfect for short projects, pilots, or urgent underwriting bursts.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {dailyPlans.map(renderPlanCard)}
          </div>
        </section>

        {/* Weekly plans */}
        <section className="mb-12 space-y-4">
          <h2 className="text-xl md:text-2xl font-bold text-white">Weekly plans</h2>
          <p className="text-sm text-muted-foreground">
            For teams who want predictable access during busy weeks.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {weeklyPlans.map(renderPlanCard)}
          </div>
        </section>

        {/* Monthly plans */}
        <section className="mb-12 space-y-4">
          <h2 className="text-xl md:text-2xl font-bold text-white">Monthly plans</h2>
          <p className="text-sm text-muted-foreground">
            Best for CAs, lenders, and teams using Akromeda every day.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {monthlyPlans.map(renderPlanCard)}
          </div>
        </section>

        {/* Yearly plans */}
        <section className="mb-12 space-y-4">
          <h2 className="text-xl md:text-2xl font-bold text-white">Yearly plans</h2>
          <p className="text-sm text-muted-foreground">
            Lock in savings for long‑term underwriting and credit operations.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {yearlyPlans.map(renderPlanCard)}
          </div>
        </section>

        {/* Per page plans */}
        <section className="mb-12 space-y-4">
          <h2 className="text-xl md:text-2xl font-bold text-white">Per page</h2>
          <p className="text-sm text-muted-foreground">
            Ultimate flexibility – only pay for the pages you convert.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {perPagePlans.map(renderPlanCard)}
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
          <Button
            variant="outline"
            size="lg"
            className="border-primary/40 text-white hover:bg-primary/10 backdrop-blur-lg px-10 h-14 font-black uppercase tracking-widest"
          >
            Contact Sales
          </Button>
        </section>
      </main>
    </div>
  );
};

export default PricingPage;

