"use server";

import { invalid, safeAction, ActionError, type ActionResult } from "@/lib/action";
import { actionMember } from "@/lib/auth";
import { interestSchema } from "@/lib/schemas";

/** « Me prévenir quand c'est prêt » : on garde juste l'intérêt, sans notification pour l'instant. */
export async function setInterest(feature: unknown, wanted: boolean): Promise<ActionResult> {
  return safeAction(async () => {
    const parsed = interestSchema.safeParse({ feature });
    if (!parsed.success) return invalid(parsed.error);
    const { supabase, user } = await actionMember();
    const query = wanted
      ? supabase
          .from("feature_interests")
          .upsert({ profile_id: user.id, feature: parsed.data.feature })
      : supabase
          .from("feature_interests")
          .delete()
          .eq("profile_id", user.id)
          .eq("feature", parsed.data.feature);
    const { error } = await query;
    if (error) throw new ActionError("Impossible d'enregistrer ton intérêt. Réessaie.");
    return { ok: true };
  });
}
