import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { ActionError } from "./action";
import type { ProfileRow } from "./database.types";

/** Session courante (une seule lecture par requête). `user` est vérifié auprès de Supabase. */
export const getAuth = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null };
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  return { supabase, user, profile: profile as ProfileRow | null };
});

/** Pour les pages : renvoie le membre actif et profil complété, sinon redirige. */
export async function requireMember(options: { allowIncomplete?: boolean } = {}) {
  const { supabase, user, profile } = await getAuth();
  if (!user) redirect("/connexion");
  if (!profile || !profile.active) {
    await supabase.auth.signOut();
    redirect("/connexion?erreur=desactive");
  }
  if (!profile.onboarded && !options.allowIncomplete) redirect("/completer-profil");
  return { supabase, user, profile, isAdmin: profile.access_role === "admin" };
}

/** Pour les pages réservées à l'admin. */
export async function requireAdminPage() {
  const ctx = await requireMember();
  if (!ctx.isAdmin) redirect("/");
  return ctx;
}

/** Pour les Server Actions : lève une ActionError au lieu de rediriger. */
export async function actionMember(options: { admin?: boolean; allowIncomplete?: boolean } = {}) {
  const { supabase, user, profile } = await getAuth();
  if (!user || !profile || !profile.active)
    throw new ActionError("Ta session a expiré. Reconnecte-toi.");
  if (options.admin && profile.access_role !== "admin")
    throw new ActionError("Cette action est réservée à l'administrateur.");
  return { supabase, user, profile, isAdmin: profile.access_role === "admin" };
}
