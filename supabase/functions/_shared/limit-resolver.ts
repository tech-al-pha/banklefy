import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

type SubscriptionRow = {
  id: string;
  user_id: string;
  conversions_used: number;
  conversions_limit: number;
  last_reset_date: string;
  timezone: string;
  tier: 'free' | 'daily' | 'business' | null;
  plan_type: string | null;
  free_daily_limit: number | null;
  free_daily_used: number | null;
  monthly_limit: number | null;
  monthly_used: number | null;
  yearly_limit: number | null;
  yearly_used: number | null;
  pack_limit: number | null;
  pack_used: number | null;
  monthly_reset_date: string | null;
  yearly_reset_date: string | null;
  is_unlimited?: boolean | null;
  unlimited?: boolean | null;
  unlimited_flag?: boolean | null;
  [key: string]: unknown;
};

type SubscriptionInsert = {
  user_id: string;
  conversions_used?: number;
  conversions_limit?: number;
  last_reset_date?: string;
  timezone?: string;
  tier?: 'free' | 'daily' | 'business' | null;
  plan_type?: string | null;
  free_daily_limit?: number;
  free_daily_used?: number;
  monthly_limit?: number;
  monthly_used?: number;
  yearly_limit?: number;
  yearly_used?: number;
  pack_limit?: number;
  pack_used?: number;
  monthly_reset_date?: string | null;
  yearly_reset_date?: string | null;
};

type SubscriptionUpdate = Partial<SubscriptionInsert>;

type AnonymousUsageRow = {
  id: string;
  ip_address: string;
  tracking_key?: string;
  conversions_count: number;
  conversions_used?: number | null;
  last_reset_date: string;
  timezone: string;
  created_at?: string;
  updated_at?: string;
};

type AnonymousUsageInsert = {
  ip_address?: string;
  tracking_key?: string;
  conversions_count?: number;
  last_reset_date?: string;
  timezone?: string;
};

type AnonymousUsageUpdate = Partial<AnonymousUsageInsert>;

type UserRoleRow = {
  id: string;
  role: 'admin' | 'user';
  user_id: string;
};

type UserRoleInsert = {
  id?: string;
  role?: 'admin' | 'user';
  user_id: string;
};

type UserRoleUpdate = Partial<UserRoleInsert>;

export type LimitResolverDatabase = {
  public: {
    Tables: {
      anonymous_usage: {
        Row: AnonymousUsageRow;
        Insert: AnonymousUsageInsert;
        Update: AnonymousUsageUpdate;
        Relationships: [];
      };
      subscriptions: {
        Row: SubscriptionRow;
        Insert: SubscriptionInsert;
        Update: SubscriptionUpdate;
        Relationships: [];
      };
      user_roles: {
        Row: UserRoleRow;
        Insert: UserRoleInsert;
        Update: UserRoleUpdate;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _user_id: string;
          _role: 'admin';
        };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type SupabaseLike = SupabaseClient<LimitResolverDatabase>;

type AuthUser = {
  id: string;
  email?: string | null;
};

type DateParts = {
  year: string;
  month: string;
  isoDate: string;
};

export type EffectiveLimitResult = {
  conversionsUsed: number;
  conversionsLimit: number;
  remaining: number;
  limitReached: boolean;
  isAuthenticated: boolean;
  planType: string;
  isAdmin: boolean;
  isOwner: boolean;
  isUnlimited: boolean;
};

type ResolveEffectiveLimitParams = {
  supabaseAdmin: SupabaseLike;
  user: AuthUser | null;
  trackingKey: string;
  timezone: string;
};

const DEFAULT_OWNER_EMAILS = ['inspirexali@gmail.com'];
const DEFAULT_AUTH_LIMIT = 5;
const DEFAULT_ANON_LIMIT = 2;
const UNLIMITED_LIMIT = 999999;

const toNumber = (value: unknown, fallback: number): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const normalizePlan = (value: unknown): string =>
  typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : 'free';

const toDateString = (value: unknown): string | null => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
};

const getCurrentPackFromLimit = (limit: number): string | null => {
  if (limit >= 11000) return 'per_page_pack_pro';
  if (limit >= 1000) return 'per_page_pack_basic';
  if (limit >= 50) return 'per_page_power';
  if (limit >= 25) return 'per_page_standard';
  if (limit >= 10) return 'per_page_lite';
  return null;
};

const getDatePartsInTimezone = (timezone: string): DateParts => {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());

    const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
    const month = parts.find((part) => part.type === 'month')?.value ?? '01';
    const day = parts.find((part) => part.type === 'day')?.value ?? '01';
    return { year, month, isoDate: `${year}-${month}-${day}` };
  } catch {
    const now = new Date();
    const year = String(now.getUTCFullYear());
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    return { year, month, isoDate: `${year}-${month}-${day}` };
  }
};

