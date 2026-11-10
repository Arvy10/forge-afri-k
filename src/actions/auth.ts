"use server";

import { redirect } from "next/navigation";
import { ActionError, invalid, safeAction, type ActionResult } from "@/lib/action";
import { actionMember, getAuth } from "@/lib/auth";
import { DEMO_MESSAGE, isDemoMode } from "@/lib/demo/mode";
import { publicEnv } from "@/lib/env";
import { loginSchema, profileSchema, resetRequestSchema, setPasswordSchema } from "@/lib/schemas";
import { safeNext } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";

export async function signIn(input: unknown, next?: string): Promise<ActionResult> {
  if (isDemoMode()) return { ok: false, error: DEMO_MESSAGE };
  const result = await safeAction<undefined>(async () => {
    const parsed = loginSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) {
      // Même message que l'e-mail soit inconnu ou le mot de passe faux : on ne révèle rien.
      throw new ActionError("E-mail ou mot de passe incorrect.");
    }
    return { ok: true };
  });
  if (!result.ok) return result;
  redirect(safeNext(next));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}

export async function requestPasswordReset(input: unknown): Promise<ActionResult> {
  if (isDemoMode()) return { ok: false, error: DEMO_MESSAGE };
  return safeAction(async () => {
    const parsed = resetRequestSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const supabase = await createClient();
    // Réponse identique que l'adresse existe ou non.
    await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${publicEnv().NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/definir-mot-de-passe`,
    });
    return { ok: true };
  });
}

export async function setPassword(input: unknown): Promise<ActionResult> {
  if (isDemoMode()) return { ok: false, error: DEMO_MESSAGE };
  const result = await safeAction<undefined>(async () => {
    const parsed = setPasswordSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { supabase, user } = await getAuth();
    if (!user)
      throw new ActionError(
        "Le lien a expiré. Demande un nouveau lien depuis la page de connexion.",
      );
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error)
      throw new ActionError("Impossible d'enregistrer ce mot de passe. Essaie-en un autre.");
    return { ok: true };
  });
  if (!result.ok) return result;
  redirect("/completer-profil");
}

const AVATAR_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const AVATAR_MAX = 3 * 1024 * 1024;

/** Enregistre le profil de la personne connectée (première connexion ou modification). */
export async function saveProfile(formData: FormData): Promise<ActionResult> {
  const result = await safeAction<undefined>(async () => {
    const { supabase, user, profile } = await actionMember({ allowIncomplete: true });

    let raw: unknown;
    try {
      raw = JSON.parse(String(formData.get("values") ?? "{}"));
    } catch {
      throw new ActionError("Formulaire illisible. Recharge la page.");
    }
    const parsed = profileSchema.safeParse(raw);
    if (!parsed.success) return invalid(parsed.error);
    const { role_ids, ...fields } = parsed.data;

    // Photo (facultative)
    let avatar_path = profile.avatar_path;
    const file = formData.get("avatar");
    if (file instanceof File && file.size > 0) {
      const ext = AVATAR_TYPES[file.type];
      if (!ext) throw new ActionError("La photo doit être au format JPG, PNG ou WebP.");
      if (file.size > AVATAR_MAX) throw new ActionError("La photo est trop lourde (3 Mo maximum).");
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, file, { contentType: file.type });
      if (error) throw new ActionError("Impossible d'envoyer la photo. Réessaie.");
      if (profile.avatar_path) await supabase.storage.from("avatars").remove([profile.avatar_path]);
      avatar_path = path;
    } else if (formData.get("remove_avatar") === "1" && profile.avatar_path) {
      await supabase.storage.from("avatars").remove([profile.avatar_path]);
      avatar_path = null;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ ...fields, avatar_path, onboarded: true })
      .eq("id", user.id);
    if (error) throw new ActionError("Impossible d'enregistrer ton profil.");

    // Rôles déclarés par la personne
    const { data: current } = await supabase
      .from("profile_roles")
      .select("role_id")
      .eq("profile_id", user.id);
    const have = new Set((current ?? []).map((r) => r.role_id));
    const want = new Set(role_ids);
    const toAdd = [...want].filter((id) => !have.has(id));
    const toRemove = [...have].filter((id) => !want.has(id));
    if (toRemove.length)
      await supabase
        .from("profile_roles")
        .delete()
        .eq("profile_id", user.id)
        .in("role_id", toRemove);
    if (toAdd.length)
      await supabase
        .from("profile_roles")
        .insert(toAdd.map((role_id) => ({ profile_id: user.id, role_id })));

    return { ok: true };
  });
  return result;
}

export async function finishOnboarding(formData: FormData): Promise<ActionResult> {
  const result = await saveProfile(formData);
  if (!result.ok) return result;
  redirect("/");
}
