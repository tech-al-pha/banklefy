import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { invokeEdgeFunction } from '@/lib/supabaseApi';

interface UsageLimit {
  conversionsUsed: number;
  conversionsLimit: number;
  remaining: number;
  limitReached: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  planType?: string;
}

export const useUsageLimit = () => {
  const { user, session } = useAuth();
  const [usageLimit, setUsageLimit] = useState<UsageLimit>({
    conversionsUsed: 0,
    conversionsLimit: 100,
    remaining: 100,
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
      const accessToken = session?.access_token;

      // Use explicit REST call (deployment-agnostic)
      const { data, error } = await invokeEdgeFunction<{
        conversionsUsed?: number;
        conversionsLimit?: number;
        remaining?: number;
        limitReached?: boolean;
        isAuthenticated?: boolean;
        planType?: string;
      }>('check-usage-limit', {
        body: { timezone },
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
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
        planType: data.planType ?? 'free',
      });
    } catch (err: any) {
      console.error('Error checking usage limit:', err);
      setUsageLimit(prev => ({
        ...prev,
        loading: false,
        error: err.message || 'Failed to check usage limit',
      }));
    }
  }, [user, session?.access_token]);

  useEffect(() => {
    checkUsageLimit();
  }, [checkUsageLimit]);

  return {
    ...usageLimit,
    refresh: checkUsageLimit,
    getTimezone,
  };
};
