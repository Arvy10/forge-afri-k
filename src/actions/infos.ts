"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, invalid, safeAction, type ActionResult } from "@/lib/action";
import { failWith } from "@/lib/db-errors";
import { infoSchema, infoUpdateSchema } from "@/lib/schemas";
import { actionContext } from "@/server/session";

const refresh = () => revalidatePath("/", "layout");

/** Publier une info (mode administrateur). */
export async function createInfo(input: unknown): Promise<ActionResult<{ id: string }>> {
  return safeAction<{ id: string }>(async () => {
    const parsed = infoSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { db } = await actionContext({ admin: true });
    const { data, error } = await db.from("pc_infos").insert(parsed.data).select("id").single();
    if (error || !data) failWith(error, "Impossible de publier cette info.");
    refresh();
    return { ok: true, data: { id: data.id } };
  });
}

export async function updateInfo(input: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    const parsed = infoUpdateSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { db } = await actionContext({ admin: true });
    const { id, ...fields } = parsed.data;
    const { error } = await db.from("pc_infos").update(fields).eq("id", id);
    if (error) failWith(error, "Impossible d'enregistrer cette info.");
    refresh();
    return { ok: true };
  });
}

export async function deleteInfo(id: string): Promise<ActionResult> {
  return safeAction(async () => {
    if (!z.uuid().safeParse(id).success) throw new ActionError("Info introuvable.");
    const { db } = await actionContext({ admin: true });
    const { error } = await db.from("pc_infos").delete().eq("id", id);
    if (error) failWith(error, "Impossible de supprimer cette info.");
    refresh();
    return { ok: true };
  });
}
