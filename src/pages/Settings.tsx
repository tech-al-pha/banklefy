import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, useRequireAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Logo from "@/components/Logo";
import { LanguageSelector } from "@/components/LanguageSelector";
import {
  ArrowLeft,
  Search,
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  CreditCard,
  HelpCircle,
  LogOut,
  Mail,
  Key,
  Trash2,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
} from "lucide-react";

interface SettingItem {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const Settings = () => {
  const navigate = useNavigate();
  const { user, loading } = useRequireAuth();
  const { signOut } = useAuth();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  
  // Settings states
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showUsageStats, setShowUsageStats] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleDeleteAccount = () => {
    toast({
      title: t('settings.deleteAccount.warning') || "Warning",
      description: t('settings.deleteAccount.contact') || "Please contact support to delete your account.",
      variant: "destructive",
    });
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth?type=recovery`,
      });
      
      if (error) throw error;
      
      toast({
        title: t('settings.password.emailSent') || "Email Sent",
        description: t('settings.password.checkInbox') || "Check your inbox for password reset link.",
      });
    } catch (error) {
      toast({
        title: t('settings.password.error') || "Error",
        description: t('settings.password.tryAgain') || "Failed to send reset email. Try again.",
        variant: "destructive",
      });
    }
  };

  const settingItems: SettingItem[] = useMemo(() => [
    // Account Settings
    {
      id: "email",
      title: t('settings.account.email') || "Email Address",
      description: t('settings.account.emailDesc') || "Your registered email",
      category: t('settings.categories.account') || "Account",
      icon: <Mail className="h-5 w-5 text-primary" />,
      component: (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{user?.email || "—"}</span>
          <Badge variant="outline" className="text-xs">{t('settings.account.verified') || "Verified"}</Badge>
        </div>
      ),
    },
    {
      id: "password",
      title: t('settings.account.password') || "Password",
      description: t('settings.account.passwordDesc') || "Change your password",
      category: t('settings.categories.account') || "Account",
      icon: <Key className="h-5 w-5 text-primary" />,
      component: (
        <Button variant="outline" size="sm" onClick={handleResetPassword}>
          {t('settings.account.resetPassword') || "Reset Password"}
        </Button>
      ),
    },
    // Notifications
    {
      id: "email-notifications",
      title: t('settings.notifications.email') || "Email Notifications",
      description: t('settings.notifications.emailDesc') || "Receive updates via email",
      category: t('settings.categories.notifications') || "Notifications",
      icon: <Mail className="h-5 w-5 text-primary" />,
      component: (
        <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
      ),
    },
    {
      id: "push-notifications",
      title: t('settings.notifications.push') || "Push Notifications",
      description: t('settings.notifications.pushDesc') || "Browser push notifications",
      category: t('settings.categories.notifications') || "Notifications",
      icon: <Bell className="h-5 w-5 text-primary" />,
      component: (
        <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
      ),
    },
    {
      id: "sound",
      title: t('settings.notifications.sound') || "Sound Effects",
      description: t('settings.notifications.soundDesc') || "Play sounds for actions",
      category: t('settings.categories.notifications') || "Notifications",
      icon: soundEnabled ? <Volume2 className="h-5 w-5 text-primary" /> : <VolumeX className="h-5 w-5 text-primary" />,
      component: (
        <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
      ),
    },
    // Appearance
    {
      id: "dark-mode",
      title: t('settings.appearance.darkMode') || "Dark Mode",
      description: t('settings.appearance.darkModeDesc') || "Use dark theme",
      category: t('settings.categories.appearance') || "Appearance",
      icon: darkMode ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-primary" />,
      component: (
        <Switch checked={darkMode} onCheckedChange={setDarkMode} />
      ),
    },
    {
      id: "language",
      title: t('settings.appearance.language') || "Language",
      description: t('settings.appearance.languageDesc') || "Select your language",
      category: t('settings.categories.appearance') || "Appearance",
      icon: <Globe className="h-5 w-5 text-primary" />,
      component: <LanguageSelector />,
    },
    // Privacy & Security
    {
      id: "usage-stats",
      title: t('settings.privacy.usageStats') || "Usage Statistics",
      description: t('settings.privacy.usageStatsDesc') || "Show conversion stats",
      category: t('settings.categories.privacy') || "Privacy & Security",
      icon: showUsageStats ? <Eye className="h-5 w-5 text-primary" /> : <EyeOff className="h-5 w-5 text-primary" />,
      component: (
        <Switch checked={showUsageStats} onCheckedChange={setShowUsageStats} />
      ),
    },
    {
      id: "two-factor",
      title: t('settings.privacy.twoFactor') || "Two-Factor Auth",
      description: t('settings.privacy.twoFactorDesc') || "Extra security layer",
      category: t('settings.categories.privacy') || "Privacy & Security",
      icon: <Shield className="h-5 w-5 text-primary" />,
      component: (
        <div className="flex items-center gap-2">
          <Switch checked={twoFactorEnabled} onCheckedChange={setTwoFactorEnabled} />
          <Badge variant="secondary" className="text-xs">{t('settings.comingSoon') || "Coming Soon"}</Badge>
        </div>
      ),
    },
    // Subscription
    {
      id: "subscription",
      title: t('settings.subscription.plan') || "Current Plan",
      description: t('settings.subscription.planDesc') || "Manage subscription",
      category: t('settings.categories.subscription') || "Subscription",
      icon: <CreditCard className="h-5 w-5 text-primary" />,
      component: (
        <div className="flex items-center gap-2">
          <Badge className="bg-primary/20 text-primary">{t('settings.subscription.free') || "Free"}</Badge>
          <Button variant="outline" size="sm" onClick={() => navigate("/#pricing")}>
            {t('settings.subscription.upgrade') || "Upgrade"}
          </Button>
        </div>
      ),
    },
    // Support
    {
      id: "help",
      title: t('settings.support.help') || "Help & Support",
      description: t('settings.support.helpDesc') || "Get assistance",
      category: t('settings.categories.support') || "Support",
      icon: <HelpCircle className="h-5 w-5 text-primary" />,
      component: (
        <Button variant="outline" size="sm" onClick={() => navigate("/about")}>
          {t('settings.support.contact') || "Contact Us"}
        </Button>
      ),
    },
    // Danger Zone
    {
      id: "delete-account",
      title: t('settings.danger.deleteAccount') || "Delete Account",
      description: t('settings.danger.deleteAccountDesc') || "Permanently delete account",
      category: t('settings.categories.danger') || "Danger Zone",
      icon: <Trash2 className="h-5 w-5 text-destructive" />,
      component: (
        <Button variant="destructive" size="sm" onClick={handleDeleteAccount}>
          {t('settings.danger.delete') || "Delete"}
        </Button>
      ),
    },
  ], [user, emailNotifications, pushNotifications, darkMode, soundEnabled, showUsageStats, twoFactorEnabled, t]);

  // Filter settings based on search
  const filteredSettings = useMemo(() => {
    if (!searchQuery.trim()) return settingItems;
    const query = searchQuery.toLowerCase();
    return settingItems.filter(
      item =>
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
    );
  }, [settingItems, searchQuery]);

  // Group by category
  const groupedSettings = useMemo(() => {
    return filteredSettings.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, SettingItem[]>);
  }, [filteredSettings]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0502] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0502] text-foreground">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#1a120b]/80 backdrop-blur-xl border-b border-primary/20">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
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
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="border-primary/50 text-foreground hover:bg-primary/10"
          >
            <LogOut className="mr-2 h-4 w-4" />
            {t('nav.signOut') || "Sign Out"}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 pt-28 pb-16 max-w-4xl">
        <div className="space-y-8">
          {/* Title & Search */}
          <div className="space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold">
              {t('settings.title') || "Settings"}
            </h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder={t('settings.searchPlaceholder') || "Search settings..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-[#1a120b]/60 border-primary/20 focus:border-primary/50"
              />
            </div>
          </div>

          {/* Settings Groups */}
          {Object.entries(groupedSettings).map(([category, items]) => (
            <Card key={category} className="bg-[#1a120b]/60 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold text-primary">{category}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {items.map((item, idx) => (
                  <div key={item.id}>
                    <div className="flex items-center justify-between py-4 px-2 rounded-lg hover:bg-primary/5 transition-colors">
                      <div className="flex items-center gap-4">
                        {item.icon}
                        <div>
                          <p className="font-medium text-foreground">{item.title}</p>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        </div>
                      </div>
                      {item.component}
                    </div>
                    {idx < items.length - 1 && <Separator className="bg-primary/10" />}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}

          {/* No Results */}
          {Object.keys(groupedSettings).length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('settings.noResults') || "No settings found"}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Settings;
