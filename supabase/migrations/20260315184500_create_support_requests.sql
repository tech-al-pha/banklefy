create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users on delete set null,
  name text,
  email text,
  subject text,
  message text not null,
  source text
);

alter table public.support_requests enable row level security;

create policy "Support requests insert (public)"
  on public.support_requests
  for insert
  to anon, authenticated
  with check (true);
