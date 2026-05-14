import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useRequireAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSettings } from "@/hooks/useSettings";
import { useUsageLimit } from "@/hooks/useUsageLimit";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import Logo from "@/components/Logo";
import { LanguageSelector } from "@/components/LanguageSelector";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Search,
  Shield,
  HelpCircle,
  BarChart3,
  Settings as SettingsIcon,
  Eye,
  Download,
  Trash2,
  LogOut,
  Loader2,
  Palette,
  MonitorSmartphone,
  SlidersHorizontal,
  Mail,
  CreditCard,
  ShieldCheck,
  UserCircle2,
  Lock,
  Bell,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatPlanLabel } from "@/lib/planLabels";
import AutoHideHeader from "@/components/AutoHideHeader";

interface SettingItem {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  component?: React.ReactNode;
  tone?: "danger" | "default";
}

const Settings = () => {
  const { user, loading: authLoading } = useRequireAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { conversionsUsed, conversionsLimit, remaining, planType, loading: usageLoading } = useUsageLimit();
  const {
    settings,
    loading: settingsLoading,
    saving,
    updateSetting,
    exportUserData,
    deleteAccount,
    updateProfile,
    sendPasswordReset,
  } = useSettings();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [displayName, setDisplayName] = useState(user?.user_metadata?.full_name ?? "");
  const [nameChanged, setNameChanged] = useState(false);
  const [email, setEmail] = useState(user?.email ?? "");
  const [emailChanged, setEmailChanged] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
  const [billingHistory, setBillingHistory] = useState<Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    created_at: string;
    plan_id: string;
  }>>([]);
  const [billingLoading, setBillingLoading] = useState(false);

  const planLabel = formatPlanLabel(planType);
  const memberSince = user?.created_at ? new Date(user.created_at) : null;
  const lastSignIn = useMemo(
    () => (user?.last_sign_in_at ? new Date(user.last_sign_in_at) : null),
    [user?.last_sign_in_at],
  );

  useEffect(() => {
    setDisplayName(user?.user_metadata?.full_name ?? "");
    setEmail(user?.email ?? "");
    setNameChanged(false);
    setEmailChanged(false);
  }, [user]);

  useEffect(() => {
    const fetchBilling = async () => {
      if (!user) return;
      setBillingLoading(true);
      const { data, error } = await supabase
        .from("razorpay_payments")
        .select("id, amount, currency, status, created_at, plan_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (!error && data) {
        setBillingHistory(data);
      }
      setBillingLoading(false);
    };
    fetchBilling();
  }, [user]);

  const handleExportData = useCallback(async () => {
    if (user?.id) {
      await exportUserData(user.id);
    }
  }, [user, exportUserData]);

  const handleDeleteAccount = useCallback(async () => {
    await deleteAccount();
  }, [deleteAccount]);

  const handleSaveName = useCallback(async () => {
    const nextName = displayName.trim();
    if (!nextName) return;
    await updateProfile(nextName);
    setNameChanged(false);
  }, [displayName, updateProfile]);

  const handleSaveEmail = useCallback(async () => {
    if (!user) return;
    const nextEmail = email.trim();
    if (!nextEmail || nextEmail === user.email) {
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
  }, [email, toast, user]);

  const handlePasswordReset = useCallback(async () => {
    if (!user?.email) return;
    await sendPasswordReset(user.email);
  }, [sendPasswordReset, user]);

  const handleLogoutAll = useCallback(async () => {
    try {
      await supabase.auth.signOut({ scope: "global" });
      toast({ title: "Signed out everywhere", description: "All sessions have been logged out." });
      navigate("/auth");
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Sign out failed",
        description: error instanceof Error ? error.message : "Could not log out all devices.",
      });
    }
  }, [navigate, toast]);

  const settingItems: SettingItem[] = useMemo(() => [
    {
      id: "account-name",
      title: "Change name",
      description: "Update the name shown on your profile and exports.",
      category: "account",
      icon: <UserCircle2 className="h-5 w-5" />,
      component: (
        <div className="flex flex-nowrap items-center gap-1 sm:gap-2">
          <Input
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              setNameChanged(e.target.value !== (user?.user_metadata?.full_name ?? ""));
            }}
            className="min-w-[220px]"
            placeholder="Enter your name"
          />
          <Button size="sm" onClick={handleSaveName} disabled={!nameChanged || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </div>
      ),
    },
    {
      id: "account-email",
      title: "Change email",
      description: "Update the email you use to sign in.",
      category: "account",
      icon: <Mail className="h-5 w-5" />,
      component: (
        <div className="flex flex-nowrap items-center gap-1 sm:gap-2">
          <Input
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailChanged(e.target.value !== (user?.email ?? ""));
            }}
            className="min-w-[240px]"
            placeholder="you@example.com"
          />
          <Button size="sm" onClick={handleSaveEmail} disabled={!emailChanged || emailSaving}>
            {emailSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </div>
      ),
    },
    {
      id: "account-password",
      title: "Change password",
      description: "Send a secure reset link to your email.",
      category: "account",
      icon: <Lock className="h-5 w-5" />,
      component: (
        <Button variant="outline" size="sm" onClick={handlePasswordReset} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Send reset email
        </Button>
      ),
    },
    {
      id: "pref-language",
      title: "Language preference",
      description: "Choose your default language for Banklefy.",
      category: "preferences",
      icon: <MonitorSmartphone className="h-5 w-5" />,
      component: <LanguageSelector />,
    },
    {
      id: "pref-export-format",
      title: "Default export format",
      description: "Pick which format downloads automatically.",
      category: "preferences",
      icon: <Download className="h-5 w-5" />,
      component: (
        <div className="flex flex-nowrap gap-1 sm:gap-2">
          <Button
            size="sm"
            variant={settings.defaultExportFormat === "xlsx" ? "default" : "outline"}
            onClick={() => updateSetting("defaultExportFormat", "xlsx")}
          >
            Excel
          </Button>
          <Button
            size="sm"
            variant={settings.defaultExportFormat === "csv" ? "default" : "outline"}
            onClick={() => updateSetting("defaultExportFormat", "csv")}
          >
            CSV
          </Button>
        </div>
      ),
    },
    {
      id: "pref-date-format",
      title: "Default date format",
      description: "Set how dates should appear in exports.",
      category: "preferences",
      icon: <SettingsIcon className="h-5 w-5" />,
      component: (
        <div className="flex flex-nowrap gap-1 sm:gap-2 overflow-x-auto scrollbar-hide pb-1">
          {(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"] as const).map((format) => (
            <Button
              key={format}
              size="sm"
              variant={settings.defaultDateFormat === format ? "default" : "outline"}
              onClick={() => updateSetting("defaultDateFormat", format)}
            >
              {format}
            </Button>
          ))}
        </div>
      ),
    },
    {
      id: "pref-auto-download",
      title: "Auto-download exports",
      description: "Download files immediately after conversion.",
      category: "preferences",
      icon: <SlidersHorizontal className="h-5 w-5" />,
      component: (
        <Switch
          checked={settings.autoDownload}
          onCheckedChange={(value) => updateSetting("autoDownload", value)}
        />
      ),
    },
    {
      id: "billing-plan",
      title: "Current plan",
      description: "Your active plan.",
      category: "billing",
      icon: <CreditCard className="h-5 w-5" />,
      component: (
        <div className="flex flex-nowrap items-center gap-1 sm:gap-2">
          <Badge className="bg-primary/20 text-primary border-primary/30 whitespace-nowrap text-[9px] sm:text-xs">{planLabel}</Badge>
          <Button variant="outline" size="sm" onClick={() => navigate("/pricing")}>
            Upgrade
          </Button>
        </div>
      ),
    },
    {
      id: "billing-credits",
      title: "Credits used / remaining",
      description: "Track your daily usage and remaining credits.",
      category: "billing",
      icon: <BarChart3 className="h-5 w-5" />,
      component: (
        <div className="text-sm text-foreground">
          <div>{conversionsUsed}/{conversionsLimit} used today</div>
          <div className="text-primary font-semibold">{remaining} remaining</div>
        </div>
      ),
    },
    {
      id: "billing-buy",
      title: "Buy more credits",
      description: "Add credits or upgrade your plan instantly.",
      category: "billing",
      icon: <CreditCard className="h-5 w-5" />,
      component: (
        <Button variant="outline" size="sm" onClick={() => navigate("/pricing")}>
          Buy credits
        </Button>
      ),
    },
    {
      id: "billing-history",
      title: "Transaction / billing history",
      description: "Recent payments and plan purchases.",
      category: "billing",
      icon: <CreditCard className="h-5 w-5" />,
      component: (
        <div className="text-sm text-muted-foreground space-y-1">
          {billingLoading && <div>Loading history…</div>}
          {!billingLoading && billingHistory.length === 0 && <div>No billing history yet.</div>}
          {!billingLoading && billingHistory.length > 0 && (
            <ul className="space-y-1">
              {billingHistory.map((entry) => (
                <li key={entry.id} className="text-foreground">
                  {entry.currency} {entry.amount} - {entry.status}
                </li>
              ))}
            </ul>
          )}
        </div>
      ),
    },
    {
      id: "notifications-complete",
      title: "Email notification on conversion complete",
      description: "Get notified when a statement is ready to download.",
      category: "notifications",
      icon: <Mail className="h-5 w-5" />,
      component: (
        <Switch
          checked={settings.emailNotifications}
          onCheckedChange={(value) => updateSetting("emailNotifications", value)}
        />
      ),
    },
    {
      id: "notifications-updates",
      title: "Product updates",
      description: "Receive new feature and product announcements.",
      category: "notifications",
      icon: <Bell className="h-5 w-5" />,
      component: (
        <Switch
          checked={settings.pushNotifications}
          onCheckedChange={(value) => updateSetting("pushNotifications", value)}
        />
      ),
    },
    {
      id: "security-sessions",
      title: "Active sessions",
      description: "You're signed in on the current device.",
      category: "security",
      icon: <ShieldCheck className="h-5 w-5" />,
      component: (
        <div className="text-sm text-muted-foreground">
          <div className="text-foreground">Current device</div>
          {lastSignIn && (
            <div className="text-xs text-muted-foreground">
              Last sign-in {lastSignIn.toLocaleString()}
            </div>
          )}
        </div>
      ),
    },
    {
      id: "security-logout",
      title: "Logout all devices",
      description: "End all active sessions instantly.",
      category: "security",
      icon: <ShieldCheck className="h-5 w-5" />,
      component: (
        <Button variant="outline" size="sm" onClick={handleLogoutAll}>
          Logout all devices
        </Button>
      ),
    },
    {
      id: "privacy-edited-warning",
      title: "Edited PDF Warning Timing",
      description: "Choose when the edited-PDF warning should appear.",
      category: "privacy",
      icon: <Eye className="h-5 w-5" />,
      component: (
        <div className="flex flex-nowrap gap-1 sm:gap-2">
          <Button
            size="sm"
            variant={settings.editedPdfWarningTiming === "upload" ? "default" : "outline"}
            onClick={() => updateSetting("editedPdfWarningTiming", "upload")}
          >
            After Upload
          </Button>
          <Button
            size="sm"
            variant={settings.editedPdfWarningTiming === "convert" ? "default" : "outline"}
            onClick={() => updateSetting("editedPdfWarningTiming", "convert")}
          >
            On Convert
          </Button>
        </div>
      ),
    },
    {
      id: "privacy-data",
      title: "Download my data",
      description: "Export your settings and account preferences.",
      category: "privacy",
      icon: <Download className="h-5 w-5" />,
      component: (
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleExportData}
          disabled={saving}
        >
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Download data
        </Button>
      ),
    },
    {
      id: "privacy-assurance",
      title: "File privacy",
      description: "We never store your files - only your converted results and account data.",
      category: "privacy",
      icon: <Shield className="h-5 w-5" />,
    },
    {
      id: "account-delete",
      title: "Delete account",
      description: "Permanently remove your account and data.",
      category: "account",
      tone: "danger",
      icon: <Trash2 className="h-5 w-5 text-red-300" />,
      component: (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="border-red-400/40 text-red-300 hover:text-red-200 hover:border-red-300/60"
            >
              <Trash2 className="h-4 w-4 mr-2 text-red-300" />
              Delete account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-background border-border">
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground">
                Delete Account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ),
    },
  ], [
    billingHistory,
    billingLoading,
    conversionsLimit,
    conversionsUsed,
    displayName,
    email,
    emailChanged,
    emailSaving,
    handleExportData,
    handleDeleteAccount,
    handleLogoutAll,
    handlePasswordReset,
    handleSaveEmail,
    handleSaveName,
    nameChanged,
    navigate,
    planLabel,
    remaining,
    saving,
    settings,
    updateSetting,
    user,
    lastSignIn,
  ]);

  const categories = [
    { id: "all", label: "All", icon: <SettingsIcon className="h-4 w-4" /> },
    { id: "account", label: "Account", icon: <UserCircle2 className="h-4 w-4" /> },
    { id: "preferences", label: "Preferences", icon: <Palette className="h-4 w-4" /> },
    { id: "billing", label: "Billing & Credits", icon: <CreditCard className="h-4 w-4" /> },
    { id: "notifications", label: "Notifications", icon: <Mail className="h-4 w-4" /> },
    { id: "security", label: "Security", icon: <ShieldCheck className="h-4 w-4" /> },
    { id: "privacy", label: "Data & Privacy", icon: <Shield className="h-4 w-4" /> },
  ];

  const filteredSettings = useMemo(() => {
    if (!searchQuery) return settingItems;
    const query = searchQuery.toLowerCase();
    return settingItems.filter(
      item => 
        item.title.toLowerCase().includes(query) || 
        item.description.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
    );
  }, [settingItems, searchQuery]);

  const renderSettingsByCategory = (category: string) => {
    const items = category === "all" 
      ? filteredSettings 
      : filteredSettings.filter(item => item.category === category);

    if (items.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{t('settings.noResults')}</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {items.map((item) => (
          <Card key={item.id} className="bg-surface-elevated/60 border-primary/20 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={item.tone === "danger" ? "p-2 rounded-lg bg-red-500/10 text-red-300" : "p-2 rounded-lg bg-primary/10 text-primary"}>
                    {item.icon}
                  </div>
                  <div>
                    <h4 className={item.tone === "danger" ? "font-medium text-red-300" : "font-medium text-foreground"}>{item.title}</h4>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {item.component}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  if (authLoading || settingsLoading || usageLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <AutoHideHeader as="header" className="bg-surface-elevated/80 backdrop-blur-xl border-b border-primary/20">
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="-ml-1">
                <Logo />
              </div>
            </div>
            <div className="flex w-auto flex-row items-center gap-4">
              <div className="relative w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('settings.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full sm:w-64 border-primary/20"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/')}
                className="btn-target-glow w-auto border-primary/50 bg-[#141414] text-foreground"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {t('settings.backToHome')}
              </Button>
            </div>
          </div>
        </div>
      </AutoHideHeader>

      {/* Main Content */}
      <main className="container mx-auto px-6 pt-28 pb-16">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">{t('settings.title')}</h1>
            <p className="text-muted-foreground">{t('settings.subtitle')}</p>
          </div>

          <Tabs defaultValue="all" className="w-full">
            <TabsList className="flex flex-nowrap overflow-x-auto gap-1 sm:gap-2 bg-transparent mb-8 h-auto p-0 pb-2 w-full justify-start [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {categories.map((cat) => (
                <TabsTrigger
                  key={cat.id}
                  value={cat.id}
                  className="chip-muted flex-shrink-0 gap-1 sm:gap-2 text-[10px] sm:text-sm px-2.5 sm:px-4 py-1.5 sm:py-2"
                >
                  <div className="scale-75 sm:scale-100 flex items-center justify-center">{cat.icon}</div>
                  <span className="whitespace-nowrap">{cat.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {categories.map((cat) => (
              <TabsContent key={cat.id} value={cat.id}>
                {renderSettingsByCategory(cat.id)}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-primary/20 py-8 px-6 bg-background">
        <div className="container mx-auto text-center">
          <p className="text-xs text-muted-foreground">
            {t('footer.copyright')}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Settings;








