import { ArrowLeft, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { securitySections } from "@/content/footerPages";
import AutoHideHeader from "@/components/AutoHideHeader";
import { useLanguage, type Language } from "@/contexts/LanguageContext";

const Security = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const localizedSecurityByLanguage: Record<
    Language,
    {
      backToHome: string;
      badge: string;
      title: string;
      subtitle: string;
      lastUpdated: string;
      sections: Array<{ title: string; content: string }>;
    }
  > = {
    en: {
      backToHome: "Back to Home",
      badge: "Security",
      title: "Security",
      subtitle:
        "This page explains how Banklefy protects data in transit, how access is controlled, what is retained, and where third-party dependencies are involved.",
      lastUpdated: "Last updated: March 27, 2026",
      sections: securitySections.map((section) => ({ title: section.title, content: section.content })),
    },
    ar: {
      backToHome: "العودة إلى الرئيسية",
      badge: "الأمان",
      title: "الأمان",
      subtitle:
        "تشرح هذه الصفحة كيف يحمي Banklefy البيانات أثناء النقل، وكيف يتم التحكم في الوصول، وما الذي يتم الاحتفاظ به، وأين يتم استخدام خدمات الطرف الثالث.",
      lastUpdated: "آخر تحديث: 27 مارس 2026",
      sections: [
        { title: "معالجة البيانات", content: "تتم معالجة الملفات لإنشاء الصادرات والتحليلات. يقتصر الوصول على حسابك أو جلستك النشطة، وتُستخدم صلاحيات الخدمة فقط عند الحاجة." },
        { title: "التشفير", content: "يتم تأمين الاتصال بين المتصفح والخدمة عبر HTTPS/TLS. كما تستخدم الخدمات الخارجية اتصالات مشفرة." },
        { title: "التحكم في الوصول", content: "يُنصح بتسجيل الدخول للحفاظ على حدود أعلى وربط بياناتك بحسابك. وعلى الأجهزة المشتركة، قم بتسجيل الخروج بعد الانتهاء." },
        { title: "الاحتفاظ والحذف", content: "الملفات مخصصة للمعالجة أثناء الجلسة النشطة فقط. وقد يتم تنظيف الملفات المؤقتة بعد المعالجة أو بعد فشل المهمة." },
        { title: "اعتمادات الطرف الثالث", content: "تعتمد الخدمة على Supabase وGoogle reCAPTCHA وRazorpay ومزودي OCR. وقد تؤثر سياساتهم وتوافرهم على سلوك الخدمة." },
        { title: "الاستجابة للحوادث", content: "عند اكتشاف مشكلة أمنية، نقوم بالتحقيق واتخاذ الإجراءات التصحيحية. وعند الحاجة القانونية، يتم إخطار المستخدمين المتأثرين." },
      ],
    },
    zh: {
      backToHome: "返回首页",
      badge: "安全",
      title: "安全",
      subtitle:
        "本页面说明 Banklefy 如何在传输中保护数据、如何控制访问、保留哪些信息，以及涉及哪些第三方依赖。",
      lastUpdated: "最后更新：2026年3月27日",
      sections: [
        { title: "数据处理", content: "文件会被处理以生成报表导出和分析结果。访问仅限你的账户或当前会话，后台仅在必要时使用服务权限。" },
        { title: "加密", content: "浏览器与服务之间通过 HTTPS/TLS 进行加密传输。平台使用的第三方服务同样通过加密连接通信。" },
        { title: "访问控制", content: "建议登录以获得更高配额并将数据绑定到账户。在共享设备上使用后请及时退出登录。" },
        { title: "保留与删除", content: "文件仅用于当前会话处理。处理完成或任务失败后，临时上传文件可能会被清理。" },
        { title: "第三方依赖", content: "本服务依赖 Supabase、Google reCAPTCHA、Razorpay 以及 OCR 提供商。其可用性和策略会影响服务行为。" },
        { title: "事件响应", content: "若检测到安全问题，我们会调查并采取修复措施。法律要求通知时，将按要求通知受影响用户。" },
      ],
    },
    es: {
      backToHome: "Volver al inicio",
      badge: "Seguridad",
      title: "Seguridad",
      subtitle:
        "Esta página explica cómo Banklefy protege los datos en tránsito, cómo se controla el acceso, qué se retiene y dónde intervienen dependencias de terceros.",
      lastUpdated: "Última actualización: 27 de marzo de 2026",
      sections: [
        { title: "Gestión de datos", content: "Los archivos se procesan para generar exportaciones y análisis. El acceso se limita a tu cuenta o sesión activa, y las credenciales de servicio solo se usan cuando es necesario." },
        { title: "Cifrado", content: "El tráfico entre tu navegador y el servicio usa HTTPS/TLS. Los proveedores externos también se comunican mediante conexiones cifradas." },
        { title: "Control de acceso", content: "Debes iniciar sesión para mantener límites más altos y vincular tus datos a tu cuenta. En dispositivos compartidos, cierra sesión al terminar." },
        { title: "Retención y eliminación", content: "Los archivos están pensados para procesamiento en sesión activa. Las cargas temporales pueden eliminarse tras procesar o si una tarea falla." },
        { title: "Dependencias de terceros", content: "El servicio depende de Supabase, Google reCAPTCHA, Razorpay y proveedores OCR. Su disponibilidad y políticas pueden afectar el comportamiento." },
        { title: "Respuesta a incidentes", content: "Si detectamos un problema de seguridad, investigamos y tomamos medidas correctivas. Cuando la ley lo exija, notificaremos a los usuarios afectados." },
      ],
    },
    hi: {
      backToHome: "होम पर वापस जाएं",
      badge: "सिक्योरिटी",
      title: "सिक्योरिटी",
      subtitle:
        "इस पेज में बताया गया है कि Banklefy डेटा को ट्रांजिट में कैसे सुरक्षित रखता है, एक्सेस कैसे कंट्रोल होती है, क्या रिटेन होता है और कौन‑से third-party dependencies इस्तेमाल होते हैं.",
      lastUpdated: "आखिरी अपडेट: 27 मार्च 2026",
      sections: [
        { title: "डेटा हैंडलिंग", content: "फाइलें exports और analysis बनाने के लिए प्रोसेस होती हैं. एक्सेस सिर्फ आपके अकाउंट या active session तक सीमित रहती है." },
        { title: "एन्क्रिप्शन", content: "ब्राउज़र और सेवा के बीच ट्रैफिक HTTPS/TLS से सुरक्षित रहता है. थर्ड-पार्टी providers भी encrypted connections का उपयोग करते हैं." },
        { title: "एक्सेस कंट्रोल", content: "उच्च limits और account binding के लिए sign-in रखें. shared device पर काम पूरा होने के बाद sign-out करें." },
        { title: "रिटेंशन और डिलीशन", content: "फाइलें active-session processing के लिए होती हैं. temporary uploads प्रोसेसिंग या failed jobs के बाद साफ की जा सकती हैं." },
        { title: "थर्ड-पार्टी डिपेंडेंसी", content: "सेवा Supabase, Google reCAPTCHA, Razorpay और OCR providers पर निर्भर है. उनकी availability/policies सेवा को प्रभावित कर सकती हैं." },
        { title: "इंसिडेंट रिस्पॉन्स", content: "अगर कोई security issue मिलता है, तो हम जांच करके corrective action लेते हैं. कानूनी आवश्यकता होने पर प्रभावित users को सूचित किया जाता है." },
      ],
    },
  };
  const copy = localizedSecurityByLanguage[language] ?? localizedSecurityByLanguage.en;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AutoHideHeader as="nav" className="bg-surface-elevated/80 backdrop-blur-xl border-b border-primary/20">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Logo />
          <Button variant="ghost" onClick={() => navigate("/")} className="back-pill">
            <ArrowLeft size={18} /> {copy.backToHome}
          </Button>
        </div>
      </AutoHideHeader>

      <section className="pt-32 pb-14 px-6">
        <div className="container mx-auto max-w-4xl text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/60 backdrop-blur-lg border border-primary/30">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm text-foreground/80">{copy.badge}</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold">{copy.title}</h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            {copy.subtitle}
          </p>
          <p className="text-sm text-muted-foreground">{copy.lastUpdated}</p>
        </div>
      </section>

      <section className="pb-16 px-6">
        <div className="container mx-auto max-w-4xl space-y-6">
          {securitySections.map((section, index) => {
            const localized = copy.sections[index] ?? { title: section.title, content: section.content };
            return (
            <div
              key={`${section.title}-${index}`}
              className="rounded-2xl border border-primary/20 bg-[#141414] p-6 flex gap-4"
            >
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <section.icon className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-white">{localized.title}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{localized.content}</p>
              </div>
            </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default Security;
