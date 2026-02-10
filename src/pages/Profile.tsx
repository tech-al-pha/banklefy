import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useUsageLimit } from "@/hooks/useUsageLimit";
import { useSettings } from "@/hooks/useSettings";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Logo from "@/components/Logo";
import { Loader2, LogOut } from "lucide-react";

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
  const { profileData, updateProfile, sendPasswordReset, saving } = useSettings();
  const [recent, setRecent] = useState<RecentConversion[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [nameChanged, setNameChanged] = useState(false);
  const authFlags = user as { email_confirmed_at?: string | null; confirmed_at?: string | null } | null;
  const isVerified = Boolean(authFlags?.email_confirmed_at || authFlags?.confirmed_at);

  const fetchRecent = useCallback(async (showLoading = false) => {
    if (!user) return;
    if (showLoading) {
      setLoading(true);
    }
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
    if (showLoading) {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchRecent(true);
  }, [user, navigate, fetchRecent]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`profile-conversions-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversions", filter: `user_id=eq.${user.id}` },
        () => {
          fetchRecent();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchRecent]);

  useEffect(() => {
    const name = profileData?.full_name || user?.user_metadata?.full_name || "";
    setDisplayName(name);
    setNameChanged(false);
  }, [profileData, user]);

  const handleSaveName = async () => {
    await updateProfile(displayName);
    setNameChanged(false);
  };

  const handlePasswordReset = async () => {
    if (user?.email) {
      await sendPasswordReset(user.email);
    }
  };

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
            <h1 className="text-2xl font-bold mb-4">Account</h1>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Email</p>
                <div className="flex items-center gap-2">
                  <p className="text-base font-semibold text-foreground">{user.email}</p>
                  {isVerified && <Badge variant="secondary">Verified</Badge>}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Display Name</p>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      setNameChanged(e.target.value !== (user?.user_metadata?.full_name || ""));
                    }}
                    placeholder="Enter your name"
                  />
                  {nameChanged && (
                    <Button size="sm" onClick={handleSaveName} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                    </Button>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Password</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={handlePasswordReset} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Reset Password
                </Button>
              </div>
            </div>
            <div className="mt-6">
              <Button variant="outline" size="sm" onClick={() => navigate("/")} className="border-primary/50">
                Back to Home
              </Button>
            </div>
          </Card>

          <Card className="p-6 glass-card">
            <h2 className="text-xl font-semibold mb-4">Usage</h2>
            <div className="grid gap-4 sm:grid-cols-2">
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
