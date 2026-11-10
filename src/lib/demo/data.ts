import {
  defaultPrepDate,
  addDaysISO,
  startOfWeekISO,
  defaultTypeForDate,
  type ISODate,
} from "../dates";
import type {
  AttachmentRow,
  CommentRow,
  GuideSectionRow,
  MilestoneRow,
  PostRow,
  PostStatusHistoryRow,
  ProfileRoleRow,
  ProfileRow,
  ProjectRow,
  RoleRow,
  TaskRow,
} from "../database.types";
import type { Channel, ContentType, PostFormat, PostStatus } from "../constants";
import type { DemoVariant } from "./mode";

export type DemoTables = {
  profiles: ProfileRow[];
  roles: RoleRow[];
  profile_roles: ProfileRoleRow[];
  posts: PostRow[];
  post_status_history: PostStatusHistoryRow[];
  tasks: TaskRow[];
  comments: CommentRow[];
  attachments: AttachmentRow[];
  guide_sections: GuideSectionRow[];
  projects: ProjectRow[];
  milestones: MilestoneRow[];
  feature_interests: never[];
};

export const DEMO_ADMIN_ID = "00000000-0000-4000-8000-0000000000a1";
const MARIE = "00000000-0000-4000-8000-0000000000b1";
const PAUL = "00000000-0000-4000-8000-0000000000b2";
const LEA = "00000000-0000-4000-8000-0000000000b3";
const NOW = "2026-01-01T08:00:00.000Z";

const id = (n: number, prefix = "c") =>
  `00000000-0000-4000-8000-${prefix}${String(n).padStart(11, "0")}`;
const role = (n: number, slug: string, name: string, mission: string): RoleRow => ({
  id: id(n, "d"),
  slug,
  name,
  mission,
  sort_order: n,
  created_at: NOW,
  updated_at: NOW,
});

/** Mêmes textes que supabase/seed.sql : c'est ce que le vrai site contient au départ. */
const ROLES: RoleRow[] = [
  role(
    1,
    "ambassadeur",
    "Ambassadeur du pôle",
    "Coordonne le pôle, valide les contenus et fait le lien avec les autres pôles.",
  ),
  role(2, "copywriter", "Copywriter", "Rédige les légendes le jour même de la publication."),
  role(
    3,
    "visuels",
    "Visuels",
    "Crée les flyers, carrousels et affiches aux couleurs de Forge Afri'K.",
  ),
  role(4, "video", "Vidéo", "Tourne et monte les vidéos au format 9:16."),
  role(5, "publication", "Publication", "Programme et publie les posts à 8h00."),
  role(6, "communaute", "Communauté", "Répond aux commentaires et aux messages."),
];

const section = (n: number, slug: string, titre: string, contenu: string): GuideSectionRow => ({
  id: id(n, "e"),
  slug,
  titre,
  contenu: contenu.trim(),
  ordre: n,
  created_at: NOW,
  updated_at: NOW,
});

