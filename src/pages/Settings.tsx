import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useRequireAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUsageLimit } from "@/hooks/useUsageLimit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { LanguageSelector } from "@/components/LanguageSelector";
import Logo from "@/components/Logo";
import { 
  ArrowLeft, 
  Search, 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Globe, 
  HelpCircle,
  FileText,
  BarChart3,
  Settings as SettingsIcon,
  Mail,
  Lock,
  Eye,
  Smartphone,
  Moon,
  Sun,
  Volume2,
  Download,
  Trash2,
  LogOut
} from "lucide-react";

interface SettingItem {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  component?: React.ReactNode;
}

const Settings = () => {
  const { user, loading } = useRequireAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { conversionsUsed, conversionsLimit, remaining, isAuthenticated } = useUsageLimit();
  const [searchQuery, setSearchQuery] = useState("");
  const [darkMode, setDarkMode] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoDownload, setAutoDownload] = useState(false);

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
        <Input 
          placeholder={t('settings.profile.namePlaceholder')}
          className="max-w-xs bg-background/50"
          defaultValue={user?.user_metadata?.full_name || ""}
        />
      )
    },
    {
      id: "profile-password",
      title: t('settings.profile.password'),
      description: t('settings.profile.passwordDesc'),
      category: "profile",
      icon: <Lock className="h-5 w-5" />,
      component: (
        <Button variant="outline" size="sm">
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
          <Button variant="outline" size="sm" className="border-primary/50 text-primary">
            {t('settings.usage.upgrade')}
          </Button>
        </div>
      )
    },
    // Notifications
    {
      id: "notifications-email",
      title: t('settings.notifications.email'),
      description: t('settings.notifications.emailDesc'),
      category: "notifications",
      icon: <Mail className="h-5 w-5" />,
      component: (
        <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
      )
    },
    {
      id: "notifications-push",
      title: t('settings.notifications.push'),
      description: t('settings.notifications.pushDesc'),
      category: "notifications",
      icon: <Smartphone className="h-5 w-5" />,
      component: (
        <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
      )
    },
    {
      id: "notifications-sound",
      title: t('settings.notifications.sound'),
      description: t('settings.notifications.soundDesc'),
      category: "notifications",
      icon: <Volume2 className="h-5 w-5" />,
      component: (
        <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
      )
    },
    // Appearance
    {
      id: "appearance-theme",
      title: t('settings.appearance.theme'),
      description: t('settings.appearance.themeDesc'),
      category: "appearance",
      icon: darkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />,
      component: (
        <div className="flex items-center gap-2">
          <Sun className="h-4 w-4 text-muted-foreground" />
          <Switch checked={darkMode} onCheckedChange={setDarkMode} />
          <Moon className="h-4 w-4 text-muted-foreground" />
        </div>
      )
    },
    {
      id: "appearance-language",
      title: t('settings.appearance.language'),
      description: t('settings.appearance.languageDesc'),
      category: "appearance",
      icon: <Globe className="h-5 w-5" />,
      component: <LanguageSelector />
    },
    // Privacy & Security
    {
      id: "privacy-visibility",
      title: t('settings.privacy.visibility'),
      description: t('settings.privacy.visibilityDesc'),
      category: "privacy",
      icon: <Eye className="h-5 w-5" />,
      component: (
        <Button variant="outline" size="sm">
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
        <Button variant="outline" size="sm">
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
        <Button variant="destructive" size="sm">
          {t('settings.privacy.deleteAccount')}
        </Button>
      )
    },
    // Advanced
    {
      id: "advanced-download",
      title: t('settings.advanced.autoDownload'),
      description: t('settings.advanced.autoDownloadDesc'),
      category: "advanced",
      icon: <Download className="h-5 w-5" />,
      component: (
        <Switch checked={autoDownload} onCheckedChange={setAutoDownload} />
      )
    },
  ], [user, conversionsUsed, conversionsLimit, remaining, isAuthenticated, darkMode, emailNotifications, pushNotifications, soundEnabled, autoDownload, t]);

  const categories = [
    { id: "all", label: t('settings.categories.all'), icon: <SettingsIcon className="h-4 w-4" /> },
    { id: "profile", label: t('settings.categories.profile'), icon: <User className="h-4 w-4" /> },
    { id: "usage", label: t('settings.categories.usage'), icon: <BarChart3 className="h-4 w-4" /> },
    { id: "notifications", label: t('settings.categories.notifications'), icon: <Bell className="h-4 w-4" /> },
    { id: "appearance", label: t('settings.categories.appearance'), icon: <Palette className="h-4 w-4" /> },
    { id: "privacy", label: t('settings.categories.privacy'), icon: <Shield className="h-4 w-4" /> },
    { id: "advanced", label: t('settings.categories.advanced'), icon: <SettingsIcon className="h-4 w-4" /> },
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
          <Card key={item.id} className="bg-[#1a120b]/60 border-primary/20 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0502] flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0502] text-foreground">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#1a120b]/80 backdrop-blur-xl border-b border-primary/20">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="text-muted-foreground hover:text-primary"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Logo />
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('settings.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64 bg-background/50 border-primary/20"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/')}
                className="border-primary/50 text-foreground hover:bg-primary/10"
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
                  className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary border border-primary/20 bg-[#1a120b]/60 gap-2"
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
      <footer className="border-t border-primary/20 py-8 px-6 bg-[#0A0502]">
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