const resolveCurrentPlanType = (planType: string, conversionsLimit: number): string => {
  const inferredPack = getCurrentPackFromLimit(conversionsLimit);

  if (planType === 'free') {
    return inferredPack ?? 'free';
  }

  if (planType === 'unlimited') {
    if (conversionsLimit >= UNLIMITED_LIMIT) return 'unlimited';
    return inferredPack ?? 'free';
  }

  if (planType.startsWith('per_page')) {
    return planType;
  }

  return planType;
};

const resolvePlanType = (row: SubscriptionRow | null, conversionsLimitHint?: number): string => {
  const hint = Number.isFinite(Number(conversionsLimitHint))
    ? Number(conversionsLimitHint)
    : toNumber(row?.conversions_limit, 0);
  const planType = normalizePlan(row?.plan_type);
  if (planType !== 'free') return resolveCurrentPlanType(planType, hint);
  return resolveCurrentPlanType(normalizePlan(row?.tier), hint);
};

const getResetBoundary = (planType: string, dateParts: DateParts): string | null => {
  const normalizedPlan = normalizePlan(planType);
  if (normalizedPlan === 'free') return dateParts.isoDate;
  if (normalizedPlan === 'unlimited' || normalizedPlan.startsWith('per_page')) return null;
  return null;
};

const getOwnerEmailSet = (): Set<string> => {
  const envRaw =
    Deno.env.get('OWNER_EMAILS') ??
    Deno.env.get('VITE_OWNER_EMAILS') ??
    '';
  const configured = envRaw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...DEFAULT_OWNER_EMAILS, ...configured]);
};

const buildResult = (
  values: {
    conversionsUsed: number;
    conversionsLimit: number;
    planType: string;
    isAuthenticated: boolean;
    isAdmin: boolean;
    isOwner: boolean;
    isUnlimited: boolean;
  },
): EffectiveLimitResult => {
  const limit = Math.max(0, values.conversionsLimit);
  const used = Math.max(0, Math.min(limit, values.conversionsUsed));
  const remaining = values.isUnlimited ? UNLIMITED_LIMIT : Math.max(0, limit - used);

  return {
    conversionsUsed: values.isUnlimited ? 0 : used,
    conversionsLimit: values.isUnlimited ? UNLIMITED_LIMIT : limit,
    remaining,
    limitReached: values.isUnlimited ? false : remaining <= 0,
    isAuthenticated: values.isAuthenticated,
    planType: values.planType,
    isAdmin: values.isAdmin,
    isOwner: values.isOwner,
    isUnlimited: values.isUnlimited,
  };
};

const ensureSubscriptionRow = async (
  supabaseAdmin: SupabaseLike,
  userId: string,
  timezone: string,
  today: string,
): Promise<SubscriptionRow> => {
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`resolveEffectiveLimit: failed to read subscriptions (${error.message})`);
  }

  if (data) return data;

  const { data: created, error: insertError } = await supabaseAdmin
    .from('subscriptions')
    .insert({
      user_id: userId,
      conversions_used: 0,
      conversions_limit: DEFAULT_AUTH_LIMIT,
      last_reset_date: today,
      timezone,
      plan_type: 'free',
    })
    .select('*')
    .single();

  if (insertError || !created) {
    throw new Error(`resolveEffectiveLimit: failed to create subscriptions row (${insertError?.message ?? 'unknown'})`);
  }

  return created;
};

const hasExplicitUnlimitedFlag = (row: SubscriptionRow): boolean => {
  const booleanFlags = ['is_unlimited', 'unlimited', 'unlimited_flag'] as const;
  for (const key of booleanFlags) {
    if (row[key] === true) return true;
  }
  const planType = normalizePlan(row.plan_type);
  const tier = normalizePlan(row.tier);
  return planType === 'unlimited' || tier === 'unlimited';
};

