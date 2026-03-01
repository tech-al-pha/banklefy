import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

type SupabaseLike = ReturnType<typeof createClient> | any;

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

const normalizeLegacyPlanType = (planType: string, conversionsLimit: number): string => {
  if (
    planType === 'free' ||
    planType === 'unlimited' ||
    planType.startsWith('monthly') ||
    planType.startsWith('yearly') ||
    planType.startsWith('per_page')
  ) {
    return planType;
  }

  if (planType === 'daily') {
    if (conversionsLimit >= 4500) return 'monthly_enterprise';
    if (conversionsLimit >= 1000) return 'monthly_pro';
    if (conversionsLimit >= 300) return 'monthly_basic';
    return 'daily';
  }

  if (planType === 'business') {
    if (conversionsLimit >= 65000) return 'yearly_pro';
    if (conversionsLimit >= 15000) return 'yearly_full';
    if (conversionsLimit >= 5000) return 'yearly_lite';
    if (conversionsLimit === 50) return 'per_page_power';
    if (conversionsLimit === 25) return 'per_page_standard';
    if (conversionsLimit === 10) return 'per_page_lite';
    return 'business';
  }

  return planType;
};

const resolvePlanType = (row: Record<string, unknown> | null, conversionsLimitHint?: number): string => {
  const hint = Number.isFinite(Number(conversionsLimitHint))
    ? Number(conversionsLimitHint)
    : toNumber(row?.conversions_limit, 0);
  const planType = normalizePlan(row?.plan_type);
  if (planType !== 'free') return normalizeLegacyPlanType(planType, hint);
  return normalizeLegacyPlanType(normalizePlan(row?.tier), hint);
};

const getResetBoundary = (planType: string, dateParts: DateParts): string | null => {
  const normalizedPlan = normalizePlan(planType);
  const isMonthly = normalizedPlan.startsWith('monthly') || normalizedPlan === 'daily';
  const isYearly = normalizedPlan.startsWith('yearly') || normalizedPlan === 'business';
  if (isMonthly) return `${dateParts.year}-${dateParts.month}-01`;
  if (isYearly) return `${dateParts.year}-01-01`;
  return dateParts.isoDate;
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
): Promise<Record<string, unknown>> => {
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`resolveEffectiveLimit: failed to read subscriptions (${error.message})`);
  }

  if (data) return data as Record<string, unknown>;

  const { data: created, error: insertError } = await supabaseAdmin
    .from('subscriptions')
    .insert({
      user_id: userId,
      conversions_used: 0,
      conversions_limit: DEFAULT_AUTH_LIMIT,
      last_reset_date: today,
      timezone,
      plan_type: 'free',
    } as any)
    .select('*')
    .single();

  if (insertError || !created) {
    throw new Error(`resolveEffectiveLimit: failed to create subscriptions row (${insertError?.message ?? 'unknown'})`);
  }

  return created as Record<string, unknown>;
};

