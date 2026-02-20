-- Harden 24h retention cleanup:
-- 1) keep existing expired conversion purge
-- 2) also remove orphan storage objects older than 24 hours

create or replace function public.purge_expired_conversions()
returns void
language plpgsql
security definer
set search_path = public, storage
as $$
begin
  -- Delete original uploads linked to expired conversions
  delete from storage.objects
  where bucket_id = 'bank-statements'
    and name in (
      select distinct (user_id::text || '/' || file_path)
      from public.conversions
      where expires_at <= now()
        and file_path is not null
        and file_path <> ''
    );

  -- Delete generated results linked to expired conversions
  delete from storage.objects
  where bucket_id = 'bank-statements'
    and name in (
      select distinct result_path
      from public.conversions
      where expires_at <= now()
        and result_path is not null
        and result_path <> ''
    );

  -- Delete expired conversion rows (cascades to related tables)
  delete from public.conversions
  where expires_at <= now();

  -- Delete orphan files older than 24h that are not referenced by any conversion
  delete from storage.objects o
  where o.bucket_id = 'bank-statements'
    and o.created_at <= now() - interval '24 hours'
    and not exists (
      select 1
      from public.conversions c
      where (c.file_path is not null and c.file_path <> '' and (c.user_id::text || '/' || c.file_path) = o.name)
         or (c.result_path is not null and c.result_path <> '' and c.result_path = o.name)
    );
end;
$$;
