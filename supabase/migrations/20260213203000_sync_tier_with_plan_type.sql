-- Sync tier with plan_type (single source of truth = plan_type)
DO $$
BEGIN
  CREATE TYPE public.subscription_tier AS ENUM ('free', 'daily', 'business');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.derive_subscription_tier(p_plan_type text)
RETURNS public.subscription_tier
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_plan_type ILIKE 'daily%' THEN 'daily'::public.subscription_tier
    WHEN p_plan_type IS NOT NULL AND p_plan_type <> '' AND p_plan_type <> 'free' THEN 'business'::public.subscription_tier
    ELSE 'free'::public.subscription_tier
  END
$$;

CREATE OR REPLACE FUNCTION public.set_subscription_tier_from_plan()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.tier := public.derive_subscription_tier(NEW.plan_type);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_subscription_tier_from_plan ON public.subscriptions;
CREATE TRIGGER set_subscription_tier_from_plan
BEFORE INSERT OR UPDATE OF plan_type
ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.set_subscription_tier_from_plan();

UPDATE public.subscriptions
SET tier = public.derive_subscription_tier(plan_type);
