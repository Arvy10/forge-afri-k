-- =====================================================================
-- Données de départ. Idempotent : ne réécrit jamais ce que l'admin a modifié.
-- AUCUN post n'est créé : le calendrier démarre vide.
-- =====================================================================

-- Rôles du pôle ---------------------------------------------------------
insert into public.roles (slug, name, mission, sort_order) values
  ('ambassadeur', 'Ambassadeur du pôle', 'Coordonne le pôle, valide les contenus et fait le lien avec les autres pôles.', 1),
  ('copywriter',  'Copywriter',          'Rédige les légendes le jour même de la publication.', 2),
  ('visuels',     'Visuels',             'Crée les flyers, carrousels et affiches aux couleurs de Forge Afri''K.', 3),
  ('video',       'Vidéo',               'Tourne et monte les vidéos au format 9:16.', 4),
  ('publication', 'Publication',         'Programme et publie les posts à 8h00.', 5),
  ('communaute',  'Communauté',          'Répond aux commentaires et aux messages.', 6)
on conflict (slug) do nothing;

-- Règles et guide ------------------------------------------------------
insert into public.guide_sections (slug, titre, contenu, ordre) values
('a-faire', 'À faire', $md$
- Publier à 8h00, aux dates du calendrier
- Préparer 2 jours avant
- Faire valider le visuel puis le post par le pôle avant de publier
- Utiliser des images libres de droits ou filmer avec l'accord des personnes
- Citer la source d'une anecdote ou d'un fait historique
- Mettre à jour son statut dans le calendrier
$md$, 1),
('a-ne-pas-faire', 'À ne pas faire', $md$
- Annoncer une date pour la marche culturelle ou la matinée sportive avant qu'elle soit arrêtée
- Parler du retour de la mairie avant confirmation
- Promettre un avantage fiscal, une exclusivité ou l'usage d'un logo sans validation
- Filmer ou photographier des enfants sans accord
- Présenter les dessins de la salle de classe comme des plans d'exécution (ce sont des études d'intention)
- Lancer une collecte d'argent qui ne soit pas volontaire, transparente et documentée
$md$, 2),
('circuit-validation', 'Circuit de validation', $md$
1. **Rédaction de la légende** : le copywriter rédige le texte le jour même.
2. **Validation du visuel** : le visuel ou la vidéo est relu avant toute publication.
3. **Validation du pôle** : l'ambassadeur valide le post complet.
4. **Publication à 8h00** : la personne en charge de la publication programme et publie.
$md$, 3),
('rythme', 'Rythme de la semaine', $md$
Cinq posts par semaine, du lundi au vendredi :

- **Lundi — Impact** : l'avancement des projets.
- **Mardi — Patrimoine** : Pointe-Noire, son histoire, ses lieux.
- **Mercredi — Coulisses** : les séances de travail, l'équipe en action.
- **Jeudi — Fun** : l'humour et les moments légers.
- **Vendredi — Appel à l'action** : rejoindre, voter, soutenir.
$md$, 4),
('canaux-formats', 'Canaux et formats', $md$
Publication sur **Instagram**, **TikTok** et **Facebook**, à 8h00.

- **TikTok et Instagram** : vidéos en 9:16 d'abord, avec un carrousel photo de temps en temps.
- **Facebook** : photos d'abord, avec une vidéo de temps en temps.
$md$, 5),
('ton-de-voix', 'Ton de voix', $md$
Chaleureux, direct, tourné vers les jeunes et la communauté.

Faire alterner un contenu sérieux et un contenu léger.
$md$, 6),
('hashtags', 'Hashtags de base', $md$
`#ForgeAfriK` `#PointeNoire` `#Congo`
$md$, 7),
('quand-preparer', 'Quand préparer', $md$
Un post se prépare ou se filme **2 jours avant** sa publication.

Les posts du lundi se préparent le **dimanche**, pendant la réunion d'équipe.
$md$, 8)
on conflict (slug) do nothing;

-- Projets ---------------------------------------------------------------
insert into public.projects (slug, titre, statut, description, prudence, pole_pilote, date_label, ordre) values
('marche-culturelle', 'Marche culturelle à Pointe-Noire', 'en_preparation',
 'Événement de découverte, de sensibilisation, de rencontres et de mobilisation.',
 'Format, parcours et date non arrêtés : ne pas annoncer de date.', '', '', 1),
('matinee-sportive', 'Matinée sportive et citoyenne mensuelle', 'a_decider',
 'Marche, fitness, présentation des projets et dons volontaires.',
 'Cadence et créneau à décider : ne pas annoncer de date.', '', '', 2),
('salle-de-classe', 'Salle de classe rurale (« 7 Days to Build »)', 'etudes_en_preparation',
 'Trois pistes à l''étude : classe traversante, classe avec patio, classe modulaire.',
 'Études d''intention, sous réserve d''études techniques et d''autorisations. Ce ne sont pas des plans d''exécution.', '', '', 3),
('sponsoring', 'Dossier de sponsoring et partenariat', 'en_preparation',
 'Quatre formules : stratégique, événement, technique / matériel, média / institutionnel.',
 'Ne rien promettre (avantage fiscal, exclusivité, usage d''un logo) sans validation.', '', '', 4),
('initiative-quartier', 'Dossier d''initiative de quartier (Tié-Tié)', 'realise',
 'Dossier déposé en mairie.',
 'Date de dépôt et retour de la mairie à confirmer : ne pas en parler avant confirmation.', '', '', 5),
('summit', 'Forge Afri''K Summit', 'date_annoncee',
 'Le grand rassemblement de Forge Afri''K à Brazzaville.',
 '', '', '22 et 23 mai 2027', 6)
on conflict (slug) do nothing;

-- Frise de la feuille de route (objectifs de travail, pas des dates arrêtées) --
insert into public.milestones (periode, titre, description, statut, ordre, project_id)
select v.periode, v.titre, v.description, v.statut::public.milestone_status, v.ordre,
       (select id from public.projects where slug = v.project_slug)
from (values
  ('Oct. 2026',        'Formation',    'Séminaires des ambassadeurs.',               'realise', 1, null),
  ('Nov. 2026',        'Mobilisation', 'Dossier mairie et conception.',              'a_venir', 2, 'initiative-quartier'),
  ('Nov.-déc. 2026',   'Visibilité',   'Marche culturelle et sport mensuel.',        'a_venir', 3, 'marche-culturelle'),
  ('2027',             'Construire',   'Étude puis chantier « 7 Days to Build ».',   'a_venir', 4, 'salle-de-classe'),
  ('22-23 mai 2027',   'Rassembler',   'Summit à Brazzaville.',                      'a_venir', 5, 'summit')
) as v(periode, titre, description, statut, ordre, project_slug)
where not exists (select 1 from public.milestones);
