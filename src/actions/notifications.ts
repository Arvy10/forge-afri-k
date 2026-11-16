"use server";

import { revalidatePath } from "next/cache";
import { ActionError, invalid, safeAction, type ActionResult } from "@/lib/action";
import { failWith } from "@/lib/db-errors";
import { messageSchema } from "@/lib/schemas";
import { actionContext } from "@/server/session";

const refresh = () => revalidatePath("/", "layout");

/** Marque comme lus tous les messages de la personne connectée. */
export async function markNotificationsRead(): Promise<ActionResult> {
  return safeAction(async () => {
    const { db, memberId } = await actionContext();
    if (!memberId) return { ok: true };
    const { error } = await db
      .from("pc_notifications")
      .update({ lu_le: new Date().toISOString() })
      .eq("member_id", memberId)
      .is("lu_le", null);
    if (error) failWith(error, "Impossible de marquer les messages comme lus.");
    refresh();
    return { ok: true };
  });
}

/**
 * Envoie un court message à quelqu'un (« il manque la légende du post de mardi… »).
 * Tout le monde peut en envoyer, observateurs compris. Au plus 20 messages par heure et par personne.
 */
export async function sendMessage(input: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    const parsed = messageSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { db, memberId } = await actionContext();
    if (parsed.data.to === memberId) throw new ActionError("Tu ne peux pas t'écrire à toi-même.");

    const { data: target } = await db
      .from("pc_members")
      .select("id")
      .eq("id", parsed.data.to)
      .eq("actif", true)
      .maybeSingle();
    if (!target) throw new ActionError("Cette personne n'existe plus.");

    const since = new Date(Date.now() - 3_600_000).toISOString();
    const recent = memberId
      ? await db
          .from("pc_notifications")
          .select("id")
          .eq("de_member_id", memberId)
          .eq("kind", "message")
          .gte("created_at", since)
          .limit(20)
      : { data: [] };
    if ((recent.data ?? []).length >= 20)
      throw new ActionError("Tu as envoyé beaucoup de messages : réessaie dans une heure.");

    const { error } = await db.from("pc_notifications").insert({
      member_id: parsed.data.to,
      de_member_id: memberId,
      kind: "message",
      texte: parsed.data.texte,
    });
    if (error) failWith(error, "Impossible d'envoyer le message. Réessaie.");
    refresh();
    return { ok: true };
  });
}
