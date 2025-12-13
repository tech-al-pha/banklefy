-- Drop the permissive policy that exposes IP addresses to the public
DROP POLICY IF EXISTS "Service role can manage anonymous usage" ON public.anonymous_usage;