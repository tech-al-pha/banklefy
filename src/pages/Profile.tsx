import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useUsageLimit } from "@/hooks/useUsageLimit";
import { useSettings } from "@/hooks/useSettings";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Logo from "@/components/Logo";
import { Camera, Loader2, LogOut } from "lucide-react";
import { formatPlanLabel } from "@/lib/planLabels";
import { useToast } from "@/hooks/use-toast";
import LoadingScreen from "@/components/LoadingScreen";
import type { ChangeEvent } from "react";

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { conversionsUsed, conversionsLimit, remaining, planType, loading: usageLoading } = useUsageLimit();
  const { profileData, updateProfile, sendPasswordReset, saving } = useSettings();
  const [displayName, setDisplayName] = useState("");
  const [nameChanged, setNameChanged] = useState(false);
  const [email, setEmail] = useState(user?.email ?? "");
  const [emailChanged, setEmailChanged] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [totalConversions, setTotalConversions] = useState<number | null>(null);
  const authFlags = user as { email_confirmed_at?: string | null; confirmed_at?: string | null } | null;
  const isVerified = Boolean(authFlags?.email_confirmed_at || authFlags?.confirmed_at);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    let isActive = true;
    setTotalConversions(null);

    const loadTotalConversions = async () => {
      const { count, error } = await supabase
        .from("conversions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (!isActive) return;
      if (!error && typeof count === "number") {
        setTotalConversions(count);
      }
    };

    loadTotalConversions();

    return () => {
      isActive = false;
    };
  }, [navigate, user]);

  useEffect(() => {
    const name = profileData?.full_name || user?.user_metadata?.full_name || "";
    setDisplayName(name);
    setNameChanged(false);
    setEmail(user?.email ?? "");
    setEmailChanged(false);
    setAvatarUrl(profileData?.avatar_url ?? (user?.user_metadata?.avatar_url as string | undefined) ?? null);
  }, [profileData, user]);

  const handleSaveName = async () => {
    await updateProfile(displayName);
    setNameChanged(false);
  };

  const handleSaveEmail = async () => {
    if (!user) return;
    const nextEmail = email.trim();
    if (!nextEmail) return;
    if (nextEmail === user.email) {
      setEmailChanged(false);
      return;
    }
    setEmailSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: nextEmail });
      if (error) throw error;

      toast({
        title: "Email update requested",
        description: "Check your inbox to confirm the new email address.",
      });
      setEmailChanged(false);
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Email update failed",
        description: error instanceof Error ? error.message : "Could not update email.",
      });
    } finally {
      setEmailSaving(false);
    }
  };

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Unsupported file",
        description: "Please upload a JPG, PNG, or WEBP image.",
      });
      return;
    }
    setAvatarUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const filePath = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(filePath, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("profile-photos").getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);
      if (profileError) throw profileError;

      await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
      setAvatarUrl(publicUrl);
      toast({ title: "Profile photo updated" });
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Could not upload photo.",
      });
    } finally {
      setAvatarUploading(false);
      event.target.value = "";
    }
  };

  const handlePasswordReset = async () => {
    if (user?.email) {
      await sendPasswordReset(user.email);
    }
  };

  const memberSince = user?.created_at ? format(new Date(user.created_at), "MMM d, yyyy") : "-";
  const planLabel = formatPlanLabel(planType);
  const displayNameFallback = profileData?.full_name || user?.user_metadata?.full_name || "Member";
  const userEmailFallback = user?.email ?? "-";

  if (!user || usageLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-surface-elevated/60 backdrop-blur-lg border-b border-primary/20">
        <div className="container mx-auto px-4 sm:px-6 py-2 sm:py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/")}
            className="border-primary/50 bg-[#141414]"
          >
            Back to Home
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 sm:px-6 pt-24 pb-16">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="p-6 glass-card">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-5">
                <div className="relative">
                  <Avatar className="h-20 w-20 border border-primary/30">
                    <AvatarImage src={avatarUrl ?? undefined} />
                    <AvatarFallback>{displayName ? displayName[0]?.toUpperCase() : "U"}</AvatarFallback>
                  </Avatar>
                  <label className="absolute -bottom-2 -right-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-neon">
                    {avatarUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                      disabled={avatarUploading}
                    />
                  </label>
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Profile</h1>
                  <p className="text-sm text-muted-foreground">Member since {memberSince}</p>
                </div>
              </div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <div className="text-[0.65rem] uppercase tracking-[0.35em] text-muted-foreground">
                  Account Type
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-primary/20 text-primary border-primary/30">{planLabel}</Badge>
                  {isVerified && <Badge variant="secondary">Verified</Badge>}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Name</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Input
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      setNameChanged(e.target.value !== (user?.user_metadata?.full_name || ""));
                    }}
                    placeholder={displayNameFallback}
                  />
                  {nameChanged && (
                    <Button size="sm" onClick={handleSaveName} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                    </Button>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Email</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Input
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailChanged(e.target.value !== (user?.email ?? ""));
                    }}
                    placeholder={userEmailFallback}
                  />
                  {emailChanged && (
                    <Button size="sm" onClick={handleSaveEmail} disabled={emailSaving}>
                      {emailSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
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
              <Button
                variant="outline"
                size="sm"
                onClick={signOut}
                className="border-primary/50 bg-[#141414]"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </Card>

          <Card className="p-6 glass-card">
            <div className="flex flex-col gap-1 mb-5">
              <h2 className="text-xl font-semibold">Usage & Achievements</h2>
              <p className="text-sm text-muted-foreground">Track your credits and lifetime conversions at a glance.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-primary/20 bg-[#121212] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Credits Remaining</p>
                <p className="mt-2 text-3xl font-bold text-primary">{remaining}</p>
                <p className="text-xs text-muted-foreground mt-1">Available conversions</p>
              </div>
              <div className="rounded-xl border border-primary/20 bg-[#121212] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Pages Today</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {conversionsUsed}/{conversionsLimit}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Daily usage</p>
              </div>
              <div className="rounded-xl border border-primary/20 bg-[#121212] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Total Conversions</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{totalConversions ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Lifetime statements processed</p>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Profile;
