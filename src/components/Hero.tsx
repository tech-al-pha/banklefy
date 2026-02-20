import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react"; 
import { useNavigate } from "react-router-dom"; 
import { useLanguage } from "@/contexts/LanguageContext";
import { scrollToId } from "@/lib/scroll";

export const Hero = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const titleLine2 = t("hero.titleLine2");
  const titleLine2Chars = Array.from(titleLine2.replace(/\s+/g, ""));
  const heroHighlights = [
    "AI OCR conversion from bank PDFs to clean Excel, CSV, JSON, and MT940.",
    "Edited PDF detection with metadata checks and document integrity signals.",
    "Accurate debit, credit, and running-balance extraction with math-first validation.",
    "Risk insights with FOIR, EMI load, income consistency, and anomaly flags.",
    "Secure processing, plan-based controls, and auto-expiry file handling.",
  ];

  return (
    <section className="relative min-h-[70vh] flex items-center justify-center pt-8 pb-10 bg-transparent">

      <div className="relative z-10 mx-auto w-full max-w-[1400px] px-4 sm:px-2 text-left">
        <div className="max-w-none mx-auto grid gap-10 md:grid-cols-[1.1fr_0.9fr] items-center pt-16">
          <div className="flex flex-col items-start space-y-6">
            <div className="inline-flex w-fit max-w-full flex-col items-start leading-tight overflow-visible">
            <h1
              className="w-full font-bold tracking-tight mt-4 font-lequire hero-title-3d bg-gradient-to-r from-[#f2f2f2] via-[#b7b7b7] to-[#7a7a7a] bg-clip-text text-transparent leading-[1.02]"
              style={{ fontSize: "clamp(2rem, 5.5vw, 4.9rem)", textWrap: "balance" }}
            >
              {t('hero.titleLine1')}
            </h1>
            <h2
              className="w-full font-black uppercase font-lequire mt-2 hero-title-3d bg-gradient-to-r from-[#f2f2f2] via-[#b7b7b7] to-[#6a6a6a] bg-clip-text text-transparent leading-[0.98]"
              style={{ fontSize: "clamp(2.3rem, 7.8vw, 6.4rem)" }}
              aria-label={titleLine2}
            >
              <span className="flex w-full justify-between">
                {titleLine2Chars.map((char, index) => (
                  <span key={`${char}-${index}`} className="inline-block">
                    {char}
                  </span>
                ))}
              </span>
            </h2>
            </div>

            <div className="w-full max-w-3xl space-y-3 pt-2">
              {heroHighlights.map((line) => (
                <div
                  key={line}
                  className="rounded-full border border-white/25 bg-gradient-to-r from-[#0b1018] via-[#1a2029] to-[#3a4655] px-6 py-3 text-sm md:text-base font-semibold text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_0_24px_rgba(142,188,232,0.15)]"
                >
                  {line}
                </div>
              ))}
            </div>

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
              className="w-full sm:w-auto border-primary/40 bg-[#141414] text-primary backdrop-blur-xl shadow-none transition-all duration-300 px-8 btn-target-glow"
              onClick={() => navigate("/sample-report")}
            >
              {t('hero.sampleReportBtn')}
            </Button>
            </div>

            {/* Stats... (unchanged) */}
          </div>

          <div className="hidden md:flex justify-end md:translate-x-6 lg:translate-x-10" />
        </div>
      </div>
    </section>
  );
};
