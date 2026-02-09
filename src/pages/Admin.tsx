import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Users, FileText, TrendingUp, Calendar, Shield, RefreshCw, BarChart3, ShieldAlert, Database, KeyRound, Settings, Server } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import akromedaLogo from '@/assets/akromeda-logo.png';
import { getEdgeFunctionUrl } from '@/lib/supabaseApi';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  subscription?: {
    tier: string;
    conversions_used: number;
    conversions_limit: number;
  } | null;
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

interface AnonymousSummary {
  totalIPs: number;
  totalConversions: number;
}

interface ApiServiceStatus {
  name: string;
  status: string;
  message?: string | null;
  rateLimit?: {
    remaining: number | null;
    limit: number | null;
    reset: number | null;
    raw?: Record<string, string>;
  } | null;
}

interface ApiErrorItem {
  id: string;
  created_at: string;
  message: string;
}

interface ApiStatusPayload {
  checkedAt: string;
  services: ApiServiceStatus[];
  recentErrors: ApiErrorItem[];
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string') return error;
  return fallback;
};

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState<ConversionStats>({
    total: 0,
    completed: 0,
    processing: 0,
    failed: 0,
    todayCount: 0,
  });
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [anonymousSummary, setAnonymousSummary] = useState<AnonymousSummary>({
    totalIPs: 0,
    totalConversions: 0,
  });
  const [activeSection, setActiveSection] = useState<'overview' | 'users' | 'conversions' | 'security' | 'system' | 'api'>('overview');
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [tierFilter, setTierFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [apiStatus, setApiStatus] = useState<ApiStatusPayload | null>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const PAGE_SIZE = 10;

  const recentUsers = useMemo(() => {
    return [...users]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 6);
  }, [users]);

  const successRate = useMemo(() => {
    if (stats.total === 0) return 0;
    return Math.round((stats.completed / stats.total) * 100);
  }, [stats]);

  const paidUsersCount = useMemo(() => {
    return users.filter((u) => u.subscription?.tier && u.subscription?.tier !== 'free').length;
  }, [users]);

  const freeUsersCount = useMemo(() => {
    return users.filter((u) => !u.subscription?.tier || u.subscription?.tier === 'free').length;
  }, [users]);

  const adminUsersCount = useMemo(() => {
    return users.filter((u) => u.role === 'admin').length;
  }, [users]);

  const newSignups7d = useMemo(() => {
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return users.filter((u) => now - new Date(u.created_at).getTime() <= sevenDays).length;
  }, [users]);

  const last7dTotal = useMemo(() => {
    return dailyStats.reduce((sum, d) => sum + d.count, 0);
  }, [dailyStats]);

  const last7dAverage = useMemo(() => {
    if (dailyStats.length === 0) return 0;
    return Math.round(last7dTotal / dailyStats.length);
  }, [dailyStats, last7dTotal]);

  const lastActivityDate = useMemo(() => {
    if (dailyStats.length === 0) return null;
    const latest = [...dailyStats].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    return latest?.date || null;
  }, [dailyStats]);


  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    return users.filter((u) => {
      const matchesSearch = !query ||
        u.email.toLowerCase().includes(query) ||
        (u.full_name || '').toLowerCase().includes(query);
      const matchesRole = roleFilter === 'all' || (u.role || 'user') === roleFilter;
      const tier = u.subscription?.tier || 'free';
      const matchesTier = tierFilter === 'all' ||
        (tierFilter === 'free' && tier === 'free') ||
        (tierFilter === 'paid' && tier !== 'free');
      return matchesSearch && matchesRole && matchesTier;
    });
  }, [users, userSearch, roleFilter, tierFilter]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  }, [filteredUsers.length]);

  const pagedUsers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [userSearch, roleFilter, tierFilter]);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No valid session');
      }

      // Call the admin-dashboard edge function with service_role access
      const response = await fetch(getEdgeFunctionUrl('admin-dashboard'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load dashboard data');
      }

      setUsers(data.users || []);
      setStats(data.stats || {
        total: 0,
        completed: 0,
        processing: 0,
        failed: 0,
        todayCount: 0,
      });
      setDailyStats(data.dailyStats || []);
      setAnonymousSummary(data.anonymousSummary || { totalIPs: 0, totalConversions: 0 });

    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Failed to load dashboard data.');
      console.error('Load data error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: message,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadApiStatus = useCallback(async () => {
    setApiLoading(true);
    setApiError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session');
      }

      const response = await fetch(getEdgeFunctionUrl('api-status'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to load API status');
      }

      setApiStatus(data);
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Failed to load API status.');
      setApiError(message);
      toast({
        variant: 'destructive',
        title: 'API Status Error',
        description: message,
      });
    } finally {
      setApiLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (activeSection === 'api') {
      loadApiStatus();
    }
  }, [activeSection, loadApiStatus]);

  const checkAdminAccess = useCallback(async () => {
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
    } catch (error: unknown) {
      console.error('Admin check error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to verify admin access.',
      });
      navigate('/');
    }
  }, [loadDashboardData, navigate, toast, user]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    if (user) {
      checkAdminAccess();
    }
  }, [user, authLoading, navigate, checkAdminAccess]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    if (activeSection === 'api') {
      await loadApiStatus();
    }
    setRefreshing(false);
    toast({
      title: 'Refreshed',
      description: 'Dashboard data has been updated.',
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center" role="status" aria-live="polite">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <span className="sr-only">Loading admin dashboard</span>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-dark">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute -top-32 left-[-10%] h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute top-20 right-[-5%] h-96 w-96 rounded-full bg-secondary/20 blur-3xl" />
          <div className="absolute bottom-[-10%] left-[20%] h-80 w-80 rounded-full bg-accent/15 blur-3xl" />
        </div>

        <div className="relative z-10 grid min-h-screen lg:grid-cols-[280px_1fr]">
          <aside className="border-r border-primary/10 bg-background/70 backdrop-blur-xl">
            <div className="flex h-full flex-col">
              <div className="px-6 py-6">
                <div className="flex items-center gap-3">
                  <img src={akromedaLogo} alt="Akromeda" className="h-10 w-10" />
                  <div className="flex flex-col">
                    <span className="text-lg font-semibold text-foreground">Akromeda</span>
                    <span className="text-xs text-muted-foreground">Admin Console</span>
                  </div>
                </div>
              </div>

              <nav className="flex-1 space-y-1 px-3">
                <Button
                  variant="ghost"
                  className={`w-full justify-start gap-3 ${activeSection === 'overview' ? 'bg-primary/15 text-primary' : 'text-muted-foreground'}`}
                  onClick={() => setActiveSection('overview')}
                >
                  <BarChart3 className="h-4 w-4" />
                  Overview
                </Button>
                <Button
                  variant="ghost"
                  className={`w-full justify-start gap-3 ${activeSection === 'users' ? 'bg-primary/15 text-primary' : 'text-muted-foreground'}`}
                  onClick={() => setActiveSection('users')}
                >
                  <Users className="h-4 w-4" />
                  Users
                </Button>
                <Button
                  variant="ghost"
                  className={`w-full justify-start gap-3 ${activeSection === 'conversions' ? 'bg-primary/15 text-primary' : 'text-muted-foreground'}`}
                  onClick={() => setActiveSection('conversions')}
                >
                  <FileText className="h-4 w-4" />
                  Conversions
                </Button>
                <Button
                  variant="ghost"
                  className={`w-full justify-start gap-3 ${activeSection === 'security' ? 'bg-primary/15 text-primary' : 'text-muted-foreground'}`}
                  onClick={() => setActiveSection('security')}
                >
                  <ShieldAlert className="h-4 w-4" />
                  Security
                </Button>
                <Button
                  variant="ghost"
                  className={`w-full justify-start gap-3 ${activeSection === 'system' ? 'bg-primary/15 text-primary' : 'text-muted-foreground'}`}
                  onClick={() => setActiveSection('system')}
                >
                  <Server className="h-4 w-4" />
                  System
                </Button>
                <Button
                  variant="ghost"
                  className={`w-full justify-start gap-3 ${activeSection === 'api' ? 'bg-primary/15 text-primary' : 'text-muted-foreground'}`}
                  onClick={() => setActiveSection('api')}
                >
                  <KeyRound className="h-4 w-4" />
                  API
                </Button>
              </nav>

              <div className="mt-auto space-y-3 border-t border-primary/10 px-6 py-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="w-full justify-start gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh Data
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/')}
                  className="w-full justify-start gap-2 text-muted-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to site
                </Button>
              </div>
            </div>
          </aside>

          <div className="flex flex-col">
            {/* Header */}
            <header className="border-b border-primary/10 bg-background/70 backdrop-blur-xl">
              <div className="flex flex-col gap-4 px-8 py-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Admin</p>
                  <h1 className="text-2xl font-semibold text-foreground">
                    {activeSection === 'overview' && 'Overview'}
                    {activeSection === 'users' && 'User Management'}
                    {activeSection === 'conversions' && 'Conversions'}
                    {activeSection === 'security' && 'Security Center'}
                    {activeSection === 'system' && 'System Status'}
                    {activeSection === 'api' && 'API Status'}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {activeSection === 'overview' && 'At-a-glance performance, usage, and activity.'}
                    {activeSection === 'users' && 'Manage accounts, roles, and subscription tiers.'}
                    {activeSection === 'conversions' && 'Monitor daily volumes and conversion health.'}
                    {activeSection === 'security' && 'Audit access, roles, and sensitive operations.'}
                    {activeSection === 'system' && 'Track infrastructure and operational signals.'}
                    {activeSection === 'api' && 'API limits, failures, and degraded services only.'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="outline" className="border-primary/50 text-primary">
                    <Shield className="mr-1 h-3 w-3" />
                    Admin
                  </Badge>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Button>
                </div>
              </div>
            </header>

            <main className="flex-1 px-8 py-8 space-y-8">
        {activeSection === 'overview' && (
          <>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card className="bg-card/60 backdrop-blur-lg border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Users
              </CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{users.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Registered accounts
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur-lg border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Conversions
              </CardTitle>
              <FileText className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.completed} completed, {stats.failed} failed
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur-lg border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Today's Conversions
              </CardTitle>
              <Calendar className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.todayCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Conversions today
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur-lg border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Success Rate
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {successRate}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Completion rate
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur-lg border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Anonymous Usage
              </CardTitle>
              <Users className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{anonymousSummary.totalIPs}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {anonymousSummary.totalConversions} total conversions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Daily Stats Chart */}
        <Card className="bg-card/60 backdrop-blur-lg border-primary/20">
          <CardHeader>
            <CardTitle>Conversions - Last 7 Days</CardTitle>
            <CardDescription>Daily conversion activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-32">
              {dailyStats.map((day, i) => {
                const maxCount = Math.max(...dailyStats.map(d => d.count), 1);
                const height = (day.count / maxCount) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div 
                      className="w-full bg-primary/80 rounded-t transition-all duration-300 hover:bg-primary"
                      style={{ height: `${Math.max(height, 4)}%` }}
                    />
                    <span className="text-xs text-muted-foreground">
                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                    <span className="text-xs font-medium">{day.count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/70 backdrop-blur-lg border-primary/20">
          <CardHeader>
            <CardTitle>Recent Signups</CardTitle>
            <CardDescription>Latest 6 user registrations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent signups.</p>
            ) : (
              recentUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between rounded-lg border border-primary/10 bg-background/40 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{u.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Joined {new Date(u.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize">{u.subscription?.tier || 'free'}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

          </>
        )}

        {activeSection === 'users' && (
        <Card className="bg-card/70 backdrop-blur-lg border-primary/20">
          <CardHeader className="space-y-4">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>All registered users and their subscription status</CardDescription>
            </div>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 flex-col gap-3 sm:flex-row">
                <Input
                  placeholder="Search by email or name"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="bg-background/60"
                />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as 'all' | 'admin' | 'user')}
                  className="h-10 rounded-md border border-input bg-background/60 px-3 text-sm text-foreground"
                >
                  <option value="all">All roles</option>
                  <option value="admin">Admin</option>
                  <option value="user">User</option>
                </select>
                <select
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value as 'all' | 'free' | 'paid')}
                  className="h-10 rounded-md border border-input bg-background/60 px-3 text-sm text-foreground"
                >
                  <option value="all">All tiers</option>
                  <option value="free">Free</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
              <div className="text-sm text-muted-foreground">
                Showing {filteredUsers.length} users
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <ScrollArea className="h-[400px] min-w-[720px]">
                <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedUsers.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.email}</TableCell>
                        <TableCell>{u.full_name || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                            {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {u.subscription?.tier || 'free'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {u.subscription
                            ? `${u.subscription.conversions_used}/${u.subscription.conversions_limit}`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                </Table>
              </ScrollArea>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        {activeSection === 'conversions' && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
            <Card className="bg-card/70 backdrop-blur-lg border-primary/20">
              <CardHeader>
                <CardTitle>Conversion Throughput</CardTitle>
                <CardDescription>Daily activity and volume</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2 h-36">
                  {dailyStats.map((day, i) => {
                    const maxCount = Math.max(...dailyStats.map(d => d.count), 1);
                    const height = (day.count / maxCount) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full rounded-t bg-gradient-to-b from-secondary to-secondary/20 transition-all duration-300 hover:from-secondary/80"
                          style={{ height: `${Math.max(height, 6)}%` }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                        </span>
                        <span className="text-xs font-medium">{day.count}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/70 backdrop-blur-lg border-primary/20">
              <CardHeader>
                <CardTitle>Conversion Health</CardTitle>
                <CardDescription>System-level success rate</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-primary/10 bg-background/40 px-4 py-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Success Rate</p>
                    <p className="text-2xl font-semibold text-foreground">{successRate}%</p>
                  </div>
                  <TrendingUp className="h-6 w-6 text-green-500" />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-primary/10 bg-background/40 px-4 py-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Failed Conversions</p>
                    <p className="text-2xl font-semibold text-foreground">{stats.failed}</p>
                  </div>
                  <ShieldAlert className="h-6 w-6 text-red-500" />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-primary/10 bg-background/40 px-4 py-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Anonymous IPs</p>
                    <p className="text-2xl font-semibold text-foreground">{anonymousSummary.totalIPs}</p>
                  </div>
                  <Users className="h-6 w-6 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeSection === 'security' && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card className="bg-card/70 backdrop-blur-lg border-primary/20 xl:col-span-2">
              <CardHeader>
                <CardTitle>Security Controls</CardTitle>
                <CardDescription>Administrative operations overview</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-primary/10 bg-background/40 p-4">
                    <p className="text-sm text-muted-foreground">Admin Users</p>
                    <p className="text-2xl font-semibold text-foreground">
                      {adminUsersCount}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Total admins with access</p>
                  </div>
                  <div className="rounded-xl border border-primary/10 bg-background/40 p-4">
                    <p className="text-sm text-muted-foreground">Paid Users</p>
                    <p className="text-2xl font-semibold text-foreground">
                      {paidUsersCount}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Active subscriptions</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-primary/10 bg-background/40 p-4">
                    <p className="text-sm text-muted-foreground">Free Tier Users</p>
                    <p className="text-2xl font-semibold text-foreground">
                      {freeUsersCount}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Potential upgrades</p>
                  </div>
                  <div className="rounded-xl border border-primary/10 bg-background/40 p-4">
                    <p className="text-sm text-muted-foreground">New Signups (7d)</p>
                    <p className="text-2xl font-semibold text-foreground">{newSignups7d}</p>
                    <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
                  </div>
                </div>
                <div className="rounded-xl border border-primary/10 bg-background/40 p-4">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Role Validation</p>
                      <p className="text-xs text-muted-foreground">Admin access verified via RPC and token session.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/70 backdrop-blur-lg border-primary/20">
              <CardHeader>
                <CardTitle>Key Operations</CardTitle>
                <CardDescription>Critical actions to review</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-primary/10 bg-background/40 px-3 py-2">
                  <span className="text-sm text-muted-foreground">Auth settings</span>
                  <Badge variant="outline">Normal</Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-primary/10 bg-background/40 px-3 py-2">
                  <span className="text-sm text-muted-foreground">API keys rotation</span>
                  <Badge variant="outline">Scheduled</Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-primary/10 bg-background/40 px-3 py-2">
                  <span className="text-sm text-muted-foreground">Rate limits</span>
                  <Badge variant="outline">Stable</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeSection === 'system' && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card className="bg-card/70 backdrop-blur-lg border-primary/20">
              <CardHeader>
                <CardTitle>Infrastructure</CardTitle>
                <CardDescription>Operational signals from live usage</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-primary/10 bg-background/40 p-4">
                  <p className="text-sm text-muted-foreground">Conversions (7d)</p>
                  <p className="text-lg font-semibold text-foreground">{last7dTotal}</p>
                  <p className="text-xs text-muted-foreground">Total last 7 days</p>
                </div>
                <div className="rounded-xl border border-primary/10 bg-background/40 p-4">
                  <p className="text-sm text-muted-foreground">Avg Daily Conversions</p>
                  <p className="text-lg font-semibold text-foreground">{last7dAverage}</p>
                  <p className="text-xs text-muted-foreground">7-day average</p>
                </div>
                <div className="rounded-xl border border-primary/10 bg-background/40 p-4">
                  <p className="text-sm text-muted-foreground">Latest Activity</p>
                  <p className="text-lg font-semibold text-foreground">
                    {lastActivityDate ? new Date(lastActivityDate).toLocaleDateString() : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">Most recent conversion day</p>
                </div>
                <div className="rounded-xl border border-primary/10 bg-background/40 p-4">
                  <p className="text-sm text-muted-foreground">Anonymous Share</p>
                  <p className="text-lg font-semibold text-foreground">
                    {stats.total > 0 ? Math.round((anonymousSummary.totalConversions / stats.total) * 100) : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">Of total conversions</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/70 backdrop-blur-lg border-primary/20">
              <CardHeader>
                <CardTitle>System Notes</CardTitle>
                <CardDescription>Usage-driven checkpoints</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-primary/10 bg-background/40 px-3 py-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Database className="h-4 w-4" />
                    Failure rate
                  </div>
                  <Badge variant="outline">
                    {stats.total > 0 ? Math.round((stats.failed / stats.total) * 100) : 0}%
                  </Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-primary/10 bg-background/40 px-3 py-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Server className="h-4 w-4" />
                    Processing queue
                  </div>
                  <Badge variant="outline">{stats.processing}</Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-primary/10 bg-background/40 px-3 py-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Settings className="h-4 w-4" />
                    Today's conversions
                  </div>
                  <Badge variant="outline">{stats.todayCount}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeSection === 'api' && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
            <Card className="bg-card/70 backdrop-blur-lg border-primary/20">
              <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>API Health</CardTitle>
                  <CardDescription>Live checks + admin-only diagnostics</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={loadApiStatus} disabled={apiLoading}>
                  {apiLoading ? 'Checking...' : 'Refresh'}
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {apiLoading && <p className="text-sm text-muted-foreground">Checking API health...</p>}
                {!apiLoading && apiError && (
                  <p className="text-sm text-destructive">{apiError}</p>
                )}
                {!apiLoading && !apiError && (!apiStatus || apiStatus.services.length === 0) && (
                  <p className="text-sm text-muted-foreground">No API data available.</p>
                )}
                {!apiLoading && !apiError && apiStatus?.services?.map((api) => (
                  <div key={api.name} className="flex items-center justify-between rounded-lg border border-primary/10 bg-background/40 px-4 py-3">
                    <div>
                      <p className="text-sm text-muted-foreground">{api.name}</p>
                      {api.message && <p className="text-xs text-muted-foreground mt-1">{api.message}</p>}
                      {api.rateLimit?.remaining !== null && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Remaining: {api.rateLimit.remaining}
                          {api.rateLimit.limit !== null ? ` / ${api.rateLimit.limit}` : ''}
                        </p>
                      )}
                    </div>
                    <Badge
                      className={
                        api.status === 'Healthy'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : api.status === 'Rate Limited'
                            ? 'bg-amber-500/20 text-amber-300'
                            : api.status === 'Not Configured'
                              ? 'bg-muted/40 text-muted-foreground'
                              : 'bg-destructive text-white'
                      }
                    >
                      {api.status}
                    </Badge>
                  </div>
                ))}
                {apiStatus?.checkedAt && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Last checked: {new Date(apiStatus.checkedAt).toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card/70 backdrop-blur-lg border-primary/20">
              <CardHeader>
                <CardTitle>Limits & Failures</CardTitle>
                <CardDescription>Only API-related issues</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {apiStatus?.services?.filter((svc) => svc.status !== 'Healthy').length ? (
                  apiStatus.services
                    .filter((svc) => svc.status !== 'Healthy')
                    .map((svc) => (
                      <div key={svc.name} className="rounded-lg border border-primary/10 bg-background/40 px-4 py-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">{svc.name}</span>
                          <Badge variant="outline">{svc.status}</Badge>
                        </div>
                        {svc.message && <p className="text-xs text-destructive mt-2">{svc.message}</p>}
                      </div>
                    ))
                ) : (
                  <p className="text-sm text-muted-foreground">No API issues detected.</p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card/70 backdrop-blur-lg border-primary/20 xl:col-span-2">
              <CardHeader>
                <CardTitle>Recent API Errors</CardTitle>
                <CardDescription>Latest failed API-related conversions</CardDescription>
              </CardHeader>
              <CardContent>
                {apiStatus?.recentErrors?.length ? (
                  <ScrollArea className="max-h-56 pr-2">
                    <div className="space-y-2">
                      {apiStatus.recentErrors.map((err) => (
                        <div key={err.id} className="rounded-md border border-border/30 bg-muted/10 p-3">
                          <p className="text-xs text-foreground">{err.message}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {new Date(err.created_at).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-sm text-muted-foreground">No API errors detected.</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
          </div>
        </div>
      </div>
    </div>
  );
}
