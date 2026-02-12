-- Fix subscription limit resets for monthly/yearly plans and avoid accumulating limits on renewals

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
    IF v_is_monthly OR v_is_yearly THEN
      INSERT INTO subscriptions (
        user_id,
        conversions_limit,
        conversions_used,
        last_reset_date,
        timezone,
        plan_type,
        tier
      )
      VALUES (
        p_user_id,
        v_pages,
        0,
        v_reset_date,
        'UTC',
        p_plan_id,
        v_tier
      )
      ON CONFLICT (user_id) DO UPDATE
        SET conversions_limit = EXCLUDED.conversions_limit,
            conversions_used = 0,
            last_reset_date = EXCLUDED.last_reset_date,
            timezone = EXCLUDED.timezone,
            plan_type = EXCLUDED.plan_type,
            tier = EXCLUDED.tier,
            updated_at = now();
    ELSE
      INSERT INTO subscriptions (
        user_id,
        conversions_limit,
        conversions_used,
        last_reset_date,
        timezone,
        plan_type,
        tier
      )
      VALUES (
        p_user_id,
        v_pages,
        0,
        v_reset_date,
        'UTC',
        p_plan_id,
        v_tier
      )
      ON CONFLICT (user_id) DO UPDATE
        SET conversions_limit = subscriptions.conversions_limit + v_pages,
            plan_type = EXCLUDED.plan_type,
            tier = EXCLUDED.tier,
            updated_at = now();
    END IF;
  END IF;

  already_processed := v_order_updated = 0;
  pages_added := CASE WHEN v_order_updated > 0 THEN v_pages ELSE 0 END;
  RETURN NEXT;
END;
$$;

DROP FUNCTION IF EXISTS public.check_and_reset_daily_limit(text, uuid, text);

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
  v_last_reset date;
  v_conversions integer;
  v_limit integer;
  v_needs_reset boolean := false;
  v_is_free boolean := false;
  v_has_plan_type boolean := false;
  v_has_tier boolean := false;
  v_plan_type text;
  v_is_monthly boolean := false;
  v_is_yearly boolean := false;
  v_is_per_page boolean := false;
  v_period_start date;
BEGIN
  v_today := (now() AT TIME ZONE p_timezone)::date;
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscriptions'
      AND column_name = 'plan_type'
  ) INTO v_has_plan_type;
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscriptions'
      AND column_name = 'tier'
  ) INTO v_has_tier;

  IF p_user_id IS NOT NULL THEN
    IF v_has_plan_type THEN
      SELECT s.conversions_used, s.conversions_limit, s.last_reset_date::date, s.plan_type
      INTO v_conversions, v_limit, v_last_reset, v_plan_type
      FROM subscriptions s
      WHERE s.user_id = p_user_id;
    ELSIF v_has_tier THEN
      SELECT s.conversions_used, s.conversions_limit, s.last_reset_date::date, s.tier::text
      INTO v_conversions, v_limit, v_last_reset, v_plan_type
      FROM subscriptions s
      WHERE s.user_id = p_user_id;
    ELSE
      SELECT s.conversions_used, s.conversions_limit, s.last_reset_date::date
      INTO v_conversions, v_limit, v_last_reset
      FROM subscriptions s
      WHERE s.user_id = p_user_id;
    END IF;

    IF NOT FOUND THEN
      IF v_has_plan_type THEN
        EXECUTE 'INSERT INTO subscriptions (user_id, plan_type, conversions_used, conversions_limit, last_reset_date, timezone)
                 VALUES ($1, $2, 0, 5, $3, $4)'
        USING p_user_id, 'free', v_today, p_timezone;
        v_plan_type := 'free';
      ELSIF v_has_tier THEN
        EXECUTE 'INSERT INTO subscriptions (user_id, tier, conversions_used, conversions_limit, last_reset_date, timezone)
                 VALUES ($1, $2, 0, 5, $3, $4)'
        USING p_user_id, 'free', v_today, p_timezone;
        v_plan_type := 'free';
      ELSE
        EXECUTE 'INSERT INTO subscriptions (user_id, conversions_used, conversions_limit, last_reset_date, timezone)
                 VALUES ($1, 0, 5, $2, $3)'
        USING p_user_id, v_today, p_timezone;
      END IF;
      v_conversions := 0;
      v_limit := 5;
      v_last_reset := v_today;
    END IF;

    v_is_monthly := v_plan_type LIKE 'monthly%' OR v_plan_type = 'daily';
    v_is_yearly := v_plan_type LIKE 'yearly%' OR v_plan_type = 'business';
    v_is_per_page := v_plan_type LIKE 'per_page%';
    v_is_free := COALESCE(v_plan_type = 'free', false) OR v_limit <= 5;

    IF v_is_free THEN
      IF v_last_reset IS NULL OR v_last_reset < v_today THEN
        UPDATE subscriptions
        SET conversions_used = 0,
            last_reset_date = v_today,
            timezone = p_timezone,
            conversions_limit = 5
        WHERE user_id = p_user_id;
        v_conversions := 0;
        v_limit := 5;
        v_needs_reset := true;
      END IF;
    ELSIF v_is_monthly OR v_is_yearly THEN
      v_period_start := date_trunc(CASE WHEN v_is_monthly THEN 'month' ELSE 'year' END, (now() AT TIME ZONE p_timezone))::date;
      IF v_last_reset IS NULL OR v_last_reset < v_period_start THEN
        UPDATE subscriptions
        SET conversions_used = 0,
            last_reset_date = v_period_start,
            timezone = p_timezone
        WHERE user_id = p_user_id;
        v_conversions := 0;
        v_needs_reset := true;
        v_last_reset := v_period_start;
      END IF;
    ELSE
      IF v_last_reset IS NULL THEN
        UPDATE subscriptions
        SET last_reset_date = v_today,
            timezone = p_timezone
        WHERE user_id = p_user_id;
        v_last_reset := v_today;
      END IF;
    END IF;
  ELSE
    SELECT a.conversions_count, 2, a.last_reset_date::date
    INTO v_conversions, v_limit, v_last_reset
    FROM anonymous_usage a
    WHERE a.ip_address = p_ip_address;

    IF NOT FOUND THEN
      INSERT INTO anonymous_usage (ip_address, conversions_count, last_reset_date, timezone)
      VALUES (p_ip_address, 0, v_today, p_timezone);
      v_conversions := 0;
      v_limit := 2;
      v_last_reset := v_today;
    END IF;

    IF v_last_reset < v_today THEN
      UPDATE anonymous_usage
      SET conversions_count = 0, last_reset_date = v_today, timezone = p_timezone
      WHERE ip_address = p_ip_address;
      v_conversions := 0;
      v_needs_reset := true;
    END IF;
  END IF;

  RETURN QUERY SELECT COALESCE(v_conversions, 0), COALESCE(v_limit, 0), v_needs_reset;
END;
$$;
