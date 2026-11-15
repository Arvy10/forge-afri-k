-- Les 8 domaines de travail du pôle, avec leurs sous-rôles.
-- Idempotent : peut être rejoué sans doublon. Ne retire aucun titulaire ; les 6 rôles de départ
-- ne changent que de « parent » (ils deviennent des sous-rôles du domaine correspondant).

-- 1) Les 8 domaines (rôles principaux)
insert into public.pc_roles (nom, mission, ne_fait_pas, ordre) values
  ('Photos et vidéos', 'Prend des photos et filme les activités, les réunions et les événements du pôle.', 'Ne monte pas les vidéos (voir Montage vidéo) et ne publie pas.', 10),
  ('Montage vidéo', 'Monte les vidéos filmées pour en faire des contenus prêts à publier.', 'Ne filme pas et n''écrit pas la légende.', 20),
  ('Création d''affiches', 'Réalise les affiches, les flyers et les autres visuels pour annoncer nos activités.', 'N''écrit pas les textes longs (voir Rédaction).', 30),
  ('Rédaction', 'Prépare les textes qui accompagnent les publications, les annonces et les affiches.', 'Ne crée pas les visuels et ne publie pas.', 40),
  ('Gestion des réseaux sociaux', 'S''occupe des pages Facebook, Instagram et TikTok : publie les contenus et répond aux commentaires et aux messages.', 'Ne fabrique pas les contenus (photos, vidéos, visuels).', 50),
  ('Calendrier éditorial', 'Organise les dates de publication et prépare à l''avance les contenus à publier.', 'Ne publie pas lui-même : il prévient et relance.', 60),
  ('Relations avec les médias', 'Contacte les médias, les radios, les pages d''information et les autres partenaires pour faire connaître nos activités.', 'Ne s''engage pas au nom du pôle sans l''accord de l''Ambassadeur.', 70),
  ('Suivi des publications', 'Vérifie que les contenus sont bien publiés, suit les réactions et s''assure que rien n''est oublié.', 'Ne modifie pas un post publié sans prévenir son responsable.', 80)
on conflict (nom) do nothing;

-- 2) Les rôles de départ rejoignent le domaine qui leur correspond (seulement s'ils n'ont pas déjà un parent)
update public.pc_roles c
   set parent_id = p.id
  from public.pc_roles p
 where c.parent_id is null
   and (c.nom, p.nom) in (
     ('Vidéo',       'Photos et vidéos'),
     ('Visuels',     'Création d''affiches'),
     ('Copywriter',  'Rédaction'),
     ('Publication', 'Gestion des réseaux sociaux'),
     ('Communauté',  'Gestion des réseaux sociaux')
   );

-- 3) Sous-rôles
insert into public.pc_roles (nom, mission, parent_id, ordre)
select s.nom, s.mission, p.id, s.ordre
  from (values
    ('Photos et vidéos', 'Photographe', 'Prend les photos des activités, des réunions et des événements, puis envoie les meilleures à l''équipe.', 1),
    ('Photos et vidéos', 'Cadreur / vidéaste', 'Filme en 9:16 : plans de lieux, coulisses, séances de travail, événements.', 2),
    ('Photos et vidéos', 'Interviews et micro-trottoirs', 'Pose les questions et mène les mini-interviews et micro-trottoirs prévus au calendrier.', 3),

    ('Montage vidéo', 'Monteur', 'Assemble les plans, coupe, règle le rythme et exporte la vidéo en 9:16.', 1),
    ('Montage vidéo', 'Sous-titres et musique', 'Ajoute les sous-titres et choisit une musique libre de droits.', 2),
    ('Montage vidéo', 'Miniatures et couvertures', 'Crée l''image de couverture de chaque vidéo.', 3),

    ('Création d''affiches', 'Affiches et flyers', 'Réalise les affiches et les flyers pour annoncer les activités et les événements.', 1),
    ('Création d''affiches', 'Visuels pour les réseaux', 'Crée les visuels des posts : photos, carrousels, sondages, stories.', 2),
    ('Création d''affiches', 'Modèles et charte visuelle', 'Garde les couleurs, le logo et des modèles réutilisables pour que tout soit cohérent.', 3),

    ('Rédaction', 'Scripts et scénarios', 'Écrit les idées, les scénarios et les questions des vidéos.', 1),
    ('Rédaction', 'Annonces et communiqués', 'Rédige les annonces, les messages aux partenaires et les textes des affiches.', 2),
    ('Rédaction', 'Relecture et orthographe', 'Relit chaque texte avant publication : fautes, ton, informations exactes.', 3),

    ('Gestion des réseaux sociaux', 'Page Facebook', 'Publie et anime la page Facebook : photos d''abord, vidéos si on en a.', 1),
    ('Gestion des réseaux sociaux', 'Compte Instagram', 'Publie et anime le compte Instagram : reels, carrousels, stories.', 2),
    ('Gestion des réseaux sociaux', 'Compte TikTok', 'Publie et anime le compte TikTok : vidéos en 9:16.', 3),

    ('Calendrier éditorial', 'Planification des dates', 'Place chaque post à sa date et garde le calendrier à jour.', 1),
    ('Calendrier éditorial', 'Préparation à l''avance', 'Vérifie que chaque contenu est prêt avant sa date de préparation et relance si besoin.', 2),
    ('Calendrier éditorial', 'Idées et thèmes de la semaine', 'Propose les thèmes et les idées de posts des semaines à venir.', 3),

    ('Relations avec les médias', 'Radios et télévisions', 'Contacte les radios et les télévisions pour faire connaître nos activités.', 1),
    ('Relations avec les médias', 'Pages d''information', 'Contacte les pages d''information et les créateurs de contenu locaux.', 2),
    ('Relations avec les médias', 'Partenaires et organisations', 'Garde le contact avec les partenaires et les organisations qui relaient nos activités.', 3),

    ('Suivi des publications', 'Vérification des publications', 'Contrôle chaque matin que les posts du jour sont bien publiés, à la bonne heure.', 1),
    ('Suivi des publications', 'Suivi des réactions', 'Note les commentaires, les partages et les chiffres, et signale ce qui marche.', 2),
    ('Suivi des publications', 'Bilan de la semaine', 'Prépare le petit bilan de la semaine pour la réunion d''équipe.', 3)
  ) as s(parent, nom, mission, ordre)
  join public.pc_roles p on p.nom = s.parent and p.parent_id is null
on conflict (nom) do nothing;
