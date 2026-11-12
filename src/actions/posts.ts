"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, invalid, safeAction, type ActionResult } from "@/lib/action";
import { defaultPrepDate, isISODate } from "@/lib/dates";
import { failWith } from "@/lib/db-errors";
import type { PostRow } from "@/lib/database.types";
import { fullName } from "@/lib/members";
import { FIELD_KEYS, importPostsText, type FieldKey, type ImportReport } from "@/lib/paste-import";
import { postMoveSchema, postSchema, postStatusSchema, type PostValues } from "@/lib/schemas";
import { actionContext } from "@/server/session";

const refresh = () => revalidatePath("/", "layout");

function toRow(values: PostValues) {
  return {
    ...values,
    autres_canaux: values.autres_canaux.filter((c) => c !== values.canal_principal),
    prep_date: values.prep_date ?? defaultPrepDate(values.date),
  };
}

async function loadPost(
  db: Awaited<ReturnType<typeof actionContext>>["db"],
  id: string,
): Promise<PostRow> {
  if (!z.uuid().safeParse(id).success) throw new ActionError("Post introuvable.");
  const { data } = await db.from("pc_posts").select("*").eq("id", id).maybeSingle();
  if (!data) throw new ActionError("Ce post n'existe plus. Recharge la page.");
  return data as PostRow;
}

/** Modifier un post : son responsable ou l'administrateur. */
function assertCanEdit(post: PostRow, ctx: { memberId: string | null; isAdmin: boolean }) {
  if (!ctx.isAdmin && (!ctx.memberId || post.responsable_id !== ctx.memberId))
    throw new ActionError("Tu ne peux modifier que les posts dont tu es responsable.");
}

export async function createPost(input: unknown): Promise<ActionResult<{ id: string }>> {
  return safeAction<{ id: string }>(async () => {
    const parsed = postSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { db, memberId, isAdmin } = await actionContext();
    const row = toRow(parsed.data);
    // Un membre crée pour lui-même ; seul l'admin attribue à quelqu'un d'autre.
    if (!isAdmin) row.responsable_id = memberId;
    const { data, error } = await db
      .from("pc_posts")
      .insert({ ...row, cree_par: memberId, maj_par: memberId })
      .select("id")
      .single();
    if (error || !data)
      failWith(error, "Impossible d'ajouter ce post. Vérifie les champs et réessaie.");
    refresh();
    return { ok: true, data: { id: data.id } };
  });
}

export async function updatePost(id: string, input: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    const parsed = postSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const ctx = await actionContext();
    const post = await loadPost(ctx.db, id);
    assertCanEdit(post, ctx);
    const row = toRow(parsed.data);
    if (!ctx.isAdmin) row.responsable_id = post.responsable_id; // seul l'admin réassigne
    const { error } = await ctx.db
      .from("pc_posts")
      .update({ ...row, maj_par: ctx.memberId })
      .eq("id", id);
    if (error) failWith(error, "Impossible d'enregistrer ce post. Réessaie.");
    refresh();
    return { ok: true };
  });
}

export async function setPostStatus(input: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    const parsed = postStatusSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const ctx = await actionContext();
    const post = await loadPost(ctx.db, parsed.data.id);
    assertCanEdit(post, ctx);
    const { error } = await ctx.db
      .from("pc_posts")
      .update({ statut: parsed.data.statut, maj_par: ctx.memberId })
      .eq("id", post.id);
    if (error) failWith(error, "Impossible de changer le statut. Réessaie.");
    refresh();
    return { ok: true };
  });
}

/** Déplace un post à une autre date (glisser-déposer). La préparation suit si elle était calculée par défaut. */
export async function movePost(input: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    const parsed = postMoveSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const ctx = await actionContext();
    const post = await loadPost(ctx.db, parsed.data.id);
    assertCanEdit(post, ctx);
    const followedDefault =
      post.prep_date === null || post.prep_date === defaultPrepDate(post.date);
    const { error } = await ctx.db
      .from("pc_posts")
      .update({
        date: parsed.data.date,
        maj_par: ctx.memberId,
        ...(followedDefault ? { prep_date: defaultPrepDate(parsed.data.date) } : {}),
      })
      .eq("id", post.id);
    if (error) failWith(error, "Impossible de déplacer ce post. Réessaie.");
    refresh();
    return { ok: true };
  });
}

export async function deletePost(id: string): Promise<ActionResult> {
  return safeAction(async () => {
    const { db } = await actionContext({ admin: true });
    if (!z.uuid().safeParse(id).success) throw new ActionError("Post introuvable.");
    const { error } = await db.from("pc_posts").delete().eq("id", id);
    if (error) failWith(error, "Impossible de supprimer ce post.");
    refresh();
    return { ok: true };
  });
}

/* ------------------------------- Import CSV (admin) ------------------------------- */

const importOptionsSchema = z
  .object({
    mapping: z.array(z.enum(FIELD_KEYS).nullable()).max(60).optional(),
    weekStart: z
      .string()
      .refine((v) => isISODate(v), "Date de départ invalide.")
      .nullish(),
  })
  .optional();

export async function importPosts(
  csv: string,
  dryRun: boolean,
  options?: { mapping?: (FieldKey | null)[]; weekStart?: string | null },
): Promise<ActionResult<ImportReport & { inserted: number }>> {
  return safeAction<ImportReport & { inserted: number }>(async () => {
    const { db, memberId } = await actionContext({ admin: true });
    if (typeof csv !== "string" || csv.trim().length === 0)
      throw new ActionError("Le texte est vide.");
    if (csv.length > 2_000_000) throw new ActionError("Le texte est trop gros (2 Mo maximum).");
    const parsedOptions = importOptionsSchema.safeParse(options);
    if (!parsedOptions.success) throw new ActionError("Réglages d'import invalides.");
    const opts = parsedOptions.data ?? {};

    const { data: members } = await db
      .from("pc_members")
      .select("id, prenom, nom")
      .eq("actif", true);
    const report = importPostsText(
      csv,
      (members ?? []).map((m) => ({ id: m.id, full_name: fullName(m), email: "" })),
      {
        mapping: opts.mapping,
        weekStart: opts.weekStart && isISODate(opts.weekStart) ? opts.weekStart : null,
      },
    );
    if (report.fatal) throw new ActionError(report.fatal);

    const valid = report.rows.filter((r) => r.post);
    if (dryRun) return { ok: true, data: { ...report, inserted: 0 } };
    if (valid.length === 0) throw new ActionError("Aucune ligne valide à importer.");

    // Le numéro est toujours attribué automatiquement, dans l'ordre du fichier.
    const rows = valid.map((r) => {
      const { numero, ...p } = r.post!;
      void numero;
      return { ...p, cree_par: memberId, maj_par: memberId };
    });
    const { error } = await db.from("pc_posts").insert(rows);
    if (error) failWith(error, "L'import a échoué : aucun post n'a été ajouté.");
    refresh();
    return { ok: true, data: { ...report, inserted: rows.length } };
  });
}
