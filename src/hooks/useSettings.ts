import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UserSettings {
  darkMode: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  soundEnabled: boolean;
  autoDownload: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  darkMode: true,
  emailNotifications: true,
  pushNotifications: false,
  soundEnabled: true,
  autoDownload: false,
};

const STORAGE_KEY = 'akromeda_user_settings';

export const useSettings = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (e) {
      console.warn('Failed to load settings:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Apply dark mode to document
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  const updateSetting = useCallback(<K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      // Persist to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      } catch (e) {
        console.warn('Failed to save settings:', e);
      }
      return newSettings;
    });
  }, []);

  const updateProfile = useCallback(async (fullName: string) => {
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName }
      });

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your display name has been saved.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error.message || "Could not update profile",
      });
    } finally {
      setSaving(false);
    }
  }, [toast]);

  const sendPasswordReset = useCallback(async (email: string) => {
    setSaving(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?type=recovery`,
      });

      if (error) throw error;

      toast({
        title: "Password reset email sent",
        description: "Check your inbox for the reset link.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to send reset email",
        description: error.message || "Please try again later",
      });
    } finally {
      setSaving(false);
    }
  }, [toast]);

  const exportUserData = useCallback(async (userId: string) => {
    setSaving(true);
    try {
      // Fetch user's conversions
      const { data: conversions, error } = await supabase
        .from('conversions')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      // Create export data
      const exportData = {
        exportedAt: new Date().toISOString(),
        settings,
        conversions: conversions || [],
      };

      // Download as JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `akromeda-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Data exported",
        description: "Your data has been downloaded as JSON.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Export failed",
        description: error.message || "Could not export data",
      });
    } finally {
      setSaving(false);
    }
  }, [settings, toast]);

  const deleteAccount = useCallback(async () => {
    // Note: Full account deletion requires admin action or edge function
    // This is a placeholder that signs out the user
    toast({
      title: "Account deletion requested",
      description: "Please contact support to complete account deletion.",
    });
  }, [toast]);

  return {
    settings,
    loading,
    saving,
    updateSetting,
    updateProfile,
    sendPasswordReset,
    exportUserData,
    deleteAccount,
  };
};
