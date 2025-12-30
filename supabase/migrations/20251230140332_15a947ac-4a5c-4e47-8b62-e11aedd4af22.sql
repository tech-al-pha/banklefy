-- Explicitly deny anonymous access to profiles (defense in depth)
CREATE POLICY "Deny anonymous access to profiles"
  ON public.profiles
  FOR ALL
  TO anon
  USING (false);

-- Explicitly deny anonymous access to conversions
CREATE POLICY "Deny anonymous access to conversions"
  ON public.conversions
  FOR ALL
  TO anon
  USING (false);

-- Explicitly deny anonymous access to user_roles
CREATE POLICY "Deny anonymous access to user_roles"
  ON public.user_roles
  FOR ALL
  TO anon
  USING (false);

-- Explicitly deny anonymous access to subscriptions
CREATE POLICY "Deny anonymous access to subscriptions"
  ON public.subscriptions
  FOR ALL
  TO anon
  USING (false);