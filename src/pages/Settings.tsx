import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useRequireAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUsageLimit } from "@/hooks/useUsageLimit";
import { useSettings } from "@/hooks/useSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import Logo from "@/components/Logo";
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
  User, 
  Shield, 
  HelpCircle,
  FileText,
  BarChart3,
  Settings as SettingsIcon,
  Mail,
  Lock,
  Eye,
  Download,
  Trash2,
  LogOut,
  Save,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SettingItem {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  component?: React.ReactNode;
}

const Settings = () => {
  const { user, loading: authLoading } = useRequireAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { conversionsUsed, conversionsLimit, remaining, isAuthenticated } = useUsageLimit();
  const {
    loading: settingsLoading,
    saving,
    profileData,
    updateProfile,
    sendPasswordReset,
    exportUserData,
    deleteAccount,
  } = useSettings();
  
  const [searchQuery, setSearchQuery] = useState("");
  // Use profileData from Supabase, fallback to auth metadata
  const [displayName, setDisplayName] = useState("");
  const [nameChanged, setNameChanged] = useState(false);

  // Initialize display name from Supabase profile or auth metadata
  useEffect(() => {
    const name = profileData?.full_name || user?.user_metadata?.full_name || "";
    setDisplayName(name);
  }, [profileData, user]);

  // Handle display name change
  const handleNameChange = useCallback((value: string) => {
    setDisplayName(value);
    setNameChanged(value !== (user?.user_metadata?.full_name || ""));
  }, [user]);

  const handleSaveName = useCallback(async () => {
    await updateProfile(displayName);
    setNameChanged(false);
  }, [displayName, updateProfile]);

  const handlePasswordReset = useCallback(async () => {
    if (user?.email) {
      await sendPasswordReset(user.email);
    }
  }, [user, sendPasswordReset]);

  const handleExportData = useCallback(async () => {
    if (user?.id) {
      await exportUserData(user.id);
    }
  }, [user, exportUserData]);

  const handleDeleteAccount = useCallback(async () => {
    await deleteAccount();
  }, [deleteAccount]);

  const settingItems: SettingItem[] = useMemo(() => [
    // Profile Settings
    {
      id: "profile-email",
      title: t('settings.profile.email'),
      description: t('settings.profile.emailDesc'),
      category: "profile",
      icon: <Mail className="h-5 w-5" />,
      component: (
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground">{user?.email || "—"}</span>
          <Badge variant="secondary">{t('settings.verified')}</Badge>
        </div>
      )
    },
    {
      id: "profile-name",
      title: t('settings.profile.name'),
      description: t('settings.profile.nameDesc'),
      category: "profile",
      icon: <User className="h-5 w-5" />,
      component: (
        <div className="flex items-center gap-2">
          <Input 
            placeholder={t('settings.profile.namePlaceholder')}
            className="max-w-xs bg-background/50"
            value={displayName}
            onChange={(e) => handleNameChange(e.target.value)}
          />
          {nameChanged && (
            <Button 
              size="sm" 
              onClick={handleSaveName}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            </Button>
          )}
        </div>
      )
    },
    {
      id: "profile-password",
      title: t('settings.profile.password'),
      description: t('settings.profile.passwordDesc'),
      category: "profile",
      icon: <Lock className="h-5 w-5" />,
      component: (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handlePasswordReset}
          disabled={saving}
        >
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          {t('settings.profile.changePassword')}
        </Button>
      )
    },
    // Usage & Billing
    {
      id: "usage-stats",
      title: t('settings.usage.stats'),
      description: t('settings.usage.statsDesc'),
      category: "usage",
      icon: <BarChart3 className="h-5 w-5" />,
      component: (
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{conversionsUsed}/{conversionsLimit}</p>
            <p className="text-xs text-muted-foreground">{t('settings.usage.conversionsToday')}</p>
          </div>
          <div className="h-12 w-px bg-border" />
          <div className="text-right">
            <p className="text-2xl font-bold text-green-500">{remaining}</p>
            <p className="text-xs text-muted-foreground">{t('settings.usage.remaining')}</p>
          </div>
        </div>
      )
    },
    {
      id: "usage-subscription",
      title: t('settings.usage.subscription'),
      description: t('settings.usage.subscriptionDesc'),
      category: "usage",
      icon: <FileText className="h-5 w-5" />,
      component: (
        <div className="flex items-center gap-3">
          <Badge className="bg-primary/20 text-primary border-primary/30">
            {isAuthenticated ? t('settings.usage.freeTier') : t('settings.usage.anonymous')}
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            className="border-primary/50 text-primary"
            onClick={() => toast({ title: "Coming Soon", description: "Premium plans will be available soon!" })}
          >
            {t('settings.usage.upgrade')}
          </Button>
        </div>
      )
    },
    // Privacy & Security
    {
      id: "privacy-visibility",
      title: t('settings.privacy.visibility'),
      description: t('settings.privacy.visibilityDesc'),
      category: "privacy",
      icon: <Eye className="h-5 w-5" />,
      component: (
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => toast({ title: "Privacy Settings", description: "Your data is private by default and not shared with anyone." })}
        >
          {t('settings.privacy.manage')}
        </Button>
      )
    },
    {
      id: "privacy-data",
      title: t('settings.privacy.data'),
      description: t('settings.privacy.dataDesc'),
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
          {t('settings.privacy.download')}
        </Button>
      )
    },
    {
      id: "privacy-delete",
      title: t('settings.privacy.delete'),
      description: t('settings.privacy.deleteDesc'),
      category: "privacy",
      icon: <Trash2 className="h-5 w-5 text-destructive" />,
      component: (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              {t('settings.privacy.deleteAccount')}
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
      )
    },
  ], [user, conversionsUsed, conversionsLimit, remaining, isAuthenticated, displayName, nameChanged, saving, t, toast, handleNameChange, handleSaveName, handlePasswordReset, handleExportData, handleDeleteAccount]);

  const categories = [
    { id: "all", label: t('settings.categories.all'), icon: <SettingsIcon className="h-4 w-4" /> },
    { id: "profile", label: t('settings.categories.profile'), icon: <User className="h-4 w-4" /> },
    { id: "usage", label: t('settings.categories.usage'), icon: <BarChart3 className="h-4 w-4" /> },
    { id: "privacy", label: t('settings.categories.privacy'), icon: <Shield className="h-4 w-4" /> },
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
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">{item.title}</h4>
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

  if (authLoading || settingsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface-elevated/80 backdrop-blur-xl border-b border-primary/20">
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="-ml-1">
                <Logo />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full sm:w-auto">
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('settings.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full sm:w-64 bg-background/50 border-primary/20"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/')}
                className="border-primary/50 text-foreground w-full sm:w-auto"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {t('settings.backToHome')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 pt-28 pb-16">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">{t('settings.title')}</h1>
            <p className="text-muted-foreground">{t('settings.subtitle')}</p>
          </div>

          <Tabs defaultValue="all" className="w-full">
            <TabsList className="flex flex-wrap gap-2 bg-transparent mb-8 h-auto p-0">
              {categories.map((cat) => (
                <TabsTrigger
                  key={cat.id}
                  value={cat.id}
                  className="chip-muted gap-2"
                >
                  {cat.icon}
                  {cat.label}
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
