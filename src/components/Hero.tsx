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
      "PDF to Excel, CSV, JSON, and MT940.",
      "Edited PDF detector with integrity checks.",
      "Accurate debit, credit, and balance mapping.",
      "FOIR, EMI load, and risk insights.",
      "Secure processing with user-controlled access.",
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
      "Mapeo preciso de débito, crédito y saldo.",
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
    <section className="relative flex min-h-[70vh] items-center justify-center bg-transparent pb-10 pt-4 md:pt-8">

      <div className="relative z-10 mx-auto w-full max-w-[1400px] px-4 text-left">
        <div className="mx-auto grid max-w-none grid-cols-[1.1fr_0.9fr] items-center gap-10 pt-10 md:pt-16">
          <div className="flex flex-col items-start space-y-6">
            <div className="inline-flex w-fit max-w-full flex-col items-start leading-tight overflow-visible">
            <h1
              className="w-full font-bold tracking-tight mt-4 font-lequire hero-title-3d bg-gradient-to-r from-[#f2f2f2] via-[#b7b7b7] to-[#7a7a7a] bg-clip-text text-transparent leading-[1.02]"
              style={{ fontSize: "clamp(2.2rem, 6.3vw, 5.7rem)", textWrap: "balance" }}
            >
              {t('hero.titleLine1')}
            </h1>
            <h2
              className="w-full font-black uppercase font-lequire mt-2 hero-title-3d bg-gradient-to-r from-[#f2f2f2] via-[#b7b7b7] to-[#7a7a7a] bg-clip-text text-transparent leading-[0.98]"
              style={{ fontSize: "clamp(2.8rem, 9.8vw, 7.8rem)" }}
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

            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-primary/80 shadow-[0_0_18px_rgba(255,255,255,0.08)]">
              {t("hero.tagline")}
            </div>

            <p className="hero-subtitle mt-6 mb-12 max-w-2xl text-sm md:text-lg italic leading-relaxed text-white/70">
              {t("hero.subtitle")}
            </p>

            <div className="mt-14 flex w-full max-w-2xl items-center justify-start gap-4">
            <Button 
              size="lg" 
              className="group w-auto border-0 bg-primary px-8 text-primary-foreground shadow-none transition-all duration-300 hover:scale-105 no-glow"
              onClick={() => scrollToId("demo")}
            >
              <Upload className="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform" aria-hidden="true" />
              {t('hero.uploadBtn')}
            </Button>

            <Button 
              size="lg" 
              variant="outline"
              className="btn-target-glow w-auto border-primary/40 bg-[#141414] px-8 text-primary shadow-none backdrop-blur-xl transition-all duration-300"
              onClick={() => navigate("/sample-report")}
            >
              {t('hero.sampleReportBtn')}
            </Button>
            </div>

            {/* Stats... (unchanged) */}
          </div>

          <div className="flex w-full max-w-[620px] translate-x-4 flex-col justify-center gap-6 lg:translate-x-8">
            {heroHighlights.map((line) => (
              <div
                key={line}
                className="hero-highlight-pill rounded-full border border-white/30 bg-gradient-to-r from-[#0a0a0b] via-[#151617] to-[#2a2d31] px-4 py-2.5 text-center text-xs font-semibold text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_0_12px_rgba(255,255,255,0.08)] sm:px-5 md:px-6 md:py-3 md:text-sm"
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
