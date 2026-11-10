"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, invalid, safeAction, type ActionResult } from "@/lib/action";
import { actionMember } from "@/lib/auth";
import { ACCESS_ROLES } from "@/lib/constants";
import { publicEnv } from "@/lib/env";
import { inviteSchema } from "@/lib/schemas";
import { createAdminClient } from "@/lib/supabase/admin";

const refresh = () => revalidatePath("/", "layout");
const uuid = z.uuid();

/** Invite un membre par e-mail (clé service_role, côté serveur uniquement, réservé à l'admin). */
export async function inviteMember(input: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    const parsed = inviteSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { supabase } = await actionMember({ admin: true });
    const { email, full_name, access_role, role_ids } = parsed.data;

    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name },
      redirectTo: `${publicEnv().NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/definir-mot-de-passe`,
    });
    if (error || !data.user) {
      if (/already|registered|exists/i.test(error?.message ?? ""))
        throw new ActionError("Cette adresse a déjà un compte. Utilise « Mot de passe oublié » si besoin.");
      throw new ActionError("L'invitation n'a pas pu être envoyée. Vérifie l'adresse et réessaie.");
    }

    // Le profil est créé par un trigger ; on y ajoute le niveau d'accès et les rôles choisis.
    const id = data.user.id;
    await admin.from("profiles").update({ access_role, full_name }).eq("id", id);
    if (role_ids.length > 0)
      await admin.from("profile_roles").insert(role_ids.map((role_id) => ({ profile_id: id, role_id })));
    void supabase;
    refresh();
    return { ok: true };
  });
}

export async function setMemberRoles(profileId: string, roleIds: string[]): Promise<ActionResult> {
  return safeAction(async () => {
    if (!uuid.safeParse(profileId).success || !z.array(uuid).safeParse(roleIds).success)
      throw new ActionError("Données invalides.");
    const { supabase } = await actionMember({ admin: true });
    const { data: current } = await supabase.from("profile_roles").select("role_id").eq("profile_id", profileId);
    const have = new Set((current ?? []).map((r) => r.role_id));
    const want = new Set(roleIds);
    const toAdd = [...want].filter((r) => !have.has(r));
    const toRemove = [...have].filter((r) => !want.has(r));
    if (toRemove.length) {
      const { error } = await supabase.from("profile_roles").delete().eq("profile_id", profileId).in("role_id", toRemove);
      if (error) throw new ActionError("Impossible de modifier les rôles.");
    }
    if (toAdd.length) {
      const { error } = await supabase.from("profile_roles").insert(toAdd.map((role_id) => ({ profile_id: profileId, role_id })));
      if (error) throw new ActionError("Impossible de modifier les rôles.");
    }
    refresh();
    return { ok: true };
  });
}

export async function setMemberAccess(profileId: string, accessRole: string): Promise<ActionResult> {
  return safeAction(async () => {
    const role = z.enum(ACCESS_ROLES).safeParse(accessRole);
    if (!uuid.safeParse(profileId).success || !role.success) throw new ActionError("Données invalides.");
    const { supabase, user } = await actionMember({ admin: true });
    if (profileId === user.id && role.data !== "admin")
      throw new ActionError("Tu ne peux pas retirer ton propre accès administrateur. Demande à un autre admin.");
    const { error } = await supabase.from("profiles").update({ access_role: role.data }).eq("id", profileId);
    if (error) throw new ActionError("Impossible de changer le niveau d'accès.");
    refresh();
    return { ok: true };
  });
}

/** Désactive (ou réactive) un membre : plus aucun accès aux données, et connexion bloquée. */
export async function setMemberActive(profileId: string, active: boolean): Promise<ActionResult> {
  return safeAction(async () => {
    if (!uuid.safeParse(profileId).success) throw new ActionError("Données invalides.");
    const { supabase, user } = await actionMember({ admin: true });
    if (profileId === user.id) throw new ActionError("Tu ne peux pas te désactiver toi-même.");
    const { error } = await supabase.from("profiles").update({ active }).eq("id", profileId);
    if (error) throw new ActionError("Impossible de modifier ce membre.");
    // Bloque aussi la reconnexion côté Auth (best effort : la RLS ferme déjà l'accès aux données).
    try {
      await createAdminClient().auth.admin.updateUserById(profileId, { ban_duration: active ? "none" : "876000h" });
    } catch (e) {
      console.error("[members] ban/unban a échoué", e);
    }
    refresh();
    return { ok: true };
  });
}
