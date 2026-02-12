-- Atomic, idempotent Razorpay payment processing

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

  -- Record payment once
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

  -- Mark order paid only once
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

  -- Apply pages only on first successful transition to paid
  IF v_order_updated > 0 THEN
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
      (now() AT TIME ZONE 'UTC')::date,
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

  already_processed := v_order_updated = 0;
  pages_added := CASE WHEN v_order_updated > 0 THEN v_pages ELSE 0 END;
  RETURN NEXT;
END;
$$;
