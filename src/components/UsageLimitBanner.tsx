import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Crown, User, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
            className="bg-primary hover:bg-primary/90"
          >
            <Crown className="mr-2 h-4 w-4" />
            Upgrade to Premium
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (limitReached || status === 'anonymous_limit_reached') {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Daily Limit Reached</AlertTitle>
        <AlertDescription className="mt-2">
          <p className="mb-3">
            {isAuthenticated
              ? `You've used all ${limit} of your daily conversions. Your limit resets at midnight.`
              : 'Free limit reached. Please sign up to continue.'}
          </p>
          {!isAuthenticated && (
            <Button
              size="sm"
              onClick={() => navigate('/auth')}
              className="bg-primary hover:bg-primary/90"
            >
              <User className="mr-2 h-4 w-4" />
              Sign up for 6 free conversions!
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  // Show usage counter
  return (
    <div className="flex items-center justify-between mb-6 px-5 py-3 rounded-xl bg-[#0A0502]/40 backdrop-blur-lg border border-primary/20">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Crown className="h-4 w-4 text-primary" />
        <span>
          <strong className="text-primary">{remaining}</strong> of {limit} {planType && planType !== 'free' ? `${planType}` : 'free'} conversions remaining
        </span>
      </div>
      {!isAuthenticated && (
        <Button
          variant="link"
          size="sm"
          onClick={() => navigate('/auth')}
          className="text-primary hover:text-primary/80 p-0 h-auto font-medium"
        >
          Sign up for more →
        </Button>
      )}
    </div>
  );
};
