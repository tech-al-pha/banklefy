-- Ensure RLS is enabled and policies exist where missing.

ALTER TABLE IF EXISTS public.razorpay_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.razorpay_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.conversions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- razorpay_orders policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'razorpay_orders'
      AND policyname = 'Users can view their own orders'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can view their own orders" ON public.razorpay_orders FOR SELECT USING ((SELECT auth.uid()) = user_id)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'razorpay_orders'
      AND policyname = 'Service role can insert orders'
  ) THEN
    EXECUTE 'CREATE POLICY "Service role can insert orders" ON public.razorpay_orders FOR INSERT WITH CHECK (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'razorpay_orders'
      AND policyname = 'Service role can update orders'
  ) THEN
    EXECUTE 'CREATE POLICY "Service role can update orders" ON public.razorpay_orders FOR UPDATE USING (true)';
  END IF;

  -- razorpay_payments policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'razorpay_payments'
      AND policyname = 'Users can view their own payments'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can view their own payments" ON public.razorpay_payments FOR SELECT USING ((SELECT auth.uid()) = user_id)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'razorpay_payments'
      AND policyname = 'Service role can insert payments'
  ) THEN
    EXECUTE 'CREATE POLICY "Service role can insert payments" ON public.razorpay_payments FOR INSERT WITH CHECK (true)';
  END IF;

  -- conversions policies (ensure basic policies exist)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'conversions'
      AND policyname = 'Users can view their own conversions'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can view their own conversions" ON public.conversions FOR SELECT USING ((SELECT auth.uid()) = user_id)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'conversions'
      AND policyname = 'Users can insert their own conversions'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can insert their own conversions" ON public.conversions FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id)';
  END IF;
END;
$$;
