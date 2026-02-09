import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { UploadDemo } from "@/components/UploadDemo";
import { useLanguage } from "@/contexts/LanguageContext";

export const LandingPageContent = () => {
  const { t } = useLanguage();

  return (
    <>
      <div className="bg-[#0A0502]">
        <Hero />
        <HowItWorks />
      </div>

      <div id="demo">
        <UploadDemo />
      </div>

      {/* Footer CTA */}
      <section className="relative py-12 px-4 sm:px-6 overflow-hidden bg-[#0A0502]">
        <div className="container mx-auto text-center relative z-10 space-y-6">
          <h2 className="text-4xl md:text-5xl font-bold italic">
            {t('footer.cta.title')}
            <br />
            <span className="text-primary">
              {t('footer.cta.subtitle')}
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('footer.cta.desc')}
          </p>
          <button 
            className="bg-primary text-primary-foreground shadow-neon transition-all duration-300 hover:scale-105 px-8 py-4 rounded-lg font-bold text-lg"
            onClick={() => {
              document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            {t('footer.cta.btn')}
          </button>
        </div>
      </section>
    </>
  );
};
