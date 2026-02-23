-- Stack plan limits: daily free + monthly + yearly + per-page packs

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS free_daily_limit integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS free_daily_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_limit integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS yearly_limit integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS yearly_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pack_limit integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pack_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_reset_date date,
  ADD COLUMN IF NOT EXISTS yearly_reset_date date;

-- Best-effort backfill from legacy conversions_limit/used
UPDATE public.subscriptions
SET
  free_daily_limit = GREATEST(free_daily_limit, 5),
  free_daily_used = CASE
    WHEN plan_type = 'free' OR conversions_limit <= 5 THEN GREATEST(free_daily_used, conversions_used)
    ELSE free_daily_used
  END,
  monthly_limit = CASE
    WHEN plan_type LIKE 'monthly%' OR plan_type = 'daily' THEN GREATEST(monthly_limit, conversions_limit)
    ELSE monthly_limit
  END,
  monthly_used = CASE
    WHEN plan_type LIKE 'monthly%' OR plan_type = 'daily' THEN GREATEST(monthly_used, conversions_used)
    ELSE monthly_used
  END,
  yearly_limit = CASE
    WHEN plan_type LIKE 'yearly%' OR plan_type = 'business' THEN GREATEST(yearly_limit, conversions_limit)
    ELSE yearly_limit
  END,
  yearly_used = CASE
    WHEN plan_type LIKE 'yearly%' OR plan_type = 'business' THEN GREATEST(yearly_used, conversions_used)
    ELSE yearly_used
  END,
  pack_limit = CASE
    WHEN plan_type LIKE 'per_page%' THEN GREATEST(pack_limit, conversions_limit)
    ELSE pack_limit
  END,
  pack_used = CASE
    WHEN plan_type LIKE 'per_page%' THEN GREATEST(pack_used, conversions_used)
    ELSE pack_used
  END,
  monthly_reset_date = COALESCE(monthly_reset_date, (now() AT TIME ZONE 'UTC')::date),
  yearly_reset_date = COALESCE(yearly_reset_date, (now() AT TIME ZONE 'UTC')::date);

