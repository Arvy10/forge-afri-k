import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ActionError } from "@/lib/action";
import type { MemberRow, SettingsRow } from "@/lib/database.types";
import { envProblems, serverEnv } from "@/lib/env";
import { db } from "./db";
import {
  ADMIN_COOKIE,
  ADMIN_TTL_SECONDS,
  ME_COOKIE,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  signAdminToken,
  signSessionToken,
  verifyAdminToken,
  verifySessionToken,
} from "./jwt";

export type Auth = {
  /** Le code d'accès a été saisi et la session est valable. */
  valid: boolean;
  memberId: string | null;
  member: MemberRow | null;
  isAdmin: boolean;
  settings: SettingsRow | null;
};

const NONE: Auth = { valid: false, memberId: null, member: null, isAdmin: false, settings: null };

const cookieBase = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
});

export const getSettings = cache(async (): Promise<SettingsRow | null> => {
  const { data } = await db().from("pc_settings").select("*").eq("id", true).maybeSingle();
  return (data as SettingsRow | null) ?? null;
});

/** Qui est là ? Lu une seule fois par requête ; vérifie la signature, l'expiration et la version du code. */
export const getAuth = cache(async (): Promise<Auth> => {
  if (envProblems().length > 0) return NONE;
  const secret = serverEnv().SESSION_SECRET;
  const store = await cookies();
  const session = await verifySessionToken(store.get(SESSION_COOKIE)?.value, secret);
  if (!session) return NONE;

  const settings = await getSettings();
  if (!settings || settings.code_version !== session.v) return NONE; // le code a changé : on redemande

  let member: MemberRow | null = null;
  if (session.m) {
    const { data } = await db()
      .from("pc_members")
      .select("*")
      .eq("id", session.m)
      .eq("actif", true)
      .maybeSingle();
    member = (data as MemberRow | null) ?? null;
  }

  const admin = await verifyAdminToken(store.get(ADMIN_COOKIE)?.value, secret);
  const isAdmin = !!admin && admin.v === settings.code_version;

  return { valid: true, memberId: member?.id ?? null, member, isAdmin, settings };
});

/** Pour les pages : sans session valable, retour à l'écran du code. */
export async function requireSession(): Promise<Auth> {
  const auth = await getAuth();
  if (!auth.valid) redirect("/acces");
  return auth;
}

/** Pour les pages personnelles : il faut aussi savoir qui est la personne (sauf pour l'administrateur). */
export async function requireIdentity(): Promise<Auth & { member: MemberRow }> {
  const auth = await requireSession();
  if (!auth.member) redirect("/qui-es-tu");
  return auth as Auth & { member: MemberRow };
}

/** Pour les Server Actions : lève une erreur lisible au lieu de rediriger. */
export async function actionContext(options: { admin?: boolean } = {}) {
  const auth = await getAuth();
  if (!auth.valid) throw new ActionError("Ta session a expiré. Entre de nouveau le code d'accès.");
  if (options.admin && !auth.isAdmin)
    throw new ActionError("Cette action est réservée au mode administrateur.");
  return { db: db(), auth, memberId: auth.memberId, isAdmin: auth.isAdmin };
}

/* ------------------------------- Écriture des cookies ------------------------------- */

export async function startSession(memberId?: string | null): Promise<void> {
  const settings = await getSettings();
  const store = await cookies();
  const token = await signSessionToken(
    { v: settings?.code_version ?? 1, m: memberId ?? undefined },
    serverEnv().SESSION_SECRET,
  );
  store.set(SESSION_COOKIE, token, { ...cookieBase(), maxAge: SESSION_TTL_SECONDS });
  if (memberId) store.set(ME_COOKIE, memberId, { ...cookieBase(), maxAge: 365 * 24 * 60 * 60 });
}

export async function startAdmin(): Promise<void> {
  const settings = await getSettings();
  const store = await cookies();
  const token = await signAdminToken(
    { v: settings?.code_version ?? 1 },
    serverEnv().SESSION_SECRET,
  );
  store.set(ADMIN_COOKIE, token, { ...cookieBase(), maxAge: ADMIN_TTL_SECONDS });
}

export async function endAdmin(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(ADMIN_COOKIE);
  store.delete(ME_COOKIE);
}

export async function rememberedMemberId(): Promise<string | null> {
  return (await cookies()).get(ME_COOKIE)?.value ?? null;
}
