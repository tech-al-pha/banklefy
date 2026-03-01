import { useState, useMemo, useCallback } from "react";
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
  FileText,
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const { conversionsUsed, conversionsLimit, remaining, isAuthenticated } = useUsageLimit();
  const {
    settings,
    loading: settingsLoading,
    saving,
    updateSetting,
    exportUserData,
    deleteAccount,
  } = useSettings();
  
  const [searchQuery, setSearchQuery] = useState("");

  const handleExportData = useCallback(async () => {
    if (user?.id) {
      await exportUserData(user.id);
    }
  }, [user, exportUserData]);

  const handleDeleteAccount = useCallback(async () => {
    await deleteAccount();
  }, [deleteAccount]);

  const settingItems: SettingItem[] = useMemo(() => [
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
            onClick={() => navigate('/pricing')}
          >
            {t('settings.usage.upgrade')}
          </Button>
        </div>
      )
    },
    // Appearance
    {
      id: "appearance-theme",
      title: t('settings.appearance.theme'),
      description: t('settings.appearance.themeDesc'),
      category: "appearance",
      icon: <Palette className="h-5 w-5" />,
      component: (
        <Switch
          checked={settings.darkMode}
          onCheckedChange={(value) => updateSetting('darkMode', value)}
        />
      )
    },
    {
      id: "appearance-language",
      title: t('settings.appearance.language'),
      description: t('settings.appearance.languageDesc'),
      category: "appearance",
      icon: <MonitorSmartphone className="h-5 w-5" />,
      component: <LanguageSelector />
    },
    // Advanced
    {
      id: "advanced-auto-download",
      title: t('settings.advanced.autoDownload'),
      description: t('settings.advanced.autoDownloadDesc'),
      category: "advanced",
      icon: <SlidersHorizontal className="h-5 w-5" />,
      component: (
        <Switch
          checked={settings.autoDownload}
          onCheckedChange={(value) => updateSetting('autoDownload', value)}
        />
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
  ], [
    conversionsUsed,
    conversionsLimit,
    remaining,
    isAuthenticated,
    saving,
    settings,
    t,
    toast,
    updateSetting,
    handleExportData,
    handleDeleteAccount,
    navigate,
  ]);

  const categories = [
    { id: "all", label: t('settings.categories.all'), icon: <SettingsIcon className="h-4 w-4" /> },
    { id: "usage", label: t('settings.categories.usage'), icon: <BarChart3 className="h-4 w-4" /> },
    { id: "appearance", label: t('settings.categories.appearance'), icon: <Palette className="h-4 w-4" /> },
    { id: "privacy", label: t('settings.categories.privacy'), icon: <Shield className="h-4 w-4" /> },
    { id: "advanced", label: t('settings.categories.advanced'), icon: <SlidersHorizontal className="h-4 w-4" /> },
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
                  className="pl-10 w-full sm:w-64 border-primary/20"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/')}
                className="border-primary/50 bg-[#141414] text-foreground w-full sm:w-auto btn-target-glow"
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








