-- Update daily conversion limits: anonymous = 2, authenticated free = 5
-- Remove first-day bonus logic and align trigger defaults

DROP FUNCTION IF EXISTS public.check_and_reset_daily_limit(text, uuid, text);

CREATE OR REPLACE FUNCTION public.check_and_reset_daily_limit(
  p_ip_address text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_timezone text DEFAULT 'UTC'
)
RETURNS TABLE(conversions_used integer, conversions_limit integer, needs_reset boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_today date;
  v_last_reset date;
  v_conversions integer;
  v_limit integer;
  v_needs_reset boolean := false;
BEGIN
  -- Get today's date in user's timezone
  v_today := (now() AT TIME ZONE p_timezone)::date;
  
  IF p_user_id IS NOT NULL THEN
    -- Registered user - check subscriptions table
    SELECT s.conversions_used, s.conversions_limit, s.last_reset_date::date
    INTO v_conversions, v_limit, v_last_reset
    FROM subscriptions s
    WHERE s.user_id = p_user_id;
    
    IF NOT FOUND THEN
      -- Create new subscription for user - default 5 daily conversions
      INSERT INTO subscriptions (user_id, conversions_used, conversions_limit, last_reset_date, timezone)
      VALUES (p_user_id, 0, 5, v_today, p_timezone);
      v_conversions := 0;
      v_limit := 5;
      v_last_reset := v_today;
    END IF;
    
    -- Check if reset needed (new day)
    IF v_last_reset < v_today THEN
      UPDATE subscriptions
      SET conversions_used = 0, 
          last_reset_date = v_today, 
          timezone = p_timezone,
          conversions_limit = 5
      WHERE user_id = p_user_id;
      v_conversions := 0;
      v_limit := 5;
      v_needs_reset := true;
    END IF;
  ELSE
    -- Anonymous user - check by IP (limit 2)
    SELECT a.conversions_count, 2, a.last_reset_date::date
    INTO v_conversions, v_limit, v_last_reset
    FROM anonymous_usage a
    WHERE a.ip_address = p_ip_address;
    
    IF NOT FOUND THEN
      INSERT INTO anonymous_usage (ip_address, conversions_count, last_reset_date, timezone)
      VALUES (p_ip_address, 0, v_today, p_timezone);
      v_conversions := 0;
      v_limit := 2;
      v_last_reset := v_today;
    END IF;
    
    IF v_last_reset < v_today THEN
      UPDATE anonymous_usage
      SET conversions_count = 0, last_reset_date = v_today, timezone = p_timezone
      WHERE ip_address = p_ip_address;
      v_conversions := 0;
      v_needs_reset := true;
    END IF;
  END IF;
  
  RETURN QUERY SELECT v_conversions, v_limit, v_needs_reset;
END;
$$;

-- Update handle_new_user trigger to set 5 conversions for new signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user');
  
  INSERT INTO public.subscriptions (user_id, tier, conversions_limit, conversions_used)
  VALUES (new.id, 'free', 5, 0);
  
  RETURN new;
END;
$$;

-- Align existing free users to limit 5
UPDATE public.subscriptions
SET conversions_limit = 5
WHERE tier = 'free';
