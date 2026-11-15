"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, safeAction, type ActionResult } from "@/lib/action";
import { failWith } from "@/lib/db-errors";
import { actionContext } from "@/server/session";

const refresh = () => revalidatePath("/", "layout");
const uuid = z.uuid();

/**
 * Ajoute des tâches habituelles de rôle à ses tâches (ou, pour l'administrateur, à celles d'un membre).
 * Une tâche déjà présente et pas encore faite n'est pas ajoutée deux fois.
 */
export async function addRoleTasks(
  roleTaskIds: unknown,
  memberId?: unknown,
): Promise<ActionResult<{ added: number; skipped: number }>> {
  return safeAction<{ added: number; skipped: number }>(async () => {
    const ids = z.array(uuid).min(1).max(40).safeParse(roleTaskIds);
    if (!ids.success) throw new ActionError("Choix de tâches invalide.");
    const target = memberId === undefined || memberId === null ? null : uuid.safeParse(memberId);
    if (target && !target.success) throw new ActionError("Membre introuvable.");

    const { db, auth, memberId: me, isAdmin } = await actionContext();
    const forMember = target?.data ?? me;
    if (!forMember) throw new ActionError("Choisis d'abord qui tu es.");
    if (forMember !== me && !isAdmin)
      throw new ActionError("Seul l'administrateur peut ajouter des tâches à quelqu'un d'autre.");
    if (auth.settings?.tasks_add_policy === "admin" && !isAdmin)
      throw new ActionError("L'administrateur a réservé l'ajout de tâches. Demande-lui.");

    const { data: templates } = await db
      .from("pc_role_tasks")
      .select("titre")
      .in("id", [...new Set(ids.data)]);
    const titles = [...new Set((templates ?? []).map((t) => t.titre))];
    if (titles.length === 0) throw new ActionError("Ces tâches n'existent plus.");

    const { data: open } = await db
      .from("pc_tasks")
      .select("titre")
      .eq("member_id", forMember)
      .neq("statut", "fait");
    const have = new Set((open ?? []).map((t) => t.titre));
    const rows = titles
      .filter((t) => !have.has(t))
      .map((titre) => ({ titre, member_id: forMember, cree_par: me, maj_par: me }));
    if (rows.length > 0) {
      const { error } = await db.from("pc_tasks").insert(rows);
      if (error) failWith(error, "Impossible d'ajouter ces tâches. Réessaie.");
    }
    refresh();
    return { ok: true, data: { added: rows.length, skipped: titles.length - rows.length } };
  });
}

/** Administrateur : ajoute une tâche habituelle à un rôle. */
export async function createRoleTask(roleId: unknown, titre: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    const r = uuid.safeParse(roleId);
    const t = z
      .string()
      .trim()
      .min(1, "Écris la tâche.")
      .max(200, "200 caractères maximum.")
      .safeParse(titre);
    if (!r.success) throw new ActionError("Rôle introuvable.");
    if (!t.success) throw new ActionError(t.error.issues[0]?.message ?? "Tâche invalide.");
    const { db } = await actionContext({ admin: true });
    const { data: last } = await db.from("pc_role_tasks").select("ordre").eq("role_id", r.data);
    const ordre = Math.max(0, ...(last ?? []).map((x) => x.ordre)) + 1;
    const { error } = await db
      .from("pc_role_tasks")
      .insert({ role_id: r.data, titre: t.data, ordre });
    if (error) {
      if (error.code === "23505") throw new ActionError("Cette tâche existe déjà pour ce rôle.");
      failWith(error, "Impossible d'ajouter cette tâche.");
    }
    refresh();
    return { ok: true };
  });
}

/** Administrateur : retire une tâche habituelle d'un rôle. */
export async function deleteRoleTask(id: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    const parsed = uuid.safeParse(id);
    if (!parsed.success) throw new ActionError("Tâche introuvable.");
    const { db } = await actionContext({ admin: true });
    const { error } = await db.from("pc_role_tasks").delete().eq("id", parsed.data);
    if (error) failWith(error, "Impossible de supprimer cette tâche.");
    refresh();
    return { ok: true };
  });
}
