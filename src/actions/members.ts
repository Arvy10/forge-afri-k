"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, invalid, safeAction, type ActionResult } from "@/lib/action";
import { MEMBER_COLORS } from "@/lib/constants";
import { failWith } from "@/lib/db-errors";
import type { RoleRow } from "@/lib/database.types";
import { canBeParent } from "@/lib/roles";
import { memberSchema, roleCreateSchema, roleSchema } from "@/lib/schemas";
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

    await syncMemberRoles(db, id, role_ids);
    refresh();
    return { ok: true };
  });
}

type Db = Awaited<ReturnType<typeof actionContext>>["db"];

/** Fait correspondre les rôles d'un membre à la liste donnée (ajoute ce qui manque, retire le reste). */
async function syncMemberRoles(db: Db, memberId: string, roleIds: string[]) {
  const { data: current } = await db
    .from("pc_member_roles")
    .select("role_id")
    .eq("member_id", memberId);
  const have = new Set((current ?? []).map((r) => r.role_id));
  const want = new Set(roleIds);
  const toAdd = [...want].filter((r) => !have.has(r));
  const toRemove = [...have].filter((r) => !want.has(r));
  if (toRemove.length)
    await db.from("pc_member_roles").delete().eq("member_id", memberId).in("role_id", toRemove);
  if (toAdd.length) {
    const { error } = await db
      .from("pc_member_roles")
      .insert(toAdd.map((role_id) => ({ member_id: memberId, role_id })));
    if (error) failWith(error, "Impossible de modifier les rôles.");
  }
}

/** Chacun choisit ses propres rôles (les tâches qui l'intéressent). Plusieurs personnes peuvent avoir le même. */
export async function setMyRoles(roleIds: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    const parsed = z.array(z.uuid()).max(60).safeParse(roleIds);
    if (!parsed.success) throw new ActionError("Choix de rôles invalide.");
    const { db, memberId } = await actionContext();
    if (!memberId) throw new ActionError("Choisis d'abord qui tu es.");
    await syncMemberRoles(db, memberId, [...new Set(parsed.data)]);
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

async function allRoles(db: Awaited<ReturnType<typeof actionContext>>["db"]): Promise<RoleRow[]> {
  const { data } = await db.from("pc_roles").select("*");
  return (data ?? []) as RoleRow[];
}

/** Crée un rôle (ou un sous-rôle si un rôle parent est choisi). */
export async function createRole(input: unknown): Promise<ActionResult<{ id: string }>> {
  return safeAction<{ id: string }>(async () => {
    const parsed = roleCreateSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { db } = await actionContext({ admin: true });
    const roles = await allRoles(db);
    const check = canBeParent(null, parsed.data.parent_id, roles);
    if (!check.ok) throw new ActionError(check.reason);
    const ordre = Math.max(0, ...roles.map((r) => r.ordre)) + 1;
    const { data, error } = await db
      .from("pc_roles")
      .insert({ ...parsed.data, ordre })
      .select("id")
      .single();
    if (error || !data) failWith(error, "Impossible de créer ce rôle.");
    refresh();
    return { ok: true, data: { id: data.id } };
  });
}

/** Modifie un rôle : nom, rôle parent, mission et « ne fait pas ». */
export async function saveRole(input: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    const parsed = roleSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { db } = await actionContext({ admin: true });
    const { id, ...fields } = parsed.data;
    const check = canBeParent(id, fields.parent_id, await allRoles(db));
    if (!check.ok) throw new ActionError(check.reason);
    const { error } = await db.from("pc_roles").update(fields).eq("id", id);
    if (error) failWith(error, "Impossible d'enregistrer ce rôle.");
    refresh();
    return { ok: true };
  });
}

/** Supprime un rôle : retiré à tous ceux qui le portaient ; ses sous-rôles deviennent des rôles principaux. */
export async function deleteRole(id: string): Promise<ActionResult> {
  return safeAction(async () => {
    if (!uuid.safeParse(id).success) throw new ActionError("Rôle introuvable.");
    const { db } = await actionContext({ admin: true });
    const { error } = await db.from("pc_roles").delete().eq("id", id);
    if (error) failWith(error, "Impossible de supprimer ce rôle.");
    refresh();
    return { ok: true };
  });
}

/**
 * Supprime DÉFINITIVEMENT un membre. Ses tâches deviennent « sans responsable », sauf si on demande
 * de les supprimer aussi. Pour garder l'historique, préférer « Désactiver ».
 */
export async function deleteMember(id: string, withTasks: boolean): Promise<ActionResult> {
  return safeAction(async () => {
    if (!uuid.safeParse(id).success) throw new ActionError("Membre introuvable.");
    const { db, memberId } = await actionContext({ admin: true });
    if (memberId === id)
      throw new ActionError(
        "Tu ne peux pas te supprimer toi-même. Demande-le d'abord à ton propre profil, ou désactive-toi.",
      );
    if (withTasks) {
      const { error: e1 } = await db.from("pc_tasks").delete().eq("member_id", id);
      if (e1) failWith(e1, "Impossible de supprimer les tâches de ce membre.");
    }
    const { error } = await db.from("pc_members").delete().eq("id", id);
    if (error) failWith(error, "Impossible de supprimer ce membre.");
    refresh();
    return { ok: true };
  });
}
