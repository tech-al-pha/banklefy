import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UsageLimit {
  conversionsUsed: number;
  conversionsLimit: number;
  remaining: number;
  limitReached: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

export const useUsageLimit = () => {
  const { user } = useAuth();
  const [usageLimit, setUsageLimit] = useState<UsageLimit>({
    conversionsUsed: 0,
    conversionsLimit: 2,
    remaining: 2,
    limitReached: false,
    isAuthenticated: false,
    loading: true,
    error: null,
  });

  const getTimezone = () => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return 'UTC';
    }
  };

  const checkUsageLimit = useCallback(async () => {
    try {
      setUsageLimit(prev => ({ ...prev, loading: true, error: null }));

      const timezone = getTimezone();
      
      const { data, error } = await supabase.functions.invoke('check-usage-limit', {
        body: { timezone },
      });

      if (error) {
        throw error;
      }

      setUsageLimit({
        conversionsUsed: data.conversionsUsed ?? 0,
        conversionsLimit: data.conversionsLimit ?? (user ? 6 : 2),
        remaining: data.remaining ?? 0,
        limitReached: data.limitReached ?? false,
        isAuthenticated: data.isAuthenticated ?? !!user,
        loading: false,
        error: null,
      });
    } catch (err: any) {
      console.error('Error checking usage limit:', err);
      setUsageLimit(prev => ({
        ...prev,
        loading: false,
        error: err.message || 'Failed to check usage limit',
      }));
    }
  }, [user]);

  useEffect(() => {
    checkUsageLimit();
  }, [checkUsageLimit]);

  return {
    ...usageLimit,
    refresh: checkUsageLimit,
    getTimezone,
  };
};
