-- =====================================================================
-- Promouvoir un utilisateur en administrateur (ambassadeur du pôle).
--
-- 1. Crée d'abord l'utilisateur : Supabase > Authentication > Users > Add user
--    (e-mail + mot de passe, cocher « Auto Confirm User »).
-- 2. Remplace l'adresse ci-dessous par la tienne.
-- 3. Colle ce script dans Supabase > SQL Editor et lance-le.
-- =====================================================================
do $$
declare
  admin_email constant text := 'REMPLACE-MOI@exemple.com';
  uid uuid;
begin
  select id into uid from auth.users where lower(email) = lower(admin_email);
  if uid is null then
    raise exception 'Aucun utilisateur avec l''adresse % : crée-le d''abord dans Authentication > Users.', admin_email;
  end if;

  insert into public.profiles (id, email, full_name)
  values (uid, admin_email, 'Arvy')
  on conflict (id) do nothing;

  update public.profiles
     set access_role = 'admin', active = true, full_name = case when full_name = '' then 'Arvy' else full_name end
   where id = uid;

  insert into public.profile_roles (profile_id, role_id)
  select uid, id from public.roles where slug = 'ambassadeur'
  on conflict do nothing;

  raise notice 'OK : % est maintenant administrateur.', admin_email;
end $$;
