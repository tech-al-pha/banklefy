-- Disable 24-hour retention behavior.
-- Keep historical rows accessible and stop automatic purge scheduling.

-- Keep expires_at column for backward compatibility, but remove auto-assignment.
alter table public.conversions
  alter column expires_at drop default;

-- Restore select policy without expiry filter.
drop policy if exists "Users can view their own active conversions" on public.conversions;

create policy "Users can view their own conversions"
  on public.conversions for select
  to authenticated
  using (auth.uid() = user_id);

-- Stop scheduled purge job if present.
do $$
declare
  v_job_id integer;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    select jobid
      into v_job_id
    from cron.job
    where jobname = 'purge_expired_conversions'
    limit 1;

    if v_job_id is not null then
      perform cron.unschedule(v_job_id);
    end if;
  end if;
end;
$$;

-- Disable retention purge implementation.
create or replace function public.purge_expired_conversions()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Retention purge disabled.
  return;
end;
$$;

-- Keep health/ensure RPCs callable, but mark retention as disabled.
create or replace function public.ensure_purge_expired_conversions_cron()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object(
    'ok', true,
    'action', 'disabled',
    'reason', 'retention_disabled'
  );
end;
$$;

create or replace function public.retention_health_check()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object(
    'retention_enabled', false,
    'status', 'disabled'
  );
end;
$$;
