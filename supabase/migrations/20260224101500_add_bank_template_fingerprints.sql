create table if not exists public.bank_template_fingerprints (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique,
  template_id text,
  header_hint text,
  allow_single_date boolean not null default false,
  match_count integer not null default 1,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.bank_template_fingerprints enable row level security;
