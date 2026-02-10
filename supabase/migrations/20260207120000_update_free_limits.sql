-- Update daily conversion limits: anonymous = 2, authenticated free = 5
-- Remove first-day bonus logic and align trigger defaults

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscriptions'
      AND column_name = 'conversions_limit'
  ) THEN
    EXECUTE 'ALTER TABLE public.subscriptions ADD COLUMN conversions_limit int NOT NULL DEFAULT 5';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscriptions'
      AND column_name = 'conversions_used'
  ) THEN
    EXECUTE 'ALTER TABLE public.subscriptions ADD COLUMN conversions_used int NOT NULL DEFAULT 0';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscriptions'
      AND column_name = 'last_reset_date'
  ) THEN
    EXECUTE 'ALTER TABLE public.subscriptions ADD COLUMN last_reset_date date';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscriptions'
      AND column_name = 'timezone'
  ) THEN
    EXECUTE 'ALTER TABLE public.subscriptions ADD COLUMN timezone text';
  END IF;
END;
$$;

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
  v_has_plan_type boolean := false;
  v_has_tier boolean := false;
BEGIN
  -- Get today's date in user's timezone
  v_today := (now() AT TIME ZONE p_timezone)::date;
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscriptions'
      AND column_name = 'plan_type'
  ) INTO v_has_plan_type;
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscriptions'
      AND column_name = 'tier'
  ) INTO v_has_tier;
  
  IF p_user_id IS NOT NULL THEN
    -- Registered user - check subscriptions table
    SELECT s.conversions_used, s.conversions_limit, s.last_reset_date::date
    INTO v_conversions, v_limit, v_last_reset
    FROM subscriptions s
    WHERE s.user_id = p_user_id;
    
    IF NOT FOUND THEN
      -- Create new subscription for user - default 5 daily conversions
      IF v_has_plan_type THEN
        EXECUTE 'INSERT INTO subscriptions (user_id, plan_type, conversions_used, conversions_limit, last_reset_date, timezone)
                 VALUES ($1, $2, 0, 5, $3, $4)'
        USING p_user_id, 'free', v_today, p_timezone;
      ELSIF v_has_tier THEN
        EXECUTE 'INSERT INTO subscriptions (user_id, tier, conversions_used, conversions_limit, last_reset_date, timezone)
                 VALUES ($1, $2, 0, 5, $3, $4)'
        USING p_user_id, 'free', v_today, p_timezone;
      ELSE
        EXECUTE 'INSERT INTO subscriptions (user_id, conversions_used, conversions_limit, last_reset_date, timezone)
                 VALUES ($1, 0, 5, $2, $3)'
        USING p_user_id, v_today, p_timezone;
      END IF;
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
DECLARE
  v_has_plan_type boolean := false;
  v_has_tier boolean := false;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user');
  
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscriptions'
      AND column_name = 'plan_type'
  ) INTO v_has_plan_type;
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscriptions'
      AND column_name = 'tier'
  ) INTO v_has_tier;

  IF v_has_plan_type THEN
    EXECUTE 'INSERT INTO public.subscriptions (user_id, plan_type, conversions_limit, conversions_used)
             VALUES ($1, $2, 5, 0)'
    USING new.id, 'free';
  ELSIF v_has_tier THEN
    EXECUTE 'INSERT INTO public.subscriptions (user_id, tier, conversions_limit, conversions_used)
             VALUES ($1, $2, 5, 0)'
    USING new.id, 'free';
  ELSE
    EXECUTE 'INSERT INTO public.subscriptions (user_id, conversions_limit, conversions_used)
             VALUES ($1, 5, 0)'
    USING new.id;
  END IF;
  
  RETURN new;
END;
$$;

-- Align existing free users to limit 5
DO $$
DECLARE
  v_has_plan_type boolean := false;
  v_has_tier boolean := false;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscriptions'
      AND column_name = 'plan_type'
  ) INTO v_has_plan_type;
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscriptions'
      AND column_name = 'tier'
  ) INTO v_has_tier;

  IF v_has_plan_type THEN
    EXECUTE 'UPDATE public.subscriptions SET conversions_limit = 5 WHERE plan_type = ''free''';
  ELSIF v_has_tier THEN
    EXECUTE 'UPDATE public.subscriptions SET conversions_limit = 5 WHERE tier = ''free''';
  ELSE
    EXECUTE 'UPDATE public.subscriptions SET conversions_limit = 5 WHERE conversions_limit < 5';
  END IF;
END;
$$;
