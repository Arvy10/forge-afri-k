"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { ActionError, invalid, safeAction, type ActionResult } from "@/lib/action";
import { envProblems } from "@/lib/env";
import { accessCodeSchema, adminCodeSchema } from "@/lib/schemas";
import { safeNext } from "@/lib/safe-redirect";
import {
  checkAccessCode,
  checkAdminCode,
  clearFailures,
  clientKey,
  registerFailure,
  waitMinutes,
} from "@/server/access";
import { db } from "@/server/db";
import {
  actionContext,
  endAdmin,
  endSession,
  getAuth,
  rememberedMemberId,
  startAdmin,
  startSession,
} from "@/server/session";

const plural = (n: number, one: string, many: string) => (n > 1 ? many : one);

function lockedMessage(minutes: number) {
  return `Trop d'essais. Réessaie dans ${minutes} ${plural(minutes, "minute", "minutes")}.`;
}

/** Écran 1 : le code d'accès commun. Vérifié côté serveur ; le code n'est jamais envoyé au navigateur. */
export async function submitAccessCode(input: unknown): Promise<ActionResult> {
  const result = await safeAction<{ next: string }>(async () => {
    const problems = envProblems();
    if (problems.length > 0)
      throw new ActionError(
        "Le site n'est pas encore configuré (variables d'environnement manquantes).",
      );

    const parsed = accessCodeSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);

    const key = await clientKey();
    const wait = await waitMinutes("access", key);
    if (wait > 0) throw new ActionError(lockedMessage(wait));

    if (!(await checkAccessCode(parsed.data.code))) {
      const { left, lockedFor } = await registerFailure("access", key);
      if (lockedFor > 0) throw new ActionError(lockedMessage(lockedFor));
      throw new ActionError(
        `Code incorrect. Il te reste ${left} ${plural(left, "essai", "essais")}.`,
      );
    }
    await clearFailures("access", key);

    // Si la personne s'est déjà identifiée sur cet appareil, on la retrouve directement.
    const remembered = await rememberedMemberId();
    let memberId: string | null = null;
    if (remembered && z.uuid().safeParse(remembered).success) {
      const { data } = await db()
        .from("pc_members")
        .select("id")
        .eq("id", remembered)
        .eq("actif", true)
        .maybeSingle();
      memberId = data?.id ?? null;
    }
    await startSession(memberId);
    return { ok: true, data: { next: memberId ? safeNext(parsed.data.suite, "/") : "/qui-es-tu" } };
  });
  if (!result.ok) return result;
  redirect(result.data!.next);
}

/** Écran 2 : « Qui es-tu ? ». Un clic = « je suis cette personne » (mémorisé). */
export async function chooseMember(memberId: string): Promise<ActionResult> {
  const result = await safeAction(async () => {
    if (!z.uuid().safeParse(memberId).success) throw new ActionError("Membre introuvable.");
    const { db } = await actionContext();
    const { data } = await db
      .from("pc_members")
      .select("id")
      .eq("id", memberId)
      .eq("actif", true)
      .maybeSingle();
    if (!data) throw new ActionError("Ce membre n'existe plus ou a été désactivé.");
    await startSession(memberId);
    return { ok: true };
  });
  if (!result.ok) return result;
  redirect("/mon-espace");
}

export async function leaveSession(): Promise<void> {
  await endSession();
  redirect("/acces");
}

/** Mode administrateur : second code, valable 12 heures. */
export async function enterAdminMode(input: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    const parsed = adminCodeSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const auth = await getAuth();
    if (!auth.valid)
      throw new ActionError("Ta session a expiré. Entre de nouveau le code d'accès.");

    const key = await clientKey();
    const wait = await waitMinutes("admin", key);
    if (wait > 0) throw new ActionError(lockedMessage(wait));
    if (!checkAdminCode(parsed.data.code)) {
      const { left, lockedFor } = await registerFailure("admin", key);
      if (lockedFor > 0) throw new ActionError(lockedMessage(lockedFor));
      throw new ActionError(
        `Code administrateur incorrect. Il te reste ${left} ${plural(left, "essai", "essais")}.`,
      );
    }
    await clearFailures("admin", key);
    await startAdmin();
    return { ok: true };
  });
}

export async function leaveAdminMode(): Promise<void> {
  await endAdmin();
  redirect("/");
}
