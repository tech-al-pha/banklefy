-- Create table for anonymous user usage tracking
CREATE TABLE public.anonymous_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL UNIQUE,
  conversions_count integer NOT NULL DEFAULT 0,
  last_reset_date date NOT NULL DEFAULT CURRENT_DATE,
  timezone text NOT NULL DEFAULT 'UTC',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on anonymous_usage (public access needed for edge function)
ALTER TABLE public.anonymous_usage ENABLE ROW LEVEL SECURITY;

-- Policy to allow edge function (service role) to manage anonymous usage
CREATE POLICY "Service role can manage anonymous usage"
ON public.anonymous_usage
FOR ALL
USING (true)
WITH CHECK (true);

-- Add timezone and last_reset_date to subscriptions for registered users
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS last_reset_date date NOT NULL DEFAULT CURRENT_DATE;

-- Update default conversions_limit to 6 for registered users
ALTER TABLE public.subscriptions 
ALTER COLUMN conversions_limit SET DEFAULT 6;

-- Update existing subscriptions to have limit of 6
UPDATE public.subscriptions SET conversions_limit = 6 WHERE tier = 'free';

-- Create trigger for updated_at on anonymous_usage
CREATE TRIGGER update_anonymous_usage_updated_at
BEFORE UPDATE ON public.anonymous_usage
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Function to check and reset daily limit based on timezone
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
  v_current_date date;
  v_last_reset date;
  v_count integer;
  v_limit integer;
  v_needs_reset boolean := false;
BEGIN
  -- Get current date in user's timezone
  v_current_date := (NOW() AT TIME ZONE p_timezone)::date;
  
  IF p_user_id IS NOT NULL THEN
    -- Registered user
    SELECT s.conversions_used, s.conversions_limit, s.last_reset_date
    INTO v_count, v_limit, v_last_reset
    FROM subscriptions s
    WHERE s.user_id = p_user_id;
    
    IF v_last_reset < v_current_date THEN
      v_needs_reset := true;
      UPDATE subscriptions 
      SET conversions_used = 0, last_reset_date = v_current_date, timezone = p_timezone
      WHERE user_id = p_user_id;
      v_count := 0;
    END IF;
    
    RETURN QUERY SELECT v_count, v_limit, v_needs_reset;
  ELSE
    -- Anonymous user
    SELECT a.conversions_count, a.last_reset_date
    INTO v_count, v_last_reset
    FROM anonymous_usage a
    WHERE a.ip_address = p_ip_address;
    
    IF NOT FOUND THEN
      -- Create new record
      INSERT INTO anonymous_usage (ip_address, conversions_count, last_reset_date, timezone)
      VALUES (p_ip_address, 0, v_current_date, p_timezone);
      v_count := 0;
      v_last_reset := v_current_date;
    ELSIF v_last_reset < v_current_date THEN
      v_needs_reset := true;
      UPDATE anonymous_usage 
      SET conversions_count = 0, last_reset_date = v_current_date, timezone = p_timezone
      WHERE ip_address = p_ip_address;
      v_count := 0;
    END IF;
    
    -- Anonymous limit is 2
    RETURN QUERY SELECT v_count, 2, v_needs_reset;
  END IF;
END;
$$;

-- Function to increment usage count
CREATE OR REPLACE FUNCTION public.increment_usage_count(
  p_ip_address text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NOT NULL THEN
    UPDATE subscriptions 
    SET conversions_used = conversions_used + 1
    WHERE user_id = p_user_id;
  ELSE
    UPDATE anonymous_usage 
    SET conversions_count = conversions_count + 1
    WHERE ip_address = p_ip_address;
  END IF;
  
  RETURN true;
END;
$$;