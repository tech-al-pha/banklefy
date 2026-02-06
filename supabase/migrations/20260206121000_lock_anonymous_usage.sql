-- Lock down anonymous_usage to service role only

alter table public.anonymous_usage enable row level security;

-- Remove any permissive policies
drop policy if exists "Service role can manage anonymous usage" on public.anonymous_usage;
drop policy if exists "Allow anonymous usage access" on public.anonymous_usage;
drop policy if exists "Allow all" on public.anonymous_usage;
drop policy if exists "Public access" on public.anonymous_usage;

-- Allow only service role (edge functions/admin)
create policy "Service role can manage anonymous usage"
  on public.anonymous_usage
  for all
  to service_role
  using (true)
  with check (true);
