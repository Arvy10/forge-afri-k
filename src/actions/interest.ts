"use server";

import { ActionError, invalid, safeAction, type ActionResult } from "@/lib/action";
import { interestSchema } from "@/lib/schemas";
import { actionContext } from "@/server/session";

/** « Me prévenir quand c'est prêt » : on garde juste l'intérêt, sans notification pour l'instant. */
export async function setInterest(feature: unknown, wanted: boolean): Promise<ActionResult> {
  return safeAction(async () => {
    const parsed = interestSchema.safeParse({ feature });
    if (!parsed.success) return invalid(parsed.error);
    const { db, memberId } = await actionContext();
    if (!memberId) throw new ActionError("Choisis d'abord qui tu es pour demander à être prévenu.");
    const q = wanted
      ? db
          .from("pc_feature_interests")
          .upsert({ member_id: memberId, feature: parsed.data.feature })
      : db
          .from("pc_feature_interests")
          .delete()
          .eq("member_id", memberId)
          .eq("feature", parsed.data.feature);
    const { error } = await q;
    if (error) throw new ActionError("Impossible d'enregistrer ton intérêt. Réessaie.");
    return { ok: true };
  });
}
