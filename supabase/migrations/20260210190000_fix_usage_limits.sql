-- Update usage limit functions to respect paid limits and support variable increments

-- Ensure free default is 5 conversions
ALTER TABLE public.subscriptions
  ALTER COLUMN conversions_limit SET DEFAULT 5;

UPDATE public.subscriptions
SET conversions_limit = 5
WHERE tier = 'free' AND conversions_limit < 5;

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
  v_tier subscription_tier;
  v_is_free boolean := false;
BEGIN
  v_today := (now() AT TIME ZONE p_timezone)::date;

  IF p_user_id IS NOT NULL THEN
    SELECT s.conversions_used, s.conversions_limit, s.last_reset_date::date, s.tier
    INTO v_conversions, v_limit, v_last_reset, v_tier
    FROM subscriptions s
    WHERE s.user_id = p_user_id;

    IF NOT FOUND THEN
      INSERT INTO subscriptions (user_id, conversions_used, conversions_limit, last_reset_date, timezone, tier)
      VALUES (p_user_id, 0, 5, v_today, p_timezone, 'free');
      v_conversions := 0;
      v_limit := 5;
      v_last_reset := v_today;
      v_tier := 'free';
    END IF;

    v_is_free := (v_tier = 'free' AND v_limit <= 5);

    IF v_is_free AND (v_last_reset IS NULL OR v_last_reset < v_today) THEN
      UPDATE subscriptions
      SET conversions_used = 0,
          last_reset_date = v_today,
          timezone = p_timezone,
          conversions_limit = 5
      WHERE user_id = p_user_id;
      v_conversions := 0;
      v_limit := 5;
      v_needs_reset := true;
    ELSIF NOT v_is_free THEN
      IF v_last_reset IS NULL THEN
        UPDATE subscriptions
        SET last_reset_date = v_today,
            timezone = p_timezone
        WHERE user_id = p_user_id;
        v_last_reset := v_today;
      END IF;
    END IF;
  ELSE
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

  RETURN QUERY SELECT COALESCE(v_conversions, 0), COALESCE(v_limit, 0), v_needs_reset;
END;
$$;

DROP FUNCTION IF EXISTS public.increment_usage_count(text, uuid);
DROP FUNCTION IF EXISTS public.increment_usage_count(text, uuid, integer);

CREATE OR REPLACE FUNCTION public.increment_usage_count(
  p_ip_address text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_increment integer DEFAULT 1
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_increment integer := COALESCE(p_increment, 1);
BEGIN
  IF v_increment < 1 THEN
    v_increment := 1;
  END IF;

  IF p_user_id IS NOT NULL THEN
    UPDATE subscriptions
    SET conversions_used = conversions_used + v_increment
    WHERE user_id = p_user_id;
  ELSE
    UPDATE anonymous_usage
    SET conversions_count = conversions_count + v_increment
    WHERE ip_address = p_ip_address;
  END IF;

  RETURN true;
END;
$$;
