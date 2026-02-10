import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react"; 
import { useNavigate } from "react-router-dom"; 
import { useLanguage } from "@/contexts/LanguageContext";
import { scrollToId } from "@/lib/scroll";
import heroDemoVideo from "@/assets/hero-demo.mp4";

export const Hero = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <section className="relative min-h-[70vh] flex items-center justify-center pt-8 pb-10 bg-transparent">

      <div className="relative z-10 container mx-auto px-4 sm:px-6 text-left">
        <div className="max-w-6xl mx-auto grid gap-10 md:grid-cols-[1.1fr_0.9fr] items-center pt-16">
          <div className="flex flex-col items-start space-y-6 md:-ml-6 lg:-ml-10">
            <div className="flex flex-col items-start leading-tight">
            <h1
              className="font-bold tracking-tight max-w-[18ch] mt-4 outline-title font-lequire"
              style={{ fontSize: "clamp(2.5rem, 5vw, 5.5rem)", textWrap: "balance" }}
            >
              {t('hero.titleLine1')}
            </h1>
            <h2
              className="font-black uppercase tracking-tight leading-[0.95] outline-title-thick font-lequire mt-2"
              style={{ fontSize: "clamp(3.2rem, 8.6vw, 8.4rem)", textWrap: "balance" }}
            >
              {t('hero.titleLine2')}
            </h2>
            </div>

            <div className="inline-flex flex-wrap items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[0.65rem] sm:text-xs md:text-sm font-semibold text-primary/80 tracking-[0.28em] uppercase shadow-[0_0_18px_rgba(255,255,255,0.08)]">
              {t('hero.tagline')}
            </div>

            <p className="text-sm md:text-lg text-white/70 max-w-2xl leading-relaxed mt-6 mb-12">
              {t('hero.subtitle')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-start items-start sm:items-center mt-14 w-full max-w-2xl">
            <Button 
              size="lg" 
              className="w-full sm:w-auto bg-primary text-primary-foreground shadow-none transition-all duration-300 hover:scale-105 group px-8 border-0 no-glow"
              onClick={() => scrollToId("demo")}
            >
              <Upload className="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform" aria-hidden="true" />
              {t('hero.uploadBtn')}
            </Button>

            <Button 
              size="lg" 
              variant="outline"
              className="w-full sm:w-auto border-primary/40 bg-surface-elevated/80 text-primary backdrop-blur-xl shadow-none transition-all duration-300 px-8"
              onClick={() => navigate("/sample-report")}
            >
              {t('hero.sampleReportBtn')}
            </Button>
            </div>

            {/* Stats... (unchanged) */}
          </div>

          <div className="hidden md:flex justify-end md:translate-x-6 lg:translate-x-10">
            <div className="w-full max-w-[600px] lg:max-w-[740px] aspect-[4/3] overflow-hidden bg-black">
              <video
                className="h-full w-full object-cover scale-[1.18] shadow-none outline-none"
                style={{ clipPath: "inset(3%)" }}
                src={heroDemoVideo}
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
