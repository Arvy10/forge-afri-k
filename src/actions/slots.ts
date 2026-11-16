"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, invalid, safeAction, type ActionResult } from "@/lib/action";
import type { SlotRow } from "@/lib/database.types";
import { failWith } from "@/lib/db-errors";
import { slotUpdateSchema } from "@/lib/schemas";
import { actionContext } from "@/server/session";

const refresh = () => revalidatePath("/", "layout");

/**
 * Remplir un créneau : responsable, statut, lien du post, date de préparation.
 * - L'administrateur peut tout faire.
 * - Un membre peut prendre un créneau sans responsable (« Je m'en occupe »), puis le modifier ou le lâcher.
 *   Il ne touche pas aux créneaux d'un autre et n'attribue pas à quelqu'un d'autre.
 */
export async function updateSlot(id: string, input: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    if (!z.uuid().safeParse(id).success) throw new ActionError("Créneau introuvable.");
    const parsed = slotUpdateSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const patch = parsed.data;
    if (Object.keys(patch).length === 0) return { ok: true };

    const { db, memberId, isAdmin } = await actionContext({ worker: true });
    const { data } = await db.from("pc_slots").select("*").eq("id", id).maybeSingle();
    const slot = data as SlotRow | null;
    if (!slot) throw new ActionError("Ce créneau n'existe plus. Recharge la page.");

    if (!isAdmin) {
      if (!memberId) throw new ActionError("Choisis d'abord qui tu es.");
      if (slot.responsable_id && slot.responsable_id !== memberId)
        throw new ActionError("Ce créneau est déjà pris en charge par quelqu'un d'autre.");
      if (
        patch.responsable_id !== undefined &&
        patch.responsable_id !== null &&
        patch.responsable_id !== memberId
      )
        throw new ActionError(
          "Seul l'administrateur peut attribuer un créneau à quelqu'un d'autre.",
        );
      // Modifier le statut ou le lien sans être responsable : on prend le créneau d'abord.
      if (!slot.responsable_id && patch.responsable_id === undefined)
        throw new ActionError("Prends d'abord ce créneau (« Je m'en occupe »).");
    }

    const { error } = await db
      .from("pc_slots")
      .update({ ...patch, maj_par: memberId })
      .eq("id", id);
    if (error) failWith(error, "Impossible d'enregistrer. Réessaie.");
    refresh();
    return { ok: true };
  });
}
