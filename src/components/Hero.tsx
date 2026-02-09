import { Button } from "@/components/ui/button";
import { Upload, Zap } from "lucide-react"; 
import { useNavigate } from "react-router-dom"; 
import { useLanguage } from "@/contexts/LanguageContext";

export const Hero = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <section className="relative min-h-[70vh] flex items-center justify-center pt-8 pb-10 bg-transparent">

      <div className="relative z-10 container mx-auto px-4 sm:px-6 text-center">
        <div className="max-w-5xl mx-auto flex flex-col items-center space-y-6 pt-16">
          <div className="flex flex-col items-center leading-tight">
            <h1
              className="font-bold tracking-tight text-white/95 max-w-[18ch] mt-4"
              style={{ fontSize: "clamp(2.5rem, 5vw, 5.5rem)", textWrap: "balance" }}
            >
              {t('hero.titleLine1')}
            </h1>
            <h2
              className="font-black uppercase tracking-tight bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-200 bg-clip-text text-transparent leading-[0.95]"
              style={{ fontSize: "clamp(3.5rem, 9vw, 9rem)", textWrap: "balance" }}
            >
              {t('hero.titleLine2')}
            </h2>
          </div>

          <div className="text-sm sm:text-lg md:text-xl font-semibold text-primary tracking-[0.06em] md:tracking-[0.1em] uppercase pt-1">
            {t('hero.tagline')}
          </div>

          <p className="text-sm md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed opacity-70 italic mt-8 mb-12">
            {t('hero.subtitle')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-14 w-full max-w-2xl mx-auto">
            <Button 
              size="lg" 
              className="w-full sm:w-auto bg-primary text-primary-foreground shadow-none transition-all duration-300 hover:scale-105 group px-8 border-0 no-glow focus-visible:ring-0 focus-visible:ring-offset-0"
              onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <Upload className="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform" />
              {t('hero.uploadBtn')}
            </Button>

            <Button 
              size="lg" 
              variant="outline"
              className="w-full sm:w-auto border-primary/40 bg-[#1a120b]/80 text-primary backdrop-blur-xl shadow-none transition-all duration-300 px-8"
              onClick={() => navigate("/sample-report")}
            >
              {t('hero.sampleReportBtn')}
            </Button>
          </div>

          {/* Stats... (unchanged) */}
        </div>
      </div>
    </section>
  );
};
