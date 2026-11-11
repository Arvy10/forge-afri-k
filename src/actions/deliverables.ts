"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, invalid, safeAction, type ActionResult } from "@/lib/action";
import { failWith } from "@/lib/db-errors";
import type { DeliverableRow, TaskRow } from "@/lib/database.types";
import {
  deliverableFileSchema,
  deliverableLinkSchema,
  deliverableRegisterSchema,
} from "@/lib/schemas";
import { actionContext } from "@/server/session";

const BUCKET = "pc-livrables";
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const refresh = () => revalidatePath("/", "layout");

async function ownTask(
  ctx: Awaited<ReturnType<typeof actionContext>>,
  taskId: string,
): Promise<TaskRow> {
  const { data } = await ctx.db.from("pc_tasks").select("*").eq("id", taskId).maybeSingle();
  if (!data) throw new ActionError("Cette tâche n'existe plus. Recharge la page.");
  const task = data as TaskRow;
  if (!ctx.isAdmin && (!ctx.memberId || task.member_id !== ctx.memberId))
    throw new ActionError("Tu ne peux déposer des livrables que sur tes propres tâches.");
  return task;
}

const safeName = (name: string) =>
  name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(-80);

/** Livrable sous forme de lien (Drive, WeTransfer…). */
export async function addDeliverableLink(input: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    const parsed = deliverableLinkSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const ctx = await actionContext();
    await ownTask(ctx, parsed.data.task_id);
    const nom =
      parsed.data.nom ||
      (() => {
        try {
          return new URL(parsed.data.url).hostname;
        } catch {
          return "Lien";
        }
      })();
    const { error } = await ctx.db.from("pc_task_deliverables").insert({
      task_id: parsed.data.task_id,
      type: "lien",
      nom,
      url: parsed.data.url,
      depose_par: ctx.memberId,
    });
    if (error) failWith(error, "Impossible d'enregistrer ce lien. Réessaie.");
    refresh();
    return { ok: true };
  });
}

/** Étape 1 d'un envoi de fichier : le serveur autorise l'envoi (URL signée, courte durée). */
export async function prepareDeliverableUpload(
  input: unknown,
): Promise<ActionResult<{ path: string; token: string }>> {
  return safeAction<{ path: string; token: string }>(async () => {
    const parsed = deliverableFileSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    if (parsed.data.size_bytes > MAX_FILE_BYTES)
      throw new ActionError(
        "Ce fichier dépasse 50 Mo. Dépose-le sur Drive ou WeTransfer et colle le lien à la place.",
      );
    const ctx = await actionContext();
    await ownTask(ctx, parsed.data.task_id);
    const path = `${parsed.data.task_id}/${crypto.randomUUID()}-${safeName(parsed.data.file_name)}`;
    const { data, error } = await ctx.db.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data) throw new ActionError("Impossible de préparer l'envoi. Réessaie.");
    return { ok: true, data: { path, token: data.token } };
  });
}

/** Étape 3 : enregistre le livrable une fois le fichier envoyé. */
export async function registerDeliverableFile(input: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    const parsed = deliverableRegisterSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const ctx = await actionContext();
    await ownTask(ctx, parsed.data.task_id);
    if (!parsed.data.path.startsWith(`${parsed.data.task_id}/`))
      throw new ActionError("Chemin de fichier invalide.");
    const { error } = await ctx.db.from("pc_task_deliverables").insert({
      task_id: parsed.data.task_id,
      type: "fichier",
      nom: parsed.data.file_name,
      storage_path: parsed.data.path,
      taille_octets: parsed.data.size_bytes,
      depose_par: ctx.memberId,
    });
    if (error) {
      await ctx.db.storage.from(BUCKET).remove([parsed.data.path]);
      failWith(error, "Impossible d'enregistrer ce fichier. Réessaie.");
    }
    refresh();
    return { ok: true };
  });
}

/** Suppression : par la personne qui l'a déposé, ou par l'admin. */
export async function deleteDeliverable(id: string): Promise<ActionResult> {
  return safeAction(async () => {
    if (!z.uuid().safeParse(id).success) throw new ActionError("Livrable introuvable.");
    const ctx = await actionContext();
    const { data } = await ctx.db
      .from("pc_task_deliverables")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!data) throw new ActionError("Ce livrable n'existe plus.");
    const row = data as DeliverableRow;
    if (!ctx.isAdmin && (!ctx.memberId || row.depose_par !== ctx.memberId))
      throw new ActionError("Tu ne peux supprimer que les livrables que tu as déposés.");
    const { error } = await ctx.db.from("pc_task_deliverables").delete().eq("id", id);
    if (error) failWith(error, "Impossible de supprimer ce livrable.");
    if (row.storage_path) await ctx.db.storage.from(BUCKET).remove([row.storage_path]);
    refresh();
    return { ok: true };
  });
}
