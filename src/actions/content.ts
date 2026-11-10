"use server";

import { revalidatePath } from "next/cache";
import { ActionError, invalid, safeAction, type ActionResult } from "@/lib/action";
import { actionMember } from "@/lib/auth";
import { guideSectionSchema, projectSchema } from "@/lib/schemas";

/** Modifie une section du guide (administrateur uniquement). */
export async function saveGuideSection(input: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    const parsed = guideSectionSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { supabase } = await actionMember({ admin: true });
    const { id, ...fields } = parsed.data;
    const { data, error } = await supabase
      .from("guide_sections")
      .update(fields)
      .eq("id", id)
      .select("id");
    if (error || !data || data.length === 0)
      throw new ActionError("Impossible d'enregistrer cette section.");
    revalidatePath("/regles");
    return { ok: true };
  });
}

/** Modifie un projet (administrateur uniquement). */
export async function saveProject(input: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    const parsed = projectSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { supabase } = await actionMember({ admin: true });
    const { id, ...fields } = parsed.data;
    const { data, error } = await supabase
      .from("projects")
      .update(fields)
      .eq("id", id)
      .select("id");
    if (error || !data || data.length === 0)
      throw new ActionError("Impossible d'enregistrer ce projet.");
    revalidatePath("/projets");
    revalidatePath("/");
    return { ok: true };
  });
}
