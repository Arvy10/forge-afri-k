"use server";

import { revalidatePath } from "next/cache";
import { ActionError, invalid, safeAction, type ActionResult } from "@/lib/action";
import { actionMember } from "@/lib/auth";
import { defaultPrepDate } from "@/lib/dates";
import type { PostRow } from "@/lib/database.types";
import { importPostsCsv, type ImportReport } from "@/lib/post-csv";
import {
  commentSchema,
  postMoveSchema,
  postSchema,
  postStatusSchema,
  type PostValues,
} from "@/lib/schemas";
import { z } from "zod";

const refresh = () => revalidatePath("/", "layout");

function toRow(values: PostValues) {
  return {
    ...values,
    autres_canaux: values.autres_canaux.filter((c) => c !== values.canal_principal),
    prep_date: values.prep_date ?? defaultPrepDate(values.date),
  };
}

export async function createPost(input: unknown): Promise<ActionResult<{ id: string }>> {
  return safeAction<{ id: string }>(async () => {
    const parsed = postSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { supabase, user, isAdmin } = await actionMember();
    const row = toRow(parsed.data);
    // Un membre crée pour lui-même ; seul l'admin attribue à quelqu'un d'autre.
    if (!isAdmin) row.responsable_id = user.id;
    const { data, error } = await supabase
      .from("posts")
      .insert({ ...row, created_by: user.id })
      .select("id")
      .single();
    if (error || !data)
      throw new ActionError("Impossible d'ajouter ce post. Vérifie les champs et réessaie.");
    refresh();
    return { ok: true, data: { id: data.id } };
  });
}

export async function updatePost(id: string, input: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    if (!z.uuid().safeParse(id).success) throw new ActionError("Post introuvable.");
    const parsed = postSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { supabase, user, isAdmin } = await actionMember();
    const row = toRow(parsed.data);
    if (!isAdmin) row.responsable_id = user.id; // la RLS l'exige aussi
    const { data, error } = await supabase.from("posts").update(row).eq("id", id).select("id");
    if (error) throw new ActionError("Impossible d'enregistrer ce post. Réessaie.");
    if (!data || data.length === 0)
      throw new ActionError("Tu ne peux modifier que les posts qui te sont assignés.");
    refresh();
    return { ok: true };
  });
}

export async function setPostStatus(input: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    const parsed = postStatusSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { supabase } = await actionMember();
    const { data, error } = await supabase
      .from("posts")
      .update({ statut: parsed.data.statut })
      .eq("id", parsed.data.id)
      .select("id");
    if (error) throw new ActionError("Impossible de changer le statut. Réessaie.");
    if (!data || data.length === 0)
      throw new ActionError("Tu ne peux changer que le statut de tes propres posts.");
    refresh();
    return { ok: true };
  });
}

/** Déplace un post à une autre date (glisser-déposer). La préparation suit si elle était calculée par défaut. */
export async function movePost(input: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    const parsed = postMoveSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { supabase } = await actionMember();
    const { data: current } = await supabase
      .from("posts")
      .select("id, date, prep_date")
      .eq("id", parsed.data.id)
      .maybeSingle();
    if (!current) throw new ActionError("Post introuvable.");
    const post = current as Pick<PostRow, "id" | "date" | "prep_date">;
    const followedDefault =
      post.prep_date === null || post.prep_date === defaultPrepDate(post.date);
    const { data, error } = await supabase
      .from("posts")
      .update({
        date: parsed.data.date,
        ...(followedDefault ? { prep_date: defaultPrepDate(parsed.data.date) } : {}),
      })
      .eq("id", post.id)
      .select("id");
    if (error) throw new ActionError("Impossible de déplacer ce post. Réessaie.");
    if (!data || data.length === 0)
      throw new ActionError("Tu ne peux déplacer que tes propres posts.");
    refresh();
    return { ok: true };
  });
}

export async function deletePost(id: string): Promise<ActionResult> {
  return safeAction(async () => {
    if (!z.uuid().safeParse(id).success) throw new ActionError("Post introuvable.");
    const { supabase } = await actionMember({ admin: true });
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) throw new ActionError("Impossible de supprimer ce post.");
    refresh();
    return { ok: true };
  });
}

export async function addComment(input: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    const parsed = commentSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { supabase, user } = await actionMember();
    const { error } = await supabase
      .from("comments")
      .insert({ post_id: parsed.data.post_id, body: parsed.data.body, author_id: user.id });
    if (error) throw new ActionError("Impossible d'envoyer le commentaire. Réessaie.");
    refresh();
    return { ok: true };
  });
}

export async function deleteComment(id: string): Promise<ActionResult> {
  return safeAction(async () => {
    if (!z.uuid().safeParse(id).success) throw new ActionError("Commentaire introuvable.");
    const { supabase } = await actionMember();
    const { data, error } = await supabase.from("comments").delete().eq("id", id).select("id");
    if (error || !data || data.length === 0)
      throw new ActionError("Tu ne peux supprimer que tes commentaires.");
    refresh();
    return { ok: true };
  });
}

/* ------------------------------- Import CSV (admin) ------------------------------- */

export async function importPosts(
  csv: string,
  dryRun: boolean,
): Promise<ActionResult<ImportReport & { inserted: number }>> {
  return safeAction<ImportReport & { inserted: number }>(async () => {
    const { supabase, user } = await actionMember({ admin: true });
    if (typeof csv !== "string" || csv.length === 0) throw new ActionError("Le fichier est vide.");
    if (csv.length > 2_000_000) throw new ActionError("Le fichier est trop gros (2 Mo maximum).");

    const { data: people } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("active", true);
    const report = importPostsCsv(csv, people ?? []);
    if (report.fatal) throw new ActionError(report.fatal);

    const valid = report.rows.filter((r) => r.post);
    if (dryRun) return { ok: true, data: { ...report, inserted: 0 } };
    if (valid.length === 0) throw new ActionError("Aucune ligne valide à importer.");

    // Le numéro est toujours attribué automatiquement, dans l'ordre du fichier.
    const rows = valid.map((r) => {
      const { numero, ...p } = r.post!;
      void numero;
      return { ...p, created_by: user.id };
    });
    const { error } = await supabase.from("posts").insert(rows);
    if (error) throw new ActionError("L'import a échoué : aucun post n'a été ajouté.");
    refresh();
    return { ok: true, data: { ...report, inserted: rows.length } };
  });
}
