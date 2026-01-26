import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Users, FileText, TrendingUp, Calendar, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import akromedaLogo from '@/assets/akromeda-logo.png';

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
      // Admins need access to all data - use service-level queries via edge function
      // For now, load only data visible through RLS (admin can see their own)
      // In production, create an admin edge function for full access
      
      // Load profiles - RLS will filter to what admin can see
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Profiles query error:', profilesError);
        throw profilesError;
      }

      // Load subscriptions - RLS will filter appropriately  
      const { data: subscriptions, error: subsError } = await supabase
        .from('subscriptions')
        .select('user_id, tier, conversions_used, conversions_limit');

      if (subsError) {
        console.error('Subscriptions query error:', subsError);
        throw subsError;
      }

      // Load user roles - RLS will filter to what admin can see
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) {
        console.error('Roles query error:', rolesError);
        throw rolesError;
      }

      // Combine data - match by user_id
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
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* Header */}
      <header className="border-b border-primary/10 bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <img src={akromedaLogo} alt="Akromeda" className="h-10 w-10 md:h-12 md:w-12" />
                <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  Admin Dashboard
                </span>
              </div>
            </div>
            <Badge variant="outline" className="border-primary/50 text-primary">
              <Shield className="h-3 w-3 mr-1" />
              Admin
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Completion rate
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

        {/* Users Table */}
        <Card className="bg-card/60 backdrop-blur-lg border-primary/20">
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>All registered users and their subscription status</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <Table>
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
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((u) => (
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
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
