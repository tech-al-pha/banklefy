import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Crown, User, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatPlanLabel } from "@/lib/planLabels";
import { useLanguage } from "@/contexts/LanguageContext";

interface UsageLimitBannerProps {
  remaining: number;
  limit: number;
  isAuthenticated: boolean;
  limitReached: boolean;
  status?: string; // Status code from backend
  pagesDetected?: number;
  maxPagesAllowed?: number;
  used?: number; // Pages/conversions used
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
  used = 0,
  planType = 'free',
}: UsageLimitBannerProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const planLabel = formatPlanLabel(planType);
  const normalizedPlan = (planType || "free").toLowerCase();
  const isUnlimitedPlan = normalizedPlan === "unlimited" && Number.isFinite(limit) && limit >= 900000;
  const isPerPagePlan = normalizedPlan.startsWith("per_page");
  const isMonthlyPlan = normalizedPlan.startsWith("monthly") || normalizedPlan === "daily";
  const isYearlyPlan = normalizedPlan.startsWith("yearly") || normalizedPlan === "business";
  const isKnownPaidPlan = isPerPagePlan || isMonthlyPlan || isYearlyPlan || isUnlimitedPlan;
  const isFreeMode = !isKnownPaidPlan && (!isAuthenticated || normalizedPlan === "free" || limit <= 5);
  const isPaidPlan = !isFreeMode;
  const conversionLabel = remaining === 1 ? "conversion" : "conversions";
  const pageLabel = remaining === 1 ? "page" : "pages";

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
      if (isMonthlyPlan) {
        return formatTemplate("upload.limit.paid.month", { limit });
      }
      if (isYearlyPlan) {
        return formatTemplate("upload.limit.paid.year", { limit });
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
    <div className="subtle-border-glow flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6 px-5 py-3 rounded-xl bg-[#191919]/70 backdrop-blur-lg border border-primary/20">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Crown className="h-4 w-4 text-primary" />
        <span>
          {isUnlimitedPlan ? (
            "Unlimited pages remaining."
          ) : (
            <>
              <strong className="text-primary">{remaining}</strong>{" "}
              {isFreeMode
                ? `of ${limit} ${conversionLabel} remaining today`
                : isPerPagePlan
                  ? `of ${limit} ${pageLabel} remaining in your pack`
                  : isYearlyPlan
                    ? `of ${limit} ${pageLabel} remaining this year`
                    : `of ${limit} ${pageLabel} remaining this month`}
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
          className="text-glow-link no-hover-glow text-primary p-0 h-auto font-medium w-full sm:w-auto justify-start sm:justify-center"
        >
          {t("upload.remaining.signupMore")}{" ->"}
        </Button>
      )}
    </div>
  );
};


