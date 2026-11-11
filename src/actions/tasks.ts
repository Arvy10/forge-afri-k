"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, invalid, safeAction, type ActionResult } from "@/lib/action";
import { failWith } from "@/lib/db-errors";
import { isLate } from "@/lib/progress";
import { todayISO } from "@/lib/dates";
import { nudgeMessage } from "@/lib/nudge";
import type { TaskRow } from "@/lib/database.types";
import { nudgeSchema, taskSchema, taskStatusSchema } from "@/lib/schemas";
import { actionContext } from "@/server/session";

const refresh = () => revalidatePath("/", "layout");
const uuid = z.uuid();

async function loadTask(
  db: Awaited<ReturnType<typeof actionContext>>["db"],
  id: string,
): Promise<TaskRow> {
  if (!uuid.safeParse(id).success) throw new ActionError("Tâche introuvable.");
  const { data } = await db.from("pc_tasks").select("*").eq("id", id).maybeSingle();
  if (!data) throw new ActionError("Cette tâche n'existe plus. Recharge la page.");
  return data as TaskRow;
}

/** Ajout d'une tâche : à n'importe qui, sauf si l'admin a réservé l'ajout (réglage). */
export async function createTask(input: unknown): Promise<ActionResult<{ id: string }>> {
  return safeAction<{ id: string }>(async () => {
    const parsed = taskSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { db, auth, memberId, isAdmin } = await actionContext();
    if (auth.settings?.tasks_add_policy === "admin" && !isAdmin)
      throw new ActionError("L'administrateur a réservé l'ajout de tâches. Demande-lui.");
    const { data, error } = await db
      .from("pc_tasks")
      .insert({
        ...parsed.data,
        member_id: parsed.data.member_id ?? memberId,
        cree_par: memberId,
        maj_par: memberId,
      })
      .select("id")
      .single();
    if (error || !data) failWith(error, "Impossible d'ajouter cette tâche. Réessaie.");
    refresh();
    return { ok: true, data: { id: data.id } };
  });
}

/** Modification : par la personne concernée, par celle qui l'a créée, ou par l'admin. Réassigner = admin. */
export async function updateTask(id: string, input: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    const parsed = taskSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { db, memberId, isAdmin } = await actionContext();
    const task = await loadTask(db, id);
    const mine = !!memberId && (task.member_id === memberId || task.cree_par === memberId);
    if (!isAdmin && !mine) throw new ActionError("Tu ne peux modifier que tes propres tâches.");
    if (!isAdmin && (parsed.data.member_id ?? null) !== task.member_id)
      throw new ActionError("Seul l'administrateur peut réassigner une tâche.");
    const { error } = await db
      .from("pc_tasks")
      .update({ ...parsed.data, maj_par: memberId })
      .eq("id", id);
    if (error) failWith(error, "Impossible d'enregistrer cette tâche. Réessaie.");
    refresh();
    return { ok: true };
  });
}

/** Cocher / décocher : chacun coche ses propres tâches ; l'admin peut tout cocher. */
export async function setTaskStatus(input: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    const parsed = taskStatusSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { db, memberId, isAdmin } = await actionContext();
    const task = await loadTask(db, parsed.data.id);
    if (!isAdmin && (!memberId || task.member_id !== memberId))
      throw new ActionError("Tu ne peux cocher que tes propres tâches.");
    const { error } = await db
      .from("pc_tasks")
      .update({ statut: parsed.data.statut, maj_par: memberId })
      .eq("id", task.id);
    if (error) failWith(error, "Impossible de changer le statut. Réessaie.");
    refresh();
    return { ok: true };
  });
}

export async function deleteTask(id: string): Promise<ActionResult> {
  return safeAction(async () => {
    const { db } = await actionContext({ admin: true });
    if (!uuid.safeParse(id).success) throw new ActionError("Tâche introuvable.");
    const { error } = await db.from("pc_tasks").delete().eq("id", id);
    if (error) failWith(error, "Impossible de supprimer cette tâche.");
    refresh();
    return { ok: true };
  });
}

/** Relance : enregistrée, visible dans l'espace de la personne, et message prêt à copier pour WhatsApp. */
export async function nudgeTask(input: unknown): Promise<ActionResult<{ message: string }>> {
  return safeAction<{ message: string }>(async () => {
    const parsed = nudgeSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { db, auth, memberId } = await actionContext();
    const task = await loadTask(db, parsed.data.task_id);
    if (task.statut === "fait")
      throw new ActionError("Cette tâche est déjà faite : pas besoin de relancer.");
    if (task.member_id && task.member_id === memberId)
      throw new ActionError("C'est ta propre tâche : pas besoin de te relancer.");

    const { error } = await db
      .from("pc_nudges")
      .insert({ task_id: task.id, par_member_id: memberId, note: parsed.data.note });
    if (error) failWith(error, "Impossible d'enregistrer la relance. Réessaie.");

    const { data: target } = task.member_id
      ? await db.from("pc_members").select("prenom").eq("id", task.member_id).maybeSingle()
      : { data: null };
    const message = nudgeMessage({
      prenom: target?.prenom ?? "toi",
      titre: task.titre,
      echeance: task.echeance,
      late: isLate(task, todayISO()),
      par: auth.member?.prenom ?? null,
      note: parsed.data.note || undefined,
    });
    refresh();
    return { ok: true, data: { message } };
  });
}
