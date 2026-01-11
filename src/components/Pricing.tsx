import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const monthlyPlans = [
  {
    name: "Starter",
    price: "$10",
    period: "month",
    pages: "500",
    description: "Perfect for small projects",
    highlighted: false,
  },
  {
    name: "Professional",
    price: "$20",
    period: "month",
    pages: "1,500",
    description: "Best for growing businesses",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "$40",
    period: "month",
    pages: "4,000",
    description: "For large-scale operations",
    highlighted: false,
  },
];

const yearlyPlans = [
  {
    name: "Starter",
    price: "$100",
    period: "year",
    pages: "12,000",
    description: "Perfect for small projects",
    highlighted: false,
  },
  {
    name: "Professional",
    price: "$200",
    period: "year",
    pages: "36,000",
    description: "Best for growing businesses",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "$400",
    period: "year",
    pages: "96,000",
    description: "For large-scale operations",
    highlighted: false,
  },
];

const PricingCard = ({ plan }: { plan: typeof monthlyPlans[0] }) => (
  <Card
    className={`relative overflow-hidden rounded-2xl ${
      plan.highlighted ? "pricing-featured" : "bento-card"
    }`}
  >
    <div className="p-8">
      {plan.highlighted && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-primary text-primary-foreground border-0 shadow-neon">
          MOST POPULAR
        </Badge>
      )}

      <div className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-foreground">{plan.name}</h3>
          <p className="text-sm text-muted-foreground">{plan.description}</p>
        </div>

        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-bold text-foreground">{plan.price}</span>
            <span className="text-muted-foreground">/{plan.period}</span>
          </div>
        </div>

        <div className="py-4 border-t border-border/70">
          <div className="flex items-center gap-2 text-foreground">
            <Check className={`w-5 h-5 ${plan.highlighted ? "text-primary" : "text-accent"}`} />
            <span className="text-lg font-medium">Up to {plan.pages} pages</span>
          </div>
        </div>

        <Button
          className={`w-full transition-all duration-300 ${
            plan.highlighted
              ? "btn-premium bg-primary hover:bg-primary/90 text-primary-foreground shadow-neon"
              : "border border-primary/25 bg-background/10 hover:bg-primary/10 hover:border-primary/45"
          }`}
          variant={plan.highlighted ? "default" : "outline"}
        >
          Choose Plan
        </Button>
      </div>
    </div>

    {/* Decorative glow */}
    <div className="pointer-events-none absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300">
      <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
    </div>
  </Card>
);

export const Pricing = () => {
  return (
    <section id="pricing" className="relative py-24 px-6 overflow-hidden">
      <div className="absolute inset-0 mesh-bg opacity-35" />
      <div className="container mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold">
            Choose Your
            <span className="bg-gradient-primary bg-clip-text text-transparent"> Perfect Plan</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Flexible pricing for every need - pay monthly or save with yearly plans
          </p>
        </div>

        <Tabs defaultValue="monthly" className="max-w-6xl mx-auto">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-12 bg-card/40 border border-primary/20 backdrop-blur-lg">
            <TabsTrigger value="monthly">Monthly Plans</TabsTrigger>
            <TabsTrigger value="yearly">Yearly Plans</TabsTrigger>
          </TabsList>

          <TabsContent value="monthly" className="space-y-8">
            <div className="grid md:grid-cols-3 gap-8">
              {monthlyPlans.map((plan, index) => (
                <PricingCard key={index} plan={plan} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="yearly" className="space-y-8">
            <div className="grid md:grid-cols-3 gap-8">
              {yearlyPlans.map((plan, index) => (
                <PricingCard key={index} plan={plan} />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-16 text-center">
          <p className="text-muted-foreground mb-4">Need a custom solution for your organization?</p>
          <Button variant="outline" className="border-secondary/40 hover:bg-secondary/10">
            Contact Sales
          </Button>
        </div>
      </div>
    </section>
  );
};
