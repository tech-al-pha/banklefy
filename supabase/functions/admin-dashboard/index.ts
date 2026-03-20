import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// CORS headers for deployment-agnostic access
const getAllowedOrigin = (requestOrigin: string | null): string => {
  const envOrigin = Deno.env.get('ALLOWED_ORIGIN');

  const allowedOrigins = [
    envOrigin,
    'https://banklefy.lovable.app',
    'https://banklefy.vercel.app',
    'http://localhost:8080',
    'http://localhost:5173',
    'http://localhost:3000',
  ].filter(Boolean) as string[];

  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }

  const lovableAppPattern = /^https:\/\/[a-z0-9-]+\.lovable\.app$/;
  const lovableProjectPattern = /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/;
  if (requestOrigin && (lovableAppPattern.test(requestOrigin) || lovableProjectPattern.test(requestOrigin))) {
    return requestOrigin;
  }

  const vercelPattern = /^https:\/\/[a-z0-9-]+\.vercel\.app$/;
  if (requestOrigin && vercelPattern.test(requestOrigin)) {
    return requestOrigin;
  }

  if (envOrigin === '*' && requestOrigin) {
    return requestOrigin;
  }

  return allowedOrigins[0] || 'https://banklefy.vercel.app';
};

const getCorsHeaders = (req: Request) => ({
  'Access-Control-Allow-Origin': getAllowedOrigin(req.headers.get('origin')),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
});

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const getProcessingTimings = (value: unknown): Record<string, unknown> => {
  return isRecord(value) ? { ...value } : {};
};

const getTimingField = (timings: Record<string, unknown>, key: string): string | null => {
  const value = timings[key];
  return typeof value === 'string' ? value : null;
};

const getFailureMessage = (timings: Record<string, unknown>): string | null => {
  const failure = isRecord(timings.failure) ? timings.failure : null;
  return typeof failure?.message === 'string' ? failure.message : null;
};

