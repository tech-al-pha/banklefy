ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS plan_type text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS free_daily_limit integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS free_daily_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pack_limit integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pack_used integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.process_razorpay_payment(
  p_user_id uuid,
  p_order_id uuid,
  p_razorpay_payment_id text,
  p_razorpay_order_id text,
  p_razorpay_signature text,
  p_amount integer,
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
  v_existing_limit integer := 0;
  v_existing_used integer := 0;
  v_next_limit integer := 0;
  v_next_used integer := 0;
  v_plan_tier public.subscription_tier := 'business';
BEGIN
  IF p_user_id IS NULL OR p_order_id IS NULL OR p_razorpay_payment_id IS NULL OR p_razorpay_order_id IS NULL THEN
    RAISE EXCEPTION 'Missing payment finalization data';
  END IF;

  IF COALESCE(p_pages_to_add, 0) < 0 THEN
    RAISE EXCEPTION 'Invalid pages to add';
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
  ) VALUES (
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

  IF NOT p_plan_id LIKE 'per_page_%' THEN
    v_plan_tier := 'free';
  END IF;

  SELECT conversions_limit, conversions_used
  INTO v_existing_limit, v_existing_used
  FROM public.subscriptions
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.subscriptions (
      user_id,
      tier,
      plan_type,
      conversions_limit,
      conversions_used,
      free_daily_limit,
      free_daily_used,
      pack_limit,
      pack_used,
      timezone,
      last_reset_date,
      billing_cycle_start,
      billing_cycle_end
    ) VALUES (
      p_user_id,
      v_plan_tier,
      p_plan_id,
      COALESCE(p_pages_to_add, 0),
      0,
      5,
      0,
      COALESCE(p_pages_to_add, 0),
      0,
      'UTC',
      CURRENT_DATE,
      now(),
      now() + interval '100 years'
    );
  ELSE
    v_next_limit := GREATEST(COALESCE(v_existing_limit, 0), 0) + COALESCE(p_pages_to_add, 0);
    v_next_used := LEAST(v_next_limit, GREATEST(COALESCE(v_existing_used, 0), 0));

    UPDATE public.subscriptions
    SET
      tier = v_plan_tier,
      plan_type = p_plan_id,
      conversions_limit = v_next_limit,
      conversions_used = v_next_used,
      free_daily_limit = GREATEST(COALESCE(free_daily_limit, 5), 5),
      pack_limit = v_next_limit,
      pack_used = v_next_used,
      last_reset_date = CURRENT_DATE,
      updated_at = now()
    WHERE user_id = p_user_id;
  END IF;

  already_processed := false;
  pages_added := COALESCE(p_pages_to_add, 0);
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_razorpay_payment(uuid, uuid, text, text, text, integer, text, text, integer) TO service_role;