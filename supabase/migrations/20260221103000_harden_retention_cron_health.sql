-- Harden 24-hour retention by making cron scheduling self-healing and observable.

create extension if not exists pg_cron;

create or replace function public.purge_expired_conversions()
returns void
language plpgsql
security definer
set search_path = public, storage, pg_catalog
as $$
begin
  execute $sql$
    delete from public.conversions
    where expires_at <= now()
  $sql$;
end;
$$;

create or replace function public.ensure_purge_expired_conversions_cron()
returns jsonb
language plpgsql
security definer
set search_path = public, cron, pg_catalog
as $$
declare
  v_expected_schedule text := '0 * * * *';
  v_expected_command text := 'select public.purge_expired_conversions();';
  v_action text := 'unknown';
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    return jsonb_build_object(
      'ok', false,
      'error', 'pg_cron extension is not installed'
    );
  end if;

  begin
    perform cron.schedule(
      'purge_expired_conversions',
      v_expected_schedule,
      v_expected_command
    );
    v_action := 'created';
  exception
    when others then
      if sqlerrm ilike '%already exists%' then
        v_action := 'already_exists';
      else
        return jsonb_build_object(
          'ok', false,
          'error', sqlerrm
        );
      end if;
  end;

  return jsonb_build_object(
    'ok', true,
    'action', v_action,
    'schedule', v_expected_schedule,
    'command', v_expected_command
  );
end;
$$;

create or replace function public.retention_health_check()
returns jsonb
language plpgsql
security definer
set search_path = public, storage, cron, pg_catalog
as $$
declare
  v_expired_conversion_count bigint := 0;
  v_oldest_expired_at timestamptz := null;
  v_orphan_storage_count bigint := 0;
  v_cron_installed boolean := false;
  v_ensure_result jsonb;
  v_has_user_id boolean;
  v_has_file_path boolean;
  v_has_result_path boolean;
  v_ref_conditions text := '';
begin
  select exists(select 1 from pg_extension where extname = 'pg_cron')
  into v_cron_installed;

  v_ensure_result := public.ensure_purge_expired_conversions_cron();

  select count(*), min(expires_at)
  into v_expired_conversion_count, v_oldest_expired_at
  from public.conversions
  where expires_at <= now();

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'conversions' and column_name = 'user_id'
  ) into v_has_user_id;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'conversions' and column_name = 'file_path'
  ) into v_has_file_path;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'conversions' and column_name = 'result_path'
  ) into v_has_result_path;

  if v_has_user_id and v_has_file_path then
    v_ref_conditions := v_ref_conditions || '((c.file_path is not null and c.file_path <> '''' and (c.user_id::text || ''/'' || c.file_path) = o.name))';
  end if;

  if v_has_result_path then
    if v_ref_conditions <> '' then
      v_ref_conditions := v_ref_conditions || ' or ';
    end if;
    v_ref_conditions := v_ref_conditions || '((c.result_path is not null and c.result_path <> '''' and c.result_path = o.name))';
  end if;

  if v_ref_conditions <> '' then
    execute format(
      $sql$
        select count(*)
        from storage.objects o
        where o.bucket_id = 'bank-statements'
          and o.created_at <= now() - interval '24 hours'
          and not exists (
            select 1
            from public.conversions c
            where %s
          )
      $sql$,
      v_ref_conditions
    )
    into v_orphan_storage_count;
  else
    select count(*)
    into v_orphan_storage_count
    from storage.objects o
    where o.bucket_id = 'bank-statements'
      and o.created_at <= now() - interval '24 hours';
  end if;

  return jsonb_build_object(
    'cron_installed', v_cron_installed,
    'cron_probe', v_ensure_result,
    'expired_conversion_count', v_expired_conversion_count,
    'oldest_expired_at', v_oldest_expired_at,
    'orphan_storage_count_older_than_24h', v_orphan_storage_count
  );
end;
$$;

-- Ensure the hourly retention job is present right now.
select public.ensure_purge_expired_conversions_cron();

-- Run one immediate cleanup pass so migration effect is visible instantly.
select public.purge_expired_conversions();
