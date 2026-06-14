import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { scrollToId } from "@/lib/scroll";

export const Hero = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const titleLine2 = t("hero.titleLine2");
  const titleLine2Chars = Array.from(titleLine2.replace(/\s+/g, ""));
  const heroHighlightsByLanguage: Record<Language, string[]> = {
    en: [
      "Convert bank statement PDFs to Excel, CSV, JSON, and MT940.",
      "Detect edited PDFs with integrity validation checks.",
      "Extract and map debit, credit, and running balances accurately.",
      "Generate FOIR, EMI load, and risk analysis insights.",
      "Secure account access with user-controlled permissions.",
    ],
    ar: [
      "تحويل PDF إلى Excel وCSV وJSON وMT940.",
      "كشف PDF المعدل مع فحوصات السلامة.",
      "تعيين دقيق للخصم والائتمان والرصيد.",
      "رؤى FOIR وعبء EMI والمخاطر.",
      "معالجة آمنة مع تحكم كامل للمستخدم.",
    ],
    zh: [
      "PDF 转 Excel、CSV、JSON 和 MT940。",
      "编辑版 PDF 检测与完整性校验。",
      "借记、贷记与余额映射更准确。",
      "FOIR、EMI 负担与风险洞察。",
      "安全处理，访问权限由用户控制。",
    ],
    es: [
      "PDF a Excel, CSV, JSON y MT940.",
      "Detector de PDF editado con comprobaciones de integridad.",
      "Mapeo preciso de débito، crédito y saldo.",
      "Información de FOIR, carga EMI y riesgo.",
      "Procesamiento seguro con acceso controlado por el usuario.",
    ],
    hi: [
      "PDF से Excel, CSV, JSON और MT940.",
      "इंटीग्रिटी चेक्स के साथ Edited PDF detector.",
      "Debit, credit और balance की accurate mapping.",
      "FOIR, EMI load और risk insights.",
      "यूज़र-कंट्रोल्ड एक्सेस के साथ secure processing.",
    ],
  };
  const heroHighlights = heroHighlightsByLanguage[language] ?? heroHighlightsByLanguage.en;

  return (
    <section className="relative flex min-h-[70vh] items-center justify-center bg-transparent pb-8 pt-1 md:pt-6">

      <div className="relative z-10 mx-auto w-full max-w-[1400px] px-4 text-left">
        <div className="mx-auto grid max-w-none grid-cols-1 md:grid-cols-[1.1fr_0.9fr] items-center gap-5 md:gap-10 pt-1 sm:pt-2 md:pt-12">
          <div className="flex flex-col items-start space-y-5 sm:space-y-6">
            <div className="inline-flex w-fit max-w-full flex-col items-start leading-tight overflow-visible lg:hidden">
              <h1
                className="w-full font-bold tracking-tight mt-2 sm:mt-4 font-lequire hero-title-3d bg-gradient-to-r from-[#f2f2f2] via-[#b7b7b7] to-[#7a7a7a] bg-clip-text text-transparent leading-[0.98] sm:leading-[1.02]"
                style={{ fontSize: "clamp(2.3rem, 8vw, 5.7rem)", textWrap: "balance" }}
              >
                <span className="block leading-[0.92]">BANK</span>
                <span className="block leading-[0.92] mt-1">STATEMENT</span>
              </h1>
              <h2
                className="w-full font-black uppercase font-lequire mt-1 sm:mt-2 hero-title-3d bg-gradient-to-r from-[#f2f2f2] via-[#b7b7b7] to-[#7a7a7a] bg-clip-text text-transparent leading-[0.9] sm:leading-[0.96]"
                style={{ fontSize: "clamp(2.7rem, 10.5vw, 7.8rem)" }}
                aria-label={`${t('hero.titleLine1')} ${titleLine2}`}
              >
                <span className="block leading-[0.9]">CONVERTER</span>
              </h2>
            </div>

            <div className="hidden lg:inline-flex w-fit max-w-full flex-col items-start leading-tight overflow-visible">
              <h1
                className="w-full font-bold tracking-tight mt-4 font-lequire hero-title-3d bg-gradient-to-r from-[#f2f2f2] via-[#b7b7b7] to-[#7a7a7a] bg-clip-text text-transparent leading-[1.02]"
                style={{ fontSize: "clamp(2.6rem, 8.5vw, 5.7rem)", textWrap: "balance" }}
              >
                {t('hero.titleLine1')}
              </h1>
              <h2
                className="w-full font-black uppercase font-lequire mt-2 hero-title-3d bg-gradient-to-r from-[#f2f2f2] via-[#b7b7b7] to-[#7a7a7a] bg-clip-text text-transparent leading-[0.98]"
                style={{ fontSize: "clamp(3.5rem, 12vw, 7.8rem)" }}
                aria-label={titleLine2}
              >
                <span className="flex w-full justify-between gap-2">
                  {titleLine2Chars.map((char, index) => (
                    <span key={`${char}-${index}`} className="inline-block">
                      {char}
                    </span>
                  ))}
                </span>
              </h2>
            </div>

            <div className="hero-highlight-pill inline-flex max-w-[96vw] items-center gap-2 sm:gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 sm:px-4 sm:py-2 text-[0.54rem] sm:text-xs font-semibold uppercase tracking-[0.12em] sm:tracking-[0.28em] text-primary/80 shadow-[0_0_18px_rgba(255,255,255,0.08)] whitespace-nowrap overflow-hidden text-ellipsis lg:py-2 lg:px-4 lg:text-xs">
              {t("hero.tagline")}
            </div>

            <p className="hero-subtitle mt-2 sm:mt-4 mb-5 sm:mb-12 max-w-3xl text-pretty text-[0.72rem] sm:text-sm md:text-lg italic leading-snug sm:leading-relaxed text-white/80 lg:text-lg lg:leading-relaxed">
              {t("hero.subtitle")}
            </p>

            <div className="hero-cta-group mt-4 sm:mt-8 md:mt-12 flex w-full max-w-2xl flex-row items-stretch justify-start gap-2.5 sm:gap-4 lg:mt-14 lg:gap-4">
              <Button
                size="lg"
                className="group hero-cta-primary w-[68%] sm:w-auto border-0 bg-primary px-4 sm:px-8 text-[0.72rem] sm:text-base lg:text-base text-primary-foreground shadow-none transition-all duration-300 hover:scale-105 no-glow"
                onClick={() => scrollToId("demo")}
              >
                <Upload className="mr-2 h-3.5 w-3.5 sm:h-5 sm:w-5 lg:h-5 lg:w-5 group-hover:rotate-12 transition-transform" aria-hidden="true" />
                {t('hero.uploadBtn')}
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="btn-target-glow hero-cta-secondary w-[32%] sm:w-auto border-primary/40 bg-[#141414] px-3 sm:px-8 text-[0.68rem] sm:text-base lg:text-base text-primary shadow-none backdrop-blur-xl transition-all duration-300"
                onClick={() => navigate("/sample-data")}
              >
                Sample Data
              </Button>
            </div>

            {/* Stats... (unchanged) */}
          </div>

          <div className="hidden md:flex w-full max-w-[620px] translate-x-0 md:translate-x-4 flex-col justify-center gap-3 sm:gap-6 lg:translate-x-8">
            {heroHighlights.map((line) => (
              <div
                key={line}
                className="hero-highlight-pill rounded-full border border-white/30 bg-gradient-to-r from-[#0a0a0b] via-[#151617] to-[#2a2d31] px-3 sm:px-4 py-2 sm:py-2.5 text-center text-[0.7rem] sm:text-xs font-semibold text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_0_12px_rgba(255,255,255,0.08)] md:px-6 md:py-3 md:text-sm"
              >
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
