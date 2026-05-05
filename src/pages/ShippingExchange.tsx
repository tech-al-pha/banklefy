import { ArrowLeft, Truck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import AutoHideHeader from "@/components/AutoHideHeader";

const ShippingExchange = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AutoHideHeader as="nav" className="bg-surface-elevated/80 backdrop-blur-xl border-b border-primary/20">
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Logo />
            <Button variant="ghost" onClick={() => navigate("/")} className="back-pill w-full sm:w-auto">
              <ArrowLeft size={18} /> Back to Home
            </Button>
          </div>
        </div>
      </AutoHideHeader>

      <section className="pt-32 pb-14 px-6">
        <div className="container mx-auto max-w-4xl text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/60 backdrop-blur-lg border border-primary/30">
            <Truck className="w-4 h-4 text-primary" />
            <span className="text-sm text-foreground/80">Shipping & Exchange</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold">Shipping & Exchange Policy</h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Banklefy is a digital service. No physical goods are shipped.
          </p>
          <p className="text-sm text-muted-foreground">Last updated: May 5, 2026</p>
        </div>
      </section>

      <section className="pb-16 px-6">
        <div className="container mx-auto max-w-4xl space-y-6">
          <div className="rounded-2xl border border-primary/20 bg-[#141414] p-6 space-y-3">
            <h2 className="text-xl font-semibold text-white">Shipping</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We do not ship physical items. All deliveries are digital and provided through the web app.
            </p>
          </div>

          <div className="rounded-2xl border border-primary/20 bg-[#141414] p-6 space-y-3">
            <h2 className="text-xl font-semibold text-white">Exchanges</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Exchanges are not applicable for digital exports. If you face an issue with your purchase, contact support.
            </p>
            <Button variant="outline" className="back-pill" onClick={() => navigate("/contact")}>
              Go to Contact
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ShippingExchange;

