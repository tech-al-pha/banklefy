import { Button } from "@/components/ui/button";
import { Upload, Zap } from "lucide-react";

export const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-dark">
        <div className="absolute inset-0 bg-gradient-glow opacity-50 animate-pulse" />
        <div className="absolute top-20 left-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/60 backdrop-blur-lg border border-primary/30">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm text-foreground/80">AI-Powered Financial Intelligence</span>
          </div>

          {/* Heading */}
          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            AI Bank Statement Converter to Excel
            <br />
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              50+ Languages | OCR-Powered | Instant Results
            </span>
          </h1>

          {/* Description */}
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Convert bank statements to Excel with AI-powered OCR technology. 
            Process PDF, scanned images, and photos from any bank in 50+ languages including 
            Hindi, Arabic, Mandarin. Bank-level security, batch uploads, instant Excel compatibility.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Button 
              size="lg" 
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-neon transition-all duration-300 hover:scale-105 group"
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
              className="border-primary/50 text-foreground hover:bg-primary/10 backdrop-blur-lg transition-all duration-300"
              onClick={() => {
                document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              View Pricing
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto pt-12">
            <div className="space-y-2">
              <div className="text-3xl md:text-4xl font-bold text-primary">50+</div>
              <div className="text-sm text-muted-foreground">Languages Supported</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl md:text-4xl font-bold text-secondary">99.9%</div>
              <div className="text-sm text-muted-foreground">AI Accuracy</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl md:text-4xl font-bold text-accent">&lt;30s</div>
              <div className="text-sm text-muted-foreground">Fast Processing</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
