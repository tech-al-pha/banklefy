-- Fix razorpay_orders: scope INSERT and UPDATE policies to service_role only
DROP POLICY IF EXISTS "Service role can insert orders" ON public.razorpay_orders;
DROP POLICY IF EXISTS "Service role can update orders" ON public.razorpay_orders;

CREATE POLICY "Service role can insert orders"
ON public.razorpay_orders
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update orders"
ON public.razorpay_orders
FOR UPDATE
TO service_role
USING (true);

-- Fix razorpay_payments: scope INSERT policy to service_role only
DROP POLICY IF EXISTS "Service role can insert payments" ON public.razorpay_payments;

CREATE POLICY "Service role can insert payments"
ON public.razorpay_payments
FOR INSERT
TO service_role
WITH CHECK (true);