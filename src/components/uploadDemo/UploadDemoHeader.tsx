import { useLanguage, type Language } from "@/contexts/LanguageContext";

export const UploadDemoHeader = () => {
  const { language } = useLanguage();
  const copyByLanguage: Record<Language, { title: string; accent: string; subtitle: string }> = {
    en: { title: "See It In", accent: "Action", subtitle: "Upload, convert, and download in three simple steps" },
    ar: { title: "شاهدها", accent: "عمليًا", subtitle: "ارفع الملف وحوّله ونزّله في ثلاث خطوات بسيطة" },
    zh: { title: "亲眼看看", accent: "实际效果", subtitle: "上传、转换、下载，仅需三步" },
    es: { title: "Míralo", accent: "en acción", subtitle: "Sube, convierte y descarga en tres pasos simples" },
    hi: { title: "इसे देखें", accent: "एक्शन में", subtitle: "अपलोड, कन्वर्ट और डाउनलोड सिर्फ 3 आसान स्टेप में" },
  };
  const copy = copyByLanguage[language] ?? copyByLanguage.en;

  return (
    <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
      <h2 className="text-4xl md:text-5xl font-bold">
        {copy.title}
        <span className="bg-gradient-primary bg-clip-text text-transparent"> {copy.accent}</span>
      </h2>
      <p className="text-lg text-muted-foreground">
        {copy.subtitle}
      </p>
    </div>
  );
};
