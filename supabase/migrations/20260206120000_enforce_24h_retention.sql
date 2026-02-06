-- Enforce 24-hour retention for conversions and restrict access to owner only

-- Add expires_at for deterministic retention
alter table public.conversions
  add column if not exists expires_at timestamptz;

update public.conversions
  set expires_at = created_at + interval '24 hours'
  where expires_at is null;

alter table public.conversions
  alter column expires_at set default (now() + interval '24 hours');

-- Tighten select policy to only show active (non-expired) conversions
drop policy if exists "Users can view their own conversions" on public.conversions;

create policy "Users can view their own active conversions"
  on public.conversions for select
  to authenticated
  using (auth.uid() = user_id and expires_at > now());

-- Purge expired conversions and associated storage objects
create or replace function public.purge_expired_conversions()
returns void
language plpgsql
security definer
set search_path = public, storage
as $$
begin
  -- Delete original uploads
  delete from storage.objects
  where bucket_id = 'bank-statements'
    and name in (
      select (user_id::text || '/' || file_path)
      from public.conversions
      where expires_at <= now()
        and file_path is not null
    );

  -- Delete generated results
  delete from storage.objects
  where bucket_id = 'bank-statements'
    and name in (
      select result_path
      from public.conversions
      where expires_at <= now()
        and result_path is not null
    );

  -- Delete conversions (cascades to related tables)
  delete from public.conversions
  where expires_at <= now();
end;
$$;

-- Schedule hourly cleanup (if pg_cron is available)
create extension if not exists pg_cron;

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'purge_expired_conversions') then
    perform cron.schedule(
      'purge_expired_conversions',
      '0 * * * *',
      $$select public.purge_expired_conversions();$$
    );
  end if;
end;
$$;
