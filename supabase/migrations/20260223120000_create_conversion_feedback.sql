-- Conversion feedback from users (accuracy + template consent)
create table if not exists public.conversion_feedback (
  id uuid primary key default gen_random_uuid(),
  conversion_id uuid not null references public.conversions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  is_accurate boolean not null,
  allow_template boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  unique (conversion_id, user_id)
);

alter table public.conversion_feedback enable row level security;

-- Users can insert their own feedback
create policy "Users can insert their own conversion feedback"
  on public.conversion_feedback for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Users can view their own feedback
create policy "Users can view their own conversion feedback"
  on public.conversion_feedback for select
  to authenticated
  using (auth.uid() = user_id);
