import "server-only";
import { cache } from "react";
import type { MemberLite } from "@/lib/members";
import { fullName } from "@/lib/members";
import { roleLabel } from "@/lib/roles";
import type { MemberRoleRow, MemberRow, RoleRow } from "@/lib/database.types";
import { db } from "./db";

export const getRoles = cache(async (): Promise<RoleRow[]> => {
  const { data } = await db().from("pc_roles").select("*").order("ordre");
  return (data ?? []) as RoleRow[];
});

export type Member = MemberLite & { roleIds: string[]; ordre: number };

/** Tous les membres (actifs et désactivés), avec leurs rôles. */
export const getTeam = cache(async (): Promise<Member[]> => {
  const [{ data: members }, { data: links }, roles] = await Promise.all([
    db().from("pc_members").select("*").order("ordre").order("created_at"),
    db().from("pc_member_roles").select("member_id, role_id"),
    getRoles(),
  ]);
  const roleById = new Map(roles.map((r) => [r.id, r]));
  const roleName = new Map(roles.map((r) => [r.id, roleLabel(r, roleById)]));
  return ((members ?? []) as MemberRow[]).map((m) => {
    const ids = ((links ?? []) as Pick<MemberRoleRow, "member_id" | "role_id">[])
      .filter((l) => l.member_id === m.id)
      .map((l) => l.role_id);
    return {
      id: m.id,
      prenom: m.prenom,
      nom: m.nom,
      name: fullName(m),
      couleur: m.couleur,
      actif: m.actif,
      ordre: m.ordre,
      roleIds: ids,
      roleNames: ids.map((id) => roleName.get(id)).filter((n): n is string => !!n),
    };
  });
});

export const getActiveTeam = cache(async (): Promise<Member[]> =>
  (await getTeam()).filter((m) => m.actif),
);
