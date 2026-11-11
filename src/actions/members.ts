"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, invalid, safeAction, type ActionResult } from "@/lib/action";
import { MEMBER_COLORS } from "@/lib/constants";
import { failWith } from "@/lib/db-errors";
import { memberSchema, roleSchema } from "@/lib/schemas";
import { actionContext } from "@/server/session";

const refresh = () => revalidatePath("/", "layout");
const uuid = z.uuid();

/** « Marie Dupont » → prénom Marie, nom Dupont. */
function splitName(raw: string): { prenom: string; nom: string | null } {
  const [prenom, ...rest] = raw.trim().replace(/\s+/g, " ").split(" ");
  return { prenom: prenom ?? "", nom: rest.length > 0 ? rest.join(" ") : null };
}

/** Ajout rapide : une liste de prénoms, ajoutés d'un coup. Couleurs attribuées à tour de rôle. */
export async function addMembersQuick(names: unknown): Promise<ActionResult<{ added: number }>> {
  return safeAction<{ added: number }>(async () => {
    const parsed = z
      .array(z.string().trim().min(1).max(100))
      .min(1, "Tape au moins un prénom.")
      .max(40, "40 prénoms à la fois, au maximum.")
      .safeParse(names);
    if (!parsed.success) return invalid(parsed.error);
    const { db } = await actionContext({ admin: true });

    const { data: existing } = await db.from("pc_members").select("ordre");
    let ordre = Math.max(0, ...(existing ?? []).map((m) => m.ordre)) + 1;
    let colorIndex = (existing ?? []).length;
    const rows = parsed.data.map((n) => ({
      ...splitName(n),
      couleur: MEMBER_COLORS[colorIndex++ % MEMBER_COLORS.length]!,
      ordre: ordre++,
    }));

    const { error } = await db.from("pc_members").insert(rows);
    if (error) failWith(error, "Impossible d'ajouter ces membres. Réessaie.");
    refresh();
    return { ok: true, data: { added: rows.length } };
  });
}

/** Modifie un membre : nom, couleur et rôles (plusieurs possibles). */
export async function saveMember(id: string, input: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    if (!uuid.safeParse(id).success) throw new ActionError("Membre introuvable.");
    const parsed = memberSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { db } = await actionContext({ admin: true });
    const { role_ids, nom, ...fields } = parsed.data;

    const { error } = await db
      .from("pc_members")
      .update({ ...fields, nom: nom || null })
      .eq("id", id);
    if (error) failWith(error, "Impossible d'enregistrer ce membre.");

    const { data: current } = await db
      .from("pc_member_roles")
      .select("role_id")
      .eq("member_id", id);
    const have = new Set((current ?? []).map((r) => r.role_id));
    const want = new Set(role_ids);
    const toAdd = [...want].filter((r) => !have.has(r));
    const toRemove = [...have].filter((r) => !want.has(r));
    if (toRemove.length)
      await db.from("pc_member_roles").delete().eq("member_id", id).in("role_id", toRemove);
    if (toAdd.length) {
      const { error: e2 } = await db
        .from("pc_member_roles")
        .insert(toAdd.map((role_id) => ({ member_id: id, role_id })));
      if (e2) failWith(e2, "Impossible de modifier les rôles.");
    }
    refresh();
    return { ok: true };
  });
}

/** Désactive ou réactive : une personne désactivée n'apparaît plus dans « Qui es-tu ? » mais garde son historique. */
export async function setMemberActive(id: string, actif: boolean): Promise<ActionResult> {
  return safeAction(async () => {
    if (!uuid.safeParse(id).success) throw new ActionError("Membre introuvable.");
    const { db } = await actionContext({ admin: true });
    const { error } = await db.from("pc_members").update({ actif }).eq("id", id);
    if (error) failWith(error, "Impossible de modifier ce membre.");
    refresh();
    return { ok: true };
  });
}

/** Modèles de rôles : mission et « ne fait pas » (admin). */
export async function saveRole(input: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    const parsed = roleSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { db } = await actionContext({ admin: true });
    const { id, ...fields } = parsed.data;
    const { error } = await db.from("pc_roles").update(fields).eq("id", id);
    if (error) failWith(error, "Impossible d'enregistrer ce rôle.");
    refresh();
    return { ok: true };
  });
}
