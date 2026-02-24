do $$
declare
  v_user_id uuid;
begin
  select id into v_user_id
  from auth.users
  where email = 'inspirexali@gmail.com'
  limit 1;

  if v_user_id is not null then
    insert into public.user_roles (user_id, role)
    values (v_user_id, 'admin')
    on conflict (user_id, role) do nothing;
  end if;
end $$;
