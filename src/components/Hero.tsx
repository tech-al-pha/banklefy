import { Button } from "@/components/ui/button";
import { Upload, Zap } from "lucide-react"; 
import { useNavigate } from "react-router-dom"; 

export const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden pt-12 pb-4">
      <div className="absolute inset-0 bg-gradient-dark -z-10">
        <div className="absolute inset-0 bg-gradient-glow opacity-50 animate-pulse" />
        <div className="absolute top-10 left-6 sm:top-20 sm:left-20 w-72 h-72 sm:w-96 sm:h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-6 sm:bottom-20 sm:right-20 w-72 h-72 sm:w-96 sm:h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 text-center">
        <div className="max-w-5xl mx-auto flex flex-col items-center space-y-7 pt-10">
          <div className="flex flex-col items-center leading-tight">
            <h1
              className="font-bold tracking-tight text-white/95 max-w-[18ch]"
              style={{ fontSize: "clamp(2.25rem, 4.2vw, 4.5rem)", textWrap: "balance" }}
            >
              AI Bank Statement
            </h1>
            <h2
              className="font-black uppercase tracking-tight bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-200 bg-clip-text text-transparent leading-[0.95]"
              style={{ fontSize: "clamp(3.5rem, 9vw, 9rem)", textWrap: "balance" }}
            >
              Converter
            </h2>
          </div>

          <div className="text-xs sm:text-sm md:text-2xl font-bold text-primary tracking-[0.08em] md:tracking-[0.12em] uppercase pt-2">
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
              className="w-full sm:w-auto bg-primary text-primary-foreground shadow-neon transition-all duration-300 hover:scale-105 group px-8"
              onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <Upload className="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform" />
              Upload Your Statement Now
            </Button>

            <Button 
              size="lg" 
              variant="outline"
              className="w-full sm:w-auto border-primary/40 bg-[#1a120b]/80 text-primary backdrop-blur-xl transition-all duration-300 px-8"
              onClick={() => navigate("/sample-report")}
            >
              Sample Report
            </Button>
          </div>

          {/* Stats... (unchanged) */}
        </div>
      </div>
    </section>
  );
};
