import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Logo from "@/components/Logo";
import { useLanguage } from "@/contexts/LanguageContext";
import AutoHideHeader from "@/components/AutoHideHeader";
import {
  featureCategoryOrder,
  featureCategoryLabelKey,
  featureItems,
  type FeatureCategoryId,
  type FeatureItem,
} from "@/content/featuresDirectory";

const FeaturesPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  // Group features by category
  const groupedFeatures = featureCategoryOrder.reduce(
    (acc, categoryId) => {
      const categoryFeatures = featureItems.filter((f) => f.categoryId === categoryId);
      if (categoryFeatures.length > 0) {
        acc[categoryId] = categoryFeatures;
      }
      return acc;
    },
    {} as Partial<Record<FeatureCategoryId, FeatureItem[]>>
  );

  return (
    <div className="min-h-screen bg-background text-white font-sans selection:bg-primary/30">
      {/* Header Area */}
      <AutoHideHeader as="nav" className="border-b border-primary/10 bg-ink/40 backdrop-blur-md p-4">
        <div className="container mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')} 
            className="back-pill w-full sm:w-auto"
          >
            <ArrowLeft size={18} /> Back to Home
          </Button>
        </div>
      </AutoHideHeader>

      <main className="container mx-auto px-4 sm:px-6 pt-24 pb-12 sm:pt-28 sm:pb-16 max-w-6xl">
        {/* Header Section */}
        <section className="text-center mb-20 animate-in fade-in slide-in-from-bottom-5 duration-700">
          <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter text-primary uppercase mb-6">
            {t('featuresPage.title')}
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {t('featuresPage.subtitle')}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {featureCategoryOrder.map((cat) => (
              <span 
                key={cat} 
                className="chip-muted px-4 py-1.5 rounded-full text-xs uppercase tracking-wider font-medium"
              >
                {t(featureCategoryLabelKey[cat])}
              </span>
            ))}
          </div>
        </section>

        {/* Features by Category */}
        {Object.entries(groupedFeatures)
          .filter(([, v]) => Array.isArray(v) && v.length > 0)
          .map(([categoryId, categoryFeatures], catIdx) => (
          <section key={categoryId} className="mb-16">
            <h2 className="text-2xl font-black text-primary uppercase tracking-widest mb-8 border-b border-primary/20 pb-4">
              {t(featureCategoryLabelKey[categoryId as FeatureCategoryId])}
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              {(categoryFeatures as FeatureItem[]).map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div 
                    key={index}
                    className="animate-in fade-in slide-in-from-bottom-5 duration-700"
                    style={{ animationDelay: `${(catIdx * 50) + (index * 50)}ms` }}
                  >
                    <div className="glass-card h-full flex items-start gap-5 p-6 rounded-2xl transition-all hover:shadow-neon">
                      <div className="bg-primary/10 p-3 rounded-full text-primary flex-shrink-0">
                        <Icon size={24} />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg font-black text-white uppercase tracking-wide">
                          {t(feature.titleKey)}
                        </h3>
                        <p className="text-muted-foreground leading-relaxed text-sm">
                          {t(feature.descriptionKey)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {/* CTA Section */}
        <section className="mt-20 text-center p-6 sm:p-8 md:p-12 bg-surface border border-primary/20 rounded-3xl">
          <h2 className="text-3xl font-black text-primary uppercase mb-4">
            {t('featuresPage.cta.title')}
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            {t('featuresPage.cta.desc')}
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button 
              onClick={() => navigate('/')}
              className="bg-primary text-primary-foreground font-bold px-6 py-4 sm:px-8 sm:py-6 text-base sm:text-lg"
            >
              {t('featuresPage.cta.tryDemo')}
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/auth')}
              className="border-primary/50 bg-[#141414] text-primary font-bold px-6 py-4 sm:px-8 sm:py-6 text-base sm:text-lg btn-target-glow"
            >
              {t('featuresPage.cta.signUp')}
            </Button>
          </div>
        </section>

        <footer className="mt-20 pt-8 border-t border-white/5 text-center text-xs text-muted-foreground tracking-[0.3em] uppercase">
          {t('featuresPage.footer')}
        </footer>
      </main>
    </div>
  );
};

export default FeaturesPage;
