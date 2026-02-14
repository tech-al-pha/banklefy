import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { isPaidPlan } from "@/lib/entitlements";

type GuardProps = {
  children: React.ReactNode;
  redirectTo?: string;
};

const LoadingScreen = () => (
  <div className="min-h-screen bg-background flex items-center justify-center" role="status" aria-live="polite">
    <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
    <span className="sr-only">Loading</span>
  </div>
);

export const RequireAuth = ({ children, redirectTo = "/auth" }: GuardProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate(redirectTo);
    }
  }, [loading, user, navigate, redirectTo]);

  if (loading) return <LoadingScreen />;
  if (!user) return null;
  return <>{children}</>;
};

export const RequirePaid = ({ children, redirectTo = "/pricing" }: GuardProps) => {
  const { user, loading } = useAuth();
  const { planType, tier, loading: subLoading } = useSubscriptionTier();
  const navigate = useNavigate();

  const hasPaidAccess = !!user && isPaidPlan({ planType, tier, isAuthenticated: true });

  useEffect(() => {
    if (!loading && !subLoading) {
      if (!user) {
        navigate("/auth");
        return;
      }
      if (!hasPaidAccess) {
        navigate(redirectTo);
      }
    }
  }, [loading, subLoading, user, hasPaidAccess, navigate, redirectTo]);

  if (loading || subLoading) return <LoadingScreen />;
  if (!user || !hasPaidAccess) return null;
  return <>{children}</>;
};
