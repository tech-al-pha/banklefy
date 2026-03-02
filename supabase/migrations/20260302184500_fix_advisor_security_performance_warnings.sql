-- Fix advisor warnings: function search_path, RLS auth wrapper, and duplicate indexes

-- 1) Harden function search_path (Security Advisor: mutable search_path)
ALTER FUNCTION public.derive_subscription_tier(text)
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.set_subscription_tier_from_plan()
  SET search_path = public, pg_catalog;

-- 2) RLS performance: wrap auth.uid() in SELECT so planner can cache better
DROP POLICY IF EXISTS "Users can view their own conversions" ON public.conversions;
CREATE POLICY "Users can view their own conversions"
  ON public.conversions
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own orders" ON public.razorpay_orders;
CREATE POLICY "Users can view their own orders"
  ON public.razorpay_orders
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own payments" ON public.razorpay_payments;
CREATE POLICY "Users can view their own payments"
  ON public.razorpay_payments
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- 3) Performance Advisor: remove duplicate user_id index on razorpay_orders
DROP INDEX IF EXISTS public.razorpay_orders_user_id_idx;
CREATE INDEX IF NOT EXISTS idx_razorpay_orders_user_id
  ON public.razorpay_orders (user_id);