const GUIDE: GuideSectionRow[] = [
  section(
    1,
    "a-faire",
    "À faire",
    `
- Publier à 8h00, aux dates du calendrier
- Préparer 2 jours avant
- Faire valider le visuel puis le post par le pôle avant de publier
- Utiliser des images libres de droits ou filmer avec l'accord des personnes
- Citer la source d'une anecdote ou d'un fait historique
- Mettre à jour son statut dans le calendrier`,
  ),
  section(
    2,
    "a-ne-pas-faire",
    "À ne pas faire",
    `
- Annoncer une date pour la marche culturelle ou la matinée sportive avant qu'elle soit arrêtée
- Parler du retour de la mairie avant confirmation
- Promettre un avantage fiscal, une exclusivité ou l'usage d'un logo sans validation
- Filmer ou photographier des enfants sans accord
- Présenter les dessins de la salle de classe comme des plans d'exécution (ce sont des études d'intention)
- Lancer une collecte d'argent qui ne soit pas volontaire, transparente et documentée`,
  ),
  section(
    3,
    "circuit-validation",
    "Circuit de validation",
    `
1. **Rédaction de la légende** : le copywriter rédige le texte le jour même.
2. **Validation du visuel** : le visuel ou la vidéo est relu avant toute publication.
3. **Validation du pôle** : l'ambassadeur valide le post complet.
4. **Publication à 8h00** : la personne en charge de la publication programme et publie.`,
  ),
  section(
    4,
    "rythme",
    "Rythme de la semaine",
    `
Cinq posts par semaine, du lundi au vendredi :

- **Lundi — Impact** : l'avancement des projets.
- **Mardi — Patrimoine** : Pointe-Noire, son histoire, ses lieux.
- **Mercredi — Coulisses** : les séances de travail, l'équipe en action.
- **Jeudi — Fun** : l'humour et les moments légers.
- **Vendredi — Appel à l'action** : rejoindre, voter, soutenir.`,
  ),
  section(
    5,
    "canaux-formats",
    "Canaux et formats",
    `
Publication sur **Instagram**, **TikTok** et **Facebook**, à 8h00.

- **TikTok et Instagram** : vidéos en 9:16 d'abord, avec un carrousel photo de temps en temps.
- **Facebook** : photos d'abord, avec une vidéo de temps en temps.`,
  ),
  section(
    6,
    "ton-de-voix",
    "Ton de voix",
    `
Chaleureux, direct, tourné vers les jeunes et la communauté.

Faire alterner un contenu sérieux et un contenu léger.`,
  ),
  section(7, "hashtags", "Hashtags de base", "`#ForgeAfriK` `#PointeNoire` `#Congo`"),
  section(
    8,
    "quand-preparer",
    "Quand préparer",
    `
Un post se prépare ou se filme **2 jours avant** sa publication.

Les posts du lundi se préparent le **dimanche**, pendant la réunion d'équipe.`,
  ),
];

const project = (
  n: number,
  slug: string,
  titre: string,
  statut: ProjectRow["statut"],
  description: string,
  prudence: string,
  date_label = "",
): ProjectRow => ({
  id: id(n, "f"),
  slug,
  titre,
  statut,
  description,
  prudence,
  pole_pilote: "",
  date_label,
  ordre: n,
  created_at: NOW,
  updated_at: NOW,
});

const PROJECTS: ProjectRow[] = [
  project(
    1,
    "marche-culturelle",
    "Marche culturelle à Pointe-Noire",
    "en_preparation",
    "Événement de découverte, de sensibilisation, de rencontres et de mobilisation.",
    "Format, parcours et date non arrêtés : ne pas annoncer de date.",
  ),
  project(
    2,
    "matinee-sportive",
    "Matinée sportive et citoyenne mensuelle",
    "a_decider",
    "Marche, fitness, présentation des projets et dons volontaires.",
    "Cadence et créneau à décider : ne pas annoncer de date.",
  ),
  project(
    3,
    "salle-de-classe",
    "Salle de classe rurale (« 7 Days to Build »)",
    "etudes_en_preparation",
    "Trois pistes à l'étude : classe traversante, classe avec patio, classe modulaire.",
    "Études d'intention, sous réserve d'études techniques et d'autorisations. Ce ne sont pas des plans d'exécution.",
  ),
  project(
    4,
    "sponsoring",
    "Dossier de sponsoring et partenariat",
    "en_preparation",
    "Quatre formules : stratégique, événement, technique / matériel, média / institutionnel.",
    "Ne rien promettre (avantage fiscal, exclusivité, usage d'un logo) sans validation.",
  ),
  project(
    5,
    "initiative-quartier",
    "Dossier d'initiative de quartier (Tié-Tié)",
    "realise",
    "Dossier déposé en mairie.",
    "Date de dépôt et retour de la mairie à confirmer : ne pas en parler avant confirmation.",
  ),
  project(
    6,
    "summit",
    "Forge Afri'K Summit",
    "date_annoncee",
    "Le grand rassemblement de Forge Afri'K à Brazzaville.",
    "",
    "22 et 23 mai 2027",
  ),
];

const milestone = (
  n: number,
  periode: string,
  titre: string,
  description: string,
  statut: MilestoneRow["statut"],
): MilestoneRow => ({
  id: id(n, "a"),
  project_id: null,
  periode,
  titre,
  description,
  statut,
  ordre: n,
  created_at: NOW,
  updated_at: NOW,
});

const MILESTONES: MilestoneRow[] = [
  milestone(1, "Oct. 2026", "Formation", "Séminaires des ambassadeurs.", "realise"),
  milestone(2, "Nov. 2026", "Mobilisation", "Dossier mairie et conception.", "a_venir"),
  milestone(3, "Nov.-déc. 2026", "Visibilité", "Marche culturelle et sport mensuel.", "a_venir"),
  milestone(4, "2027", "Construire", "Étude puis chantier « 7 Days to Build ».", "a_venir"),
  milestone(5, "22-23 mai 2027", "Rassembler", "Summit à Brazzaville.", "a_venir"),
];