const hasFiniteConfiguredLimit = (row: SubscriptionRow): boolean => {
  const explicitLimit = toNumber(row.conversions_limit, 0);
  const freeLimit = toNumber(row.free_daily_limit, 0);
  const packLimit = toNumber(row.pack_limit, 0);
  return explicitLimit > 0 || freeLimit > 0 || packLimit > 0;
};

const resolveAdminRole = async (supabaseAdmin: SupabaseLike, userId: string): Promise<boolean> => {
  const { data: roleRow, error: roleRowError } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle();

  if (!roleRowError) {
    return !!roleRow;
  }

  const { data: roleData, error: roleError } = await supabaseAdmin.rpc('has_role', {
    _user_id: userId,
    _role: 'admin',
  });

  if (roleError) {
    console.warn(`resolveEffectiveLimit: admin role lookup failed, defaulting to non-admin (${roleError.message})`);
    return false;
  }

  return !!roleData;
};

const resolveAnonymousLimit = async (
  supabaseAdmin: SupabaseLike,
  trackingKey: string,
  timezone: string,
  today: string,
): Promise<EffectiveLimitResult> => {
  const readByIp = await supabaseAdmin
    .from('anonymous_usage')
    .select('*')
    .eq('ip_address', trackingKey)
    .maybeSingle();

  let keyColumn: 'ip_address' | 'tracking_key' = 'ip_address';
  let row: AnonymousUsageRow | null = readByIp.data;
  let readError = readByIp.error;

  if (
    readError &&
    String(readError.message ?? '').toLowerCase().includes('column') &&
    String(readError.message ?? '').toLowerCase().includes('ip_address')
  ) {
    const readByTracking = await supabaseAdmin
      .from('anonymous_usage')
      .select('*')
      .eq('tracking_key', trackingKey)
      .maybeSingle();
    keyColumn = 'tracking_key';
    row = readByTracking.data;
    readError = readByTracking.error;
  }

  if (readError) {
    throw new Error(`resolveEffectiveLimit: failed to read anonymous usage (${readError.message})`);
  }

  if (!row) {
    const insertPayload: AnonymousUsageInsert = {
      conversions_count: 0,
      last_reset_date: today,
      timezone,
    };
    insertPayload[keyColumn] = trackingKey;
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('anonymous_usage')
      .insert(insertPayload)
      .select('*')
      .single();
    if (insertError || !inserted) {
      throw new Error(`resolveEffectiveLimit: failed to create anonymous usage (${insertError?.message ?? 'unknown'})`);
    }
    row = inserted;
  }

  let used = toNumber(row.conversions_count ?? row.conversions_used, 0);
  const lastResetDate = toDateString(row.last_reset_date);
  if (!lastResetDate || lastResetDate < today) {
    used = 0;
    const resetPayload: AnonymousUsageUpdate = {
      conversions_count: 0,
      last_reset_date: today,
      timezone,
    };
    const { error: updateError } = await supabaseAdmin
      .from('anonymous_usage')
      .update(resetPayload)
      .eq(keyColumn, trackingKey);
    if (updateError) {
      throw new Error(`resolveEffectiveLimit: failed to reset anonymous usage (${updateError.message})`);
    }
  }

  return buildResult({
    conversionsUsed: used,
    conversionsLimit: DEFAULT_ANON_LIMIT,
    planType: 'free',
    isAuthenticated: false,
    isAdmin: false,
    isOwner: false,
    isUnlimited: false,
  });
};

