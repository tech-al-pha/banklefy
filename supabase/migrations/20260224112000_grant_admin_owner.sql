do $$
declare
  v_user_id uuid;
begin
  select id into v_user_id
  from auth.users
  where email = 'inspirexali@gmail.com'
  limit 1;

  if v_user_id is not null then
    if not exists (
      select 1 from public.user_roles
      where user_id = v_user_id and role = 'admin'
    ) then
      insert into public.user_roles (user_id, role)
      values (v_user_id, 'admin');
    end if;
  end if;
end $$;
