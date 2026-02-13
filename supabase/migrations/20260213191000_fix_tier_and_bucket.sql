-- Fix subscriptions.tier and ensure storage bucket exists
DO $$
BEGIN
  CREATE TYPE public.subscription_tier AS ENUM ('free', 'daily', 'business');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS tier public.subscription_tier DEFAULT 'free';

UPDATE public.subscriptions
SET tier = CASE
  WHEN tier IS NOT NULL THEN tier
  WHEN plan_type ILIKE 'daily%' THEN 'daily'::public.subscription_tier
  WHEN plan_type IS NOT NULL AND plan_type <> '' AND plan_type <> 'free' THEN 'business'::public.subscription_tier
  ELSE 'free'::public.subscription_tier
END
WHERE tier IS NULL;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT
  'bank-statements',
  'bank-statements',
  false,
  10485760,
  array['application/pdf', 'image/png', 'image/jpeg']
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'bank-statements'
);
