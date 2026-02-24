alter table public.conversions
  add column if not exists processing_timings jsonb,
  add column if not exists processing_total_ms integer;