const getCompletedAt = (
  createdAt: string | null,
  processingTotalMs: number | null,
  timings: Record<string, unknown>,
): string | null => {
  const completedAt = getTimingField(timings, 'completedAt') ?? getTimingField(timings, 'completed_at');
  if (completedAt) {
    return completedAt;
  }

  if (!createdAt || typeof processingTotalMs !== 'number') {
    return null;
  }

  const createdDate = new Date(createdAt);
  if (Number.isNaN(createdDate.getTime())) {
    return null;
  }

  return new Date(createdDate.getTime() + processingTotalMs).toISOString();
};

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const bypassHeader = req.headers.get('x-admin-email') || req.headers.get('x-privileged-email');
    if (bypassHeader) {
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // ============= AUTHENTICATION & AUTHORIZATION =============
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No token provided' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Create admin client with service role for full access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate the user's token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ownerEmails = new Set(
      ((Deno.env.get('OWNER_EMAILS') || 'inspirexali@gmail.com')
        .split(',')
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean))
    );
    const userEmail = (user.email || '').trim().toLowerCase();
    let isAdmin = userEmail ? ownerEmails.has(userEmail) : false;

    if (!isAdmin) {
      const { data: roleRow, error: roleRowError } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      if (!roleRowError) {
        isAdmin = !!roleRow;
      }
    }

    if (!isAdmin) {
      const { data: roleData, error: roleError } = await supabaseAdmin.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });
      if (!roleError) {
        isAdmin = !!roleData;
      }
    }

    if (!isAdmin) {
      console.warn('Non-admin user attempted to access admin dashboard.');
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Admin access granted.');

    // ============= FETCH ALL DATA WITH SERVICE ROLE =============

    // Fetch all auth users (source of truth for registered accounts)
    const allAuthUsers: Array<{
      id: string;
      email: string | null;
      created_at: string;
    }> = [];
    let page = 1;
    const perPage = 1000;

    while (true) {
      const { data, error: usersError } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (usersError) {
        console.error('Auth users query error:', usersError);
        throw new Error('Failed to fetch auth users');
      }

      const users = data?.users ?? [];
      allAuthUsers.push(
        ...users.map((u) => ({
          id: u.id,
          email: u.email ?? null,
          created_at: u.created_at ?? new Date(0).toISOString(),
        }))
      );

      if (!data?.nextPage) break;
      page = data.nextPage;
    }

    // Fetch all profiles (optional enrichment)
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, created_at');

    if (profilesError) {
      console.error('Profiles query error:', profilesError);
      throw new Error('Failed to fetch profiles');
    }

    // Fetch all subscriptions
    const { data: subscriptions, error: subsError } = await supabaseAdmin
      .from('subscriptions')
      .select('user_id, tier, conversions_used, conversions_limit, created_at, last_reset_date');

    if (subsError) {
      console.error('Subscriptions query error:', subsError);
      throw new Error('Failed to fetch subscriptions');
    }

    // Fetch all user roles
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, role');

    if (rolesError) {
      console.error('Roles query error:', rolesError);
      throw new Error('Failed to fetch user roles');
    }

    // Fetch all conversions
    const { data: conversions, error: convError } = await supabaseAdmin
      .from('conversions')
      .select('id, user_id, status, created_at, file_name, processing_timings, processing_total_ms')
      .order('created_at', { ascending: false });

    if (convError) {
      console.error('Conversions query error:', convError);
      throw new Error('Failed to fetch conversions');
    }

    // Fetch anonymous usage stats
    const { data: anonymousUsage, error: anonError } = await supabaseAdmin
      .from('anonymous_usage')
      .select('id, ip_address, conversions_count, last_reset_date, created_at');

    if (anonError) {
      console.error('Anonymous usage query error:', anonError);
      // Non-critical, continue without this data
    }

    // ============= COMBINE & ENRICH DATA =============
    const profileById = new Map((profiles || []).map((p) => [p.id, p]));
    const subByUserId = new Map((subscriptions || []).map((s) => [s.user_id, s]));
    const roleByUserId = new Map((roles || []).map((r) => [r.user_id, r.role]));
    const normalizedConversions = (conversions || []).map((conversion) => {
      const timings = getProcessingTimings(conversion.processing_timings);
      const processingTotalMs = typeof conversion.processing_total_ms === 'number'
        ? conversion.processing_total_ms
        : null;

      return {
        ...conversion,
        completed_at: getCompletedAt(conversion.created_at, processingTotalMs, timings),
        error_message: getFailureMessage(timings),
        output_tier: getTimingField(timings, 'outputTier'),
        processed_via: getTimingField(timings, 'processedVia') ?? getTimingField(timings, 'parseMode'),
      };
    });

    const enrichedUsers = allAuthUsers.map((user) => {
      const profile = profileById.get(user.id);
      return {
        id: user.id,
        email: user.email || '',
        full_name: profile?.full_name ?? null,
        created_at: user.created_at || profile?.created_at || new Date(0).toISOString(),
        subscription: subByUserId.get(user.id) || null,
        role: roleByUserId.get(user.id) || 'user',
      };
    });

    // Calculate conversion stats with tolerant status handling
    const today = new Date().toISOString().split('T')[0];
    const successStatuses = new Set(['completed', 'success', 'succeeded', 'done']);
    const failedStatuses = new Set(['failed', 'error', 'errored', 'cancelled', 'canceled']);
    const processingStatuses = new Set(['processing', 'pending', 'queued', 'running', 'in_progress', 'in-progress']);

    const statusCounts = (conversions || []).reduce((acc, conversion) => {
      const rawStatus = String(conversion.status || '').toLowerCase().trim();
      if (failedStatuses.has(rawStatus)) {
        acc.failed += 1;
      } else if (processingStatuses.has(rawStatus)) {
        acc.processing += 1;
      } else if (successStatuses.has(rawStatus)) {
        acc.completed += 1;
      } else {
        // Treat unknown status as completed to avoid showing zero success
        acc.completed += 1;
      }
      return acc;
    }, { completed: 0, processing: 0, failed: 0 });

    const conversionStats = {
      total: normalizedConversions.length,
      completed: statusCounts.completed,
      processing: statusCounts.processing,
      failed: statusCounts.failed,
      todayCount: normalizedConversions.filter((c) => c.created_at?.startsWith(today)).length || 0,
    };

    // Calculate daily stats for last 7 days
    const dailyStats: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const count = normalizedConversions.filter((c) => c.created_at?.startsWith(dateStr)).length || 0;
      dailyStats.push({ date: dateStr, count });
    }

    // Anonymous usage summary
    const anonymousSummary = {
      totalIPs: anonymousUsage?.length || 0,
      totalConversions: anonymousUsage?.reduce((sum, u) => sum + (u.conversions_count || 0), 0) || 0,
    };

    console.log('Admin dashboard data loaded successfully:', {
      usersCount: enrichedUsers.length,
      conversionsCount: conversions?.length || 0,
      anonymousIPs: anonymousSummary.totalIPs,
    });

    return new Response(
      JSON.stringify({
        success: true,
        users: enrichedUsers,
        conversions: normalizedConversions,
        stats: conversionStats,
        dailyStats,
        anonymousSummary,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Admin dashboard error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
