"use server";

import { revalidatePath } from "next/cache";
import { ActionError, invalid, safeAction, type ActionResult } from "@/lib/action";
import { guideSectionSchema, projectSchema } from "@/lib/schemas";
import { actionContext } from "@/server/session";

/** Modifie une section du guide (mode administrateur). */
export async function saveGuideSection(input: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    const parsed = guideSectionSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { db } = await actionContext({ admin: true });
    const { id, ...fields } = parsed.data;
    const { error } = await db.from("pc_guide_sections").update(fields).eq("id", id);
    if (error) throw new ActionError("Impossible d'enregistrer cette section.");
    revalidatePath("/regles");
    return { ok: true };
  });
}

/** Modifie un projet (mode administrateur). */
export async function saveProject(input: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    const parsed = projectSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { db } = await actionContext({ admin: true });
    const { id, ...fields } = parsed.data;
    const { error } = await db.from("pc_projects").update(fields).eq("id", id);
    if (error) throw new ActionError("Impossible d'enregistrer ce projet.");
    revalidatePath("/projets");
    revalidatePath("/");
    return { ok: true };
  });
}