const hasExplicitUnlimitedFlag = (row: Record<string, unknown>): boolean => {
  const booleanFlags = ['is_unlimited', 'unlimited', 'unlimited_flag'] as const;
  for (const key of booleanFlags) {
    if (row[key] === true) return true;
  }
  const planType = normalizePlan(row.plan_type);
  const tier = normalizePlan(row.tier);
  return planType === 'unlimited' || tier === 'unlimited';
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
    throw new Error(`resolveEffectiveLimit: failed to resolve admin role (${roleError.message})`);
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
  let row = readByIp.data as Record<string, unknown> | null;
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
    row = readByTracking.data as Record<string, unknown> | null;
    readError = readByTracking.error;
  }

  if (readError) {
    throw new Error(`resolveEffectiveLimit: failed to read anonymous usage (${readError.message})`);
  }

  if (!row) {
    const insertPayload: Record<string, unknown> = {
      conversions_count: 0,
      last_reset_date: today,
      timezone,
    };
    insertPayload[keyColumn] = trackingKey;
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('anonymous_usage')
      .insert(insertPayload as any)
      .select('*')
      .single();
    if (insertError || !inserted) {
      throw new Error(`resolveEffectiveLimit: failed to create anonymous usage (${insertError?.message ?? 'unknown'})`);
    }
    row = inserted as Record<string, unknown>;
  }

  let used = toNumber(row.conversions_count ?? row.conversions_used, 0);
  const lastResetDate = toDateString(row.last_reset_date);
  if (!lastResetDate || lastResetDate < today) {
    used = 0;
    const resetPayload: Record<string, unknown> = {
      conversions_count: 0,
      last_reset_date: today,
      timezone,
    };
    const { error: updateError } = await supabaseAdmin
      .from('anonymous_usage')
      .update(resetPayload as any)
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

  // 1) Explicit unlimited flag
  if (hasExplicitUnlimitedFlag(row)) {
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
        } as any)
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

  // 3) Stacked buckets
  const hasBuckets =
    Object.prototype.hasOwnProperty.call(row, 'free_daily_limit') ||
    Object.prototype.hasOwnProperty.call(row, 'monthly_limit') ||
    Object.prototype.hasOwnProperty.call(row, 'yearly_limit') ||
    Object.prototype.hasOwnProperty.call(row, 'pack_limit');

  if (hasBuckets) {
    const freeLimit = toNumber(row.free_daily_limit, DEFAULT_AUTH_LIMIT);
    let freeUsed = toNumber(row.free_daily_used, 0);
    const monthlyLimit = toNumber(row.monthly_limit, 0);
    let monthlyUsed = toNumber(row.monthly_used, 0);
    const yearlyLimit = toNumber(row.yearly_limit, 0);
    let yearlyUsed = toNumber(row.yearly_used, 0);
    const packLimit = toNumber(row.pack_limit, 0);
    const packUsed = toNumber(row.pack_used, 0);

    const monthBoundary = `${dateParts.year}-${dateParts.month}-01`;
    const yearBoundary = `${dateParts.year}-01-01`;
    const lastResetDate = toDateString(row.last_reset_date);
    const monthReset = toDateString(row.monthly_reset_date);
    const yearReset = toDateString(row.yearly_reset_date);

    const shouldResetFree = !lastResetDate || lastResetDate < dateParts.isoDate;
    const shouldResetMonthly = !monthReset || monthReset < monthBoundary;
    const shouldResetYearly = !yearReset || yearReset < yearBoundary;

    if (shouldResetFree) freeUsed = 0;
    if (shouldResetMonthly) monthlyUsed = 0;
    if (shouldResetYearly) yearlyUsed = 0;

    if (shouldResetFree || shouldResetMonthly || shouldResetYearly) {
      const { error: bucketResetError } = await supabaseAdmin
        .from('subscriptions')
        .update({
          free_daily_used: freeUsed,
          monthly_used: monthlyUsed,
          yearly_used: yearlyUsed,
          last_reset_date: shouldResetFree ? dateParts.isoDate : row.last_reset_date,
          monthly_reset_date: shouldResetMonthly ? monthBoundary : row.monthly_reset_date,
          yearly_reset_date: shouldResetYearly ? yearBoundary : row.yearly_reset_date,
          timezone,
        } as any)
        .eq('user_id', user.id);

      if (bucketResetError) {
        throw new Error(`resolveEffectiveLimit: failed to reset stacked buckets (${bucketResetError.message})`);
      }
    }

    const stackedLimit = freeLimit + monthlyLimit + yearlyLimit + packLimit;
    const stackedUsed = freeUsed + monthlyUsed + yearlyUsed + packUsed;

    if (stackedLimit > 0) {
      const planType = resolvePlanType(row, stackedLimit);
      return buildResult({
        conversionsUsed: stackedUsed,
        conversionsLimit: stackedLimit,
        planType,
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
