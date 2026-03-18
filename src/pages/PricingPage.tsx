import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BadgeDollarSign, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import SupportContactDialog from "@/components/SupportContactDialog";

const PURCHASE_TOAST_STORAGE_KEY = "banklefy:last-plan-purchase";
const RAZORPAY_CHECKOUT_URL = "https://checkout.razorpay.com/v1/checkout.js";

type Plan = {
  planId: string;
  category: "perPage";
  name: string;
  price: string;
  amountInRupee: number;
  unit: string;
  description: string;
  statements: string;
  features: string[];
  editPdfDetector?: "Basic" | "Advanced";
  savings?: string;
  highlighted?: boolean;
  isFree?: boolean;
};

const pricingPlans: Plan[] = [
  {
    planId: "free",
    category: "perPage",
    name: "Free",
    price: "₹0",
    amountInRupee: 0,
    unit: "forever",
    description: "Guest access gets 2 pages/day; signed-in free users get 5 pages/day.",
    statements: "2 Pages / day (Guest) | 5 Pages / day (Signed in)",
    features: ["Excel/CSV exports", "Basic parsing", "No AI-only features"],
    isFree: true,
  },
  {
    planId: "per_page_pack_basic",
    category: "perPage",
    name: "Basic Pack",
    price: "₹1,899",
    amountInRupee: 1899,
    unit: "one-time",
    description: "Best for occasional usage",
    statements: "1,000 Pages",
    features: ["Excel/CSV exports", "Tally/MT940 available", "FOIR + EMI insights"],
    highlighted: true,
  },
  {
    planId: "per_page_pack_pro",
    category: "perPage",
    name: "Pro Pack",
    price: "₹18,999",
    amountInRupee: 18999,
    unit: "one-time",
    description: "High-volume credits for teams",
    statements: "11,000 Pages",
    features: [
      "Excel/CSV exports",
      "Tally/MT940 available",
      "FOIR + EMI insights",
      "Fraud + edited PDF checks",
      "Priority processing",
    ],
  },
];


const perConversionPlans: Plan[] = [
  {
    planId: "per_page_lite",
    category: "perPage",
    name: "Lite",
    price: "₹89",
    amountInRupee: 89,
    unit: "/conversion",
    description: "Quick single conversion",
    statements: "10 Pages",
    features: ["Analyzed PDF Report", "Download in 4 Formats"],
  },
  {
    planId: "per_page_standard",
    category: "perPage",
    name: "Standard",
    price: "₹179",
    amountInRupee: 179,
    unit: "/conversion",
    description: "Popular for small batches",
    statements: "25 Pages",
    features: ["Analyzed PDF Report", "Download in 4 Formats"],
    highlighted: true,
  },
  {
    planId: "per_page_power",
    category: "perPage",
    name: "Power",
    price: "₹299",
    amountInRupee: 299,
    unit: "/conversion",
    description: "For larger batches",
    statements: "50 Pages",
    features: ["Analyzed PDF Report", "Download in 4 Formats"],
  },
];

