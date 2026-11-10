/**
 * Types de la base, écrits à la main d'après supabase/migrations/0001_init.sql.
 * (Remplaçables par `supabase gen types typescript` si tu utilises la CLI Supabase.)
 */
import type {
  AccessRole,
  Channel,
  ContentType,
  PostFormat,
  PostStatus,
  ProjectStatus,
  TaskPriority,
  TaskStatus,
} from "./constants";

export type MilestoneStatus = "realise" | "en_cours" | "a_venir";

export type ProfileRow = {
  id: string;
  email: string;
  full_name: string;
  avatar_path: string | null;
  bio: string;
  mission: string;
  does: string;
  does_not: string;
  whatsapp: string;
  access_role: AccessRole;
  active: boolean;
  onboarded: boolean;
  created_at: string;
  updated_at: string;
};
export type RoleRow = {
  id: string;
  slug: string;
  name: string;
  mission: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};
export type ProfileRoleRow = { profile_id: string; role_id: string; created_at: string };
export type PostRow = {
  id: string;
  numero: number;
  date: string;
  type: ContentType;
  canal_principal: Channel;
  autres_canaux: Channel[];
  format: PostFormat;
  idee: string;
  prep_date: string | null;
  heure: string;
  legende: string;
  responsable_id: string | null;
  statut: PostStatus;
  lien: string | null;
  notes: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};
export type PostStatusHistoryRow = {
  id: number;
  post_id: string;
  from_status: PostStatus | null;
  to_status: PostStatus;
  changed_by: string | null;
  changed_at: string;
};
export type TaskRow = {
  id: string;
  titre: string;
  description: string;
  responsable_id: string | null;
  echeance: string | null;
  priorite: TaskPriority;
  post_id: string | null;
  statut: TaskStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};
export type CommentRow = {
  id: string;
  post_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
  updated_at: string;
};
export type AttachmentRow = {
  id: string;
  post_id: string | null;
  task_id: string | null;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: string | null;
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
export type FeatureInterestRow = {
  profile_id: string;
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
      profiles: Table<ProfileRow, "id" | "email">;
      roles: Table<RoleRow, "slug" | "name">;
      profile_roles: Table<ProfileRoleRow, "profile_id" | "role_id">;
      posts: Table<PostRow, "date" | "type" | "canal_principal">;
      post_status_history: Table<PostStatusHistoryRow, "post_id" | "to_status">;
      tasks: Table<TaskRow, "titre">;
      comments: Table<CommentRow, "post_id" | "body">;
      attachments: Table<AttachmentRow, "storage_path" | "file_name">;
      guide_sections: Table<GuideSectionRow, "slug" | "titre">;
      projects: Table<ProjectRow, "slug" | "titre">;
      milestones: Table<MilestoneRow, "periode" | "titre">;
      feature_interests: Table<FeatureInterestRow, "profile_id" | "feature">;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