-- Helper: recompute totals
CREATE OR REPLACE FUNCTION public.recalculate_subscription_totals(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE subscriptions
  SET
    conversions_limit = free_daily_limit + monthly_limit + yearly_limit + pack_limit,
    conversions_used = free_daily_used + monthly_used + yearly_used + pack_used,
    pages_used_this_month = monthly_used
  WHERE user_id = p_user_id;
END;
$$;

-- Update process_razorpay_payment to stack limits
CREATE OR REPLACE FUNCTION public.process_razorpay_payment(
  p_user_id uuid,
  p_order_id uuid,
  p_razorpay_payment_id text,
  p_razorpay_order_id text,
  p_razorpay_signature text,
  p_amount numeric,
  p_currency text,
  p_plan_id text,
  p_pages_to_add integer
)
RETURNS TABLE(already_processed boolean, pages_added integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_order_status text;
  v_order_updated integer := 0;
  v_pages integer := COALESCE(p_pages_to_add, 0);
  v_tier text;
  v_is_monthly boolean := false;
  v_is_yearly boolean := false;
  v_is_per_page boolean := false;
  v_reset_date date := (now() AT TIME ZONE 'UTC')::date;
BEGIN
  IF v_pages < 0 THEN
    v_pages := 0;
  END IF;

  SELECT status
    INTO v_order_status
  FROM razorpay_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  INSERT INTO razorpay_payments (
    user_id,
    order_id,
    razorpay_payment_id,
    razorpay_order_id,
    razorpay_signature,
    amount,
    currency,
    status,
    plan_id,
    metadata
  )
  VALUES (
    p_user_id,
    p_order_id,
    p_razorpay_payment_id,
    p_razorpay_order_id,
    p_razorpay_signature,
    p_amount,
    p_currency,
    'captured',
    p_plan_id,
    jsonb_build_object('verified_at', now())
  )
  ON CONFLICT (razorpay_payment_id) DO NOTHING;

  UPDATE razorpay_orders
  SET status = 'paid'
  WHERE id = p_order_id
    AND status <> 'paid';

  GET DIAGNOSTICS v_order_updated = ROW_COUNT;

  v_tier := CASE
    WHEN p_plan_id LIKE 'yearly%' THEN 'business'
    WHEN p_plan_id LIKE 'monthly%' THEN 'daily'
    ELSE 'free'
  END;

  v_is_monthly := p_plan_id LIKE 'monthly%';
  v_is_yearly := p_plan_id LIKE 'yearly%';
  v_is_per_page := p_plan_id LIKE 'per_page%';

  IF v_order_updated > 0 THEN
    INSERT INTO subscriptions (
      user_id,
      conversions_limit,
      conversions_used,
      last_reset_date,
      timezone,
      plan_type,
      tier,
      pages_used_this_month,
      free_daily_limit,
      free_daily_used,
      monthly_limit,
      monthly_used,
      yearly_limit,
      yearly_used,
      pack_limit,
      pack_used,
      monthly_reset_date,
      yearly_reset_date
    )
    VALUES (
      p_user_id,
      0,
      0,
      v_reset_date,
      'UTC',
      p_plan_id,
      v_tier,
      0,
      5,
      0,
      CASE WHEN v_is_monthly THEN v_pages ELSE 0 END,
      0,
      CASE WHEN v_is_yearly THEN v_pages ELSE 0 END,
      0,
      CASE WHEN v_is_per_page THEN v_pages ELSE 0 END,
      0,
      v_reset_date,
      v_reset_date
    )
    ON CONFLICT (user_id) DO UPDATE
      SET
        plan_type = EXCLUDED.plan_type,
        tier = EXCLUDED.tier,
        monthly_limit = subscriptions.monthly_limit + CASE WHEN v_is_monthly THEN v_pages ELSE 0 END,
        yearly_limit = subscriptions.yearly_limit + CASE WHEN v_is_yearly THEN v_pages ELSE 0 END,
        pack_limit = subscriptions.pack_limit + CASE WHEN v_is_per_page THEN v_pages ELSE 0 END,
        last_reset_date = EXCLUDED.last_reset_date,
        timezone = EXCLUDED.timezone,
        updated_at = now();

    PERFORM public.recalculate_subscription_totals(p_user_id);
  END IF;

  already_processed := v_order_updated = 0;
  pages_added := CASE WHEN v_order_updated > 0 THEN v_pages ELSE 0 END;
  RETURN NEXT;
END;
$$;

-- Update check/reset to use stacked buckets
CREATE OR REPLACE FUNCTION public.check_and_reset_daily_limit(
  p_ip_address text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_timezone text DEFAULT 'UTC'
)
RETURNS TABLE(conversions_used integer, conversions_limit integer, needs_reset boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_today date;
  v_period_month date;
  v_period_year date;
  v_needs_reset boolean := false;
  v_daily_limit integer := 5;
  v_daily_used integer := 0;
  v_monthly_limit integer := 0;
  v_monthly_used integer := 0;
  v_yearly_limit integer := 0;
  v_yearly_used integer := 0;
  v_pack_limit integer := 0;
  v_pack_used integer := 0;
  v_month_reset date;
  v_year_reset date;
BEGIN
  v_today := (now() AT TIME ZONE p_timezone)::date;
  v_period_month := date_trunc('month', (now() AT TIME ZONE p_timezone))::date;
  v_period_year := date_trunc('year', (now() AT TIME ZONE p_timezone))::date;

  IF p_user_id IS NOT NULL THEN
    SELECT
      s.free_daily_limit,
      s.free_daily_used,
      s.monthly_limit,
      s.monthly_used,
      s.yearly_limit,
      s.yearly_used,
      s.pack_limit,
      s.pack_used,
      s.monthly_reset_date,
      s.yearly_reset_date
    INTO
      v_daily_limit,
      v_daily_used,
      v_monthly_limit,
      v_monthly_used,
      v_yearly_limit,
      v_yearly_used,
      v_pack_limit,
      v_pack_used,
      v_month_reset,
      v_year_reset
    FROM subscriptions s
    WHERE s.user_id = p_user_id;

    IF NOT FOUND THEN
      INSERT INTO subscriptions (
        user_id,
        conversions_used,
        conversions_limit,
        last_reset_date,
        timezone,
        plan_type,
        tier,
        pages_used_this_month,
        free_daily_limit,
        free_daily_used,
        monthly_limit,
        monthly_used,
        yearly_limit,
        yearly_used,
        pack_limit,
        pack_used,
        monthly_reset_date,
        yearly_reset_date
      )
      VALUES (
        p_user_id,
        0,
        5,
        v_today,
        p_timezone,
        'free',
        'free',
        0,
        5,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        v_period_month,
        v_period_year
      );
      v_daily_limit := 5;
      v_daily_used := 0;
      v_monthly_limit := 0;
      v_monthly_used := 0;
      v_yearly_limit := 0;
      v_yearly_used := 0;
      v_pack_limit := 0;
      v_pack_used := 0;
      v_month_reset := v_period_month;
      v_year_reset := v_period_year;
    END IF;

    -- Daily reset
    IF (SELECT last_reset_date FROM subscriptions WHERE user_id = p_user_id) IS NULL
       OR (SELECT last_reset_date FROM subscriptions WHERE user_id = p_user_id) < v_today THEN
      UPDATE subscriptions
      SET free_daily_used = 0,
          last_reset_date = v_today,
          timezone = p_timezone
      WHERE user_id = p_user_id;
      v_daily_used := 0;
      v_needs_reset := true;
    END IF;

    -- Monthly reset
    IF v_month_reset IS NULL OR v_month_reset < v_period_month THEN
      UPDATE subscriptions
      SET monthly_used = 0,
          monthly_reset_date = v_period_month,
          pages_used_this_month = 0
      WHERE user_id = p_user_id;
      v_monthly_used := 0;
      v_needs_reset := true;
    END IF;

    -- Yearly reset
    IF v_year_reset IS NULL OR v_year_reset < v_period_year THEN
      UPDATE subscriptions
      SET yearly_used = 0,
          yearly_reset_date = v_period_year
      WHERE user_id = p_user_id;
      v_yearly_used := 0;
      v_needs_reset := true;
    END IF;

    PERFORM public.recalculate_subscription_totals(p_user_id);

    RETURN QUERY
      SELECT
        (SELECT conversions_used FROM subscriptions WHERE user_id = p_user_id),
        (SELECT conversions_limit FROM subscriptions WHERE user_id = p_user_id),
        v_needs_reset;
  ELSE
    SELECT a.conversions_count, 2, a.last_reset_date::date
    INTO v_daily_used, v_daily_limit, v_today
    FROM anonymous_usage a
    WHERE a.ip_address = p_ip_address;

    IF NOT FOUND THEN
      INSERT INTO anonymous_usage (ip_address, conversions_count, last_reset_date, timezone)
      VALUES (p_ip_address, 0, v_today, p_timezone);
      RETURN QUERY SELECT 0, 2, false;
    END IF;

    IF v_today < (now() AT TIME ZONE p_timezone)::date THEN
      UPDATE anonymous_usage
      SET conversions_count = 0, last_reset_date = (now() AT TIME ZONE p_timezone)::date, timezone = p_timezone
      WHERE ip_address = p_ip_address;
      RETURN QUERY SELECT 0, 2, true;
    END IF;

    RETURN QUERY SELECT COALESCE(v_daily_used, 0), COALESCE(v_daily_limit, 2), false;
  END IF;
END;
$$;

-- Update increment_usage_count to consume stacked buckets
DROP FUNCTION IF EXISTS public.increment_usage_count(text, uuid);
DROP FUNCTION IF EXISTS public.increment_usage_count(text, uuid, integer);

CREATE OR REPLACE FUNCTION public.increment_usage_count(
  p_ip_address text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_increment integer DEFAULT 1
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_increment integer := COALESCE(p_increment, 1);
  v_daily_limit integer;
  v_daily_used integer;
  v_monthly_limit integer;
  v_monthly_used integer;
  v_yearly_limit integer;
  v_yearly_used integer;
  v_pack_limit integer;
  v_pack_used integer;
  v_remaining integer;
  v_take integer;
BEGIN
  IF v_increment < 1 THEN
    v_increment := 1;
  END IF;

  IF p_user_id IS NOT NULL THEN
    SELECT
      free_daily_limit,
      free_daily_used,
      monthly_limit,
      monthly_used,
      yearly_limit,
      yearly_used,
      pack_limit,
      pack_used
    INTO
      v_daily_limit,
      v_daily_used,
      v_monthly_limit,
      v_monthly_used,
      v_yearly_limit,
      v_yearly_used,
      v_pack_limit,
      v_pack_used
    FROM subscriptions
    WHERE user_id = p_user_id;

    v_remaining := v_increment;

    -- Daily free bucket
    v_take := LEAST(GREATEST(v_daily_limit - v_daily_used, 0), v_remaining);
    v_daily_used := v_daily_used + v_take;
    v_remaining := v_remaining - v_take;

    -- Pack bucket
    v_take := LEAST(GREATEST(v_pack_limit - v_pack_used, 0), v_remaining);
    v_pack_used := v_pack_used + v_take;
    v_remaining := v_remaining - v_take;

    -- Monthly bucket
    v_take := LEAST(GREATEST(v_monthly_limit - v_monthly_used, 0), v_remaining);
    v_monthly_used := v_monthly_used + v_take;
    v_remaining := v_remaining - v_take;

    -- Yearly bucket
    v_take := LEAST(GREATEST(v_yearly_limit - v_yearly_used, 0), v_remaining);
    v_yearly_used := v_yearly_used + v_take;
    v_remaining := v_remaining - v_take;

    UPDATE subscriptions
    SET
      free_daily_used = v_daily_used,
      pack_used = v_pack_used,
      monthly_used = v_monthly_used,
      yearly_used = v_yearly_used,
      pages_used_this_month = v_monthly_used
    WHERE user_id = p_user_id;

    PERFORM public.recalculate_subscription_totals(p_user_id);
  ELSE
    UPDATE anonymous_usage
    SET conversions_count = conversions_count + v_increment
    WHERE ip_address = p_ip_address;
  END IF;

  RETURN true;
END;
$$;