const profile = (
  pid: string,
  full_name: string,
  email: string,
  extra: Partial<ProfileRow> = {},
): ProfileRow => ({
  id: pid,
  email,
  full_name,
  avatar_path: null,
  bio: "",
  mission: "",
  does: "",
  does_not: "",
  whatsapp: "",
  access_role: "member",
  active: true,
  onboarded: true,
  created_at: NOW,
  updated_at: NOW,
  ...extra,
});

const ARVY = profile(DEMO_ADMIN_ID, "Arvy", "arvy@exemple.invalid", {
  access_role: "admin",
  bio: "Ambassadeur du pôle Communication & Réseau.",
  mission: "Coordonner le pôle, valider les contenus, faire le lien avec les autres pôles.",
});

type PostSeed = {
  offset: number; // jours depuis le lundi de la semaine courante
  idee: string;
  canal: Channel;
  autres: Channel[];
  format: PostFormat;
  resp: string;
  statut: PostStatus;
  legende?: string;
};

const POST_SEEDS: PostSeed[] = [
  {
    offset: 0,
    idee: "Avancement du dossier de sponsoring : ce qu'on prépare",
    canal: "instagram",
    autres: ["tiktok", "facebook"],
    format: "video_9_16",
    resp: MARIE,
    statut: "publie",
    legende:
      "Le dossier de sponsoring prend forme. Quatre formules pour s'engager à nos côtés. #ForgeAfriK #PointeNoire #Congo",
  },
  {
    offset: 1,
    idee: "Un lieu de Pointe-Noire à (re)découvrir",
    canal: "tiktok",
    autres: ["instagram"],
    format: "video_9_16",
    resp: PAUL,
    statut: "publie",
  },
  {
    offset: 2,
    idee: "La séance de travail de l'équipe en photos",
    canal: "instagram",
    autres: ["facebook"],
    format: "carrousel",
    resp: MARIE,
    statut: "en_cours",
  },
  {
    offset: 3,
    idee: "Le quiz des ambassadeurs : qui connaît le mieux la ville ?",
    canal: "tiktok",
    autres: ["instagram"],
    format: "video_9_16",
    resp: PAUL,
    statut: "a_faire",
  },
  {
    offset: 4,
    idee: "Rejoins le pôle Communication & Réseau",
    canal: "facebook",
    autres: ["instagram", "tiktok"],
    format: "photo",
    resp: DEMO_ADMIN_ID,
    statut: "pret_a_valider",
  },
  {
    offset: 7,
    idee: "Point d'étape sur les projets du mois",
    canal: "instagram",
    autres: ["tiktok", "facebook"],
    format: "video_9_16",
    resp: LEA,
    statut: "a_faire",
  },
  {
    offset: 8,
    idee: "Place de la gare : un siècle d'histoire",
    canal: "facebook",
    autres: [],
    format: "photo",
    resp: PAUL,
    statut: "a_faire",
  },
  {
    offset: 9,
    idee: "Les coulisses du tournage",
    canal: "tiktok",
    autres: ["instagram"],
    format: "video_9_16",
    resp: MARIE,
    statut: "a_faire",
  },
];

