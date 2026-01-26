-- Update check_and_reset_daily_limit function
-- Logic: 
-- - New signups get 6 conversions (one-time welcome bonus)
-- - After first day, authenticated users get 2 daily (same as anonymous)
-- - Anonymous users always get 2 daily

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
  v_is_first_day boolean := false;
BEGIN
  -- Get today's date in user's timezone
  v_today := (now() AT TIME ZONE p_timezone)::date;
  
  IF p_user_id IS NOT NULL THEN
    -- Registered user - check subscriptions table
    SELECT s.conversions_used, s.conversions_limit, s.last_reset_date::date, 
           (s.created_at::date = s.last_reset_date::date) -- Check if it's their first day
    INTO v_conversions, v_limit, v_last_reset, v_is_first_day
    FROM subscriptions s
    WHERE s.user_id = p_user_id;
    
    IF NOT FOUND THEN
      -- Create new subscription for user - FIRST DAY gets 6 conversions!
      INSERT INTO subscriptions (user_id, conversions_used, conversions_limit, last_reset_date, timezone)
      VALUES (p_user_id, 0, 6, v_today, p_timezone);
      v_conversions := 0;
      v_limit := 6;  -- First-time signup bonus!
      v_last_reset := v_today;
    END IF;
    
    -- Check if reset needed (new day)
    IF v_last_reset < v_today THEN
      -- After first day, limit becomes 2 (same as anonymous)
      UPDATE subscriptions
      SET conversions_used = 0, 
          last_reset_date = v_today, 
          timezone = p_timezone,
          conversions_limit = 2  -- Daily limit after first day
      WHERE user_id = p_user_id;
      v_conversions := 0;
      v_limit := 2;  -- Daily limit after first day
      v_needs_reset := true;
    END IF;
  ELSE
    -- Anonymous user - check by IP (LIMIT IS 2)
    SELECT a.conversions_count, 2, a.last_reset_date::date
    INTO v_conversions, v_limit, v_last_reset
    FROM anonymous_usage a
    WHERE a.ip_address = p_ip_address;
    
    IF NOT FOUND THEN
      -- Create new record for IP with limit of 2
      INSERT INTO anonymous_usage (ip_address, conversions_count, last_reset_date, timezone)
      VALUES (p_ip_address, 0, v_today, p_timezone);
      v_conversions := 0;
      v_limit := 2;
      v_last_reset := v_today;
    END IF;
    
    -- Check if reset needed
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

-- Also update handle_new_user trigger to set 6 conversions for new signups
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
  
  -- New users get 6 conversions as a welcome bonus (first day only)
  INSERT INTO public.subscriptions (user_id, tier, conversions_limit, conversions_used)
  VALUES (new.id, 'free', 6, 0);
  
  RETURN new;
END;
$$;