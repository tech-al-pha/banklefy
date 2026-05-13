import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Crown, User, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatPlanLabel } from "@/lib/planLabels";
import { useLanguage, type Language } from "@/contexts/LanguageContext";

interface UsageLimitBannerProps {
  remaining: number;
  limit: number;
  isAuthenticated: boolean;
  limitReached: boolean;
  status?: string; // Status code from backend
  pagesDetected?: number;
  maxPagesAllowed?: number;
  planType?: string; // User's plan type
}

export const UsageLimitBanner = ({
  remaining,
  limit,
  isAuthenticated,
  limitReached,
  status,
  pagesDetected,
  maxPagesAllowed,
  planType = 'free',
}: UsageLimitBannerProps) => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const localizedCounterByLanguage: Record<
    Language,
    {
      conversionSingular: string;
      conversionPlural: string;
      pageSingular: string;
      pagePlural: string;
      unlimited: string;
      freeRemaining: (limit: number) => string;
      packRemaining: (limit: number) => string;
      planRemaining: (limit: number) => string;
    }
  > = {
    en: {
      conversionSingular: "conversion",
      conversionPlural: "conversions",
      pageSingular: "page",
      pagePlural: "pages",
      unlimited: "Unlimited pages remaining.",
      freeRemaining: (limit) => `of ${limit} conversions remaining today`,
      packRemaining: (limit) => `of ${limit} pages remaining in your one-time pack`,
      planRemaining: (limit) => `of ${limit} pages remaining in your plan`,
    },
    ar: {
      conversionSingular: "تحويل",
      conversionPlural: "تحويلات",
      pageSingular: "صفحة",
      pagePlural: "صفحات",
      unlimited: "صفحات غير محدودة متبقية.",
      freeRemaining: (limit) => `من أصل ${limit} تحويل متبقٍ اليوم`,
      packRemaining: (limit) => `من أصل ${limit} صفحة متبقية في باقتك لمرة واحدة`,
      planRemaining: (limit) => `من أصل ${limit} صفحة متبقية في خطتك`,
    },
    zh: {
      conversionSingular: "次转换",
      conversionPlural: "次转换",
      pageSingular: "页",
      pagePlural: "页",
      unlimited: "剩余页数不限。",
      freeRemaining: (limit) => `今日剩余 ${limit} 次转换`,
      packRemaining: (limit) => `一次性套餐剩余 ${limit} 页`,
      planRemaining: (limit) => `当前套餐剩余 ${limit} 页`,
    },
    es: {
      conversionSingular: "conversión",
      conversionPlural: "conversiones",
      pageSingular: "página",
      pagePlural: "páginas",
      unlimited: "Páginas ilimitadas restantes.",
      freeRemaining: (limit) => `de ${limit} conversiones restantes hoy`,
      packRemaining: (limit) => `de ${limit} páginas restantes en tu paquete único`,
      planRemaining: (limit) => `de ${limit} páginas restantes en tu plan`,
    },
    hi: {
      conversionSingular: "conversion",
      conversionPlural: "conversions",
      pageSingular: "page",
      pagePlural: "pages",
      unlimited: "Unlimited pages remaining.",
      freeRemaining: (limit) => `आज ${limit} conversions में से remaining`,
      packRemaining: (limit) => `आपके one-time pack में ${limit} pages remaining`,
      planRemaining: (limit) => `आपके plan में ${limit} pages remaining`,
    },
  };
  const localizedCounter = localizedCounterByLanguage[language] ?? localizedCounterByLanguage.en;
  const planLabel = formatPlanLabel(planType);
  const normalizedPlan = (planType || "free").toLowerCase();
  const isUnlimitedPlan = normalizedPlan === "unlimited" && Number.isFinite(limit) && limit >= 900000;
  const isPerPagePlan = normalizedPlan.startsWith("per_page");
  const isKnownPaidPlan = isPerPagePlan || isUnlimitedPlan;
  const isFreeMode = !isKnownPaidPlan;
  const isPaidPlan = !isFreeMode;
  const conversionLabel = remaining === 1 ? localizedCounter.conversionSingular : localizedCounter.conversionPlural;
  const pageLabel = remaining === 1 ? localizedCounter.pageSingular : localizedCounter.pagePlural;

  const formatTemplate = (templateKey: string, values: Record<string, string | number>) =>
    t(templateKey).replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));

  // PDF too complex / page limit exceeded
  if (status === 'pdf_too_complex') {
    return (
      <Alert variant="destructive" className="mb-6">
        <Lock className="h-4 w-4" />
        <AlertTitle>Premium Required</AlertTitle>
        <AlertDescription className="mt-2">
          <p className="mb-3">
            This PDF has {pagesDetected} pages and requires a Premium plan for accurate conversion.
            {maxPagesAllowed && ` Free users can convert PDFs with up to ${maxPagesAllowed} pages.`}
          </p>
          <Button
            size="sm"
            onClick={() => navigate('/pricing')}
            className="bg-primary text-primary-foreground"
          >
            <Crown className="mr-2 h-4 w-4" />
            {t("upload.limit.upgradeCta")}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (limitReached || status === 'anonymous_limit_reached') {
    const paidMessage = (() => {
      if (isPerPagePlan) {
        return formatTemplate("upload.limit.paid.pack", { limit });
      }
      return formatTemplate("upload.limit.paid.plan", { limit });
    })();

    const freeMessage = isAuthenticated
      ? `You have used all ${limit} daily conversions. Your free limit resets at midnight.`
      : `You have used all ${limit} free daily conversions. Sign up for 5 conversions/day or choose a plan.`;
    const limitTitle = isPaidPlan ? t("upload.limit.usage.title") : t("upload.limit.daily.title");

    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{limitTitle}</AlertTitle>
        <AlertDescription className="mt-2">
          <p className="mb-3">
            {isPaidPlan ? paidMessage : freeMessage}
          </p>
          {!isAuthenticated && (
            <Button
              size="sm"
              onClick={() => navigate('/auth')}
              className="bg-primary text-primary-foreground"
            >
              <User className="mr-2 h-4 w-4" />
              {t("upload.limit.signupCta")}
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  // Show usage counter
  return (
    <div className="subtle-border-glow mb-6 flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-[#191919]/70 px-5 py-3 backdrop-blur-lg">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Crown className="h-4 w-4 text-primary" />
        <span>
          {isUnlimitedPlan ? (
            localizedCounter.unlimited
          ) : (
            <>
              <strong className="text-primary">{remaining}</strong>{" "}
              {isFreeMode
                ? localizedCounter.freeRemaining(limit).replace("conversions", conversionLabel)
                : isPerPagePlan
                  ? localizedCounter.packRemaining(limit).replace("pages", pageLabel)
                  : localizedCounter.planRemaining(limit).replace("pages", pageLabel)}
            </>
          )}
          {planLabel && planLabel !== "Free" ? ` - ${planLabel}` : ""}
        </span>
      </div>
      {!isAuthenticated && (
        <Button
          variant="link"
          size="sm"
          onClick={() => navigate('/auth')}
          className="text-glow-link no-hover-glow h-auto w-auto justify-center p-0 font-medium text-primary"
        >
          {t("upload.remaining.signupMore")}{" ->"}
        </Button>
      )}
    </div>
  );
};


