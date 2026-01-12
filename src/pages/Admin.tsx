import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Users, FileText, TrendingUp, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AdminHeader } from '@/components/layout';
import { StatCard, DailyStatsChart } from '@/components/cards';
import { UsersTable } from '@/components/tables';
import { PageLoader } from '@/components/common';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  subscription?: {
    tier: string;
    conversions_used: number;
    conversions_limit: number;
  };
  role?: string;
}

interface ConversionStats {
  total: number;
  completed: number;
  processing: number;
  failed: number;
  todayCount: number;
}

interface DailyStats {
  date: string;
  count: number;
}

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState<ConversionStats>({
    total: 0,
    completed: 0,
    processing: 0,
    failed: 0,
    todayCount: 0,
  });
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    if (user) {
      checkAdminAccess();
    }
  }, [user, authLoading, navigate]);

  const checkAdminAccess = async () => {
    try {
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: user!.id,
        _role: 'admin'
      });

      if (error) throw error;

      if (!data) {
        toast({
          variant: 'destructive',
          title: 'Access Denied',
          description: 'You do not have admin privileges.',
        });
        navigate('/');
        return;
      }

      setIsAdmin(true);
      await loadDashboardData();
    } catch (error: any) {
      console.error('Admin check error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to verify admin access.',
      });
      navigate('/');
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load users with their subscriptions
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Load subscriptions for all users
      const { data: subscriptions, error: subsError } = await supabase
        .from('subscriptions')
        .select('*');

      if (subsError) throw subsError;

      // Load user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Combine data
      const enrichedUsers = profiles?.map(profile => ({
        ...profile,
        subscription: subscriptions?.find(s => s.user_id === profile.id),
        role: roles?.find(r => r.user_id === profile.id)?.role || 'user',
      })) || [];

      setUsers(enrichedUsers);

      // Load conversion stats
      const { data: conversions, error: convError } = await supabase
        .from('conversions')
        .select('*');

      if (convError) throw convError;

      const today = new Date().toISOString().split('T')[0];
      const conversionStats: ConversionStats = {
        total: conversions?.length || 0,
        completed: conversions?.filter(c => c.status === 'completed').length || 0,
        processing: conversions?.filter(c => c.status === 'processing').length || 0,
        failed: conversions?.filter(c => c.status === 'failed').length || 0,
        todayCount: conversions?.filter(c => c.created_at.startsWith(today)).length || 0,
      };
      setStats(conversionStats);

      // Calculate daily stats for last 7 days
      const last7Days: DailyStats[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const count = conversions?.filter(c => c.created_at.startsWith(dateStr)).length || 0;
        last7Days.push({ date: dateStr, count });
      }
      setDailyStats(last7Days);

    } catch (error: any) {
      console.error('Load data error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load dashboard data.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return <PageLoader />;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-dark">
      <AdminHeader />

      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Users"
            value={users.length}
            description="Registered accounts"
            icon={Users}
            iconClassName="text-primary"
          />
          <StatCard
            title="Total Conversions"
            value={stats.total}
            description={`${stats.completed} completed, ${stats.failed} failed`}
            icon={FileText}
            iconClassName="text-secondary"
          />
          <StatCard
            title="Today's Conversions"
            value={stats.todayCount}
            description="Conversions today"
            icon={Calendar}
            iconClassName="text-accent"
          />
          <StatCard
            title="Success Rate"
            value={`${stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%`}
            description="Completion rate"
            icon={TrendingUp}
            iconClassName="text-green-500"
          />
        </div>

        {/* Daily Stats Chart */}
        <DailyStatsChart data={dailyStats} />

        {/* Users Table */}
        <UsersTable users={users} />
      </main>
    </div>
  );
}
