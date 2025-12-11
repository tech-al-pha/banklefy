-- Update the check_and_reset_daily_limit function to give unlimited conversions to admins
CREATE OR REPLACE FUNCTION public.check_and_reset_daily_limit(p_ip_address text DEFAULT NULL::text, p_user_id uuid DEFAULT NULL::uuid, p_timezone text DEFAULT 'UTC'::text)
 RETURNS TABLE(conversions_used integer, conversions_limit integer, needs_reset boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_date date;
  v_last_reset date;
  v_count integer;
  v_limit integer;
  v_needs_reset boolean := false;
  v_is_admin boolean := false;
BEGIN
  -- Get current date in user's timezone
  v_current_date := (NOW() AT TIME ZONE p_timezone)::date;
  
  IF p_user_id IS NOT NULL THEN
    -- Check if user is admin
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = p_user_id AND role = 'admin'
    ) INTO v_is_admin;
    
    -- If admin, return unlimited (999999 limit, 0 used)
    IF v_is_admin THEN
      RETURN QUERY SELECT 0, 999999, false;
      RETURN;
    END IF;
    
    -- Regular registered user
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
$function$;

-- Create a function to set admin role for a specific email after signup
CREATE OR REPLACE FUNCTION public.set_admin_for_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If the email is the owner's email, set them as admin
  IF NEW.email = 'inspirexali@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to auto-assign admin role for owner
DROP TRIGGER IF EXISTS on_owner_signup ON auth.users;
CREATE TRIGGER on_owner_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.set_admin_for_owner();