export const resolveEffectiveLimit = async ({
  supabaseAdmin,
  user,
  trackingKey,
  timezone,
}: ResolveEffectiveLimitParams): Promise<EffectiveLimitResult> => {
  const dateParts = getDatePartsInTimezone(timezone);

  if (!user) {
    return resolveAnonymousLimit(supabaseAdmin, trackingKey, timezone, dateParts.isoDate);
  }

  const isAdmin = await resolveAdminRole(supabaseAdmin, user.id);
  const userEmail = (user.email ?? '').trim().toLowerCase();
  const isOwner = !!userEmail && getOwnerEmailSet().has(userEmail);

  const row = await ensureSubscriptionRow(supabaseAdmin, user.id, timezone, dateParts.isoDate);

  // 1) Explicit unlimited flag (only when no finite limits are configured)
  if (hasExplicitUnlimitedFlag(row) && !hasFiniteConfiguredLimit(row)) {
    return buildResult({
      conversionsUsed: 0,
      conversionsLimit: UNLIMITED_LIMIT,
      planType: 'unlimited',
      isAuthenticated: true,
      isAdmin,
      isOwner,
      isUnlimited: true,
    });
  }

  // 2) Explicit conversions_limit
  const explicitLimit = toNumber(row.conversions_limit, 0);
  if (explicitLimit > 0) {
    const planType = resolvePlanType(row, explicitLimit);
    let used = toNumber(row.conversions_used, 0);
    const resetBoundary = getResetBoundary(planType, dateParts);
    const lastResetDate = toDateString(row.last_reset_date);
    if (resetBoundary && (!lastResetDate || lastResetDate < resetBoundary)) {
      used = 0;
      const { error: resetError } = await supabaseAdmin
        .from('subscriptions')
        .update({
          conversions_used: 0,
          last_reset_date: resetBoundary,
          timezone,
        })
        .eq('user_id', user.id);
      if (resetError) {
        throw new Error(`resolveEffectiveLimit: failed to reset conversions_used (${resetError.message})`);
      }
    }

    return buildResult({
      conversionsUsed: used,
      conversionsLimit: explicitLimit,
      planType,
      isAuthenticated: true,
      isAdmin,
      isOwner,
      isUnlimited: false,
    });
  }

  // 3) Bucket fallback for rows without a consolidated limit
  const hasBuckets =
    Object.prototype.hasOwnProperty.call(row, 'free_daily_limit') ||
    Object.prototype.hasOwnProperty.call(row, 'pack_limit');

  if (hasBuckets) {
    const planType = resolvePlanType(row, explicitLimit);
    const freeLimit = toNumber(row.free_daily_limit, DEFAULT_AUTH_LIMIT);
    let freeUsed = toNumber(row.free_daily_used, 0);
    const packLimit = toNumber(row.pack_limit, 0);
    const packUsed = toNumber(row.pack_used, 0);
    const lastResetDate = toDateString(row.last_reset_date);

    if (planType === 'free') {
      const shouldResetFree = !lastResetDate || lastResetDate < dateParts.isoDate;
      if (shouldResetFree) {
        freeUsed = 0;
        const { error: resetError } = await supabaseAdmin
          .from('subscriptions')
          .update({
            free_daily_used: freeUsed,
            last_reset_date: dateParts.isoDate,
            timezone,
          })
          .eq('user_id', user.id);

        if (resetError) {
          throw new Error(`resolveEffectiveLimit: failed to reset free bucket (${resetError.message})`);
        }
      }

      return buildResult({
        conversionsUsed: freeUsed,
        conversionsLimit: freeLimit > 0 ? freeLimit : DEFAULT_AUTH_LIMIT,
        planType: 'free',
        isAuthenticated: true,
        isAdmin,
        isOwner,
        isUnlimited: false,
      });
    }

    if (planType.startsWith('per_page') || packLimit > 0) {
      const resolvedPlan = planType.startsWith('per_page')
        ? planType
        : resolveCurrentPlanType('free', packLimit);
      return buildResult({
        conversionsUsed: packUsed,
        conversionsLimit: packLimit,
        planType: resolvedPlan,
        isAuthenticated: true,
        isAdmin,
        isOwner,
        isUnlimited: false,
      });
    }

    if (freeLimit > 0) {
      return buildResult({
        conversionsUsed: freeUsed,
        conversionsLimit: freeLimit,
        planType: 'free',
        isAuthenticated: true,
        isAdmin,
        isOwner,
        isUnlimited: false,
      });
    }
  }

  // 4) Free fallback
  const fallbackUsed = toNumber(row.conversions_used, 0);
  return buildResult({
    conversionsUsed: fallbackUsed,
    conversionsLimit: DEFAULT_AUTH_LIMIT,
    planType: 'free',
    isAuthenticated: true,
    isAdmin,
    isOwner,
    isUnlimited: false,
  });
};
