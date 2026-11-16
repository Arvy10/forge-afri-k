/**
 * Types de la base V2 (tables pc_*), écrits à la main d'après supabase/migrations.
 */
import type {
  ActivityKind,
  ContentType,
  DeliverableType,
  MemberColor,
  MilestoneStatus,
  PostStatus,
  ProjectStatus,
  TaskPriority,
  TaskStatus,
  TasksPolicy,
} from "./constants";

export type MemberRow = {
  id: string;
  prenom: string;
  nom: string | null;
  couleur: MemberColor;
  photo_path: string | null;
  actif: boolean;
  /** Consulte tout sans travailler dans l'équipe (pas de tâches, pas de rôle). */
  observateur: boolean;
  ordre: number;
  created_at: string;
  updated_at: string;
};
export type RoleRow = {
  id: string;
  nom: string;
  parent_id: string | null;
  mission: string;
  ne_fait_pas: string;
  ordre: number;
  created_at: string;
  updated_at: string;
};
export type InfoRow = {
  id: string;
  titre: string;
  contenu: string;
  epingle: boolean;
  created_at: string;
  updated_at: string;
};
export type RoleTaskRow = {
  id: string;
  role_id: string;
  titre: string;
  ordre: number;
  created_at: string;
  updated_at: string;
};
export type NotificationKind = "relance" | "message";
export type NotificationRow = {
  id: string;
  member_id: string;
  de_member_id: string | null;
  kind: NotificationKind;
  task_id: string | null;
  texte: string;
  lu_le: string | null;
  created_at: string;
};
export type MemberRoleRow = { member_id: string; role_id: string; created_at: string };

export type SlotMoment = "matin" | "soir";
export type SlotPriority = "obligatoire" | "facultatif";

export type DayRow = {
  id: string;
  numero: number;
  date: string;
  jour: string;
  semaine: number;
  theme_semaine: string;
  type_de_contenu: ContentType;
  consigne_du_jour: string;
  created_at: string;
  updated_at: string;
};

/** Un créneau de publication : le post obligatoire ou le petit post facultatif d'un jour. */
export type SlotRow = {
  id: string;
  day_id: string;
  moment: SlotMoment;
  heure: string;
  priorite: SlotPriority;
  genre: string;
  titre: string;
  idee: string;
  comment_faire: string[];
  accroche: string | null;
  legende: string | null;
  /** Un format par réseau : { tiktok, instagram, facebook }. */
  formats: Record<string, string>;
  a_preparer_le: string | null;
  responsable_id: string | null;
  statut: PostStatus;
  lien: string | null;
  cree_par: string | null;
  maj_par: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskRow = {
  id: string;
  titre: string;
  description: string;
  member_id: string | null;
  echeance: string | null;
  priorite: TaskPriority;
  statut: TaskStatus;
  slot_id: string | null;
  fait_le: string | null;
  cree_par: string | null;
  maj_par: string | null;
  created_at: string;
  updated_at: string;
};

export type DeliverableRow = {
  id: string;
  task_id: string;
  type: DeliverableType;
  nom: string;
  url: string | null;
  storage_path: string | null;
  taille_octets: number | null;
  depose_par: string | null;
  created_at: string;
};

export type NudgeRow = {
  id: string;
  task_id: string;
  par_member_id: string | null;
  note: string;
  created_at: string;
};

export type ActivityRow = {
  id: number;
  kind: ActivityKind;
  member_id: string | null;
  cible_id: string | null;
  task_id: string | null;
  slot_id: string | null;
  libelle: string;
  created_at: string;
};

export type GuideSectionRow = {
  id: string;
  slug: string;
  titre: string;
  contenu: string;
  ordre: number;
  created_at: string;
  updated_at: string;
};
export type ProjectRow = {
  id: string;
  slug: string;
  titre: string;
  statut: ProjectStatus;
  description: string;
  prudence: string;
  pole_pilote: string;
  date_label: string;
  ordre: number;
  created_at: string;
  updated_at: string;
};
export type MilestoneRow = {
  id: string;
  project_id: string | null;
  periode: string;
  titre: string;
  description: string;
  statut: MilestoneStatus;
  ordre: number;
  created_at: string;
  updated_at: string;
};
export type SettingsRow = {
  id: boolean;
  tasks_add_policy: TasksPolicy;
  code_hash: string | null;
  code_version: number;
  updated_at: string;
};
export type LoginAttemptRow = {
  ip_hash: string;
  kind: "access" | "admin";
  tries: number;
  window_start: string;
  locked_until: string | null;
};
export type FeatureInterestRow = {
  member_id: string;
  feature: "bibliotheque" | "reunions" | "resultats";
  created_at: string;
};

type Table<Row, Required extends keyof Row = never> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required>>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      pc_members: Table<MemberRow, "prenom">;
      pc_roles: Table<RoleRow, "nom">;
      pc_member_roles: Table<MemberRoleRow, "member_id" | "role_id">;
      pc_days: Table<DayRow, "numero" | "date" | "jour" | "semaine" | "type_de_contenu">;
      pc_slots: Table<SlotRow, "day_id" | "moment" | "heure" | "priorite" | "titre">;
      pc_tasks: Table<TaskRow, "titre">;
      pc_task_deliverables: Table<DeliverableRow, "task_id" | "type" | "nom">;
      pc_nudges: Table<NudgeRow, "task_id">;
      pc_activity: Table<ActivityRow, "kind">;
      pc_guide_sections: Table<GuideSectionRow, "slug" | "titre">;
      pc_projects: Table<ProjectRow, "slug" | "titre">;
      pc_milestones: Table<MilestoneRow, "periode" | "titre">;
      pc_settings: Table<SettingsRow>;
      pc_infos: Table<InfoRow, "titre">;
      pc_notifications: Table<NotificationRow, "member_id" | "kind" | "texte">;
      pc_role_tasks: Table<RoleTaskRow, "role_id" | "titre">;
      pc_login_attempts: Table<LoginAttemptRow, "ip_hash" | "kind">;
      pc_feature_interests: Table<FeatureInterestRow, "member_id" | "feature">;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
