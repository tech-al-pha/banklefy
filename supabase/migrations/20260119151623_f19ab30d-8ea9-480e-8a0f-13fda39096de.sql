-- Update the check_and_reset_daily_limit function to set anonymous limit to 100
CREATE OR REPLACE FUNCTION public.check_and_reset_daily_limit(
  p_ip_address text DEFAULT NULL,
  p_timezone text DEFAULT 'UTC',
  p_user_id uuid DEFAULT NULL
)
RETURNS TABLE(conversions_used integer, conversions_limit integer, needs_reset boolean) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_now timestamptz;
  v_today date;
  v_count integer;
  v_limit integer;
  v_last_reset date;
  v_needs_reset boolean := false;
BEGIN
  -- Get current time in user's timezone
  v_now := now() AT TIME ZONE p_timezone;
  v_today := v_now::date;
  
  IF p_user_id IS NOT NULL THEN
    -- Registered user - check subscriptions table
    SELECT s.conversions_used, s.conversions_limit, s.last_reset_date
    INTO v_count, v_limit, v_last_reset
    FROM subscriptions s
    WHERE s.user_id = p_user_id;
    
    IF NOT FOUND THEN
      -- Create new subscription record
      INSERT INTO subscriptions (user_id, conversions_used, conversions_limit, last_reset_date, timezone)
      VALUES (p_user_id, 0, 6, v_today, p_timezone);
      v_count := 0;
      v_limit := 6;
      v_needs_reset := false;
    ELSIF v_last_reset < v_today THEN
      -- Reset daily count
      v_needs_reset := true;
      UPDATE subscriptions 
      SET conversions_used = 0, last_reset_date = v_today, timezone = p_timezone
      WHERE user_id = p_user_id;
      v_count := 0;
    END IF;
    
    RETURN QUERY SELECT v_count, v_limit, v_needs_reset;
  ELSE
    -- Anonymous user - check by IP
    SELECT a.conversions_count, a.last_reset_date
    INTO v_count, v_last_reset
    FROM anonymous_usage a
    WHERE a.ip_address = p_ip_address;
    
    IF NOT FOUND THEN
      -- Create new anonymous usage record
      INSERT INTO anonymous_usage (ip_address, conversions_count, last_reset_date, timezone)
      VALUES (p_ip_address, 0, v_today, p_timezone);
      v_count := 0;
    ELSIF v_last_reset < v_today THEN
      -- Reset daily count
      v_needs_reset := true;
      UPDATE anonymous_usage 
      SET conversions_count = 0, last_reset_date = v_today, timezone = p_timezone
      WHERE ip_address = p_ip_address;
      v_count := 0;
    END IF;
    
    -- Anonymous limit is 100
    RETURN QUERY SELECT v_count, 100, v_needs_reset;
  END IF;
END;
$function$;