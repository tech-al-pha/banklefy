alter table public.conversions
  add column if not exists export_payload jsonb;
