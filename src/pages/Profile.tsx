import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useUsageLimit } from "@/hooks/useUsageLimit";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Logo from "@/components/Logo";
import { Loader2, LogOut, ArrowLeft } from "lucide-react";

interface RecentConversion {
  id: string;
  original_filename: string;
  status: string;
  created_at: string;
}

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { conversionsUsed, conversionsLimit, remaining, planType, loading: usageLoading } = useUsageLimit();
  const [recent, setRecent] = useState<RecentConversion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecent = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("conversions")
      .select("id, original_filename, status, created_at")
      .eq("user_id", user.id)
      .gte("created_at", since)
      .order("created_at", { ascending: false });

    if (!error) {
      setRecent(data || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchRecent();
  }, [user, navigate, fetchRecent]);

  if (!user || loading || usageLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-surface-elevated/60 backdrop-blur-lg border-b border-primary/20">
        <div className="container mx-auto px-4 sm:px-6 py-2 sm:py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="btn-glow text-muted-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Logo />
          </div>
          <Button variant="outline" size="sm" onClick={signOut} className="border-primary/50">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 sm:px-6 pt-24 pb-16">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="p-6 glass-card">
            <h1 className="text-2xl font-bold mb-4">Profile</h1>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Email</p>
                <p className="text-base font-semibold text-foreground">{user.email}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Plan</p>
                <p className="text-base font-semibold text-foreground">{planType || "free"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Conversions Today</p>
                <p className="text-base font-semibold text-foreground">
                  {conversionsUsed}/{conversionsLimit}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Remaining</p>
                <p className="text-base font-semibold text-foreground">{remaining}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 glass-card">
            <h2 className="text-xl font-semibold mb-4">Last 24 Hours</h2>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No conversions in the last 24 hours.</p>
            ) : (
              <div className="space-y-3">
                {recent.map((item) => (
                  <div key={item.id} className="flex items-center justify-between border-b border-white/5 pb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.original_filename}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(item.created_at), "MMM d, yyyy HH:mm")}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{item.status}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Profile;
