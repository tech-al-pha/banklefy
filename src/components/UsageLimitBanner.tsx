import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Crown, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface UsageLimitBannerProps {
  remaining: number;
  limit: number;
  isAuthenticated: boolean;
  limitReached: boolean;
}

export const UsageLimitBanner = ({
  remaining,
  limit,
  isAuthenticated,
  limitReached,
}: UsageLimitBannerProps) => {
  const navigate = useNavigate();

  if (limitReached) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Daily Limit Reached</AlertTitle>
        <AlertDescription className="mt-2">
          <p className="mb-3">
            {isAuthenticated
              ? `You've used all ${limit} of your daily conversions. Your limit resets at midnight.`
              : `You've used your ${limit} free conversions for today.`}
          </p>
          {!isAuthenticated && (
            <Button
              size="sm"
              onClick={() => navigate('/auth')}
              className="bg-primary hover:bg-primary/90"
            >
              <User className="mr-2 h-4 w-4" />
              Sign up for 6 free conversions/day
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  // Show usage counter
  return (
    <div className="flex items-center justify-between mb-4 px-4 py-2 rounded-lg bg-muted/50">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Crown className="h-4 w-4 text-primary" />
        <span>
          <strong className="text-foreground">{remaining}</strong> of {limit} conversions remaining today
        </span>
      </div>
      {!isAuthenticated && (
        <Button
          variant="link"
          size="sm"
          onClick={() => navigate('/auth')}
          className="text-primary hover:text-primary/80 p-0 h-auto"
        >
          Sign up for more →
        </Button>
      )}
    </div>
  );
};
