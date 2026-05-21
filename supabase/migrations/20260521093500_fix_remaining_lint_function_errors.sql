-- Resolve remaining DB lint errors after 20260521092000 migration:
-- 1) check_and_reset_daily_limit: remove ON CONFLICT dependency on user_id uniqueness
-- 2) process_razorpay_payment: remove reference to subscriptions.updated_at

CREATE OR REPLACE FUNCTION public.check_and_reset_daily_limit(
  p_ip_address text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_timezone text DEFAULT 'UTC'
)
RETURNS TABLE(conversions_used integer, conversions_limit integer, needs_reset boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := (now() AT TIME ZONE p_timezone)::date;
  v_last_reset date;
  v_used integer := 0;
  v_limit integer := 0;
  v_needs_reset boolean := false;
  v_anon_key_col text;
BEGIN
  IF p_user_id IS NOT NULL THEN
    SELECT s.conversions_used, s.conversions_limit, s.last_reset_date::date
    INTO v_used, v_limit, v_last_reset
    FROM public.subscriptions s
    WHERE s.user_id = p_user_id;

    IF NOT FOUND THEN
      BEGIN
        INSERT INTO public.subscriptions (
          user_id,
          conversions_used,
          conversions_limit,
          last_reset_date,
          timezone
        )
        VALUES (p_user_id, 0, 5, v_today, p_timezone);
      EXCEPTION
        WHEN unique_violation THEN
          NULL;
      END;

      SELECT s.conversions_used, s.conversions_limit, s.last_reset_date::date
      INTO v_used, v_limit, v_last_reset
      FROM public.subscriptions s
      WHERE s.user_id = p_user_id;

      v_used := COALESCE(v_used, 0);
      v_limit := COALESCE(v_limit, 5);
      v_last_reset := COALESCE(v_last_reset, v_today);
    END IF;

    IF v_last_reset IS NULL OR v_last_reset < v_today THEN
      UPDATE public.subscriptions s
      SET
        conversions_used = 0,
        last_reset_date = v_today,
        timezone = p_timezone
      WHERE s.user_id = p_user_id;

      v_used := 0;
      v_needs_reset := true;
    END IF;

    RETURN QUERY
      SELECT COALESCE(v_used, 0), GREATEST(COALESCE(v_limit, 5), 0), v_needs_reset;
    RETURN;
  END IF;

  IF p_ip_address IS NULL OR btrim(p_ip_address) = '' THEN
    RETURN QUERY SELECT 0, 2, false;
    RETURN;
  END IF;

  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'anonymous_usage' AND column_name = 'ip_address'
    ) THEN 'ip_address'
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'anonymous_usage' AND column_name = 'client_id'
    ) THEN 'client_id'
    ELSE NULL
  END
  INTO v_anon_key_col;

  IF v_anon_key_col IS NULL THEN
    RETURN QUERY SELECT 0, 2, false;
    RETURN;
  END IF;

  EXECUTE format(
    'SELECT conversions_count, last_reset_date::date
     FROM public.anonymous_usage
     WHERE %I = $1',
    v_anon_key_col
  )
  INTO v_used, v_last_reset
  USING p_ip_address;

  IF v_used IS NULL THEN
    BEGIN
      EXECUTE format(
        'INSERT INTO public.anonymous_usage (%I, conversions_count, last_reset_date, timezone)
         VALUES ($1, 0, $2, $3)',
        v_anon_key_col
      )
      USING p_ip_address, v_today, p_timezone;
    EXCEPTION
      WHEN unique_violation THEN
        NULL;
    END;

    RETURN QUERY SELECT 0, 2, false;
    RETURN;
  END IF;

  IF v_last_reset IS NULL OR v_last_reset < v_today THEN
    EXECUTE format(
      'UPDATE public.anonymous_usage
       SET conversions_count = 0, last_reset_date = $2, timezone = $3
       WHERE %I = $1',
      v_anon_key_col
    )
    USING p_ip_address, v_today, p_timezone;

    RETURN QUERY SELECT 0, 2, true;
    RETURN;
  END IF;

  RETURN QUERY SELECT COALESCE(v_used, 0), 2, false;
END;
$$;

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
SET search_path = public
AS $$
DECLARE
  v_order_updated integer := 0;
  v_pages integer := GREATEST(COALESCE(p_pages_to_add, 0), 0);
  v_existing_limit integer := 0;
  v_existing_used integer := 0;
  v_next_limit integer := 0;
  v_next_used integer := 0;
  v_plan_tier public.subscription_tier := CASE
    WHEN p_plan_id LIKE 'yearly%' THEN 'business'::public.subscription_tier
    WHEN p_plan_id LIKE 'monthly%' THEN 'daily'::public.subscription_tier
    ELSE 'free'::public.subscription_tier
  END;
BEGIN
  IF p_user_id IS NULL OR p_order_id IS NULL OR p_razorpay_payment_id IS NULL OR p_razorpay_order_id IS NULL THEN
    RAISE EXCEPTION 'Missing payment finalization data';
  END IF;

  INSERT INTO public.razorpay_payments (
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

  UPDATE public.razorpay_orders
  SET status = 'paid', updated_at = now()
  WHERE id = p_order_id
    AND user_id = p_user_id
    AND razorpay_order_id = p_razorpay_order_id
    AND status IS DISTINCT FROM 'paid';

  GET DIAGNOSTICS v_order_updated = ROW_COUNT;

  IF v_order_updated = 0 THEN
    already_processed := true;
    pages_added := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT COALESCE(s.conversions_limit, 0), COALESCE(s.conversions_used, 0)
  INTO v_existing_limit, v_existing_used
  FROM public.subscriptions s
  WHERE s.user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.subscriptions (
      user_id,
      tier,
      plan_type,
      conversions_limit,
      conversions_used,
      timezone,
      last_reset_date
    ) VALUES (
      p_user_id,
      v_plan_tier,
      p_plan_id,
      v_pages,
      0,
      'UTC',
      CURRENT_DATE
    );
  ELSE
    v_next_limit := GREATEST(v_existing_limit, 0) + v_pages;
    v_next_used := LEAST(v_next_limit, GREATEST(v_existing_used, 0));

    UPDATE public.subscriptions s
    SET
      tier = v_plan_tier,
      plan_type = p_plan_id,
      conversions_limit = v_next_limit,
      conversions_used = v_next_used,
      timezone = COALESCE(s.timezone, 'UTC'),
      last_reset_date = COALESCE(s.last_reset_date, CURRENT_DATE)
    WHERE s.user_id = p_user_id;
  END IF;

  already_processed := false;
  pages_added := v_pages;
  RETURN NEXT;
END;
$$;

