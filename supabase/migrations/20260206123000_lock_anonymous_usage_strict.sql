-- Strictly lock anonymous_usage to service_role only

do $$
declare r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'anonymous_usage'
  loop
    execute format('drop policy if exists %I on public.anonymous_usage', r.policyname);
  end loop;
end;
$$;

create policy "Service role can manage anonymous usage"
  on public.anonymous_usage
  for all
  to service_role
  using (true)
  with check (true);
