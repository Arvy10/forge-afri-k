/** Constantes métier partagées (serveur, client, tests). Aucune dépendance React. */

export const TIMEZONE = "Africa/Brazzaville";
/** Brazzaville est à UTC+1 toute l'année (pas d'heure d'été). */
export const TZ_OFFSET = "+01:00";
export const DEFAULT_PUBLISH_TIME = "08:00";
export const PREP_DAYS_BEFORE = 2;
export const POSTS_PER_WEEK = 5;

export const CONTENT_TYPES = ["impact", "patrimoine", "coulisses", "fun", "appel_action"] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const CONTENT_TYPE_META: Record<
  ContentType,
  { label: string; weekday: 1 | 2 | 3 | 4 | 5; description: string }
> = {
  impact: {
    label: "Impact",
    weekday: 1,
    description: "L'avancement des projets : ce qui change concrètement.",
  },
  patrimoine: {
    label: "Patrimoine",
    weekday: 2,
    description: "Pointe-Noire, son histoire, ses lieux.",
  },
  coulisses: {
    label: "Coulisses",
    weekday: 3,
    description: "Les séances de travail, l'équipe en action.",
  },
  fun: {
    label: "Fun",
    weekday: 4,
    description: "L'humour et les moments légers.",
  },
  appel_action: {
    label: "Appel à l'action",
    weekday: 5,
    description: "Rejoindre, voter, soutenir.",
  },
};

export const CHANNELS = ["instagram", "tiktok", "facebook"] as const;
export type Channel = (typeof CHANNELS)[number];
export const CHANNEL_LABEL: Record<Channel, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
};

export const POST_FORMATS = [
  "video_9_16",
  "carrousel",
  "photo",
  "story",
  "texte",
  "autre",
] as const;
export type PostFormat = (typeof POST_FORMATS)[number];
export const POST_FORMAT_LABEL: Record<PostFormat, string> = {
  video_9_16: "Vidéo 9:16",
  carrousel: "Carrousel",
  photo: "Photo",
  story: "Story",
  texte: "Texte",
  autre: "Autre",
};

export const POST_STATUSES = ["a_faire", "en_cours", "pret_a_valider", "valide", "publie"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];
export const POST_STATUS_LABEL: Record<PostStatus, string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  pret_a_valider: "Prêt à valider",
  valide: "Validé",
  publie: "Publié",
};

export const TASK_STATUSES = ["a_faire", "en_cours", "fait"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  fait: "Fait",
};

export const TASK_PRIORITIES = ["normale", "haute"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  normale: "Normale",
  haute: "Haute",
};

export const DELIVERABLE_TYPES = ["fichier", "lien"] as const;
export type DeliverableType = (typeof DELIVERABLE_TYPES)[number];

export const TASKS_POLICIES = ["tous", "admin"] as const;
export type TasksPolicy = (typeof TASKS_POLICIES)[number];

/** Couleurs de pastille d'un membre : reprennent les couleurs des types de contenu. */
export const MEMBER_COLORS = ["vert", "orange", "sable", "bleu", "ambre"] as const;
export type MemberColor = (typeof MEMBER_COLORS)[number];
export const MEMBER_COLOR_LABEL: Record<MemberColor, string> = {
  vert: "Vert",
  orange: "Orange",
  sable: "Sable",
  bleu: "Bleu-gris",
  ambre: "Ambre",
};

export const ACTIVITY_KINDS = [
  "task_created",
  "task_done",
  "task_reopened",
  "deliverable_added",
  "nudge",
  "post_created",
  "post_published",
] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export const PROJECT_STATUSES = [
  "a_decider",
  "en_preparation",
  "etudes_en_preparation",
  "realise",
  "date_annoncee",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  a_decider: "À décider",
  en_preparation: "En préparation",
  etudes_en_preparation: "Études en préparation",
  realise: "Réalisé",
  date_annoncee: "Date annoncée",
};

export type MilestoneStatus = "realise" | "en_cours" | "a_venir";
