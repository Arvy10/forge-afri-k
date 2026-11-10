-- Données de démonstration POUR LE FAUX SUPABASE LOCAL uniquement (jamais en production).
-- Mot de passe de tous les comptes : motdepasse-demo
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-0000000000a1', 'arvy@demo.local', '{"full_name":"Arvy"}'),
  ('00000000-0000-4000-8000-0000000000b1', 'marie@demo.local', '{"full_name":"Marie Nkodia"}'),
  ('00000000-0000-4000-8000-0000000000b2', 'paul@demo.local', '{"full_name":"Paul Mabiala"}')
on conflict do nothing;

update public.profiles set access_role = 'admin', onboarded = true, full_name = 'Arvy Zabidi',
  bio = 'Ambassadeur du pôle Communication & Réseau.', whatsapp = '+242 06 000 00 01'
  where id = '00000000-0000-4000-8000-0000000000a1';
update public.profiles set onboarded = true, full_name = 'Marie Nkodia', bio = 'Rédige les légendes.' where id = '00000000-0000-4000-8000-0000000000b1';
update public.profiles set onboarded = true, full_name = 'Paul Mabiala', bio = 'Tournage et montage.' where id = '00000000-0000-4000-8000-0000000000b2';

insert into public.profile_roles (profile_id, role_id)
select p.id, r.id from (values
  ('00000000-0000-4000-8000-0000000000a1'::uuid, 'ambassadeur'),
  ('00000000-0000-4000-8000-0000000000b1'::uuid, 'copywriter'),
  ('00000000-0000-4000-8000-0000000000b2'::uuid, 'video')
) as p(id, slug) join public.roles r on r.slug = p.slug on conflict do nothing;
