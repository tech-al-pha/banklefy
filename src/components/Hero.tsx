import { Button } from "@/components/ui/button";
import { Upload, Zap } from "lucide-react"; 
import { useNavigate } from "react-router-dom"; 

export const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-visible pt-24 pb-12">
      <div className="absolute inset-0 bg-gradient-dark -z-10">
        <div className="absolute inset-0 bg-gradient-glow opacity-50 animate-pulse" />
        <div className="absolute top-20 left-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 container mx-auto px-6 text-center">
        <div className="max-w-5xl mx-auto flex flex-col items-center space-y-10">
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#1a120b]/90 backdrop-blur-xl border border-primary/30 shadow-lg mb-4 shrink-0">
            <Zap className="w-4 h-4 text-primary fill-primary" />
            <span className="text-sm text-foreground/90 font-bold tracking-tight">
              AI-Powered Financial Intelligence
            </span>
          </div>

          <div className="flex flex-col items-center leading-tight">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white/95">
              AI Bank Statement
            </h1>
            <h2 className="text-7xl md:text-[8rem] lg:text-[8rem] font-black uppercase tracking-tighter bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-200 bg-clip-text text-transparent leading-[0.99]">
              Converter
            </h2>
          </div>

          <div className="text-lg md:text-2xl font-bold text-primary tracking-[0.1em] uppercase pt-2">
            professional look | OCR-Powered | Instant Results
          </div>

          <p className="text-sm md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed opacity-70">
            Convert bank statements to Excel with AI-powered OCR technology. 
            <br className="hidden md:block" />
            100% accurate data extraction with bank-level security.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6 w-full max-w-2xl mx-auto">
            <Button 
              size="lg" 
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-neon transition-all duration-300 hover:scale-105 group px-8"
              onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <Upload className="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform" />
              Upload Your Statement Now
            </Button>

            <Button 
              size="lg" 
              variant="outline"
              className="w-full sm:w-auto border-primary/40 bg-[#1a120b]/80 text-primary hover:bg-[#1a120b] hover:border-primary/60 backdrop-blur-xl transition-all duration-300 px-8"
              onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
            >
              View Pricing
            </Button>
          </div>

          {/* Stats... (unchanged) */}
        </div>
      </div>
    </section>
  );
};