export function buildDemoTables(variant: DemoVariant, today: ISODate): DemoTables {
  const base: DemoTables = {
    profiles: [ARVY],
    roles: ROLES,
    profile_roles: [{ profile_id: DEMO_ADMIN_ID, role_id: ROLES[0]!.id, created_at: NOW }],
    posts: [],
    post_status_history: [],
    tasks: [],
    comments: [],
    attachments: [],
    guide_sections: GUIDE,
    projects: PROJECTS,
    milestones: MILESTONES,
    feature_interests: [],
  };
  if (variant === "vide") return base;

  const monday = startOfWeekISO(today);
  const iso = (n: number) => addDaysISO(monday, n);

  const members = [
    ARVY,
    profile(MARIE, "Marie (exemple)", "marie@exemple.invalid", {
      bio: "Rédige les légendes.",
      whatsapp: "+242 06 000 00 02",
      mission: "Écrire des légendes claires et chaleureuses.",
      does: "Légendes, relecture, ton de voix.",
      does_not: "Montage vidéo.",
    }),
    profile(PAUL, "Paul (exemple)", "paul@exemple.invalid", {
      bio: "Tournage et montage des vidéos.",
      whatsapp: "+242 06 000 00 03",
      mission: "Tourner et monter les vidéos 9:16.",
      does: "Tournage, montage, sous-titres.",
      does_not: "Rédaction des légendes.",
    }),
    profile(LEA, "Léa (exemple)", "lea@exemple.invalid", { bio: "Visuels et carrousels." }),
  ];
  const links: ProfileRoleRow[] = [
    { profile_id: DEMO_ADMIN_ID, role_id: ROLES[0]!.id, created_at: NOW },
    { profile_id: MARIE, role_id: ROLES[1]!.id, created_at: NOW },
    { profile_id: PAUL, role_id: ROLES[3]!.id, created_at: NOW },
    { profile_id: LEA, role_id: ROLES[2]!.id, created_at: NOW },
  ];

  const posts: PostRow[] = POST_SEEDS.map((s, i) => {
    const date = iso(s.offset);
    return {
      id: id(i + 1, "1"),
      numero: i + 1,
      date,
      type: (defaultTypeForDate(date) ?? "impact") as ContentType,
      canal_principal: s.canal,
      autres_canaux: s.autres,
      format: s.format,
      idee: s.idee,
      prep_date: defaultPrepDate(date),
      heure: "08:00:00",
      legende: s.legende ?? "",
      responsable_id: s.resp,
      statut: s.statut,
      lien: s.statut === "publie" ? "https://exemple.org/post" : null,
      notes: "",
      created_by: DEMO_ADMIN_ID,
      created_at: NOW,
      updated_at: NOW,
    };
  });

  const tasks: TaskRow[] = [
    {
      titre: "Rédiger la légende du post Coulisses",
      resp: MARIE,
      due: addDaysISO(today, 0),
      prio: "haute",
      statut: "en_cours",
      post: posts[2]!.id,
    },
    {
      titre: "Valider le visuel de l'appel à l'action",
      resp: DEMO_ADMIN_ID,
      due: addDaysISO(today, 1),
      prio: "haute",
      statut: "a_faire",
      post: posts[4]!.id,
    },
    {
      titre: "Relire le dossier de sponsoring",
      resp: DEMO_ADMIN_ID,
      due: addDaysISO(today, 3),
      prio: "normale",
      statut: "en_cours",
      post: null,
    },
    {
      titre: "Filmer le quiz des ambassadeurs",
      resp: PAUL,
      due: addDaysISO(today, 1),
      prio: "normale",
      statut: "a_faire",
      post: posts[3]!.id,
    },
    {
      titre: "Préparer les carrousels de la semaine prochaine",
      resp: LEA,
      due: addDaysISO(today, -1),
      prio: "normale",
      statut: "a_faire",
      post: null,
    },
    {
      titre: "Mettre à jour la liste des hashtags",
      resp: DEMO_ADMIN_ID,
      due: null,
      prio: "normale",
      statut: "valide",
      post: null,
    },
  ].map((t, i) => ({
    id: id(i + 1, "2"),
    titre: t.titre,
    description: "",
    responsable_id: t.resp,
    echeance: t.due,
    priorite: t.prio as TaskRow["priorite"],
    post_id: t.post,
    statut: t.statut as TaskRow["statut"],
    created_by: DEMO_ADMIN_ID,
    created_at: NOW,
    updated_at: NOW,
  }));

  const history: PostStatusHistoryRow[] = posts.map((p, i) => ({
    id: i + 1,
    post_id: p.id,
    from_status: null,
    to_status: "a_faire",
    changed_by: DEMO_ADMIN_ID,
    changed_at: NOW,
  }));

  const comments: CommentRow[] = [
    {
      id: id(1, "3"),
      post_id: posts[2]!.id,
      author_id: PAUL,
      body: "J'ai les photos du mardi, je les envoie ce soir.",
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: id(2, "3"),
      post_id: posts[2]!.id,
      author_id: MARIE,
      body: "Parfait, je rédige la légende demain matin.",
      created_at: NOW,
      updated_at: NOW,
    },
  ];

  return {
    ...base,
    profiles: members,
    profile_roles: links,
    posts,
    post_status_history: history,
    tasks,
    comments,
  };
}
