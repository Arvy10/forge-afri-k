"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, invalid, safeAction, type ActionResult } from "@/lib/action";
import { actionMember } from "@/lib/auth";
import { taskSchema, taskStatusSchema } from "@/lib/schemas";

const refresh = () => revalidatePath("/", "layout");

export async function createTask(input: unknown): Promise<ActionResult<{ id: string }>> {
  return safeAction<{ id: string }>(async () => {
    const parsed = taskSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { supabase, user, isAdmin } = await actionMember();
    const row = { ...parsed.data };
    if (!isAdmin) row.responsable_id = user.id; // un membre crée pour lui-même
    const { data, error } = await supabase
      .from("tasks")
      .insert({ ...row, created_by: user.id })
      .select("id")
      .single();
    if (error || !data) throw new ActionError("Impossible d'ajouter cette tâche. Réessaie.");
    refresh();
    return { ok: true, data: { id: data.id } };
  });
}

export async function updateTask(id: string, input: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    if (!z.uuid().safeParse(id).success) throw new ActionError("Tâche introuvable.");
    const parsed = taskSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { supabase, user, isAdmin } = await actionMember();
    const row = { ...parsed.data };
    if (!isAdmin) row.responsable_id = user.id;
    const { data, error } = await supabase.from("tasks").update(row).eq("id", id).select("id");
    if (error) throw new ActionError("Impossible d'enregistrer cette tâche. Réessaie.");
    if (!data || data.length === 0)
      throw new ActionError("Tu ne peux modifier que les tâches qui te sont assignées.");
    refresh();
    return { ok: true };
  });
}

export async function setTaskStatus(input: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    const parsed = taskStatusSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { supabase } = await actionMember();
    const { data, error } = await supabase
      .from("tasks")
      .update({ statut: parsed.data.statut })
      .eq("id", parsed.data.id)
      .select("id");
    if (error) throw new ActionError("Impossible de changer le statut. Réessaie.");
    if (!data || data.length === 0)
      throw new ActionError("Tu ne peux changer que le statut de tes propres tâches.");
    refresh();
    return { ok: true };
  });
}

export async function deleteTask(id: string): Promise<ActionResult> {
  return safeAction(async () => {
    if (!z.uuid().safeParse(id).success) throw new ActionError("Tâche introuvable.");
    const { supabase } = await actionMember();
    const { data, error } = await supabase.from("tasks").delete().eq("id", id).select("id");
    if (error || !data || data.length === 0)
      throw new ActionError(
        "Seul l'administrateur (ou toi, pour une tâche que tu t'es créée) peut supprimer une tâche.",
      );
    refresh();
    return { ok: true };
  });
}
