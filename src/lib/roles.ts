import type { RoleRow } from "./database.types";

/** Un rôle principal et ses sous-rôles (un seul niveau de sous-rôles). */
export type RoleNode = { role: RoleRow; children: RoleRow[] };

const byOrder = (a: RoleRow, b: RoleRow) => a.ordre - b.ordre || a.nom.localeCompare(b.nom, "fr");

export function roleTree(roles: RoleRow[]): RoleNode[] {
  const ids = new Set(roles.map((r) => r.id));
  const top = roles.filter((r) => !r.parent_id || !ids.has(r.parent_id)).sort(byOrder);
  return top.map((role) => ({
    role,
    children: roles.filter((c) => c.parent_id === role.id).sort(byOrder),
  }));
}

/** « Vidéo › Montage » pour un sous-rôle, « Vidéo » pour un rôle principal. */
export function roleLabel(role: RoleRow, byId: Map<string, RoleRow>): string {
  const parent = role.parent_id ? byId.get(role.parent_id) : undefined;
  return parent ? `${parent.nom} › ${role.nom}` : role.nom;
}

/** Liste « à plat » dans l'ordre d'affichage : rôle principal, puis ses sous-rôles. */
export function flattenRoles(roles: RoleRow[]): { role: RoleRow; depth: 0 | 1 }[] {
  return roleTree(roles).flatMap((n) => [
    { role: n.role, depth: 0 as const },
    ...n.children.map((c) => ({ role: c, depth: 1 as const })),
  ]);
}

/**
 * Un parent est valable si : ce n'est pas le rôle lui-même, ce parent est un rôle principal (pas déjà un sous-rôle),
 * et le rôle n'a pas lui-même de sous-rôles (un seul niveau de sous-rôles).
 */
export function canBeParent(
  roleId: string | null,
  parentId: string | null,
  roles: RoleRow[],
): { ok: true } | { ok: false; reason: string } {
  if (!parentId) return { ok: true };
  if (roleId && parentId === roleId)
    return { ok: false, reason: "Un rôle ne peut pas être son propre parent." };
  const parent = roles.find((r) => r.id === parentId);
  if (!parent) return { ok: false, reason: "Le rôle parent n'existe plus." };
  if (parent.parent_id)
    return { ok: false, reason: "Un sous-rôle ne peut pas avoir lui-même de sous-rôles." };
  if (roleId && roles.some((r) => r.parent_id === roleId))
    return { ok: false, reason: "Ce rôle a des sous-rôles : il ne peut pas devenir un sous-rôle." };
  return { ok: true };
}
