-- 1. Add RLS policy to anonymous_usage table (service role only - edge functions)
-- This table stores IP addresses and should only be accessed by backend services
CREATE POLICY "Service role only access"
  ON public.anonymous_usage
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. Add INSERT policy to subscriptions for authenticated users
CREATE POLICY "Users can insert their own subscription"
  ON public.subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3. Add UPDATE policy to conversions for authenticated users
CREATE POLICY "Users can update their own conversions"
  ON public.conversions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);