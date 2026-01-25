-- Fix anonymous user limit from 100 to 2
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
      -- Create new subscription for user
      INSERT INTO subscriptions (user_id, conversions_used, conversions_limit, last_reset_date, timezone)
      VALUES (p_user_id, 0, 6, v_today, p_timezone);
      v_conversions := 0;
      v_limit := 6;
      v_last_reset := v_today;
    END IF;
    
    -- Check if reset needed
    IF v_last_reset < v_today THEN
      UPDATE subscriptions
      SET conversions_used = 0, last_reset_date = v_today, timezone = p_timezone
      WHERE user_id = p_user_id;
      v_conversions := 0;
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