import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface UserSettings {
  darkMode: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  soundEnabled: boolean;
  autoDownload: boolean;
  premiumExcelExport: boolean; // Toggle for Premium vs Simple Excel
  editedPdfWarningTiming: "upload" | "convert";
  defaultExportFormat: "xlsx" | "csv";
  defaultDateFormat: "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
}

const DEFAULT_SETTINGS: UserSettings = {
  darkMode: true,
  emailNotifications: true,
  pushNotifications: false,
  soundEnabled: true,
  autoDownload: false,
  premiumExcelExport: true, // Default to premium
  editedPdfWarningTiming: "convert",
  defaultExportFormat: "xlsx",
  defaultDateFormat: "DD/MM/YYYY",
};

const STORAGE_KEY = 'banklefy_user_settings';

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string') return error;
  return fallback;
};

export const useSettings = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState<{ full_name: string | null; avatar_url?: string | null } | null>(null);

  // Load settings from localStorage and profile from Supabase
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load UI preferences from localStorage (these don't need to be in DB)
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        }

        // Load profile data from Supabase if user is authenticated
        if (user) {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .maybeSingle();

          if (error) {
            if (import.meta.env.DEV) { console.error('Failed to load profile:', error); }
        } else if (profile) {
            setProfileData(profile as { full_name: string | null; avatar_url?: string | null });
          }
        }
      } catch (e) {
        if (import.meta.env.DEV) { console.warn('Failed to load settings:', e); }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

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
        if (import.meta.env.DEV) { console.warn('Failed to save settings:', e); }
      }
      return newSettings;
    });
  }, []);

  const updateProfile = useCallback(async (fullName: string) => {
    if (!user) return;
    
    setSaving(true);
    try {
      // Update Supabase Auth metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: fullName }
      });

      if (authError) throw authError;

      // Also update the profiles table in Supabase
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', user.id);

      if (profileError) {
        if (import.meta.env.DEV) { console.error('Profile table update error:', profileError); }
        // Don't throw - auth update succeeded
      }

      setProfileData({ full_name: fullName });

      toast({
        title: "Profile updated",
        description: "Your display name has been saved.",
      });
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: getErrorMessage(error, "Could not update profile"),
      });
    } finally {
      setSaving(false);
    }
  }, [user, toast]);

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
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Failed to send reset email",
        description: getErrorMessage(error, "Please try again later"),
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
      a.download = `banklefy-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Data exported",
        description: "Your data has been downloaded as JSON.",
      });
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Export failed",
        description: getErrorMessage(error, "Could not export data"),
      });
    } finally {
      setSaving(false);
    }
  }, [settings, toast]);

  const deleteAccount = useCallback(async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Unable to delete account",
        description: "Please sign in again and retry.",
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        throw new Error("Missing session token");
      }

      const { error } = await supabase.functions.invoke("delete-account", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error) {
        throw error;
      }

      await supabase.auth.signOut();
      toast({
        title: "Account deleted",
        description: "Your account and data have been removed.",
      });
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Deletion failed",
        description: getErrorMessage(error, "Could not delete account. Please try again."),
      });
    } finally {
      setSaving(false);
    }
  }, [toast, user]);

  return {
    settings,
    loading,
    saving,
    profileData,
    updateSetting,
    updateProfile,
    sendPasswordReset,
    exportUserData,
    deleteAccount,
  };
};
