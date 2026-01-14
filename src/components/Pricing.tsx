import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

// Updated Monthly Plans - Psychological Pricing ($9, $19, $39)
const monthlyPlans = [
  {
    name: "Starter",
    price: "$9",
    period: "month",
    pages: "500",
    description: "Perfect for small projects",
    highlighted: false,
  },
  {
    name: "Professional",
    price: "$19",
    period: "month",
    pages: "1,500",
    description: "Best for growing businesses",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "$39",
    period: "month",
    pages: "4,000",
    description: "For large-scale operations",
    highlighted: false,
  },
];

// Updated Yearly Plans - 2 Months Free Value ($89, $189, $389)
const yearlyPlans = [
  {
    name: "Starter",
    price: "$89",
    period: "year",
    pages: "12,000",
    description: "Perfect for small projects",
    highlighted: false,
  },
  {
    name: "Professional",
    price: "$189",
    period: "year",
    pages: "36,000",
    description: "Best for growing businesses",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "$389",
    period: "year",
    pages: "96,000",
    description: "For large-scale operations",
    highlighted: false,
  },
];

const PricingCard = ({ plan }: { plan: typeof monthlyPlans[0] }) => (
  <Card
    className={`relative p-8 bg-card/60 backdrop-blur-lg transition-all duration-300 ${
      plan.highlighted
        ? "border-primary shadow-neon scale-105"
        : "border-primary/20 hover:border-primary/50 hover:shadow-card"
    }`}
  >
    {plan.highlighted && (
      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-primary text-primary-foreground border-0 font-bold">
        MOST POPULAR
      </Badge>
    )}

    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
        <p className="text-sm text-muted-foreground">{plan.description}</p>
      </div>

      <div className="space-y-1">
        <div className="flex items-baseline gap-1">
          <span className="text-5xl font-black text-white tracking-tighter">{plan.price}</span>
          <span className="text-muted-foreground font-medium">/{plan.period}</span>
        </div>
        {plan.period === "year" && (
          <p className="text-xs text-primary font-bold animate-pulse">Save ~20% yearly!</p>
        )}
      </div>

      <div className="py-4 border-t border-white/5">
        <div className="flex items-center gap-2 text-white/90">
          <Check className="w-5 h-5 text-primary" />
          <span className="text-lg font-bold">Up to {plan.pages} pages</span>
        </div>
      </div>

      <Button
        className={`w-full h-12 text-base font-bold uppercase tracking-wider ${
          plan.highlighted
            ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-neon"
            : "bg-white/5 hover:bg-white/10 border border-primary/30 text-white"
        } transition-all duration-300`}
      >
        Choose Plan
      </Button>
    </div>
  </Card>
);

export const Pricing = () => {
  return (
    <section id="pricing" className="relative py-24 px-6 overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-glow opacity-20 -z-10 pointer-events-none" />
      
      <div className="container mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-tight">
            Choose Your
            <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent"> Perfect Plan</span>
          </h2>
          <p className="text-lg text-muted-foreground font-medium">
            Flexible pricing for every need - pay monthly or save big with yearly plans.
          </p>
        </div>

        <Tabs defaultValue="monthly" className="max-w-6xl mx-auto">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-16 bg-white/5 p-1 border border-white/10 rounded-full h-14">
            <TabsTrigger value="monthly" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">Monthly Plans</TabsTrigger>
            <TabsTrigger value="yearly" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">Yearly Plans</TabsTrigger>
          </TabsList>

          <TabsContent value="monthly">
            <div className="grid md:grid-cols-3 gap-8">
              {monthlyPlans.map((plan, index) => (
                <PricingCard key={index} plan={plan} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="yearly">
            <div className="grid md:grid-cols-3 gap-8">
              {yearlyPlans.map((plan, index) => (
                <PricingCard key={index} plan={plan} />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-20 text-center">
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
        </div>
      </div>
    </section>
  );
};