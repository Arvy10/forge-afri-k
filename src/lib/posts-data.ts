import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CalendarQuery } from "./calendar-params";
import type { ISODate } from "./dates";
import type {
  AttachmentRow,
  CommentRow,
  Database,
  PostRow,
  PostStatusHistoryRow,
  TaskRow,
} from "./database.types";

type Client = SupabaseClient<Database>;

/** Posts d'une période, filtres appliqués côté base. */
export async function fetchPosts(
  supabase: Client,
  range: { from: ISODate; to: ISODate },
  query: Pick<CalendarQuery, "type" | "canal" | "statut" | "resp">,
  meId: string,
): Promise<PostRow[]> {
  let q = supabase
    .from("posts")
    .select("*")
    .gte("date", range.from)
    .lte("date", range.to)
    .order("date")
    .order("heure")
    .order("numero")
    .limit(500);
  if (query.type) q = q.eq("type", query.type);
  if (query.statut) q = q.eq("statut", query.statut);
  if (query.canal) q = q.or(`canal_principal.eq.${query.canal},autres_canaux.cs.{${query.canal}}`);
  if (query.resp) q = q.eq("responsable_id", query.resp === "moi" ? meId : query.resp);
  const { data, error } = await q;
  if (error) throw new Error(`Chargement des posts impossible : ${error.message}`);
  return (data ?? []) as PostRow[];
}

export type AttachmentView = AttachmentRow & { url: string | null };

export async function signAttachments(
  supabase: Client,
  rows: AttachmentRow[],
): Promise<AttachmentView[]> {
  if (rows.length === 0) return [];
  const { data } = await supabase.storage.from("attachments").createSignedUrls(
    rows.map((r) => r.storage_path),
    60 * 60,
  );
  const urls = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  return rows.map((r) => ({ ...r, url: urls.get(r.storage_path) ?? null }));
}

export type PostDetail = {
  post: PostRow;
  comments: CommentRow[];
  history: PostStatusHistoryRow[];
  tasks: TaskRow[];
  attachments: AttachmentView[];
};

export async function fetchPostDetail(supabase: Client, id: string): Promise<PostDetail | null> {
  const { data: post } = await supabase.from("posts").select("*").eq("id", id).maybeSingle();
  if (!post) return null;
  const [comments, history, tasks, attachments] = await Promise.all([
    supabase.from("comments").select("*").eq("post_id", id).order("created_at"),
    supabase
      .from("post_status_history")
      .select("*")
      .eq("post_id", id)
      .order("changed_at", { ascending: false }),
    supabase.from("tasks").select("*").eq("post_id", id).order("echeance", { nullsFirst: false }),
    supabase.from("attachments").select("*").eq("post_id", id).order("created_at"),
  ]);
  return {
    post: post as PostRow,
    comments: (comments.data ?? []) as CommentRow[],
    history: (history.data ?? []) as PostStatusHistoryRow[],
    tasks: (tasks.data ?? []) as TaskRow[],
    attachments: await signAttachments(supabase, (attachments.data ?? []) as AttachmentRow[]),
  };
}
