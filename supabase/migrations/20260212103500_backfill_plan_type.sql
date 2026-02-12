-- Ensure plan_type exists and backfill from latest paid order

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS plan_type text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscriptions'
      AND column_name = 'tier'
  ) THEN
    UPDATE subscriptions s
    SET plan_type = o.plan_id,
        tier = CASE
          WHEN o.plan_id LIKE 'yearly%' THEN 'business'::subscription_tier
          WHEN o.plan_id LIKE 'monthly%' THEN 'daily'::subscription_tier
          ELSE 'free'::subscription_tier
        END
    FROM (
      SELECT DISTINCT ON (user_id) user_id, plan_id
      FROM razorpay_orders
      WHERE status = 'paid'
      ORDER BY user_id, created_at DESC
    ) o
    WHERE s.user_id = o.user_id
      AND (s.plan_type IS NULL OR s.plan_type = '' OR s.plan_type = 'free');
  ELSE
    UPDATE subscriptions s
    SET plan_type = o.plan_id
    FROM (
      SELECT DISTINCT ON (user_id) user_id, plan_id
      FROM razorpay_orders
      WHERE status = 'paid'
      ORDER BY user_id, created_at DESC
    ) o
    WHERE s.user_id = o.user_id
      AND (s.plan_type IS NULL OR s.plan_type = '' OR s.plan_type = 'free');
  END IF;
END $$;
