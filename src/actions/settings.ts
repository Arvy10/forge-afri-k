"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { invalid, safeAction, type ActionResult, ActionError } from "@/lib/action";
import { normalizeCode } from "@/lib/code";
import { newCodeSchema } from "@/lib/schemas";
import { actionContext, startAdmin, startSession } from "@/server/session";

const refresh = () => revalidatePath("/", "layout");

/**
 * Change le code d'accès : le nouveau code est stocké haché (bcrypt), jamais en clair.
 * Le numéro de version augmente : toutes les autres sessions tombent et devront ressaisir le nouveau code.
 */
export async function changeAccessCode(input: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    const parsed = newCodeSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { db, auth, memberId } = await actionContext({ admin: true });
    const code_hash = await hash(normalizeCode(parsed.data.code), 10);
    const { error } = await db
      .from("pc_settings")
      .update({ code_hash, code_version: (auth.settings?.code_version ?? 1) + 1 })
      .eq("id", true);
    if (error) throw new ActionError("Impossible de changer le code. Réessaie.");
    // Garde la session de l'administrateur en cours avec la nouvelle version.
    await startSession(memberId);
    await startAdmin(true);
    refresh();
    return { ok: true };
  });
}

/** Déconnecte tout le monde (sauf l'administrateur en cours) sans changer le code. */
export async function signOutEveryone(): Promise<ActionResult> {
  return safeAction(async () => {
    const { db, auth, memberId } = await actionContext({ admin: true });
    const { error } = await db
      .from("pc_settings")
      .update({ code_version: (auth.settings?.code_version ?? 1) + 1 })
      .eq("id", true);
    if (error) throw new ActionError("Impossible de déconnecter les sessions. Réessaie.");
    await startSession(memberId);
    await startAdmin(true);
    refresh();
    return { ok: true };
  });
}