const PricingPage = () => {
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session?.user);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadRazorpayCheckout = async () => {
    if (window.Razorpay) return true;

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src^="${RAZORPAY_CHECKOUT_URL}"]`
    );

    if (existingScript) {
      await new Promise<void>((resolve, reject) => {
        const timeoutId = window.setTimeout(() => {
          reject(new Error("Razorpay checkout timed out while loading."));
        }, 7000);

        existingScript.addEventListener("load", () => {
          window.clearTimeout(timeoutId);
          resolve();
        }, { once: true });

        existingScript.addEventListener("error", () => {
          window.clearTimeout(timeoutId);
          reject(new Error("Razorpay checkout script failed to load."));
        }, { once: true });
      }).catch(() => null);
      return !!window.Razorpay;
    }

    try {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `${RAZORPAY_CHECKOUT_URL}?v=${Date.now()}`;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Razorpay checkout script failed to load."));
        document.head.appendChild(script);
      });
    } catch {
      return false;
    }

    return !!window.Razorpay;
  };

  useEffect(() => {
    void loadRazorpayCheckout();
  }, []);

  const ensureActiveSession = async () => {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (!refreshError && refreshed.session?.access_token) {
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.access_token) {
      throw new Error("Session expired. Please sign in again.");
    }
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      throw new Error("Session expired. Please sign in again.");
    }
  };

  const getSessionAccessToken = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      throw new Error("Session expired. Please sign in again.");
    }
    return token;
  };

  const invokeFunctionWithSession = async (
    functionName: string,
    requestBody: Record<string, unknown>
  ) => {
    const invoke = async () => {
      await ensureActiveSession();
      const accessToken = await getSessionAccessToken();
      return supabase.functions.invoke(functionName, {
        body: {
          ...requestBody,
          accessToken,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
    };

    let { data, error } = await invoke();
    if (error && /401|unauthorized|jwt|session/i.test(error.message || "")) {
      await supabase.auth.refreshSession();
      const retry = await invoke();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      throw new Error(error.message || `Failed to invoke ${functionName}`);
    }

    return typeof data === "string" ? JSON.parse(data) : data;
  };

  const verifyPayment = async (
    razorpay_order_id: string,
    razorpay_payment_id: string,
    razorpay_signature: string,
    purchasedPlan?: Plan,
  ) => {
    try {
      const result = await invokeFunctionWithSession("razorpay-verify", {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      });
      if (result?.success) {
        const pagesAdded = Number(result.pages_added ?? 0);
        const planName = purchasedPlan?.name ?? "Selected Plan";
        const planFeatures = purchasedPlan?.features ?? [];
        const featureSummary = planFeatures.slice(0, 3).join(" | ");
        const descriptionParts = [
          `${pagesAdded} pages added to your account.`,
          featureSummary ? `Unlocked: ${featureSummary}.` : null,
        ].filter(Boolean);

        sessionStorage.setItem(
          PURCHASE_TOAST_STORAGE_KEY,
          JSON.stringify({
            at: Date.now(),
            planId: purchasedPlan?.planId ?? result.plan_id ?? null,
            planName,
            pagesAdded,
            features: planFeatures,
          }),
        );

        toast.success(`Plan activated: ${planName}`, {
          description: descriptionParts.join(" "),
        });
        window.dispatchEvent(new Event("banklefy:subscription-updated"));
        // Hard redirect ensures user always lands on the upload box section after payment.
        window.location.assign("/?next=demo");
      } else {
        toast.error("Payment verification failed.");
      }
    } catch (err) {
      if (import.meta.env.DEV) { console.error("Verification error:", err); }
      toast.error("Payment verification failed. Please contact support.");
    }
  };

  const handlePlanPurchase = async (plan: Plan) => {
    if (!isAuthenticated) {
      toast.error("Please login to purchase a plan.");
      navigate("/auth");
      return;
    }

    if (processingPlan) return;
    setProcessingPlan(plan.planId);

    try {
      const payload = await invokeFunctionWithSession("razorpay-order", {
        planId: plan.planId,
        amount: plan.amountInRupee,
        amountInRupee: plan.amountInRupee,
        amountInPaise: Math.round(plan.amountInRupee * 100),
        currency: "INR",
        notes: {
          planName: plan.name,
          planCategory: plan.category,
        },
      });
      const order = payload?.order;
      const razorpayKeyId = payload?.razorpayKeyId;
      const checkoutKey = razorpayKeyId;

      if (!order || !checkoutKey) {
        throw new Error("Payment config missing on server. Please contact support.");
      }

      if (!window.Razorpay) {
        const loaded = await loadRazorpayCheckout();
        if (!loaded || !window.Razorpay) {
          throw new Error(
            "Razorpay checkout script could not load. Disable proxy/VPN/ad-blocker and try again."
          );
        }
      }

      const { data: { user } } = await supabase.auth.getUser();

      const checkout = new window.Razorpay({
        key: checkoutKey,
        amount: order.amount,
        currency: order.currency,
        name: "Banklefy",
        description: plan.description,
        order_id: order.id,
        prefill: {
          email: user?.email || "",
        },
        notes: {
          plan_id: plan.planId,
          plan_name: plan.name,
        },
        handler: (response) => {
          verifyPayment(
            response.razorpay_order_id,
            response.razorpay_payment_id,
            response.razorpay_signature,
            plan,
          );
        },
        theme: {
          color: "#B5B5B5",
        },
      });
      checkout.on("payment.failed", () => {
        toast.error("Payment failed. Please try again.");
      });
      checkout.open();
    } catch (error) {
      if (import.meta.env.DEV) { console.error(error); }
      toast.error(error instanceof Error ? error.message : "Unable to start Razorpay checkout.");
      if (error instanceof Error && error.message.toLowerCase().includes("session expired")) {
        navigate("/auth");
      }
    } finally {
      setProcessingPlan(null);
    }
  };

  const renderPlanCard = (plan: Plan) => {
    const isProcessing = processingPlan === plan.planId;
    const planFeatureItems = plan.editPdfDetector
      ? [...plan.features, `${plan.editPdfDetector} Edit PDF Detector`]
      : plan.features;

    return (
      <Card
        key={plan.planId}
        className={`relative p-8 bg-surface-elevated/80 backdrop-blur-xl transition-all duration-300 rounded-2xl ${
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
            <div className="py-2 px-4 rounded-full border border-[#1f5b3a] bg-[#0f1f16] shadow-none">
              <p className="text-sm font-semibold text-[#7CFFA8]">{plan.savings}</p>
            </div>
          )}

          {planFeatureItems.length > 0 && (
            <ul className="space-y-2">
              {planFeatureItems.map((feature, idx) => (
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
                ? "bg-primary text-primary-foreground shadow-neon"
                : "bg-surface-elevated border border-primary/30 text-primary"
            } transition-all duration-300`}
            onClick={() => (plan.isFree ? navigate("/?next=demo") : handlePlanPurchase(plan))}
            disabled={plan.isFree ? false : isProcessing}
          >
            {plan.isFree
              ? "Start Free"
              : isProcessing
              ? "Opening checkout..."
              : "Choose Plan"}
          </Button>
        </div>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-primary/10 bg-ink/40 backdrop-blur-md p-4">
        <div className="container mx-auto flex items-center justify-start">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="back-pill"
          >
            Back to Home
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 pt-24 pb-12 sm:pt-28 sm:pb-16 max-w-6xl">
        <section className="text-center mb-16 space-y-4">
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-tight">
            Flexible pricing for
            <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              {" "}
              every workflow
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Simple one-time credit packs. Buy once and use credits anytime.
          </p>
          <p className="text-sm font-medium text-yellow-300/90">
            Analyzed PDF is a paid-only feature and is not available on free usage.
          </p>
        </section>

        {/* Pricing cards */}
        <section className="mb-12 space-y-4">
          <h2 className="text-xl md:text-2xl font-bold text-white">Credit packs</h2>
          <p className="text-sm text-muted-foreground">
            No subscriptions, no renewal pressure.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {pricingPlans.map(renderPlanCard)}
          </div>
        </section>

        {/* One-time conversion plans */}
        <section className="mb-12 space-y-4">
          <h2 className="text-xl md:text-2xl font-bold text-white">One-time conversions</h2>
          <p className="text-sm text-muted-foreground">
            Quick conversion with no commitments.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {perConversionPlans.map(renderPlanCard)}
          </div>
        </section>


        <section
          id="refunds"
          className="mt-14 glass-card p-6 sm:p-8 rounded-2xl border border-primary/10"
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <BadgeDollarSign className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Refund Policy</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Refunds are processed within 14 days. Refunds are not available if 35% or more
                of the plan usage has been consumed. Repeated refund requests may result in
                IP blocking to prevent abuse. Email support with your order ID to start the refund.
              </p>
              <SupportContactDialog
                source="pricing_refund"
                defaultSubject="Refund Request"
                trigger={
                  <Button className="mt-4 bg-primary text-primary-foreground shadow-neon">
                    Request Refund
                  </Button>
                }
              />
            </div>
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
          <SupportContactDialog
            source="pricing_enterprise"
            defaultSubject="Enterprise Pricing"
            trigger={
              <Button
                variant="outline"
                size="lg"
                className="border-primary/40 text-white backdrop-blur-lg px-10 h-14 font-black uppercase tracking-widest"
              >
                Contact Sales
              </Button>
            }
          />
        </section>
      </main>
    </div>
  );
};

export default PricingPage;

