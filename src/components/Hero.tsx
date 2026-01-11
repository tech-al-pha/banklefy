import { Button } from "@/components/ui/button";
import { Upload, Zap } from "lucide-react";

export const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center py-24 px-6 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-dark" />
      <div className="absolute inset-0 mesh-bg" />
      <div className="absolute inset-0 bg-[linear-gradient(hsl(215_100%_50%/0.03)_1px,transparent_1px),linear-gradient(90deg,hsl(215_100%_50%/0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />

      {/* Ambient Orbs */}
      <div className="absolute -top-20 -left-20 w-[520px] h-[520px] bg-primary/15 rounded-full blur-[140px]" />
      <div className="absolute -bottom-24 -right-24 w-[620px] h-[620px] bg-secondary/15 rounded-full blur-[160px]" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[520px] h-[520px] bg-accent/10 rounded-full blur-[180px]" />

      <div className="container mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 backdrop-blur-lg border border-primary/20">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm text-foreground/80">AI-Powered Financial Intelligence</span>
            </div>

            {/* Heading */}
            <div className="space-y-5">
              <h1 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight">
                AI Bank Statement Converter to Excel
                <span className="block bg-gradient-primary bg-clip-text text-transparent mt-2">
                  50+ Languages | OCR-Powered | Instant Results
                </span>
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">
                Convert bank statements to Excel with AI-powered OCR technology. 
                Process PDF, scanned images, and photos from any bank in 50+ languages including 
                Hindi, Arabic, Mandarin. Bank-level security, batch uploads, instant Excel compatibility.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                className="btn-premium bg-primary hover:bg-primary/90 text-primary-foreground shadow-neon transition-all duration-300 group"
                onClick={() => {
                  document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <Upload className="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform" />
                Upload Your Statement Now
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-primary/30 text-foreground hover:bg-primary/10 hover:border-primary/50 backdrop-blur-lg transition-all duration-300"
                onClick={() => {
                  document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                View Pricing
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-10 border-t border-border/60 max-w-xl">
              <div className="space-y-2">
                <div className="text-2xl md:text-3xl font-bold text-primary">50+</div>
                <div className="text-xs md:text-sm text-muted-foreground">Languages Supported</div>
              </div>
              <div className="space-y-2">
                <div className="text-2xl md:text-3xl font-bold text-secondary">99.9%</div>
                <div className="text-xs md:text-sm text-muted-foreground">AI Accuracy</div>
              </div>
              <div className="space-y-2">
                <div className="text-2xl md:text-3xl font-bold text-accent">&lt;30s</div>
                <div className="text-xs md:text-sm text-muted-foreground">Fast Processing</div>
              </div>
            </div>
          </div>

          {/* Right: Futuristic Preview */}
          <div className="relative hidden lg:block">
            <div className="relative">
              <div className="glass-premium rounded-2xl p-6 lightning-border">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <div className="text-xs text-muted-foreground">preview</div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-background/40 border border-border/60">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold">Salary Credit</div>
                      <div className="text-xs text-muted-foreground">Jan 01, 2024</div>
                    </div>
                    <div className="text-sm font-bold text-green-400">+₹85,000</div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-background/40 border border-border/60">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold">Rent Payment</div>
                      <div className="text-xs text-muted-foreground">Jan 05, 2024</div>
                    </div>
                    <div className="text-sm font-bold text-red-400">−₹25,000</div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-background/40 border border-border/60">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold">Online Transfer</div>
                      <div className="text-xs text-muted-foreground">Jan 10, 2024</div>
                    </div>
                    <div className="text-sm font-bold text-red-400">−₹12,500</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                    <div className="text-xs text-muted-foreground">Total Credits</div>
                    <div className="text-lg font-bold text-green-400">₹1,25,000</div>
                  </div>
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                    <div className="text-xs text-muted-foreground">Total Debits</div>
                    <div className="text-lg font-bold text-red-400">₹47,500</div>
                  </div>
                </div>
              </div>

              <div className="absolute -top-4 -right-6 px-4 py-2 rounded-full bg-primary/15 border border-primary/30 backdrop-blur-lg">
                <span className="text-sm font-semibold text-primary">Live</span>
              </div>

              <div className="absolute -bottom-6 -left-6 bento-card p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30" />
                  <div>
                    <div className="text-xs text-muted-foreground">Processing</div>
                    <div className="text-lg font-bold">&lt;30s</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
