"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, invalid, safeAction, type ActionResult } from "@/lib/action";
import { actionMember } from "@/lib/auth";

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);
const MAX_BYTES = 50 * 1024 * 1024;

const prepareSchema = z
  .object({
    post_id: z.uuid().optional(),
    task_id: z.uuid().optional(),
    file_name: z.string().trim().min(1).max(200),
    mime_type: z.string().max(120),
    size_bytes: z.number().int().positive(),
  })
  .refine((v) => !!v.post_id !== !!v.task_id, {
    message: "Rattache le fichier à un post ou à une tâche.",
  });

function safeName(name: string) {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(-80);
}

/** Étape 1 : prépare un envoi direct vers Storage (le fichier ne passe pas par le serveur du site). */
export async function prepareAttachmentUpload(
  input: unknown,
): Promise<ActionResult<{ path: string; token: string }>> {
  return safeAction<{ path: string; token: string }>(async () => {
    const parsed = prepareSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const v = parsed.data;
    if (!ALLOWED.has(v.mime_type))
      throw new ActionError(
        "Ce type de fichier n'est pas accepté (images, vidéos, PDF, texte, Word, PowerPoint).",
      );
    if (v.size_bytes > MAX_BYTES) throw new ActionError("Ce fichier dépasse 50 Mo.");
    const { supabase } = await actionMember();
    const folder = v.post_id ? `posts/${v.post_id}` : `tasks/${v.task_id}`;
    const path = `${folder}/${crypto.randomUUID()}-${safeName(v.file_name)}`;
    const { data, error } = await supabase.storage.from("attachments").createSignedUploadUrl(path);
    if (error || !data) throw new ActionError("Impossible de préparer l'envoi. Réessaie.");
    return { ok: true, data: { path, token: data.token } };
  });
}

/** Étape 3 : enregistre la pièce jointe une fois le fichier envoyé. */
export async function registerAttachment(input: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    const schema = prepareSchema.and(z.object({ path: z.string().min(1) }));
    const parsed = schema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const v = parsed.data;
    const expectedPrefix = v.post_id ? `posts/${v.post_id}/` : `tasks/${v.task_id}/`;
    if (!v.path.startsWith(expectedPrefix)) throw new ActionError("Chemin de fichier invalide.");
    const { supabase, user } = await actionMember();
    const { error } = await supabase.from("attachments").insert({
      post_id: v.post_id ?? null,
      task_id: v.task_id ?? null,
      storage_path: v.path,
      file_name: v.file_name,
      mime_type: v.mime_type,
      size_bytes: v.size_bytes,
      uploaded_by: user.id,
    });
    if (error) {
      await supabase.storage.from("attachments").remove([v.path]);
      throw new ActionError("Tu ne peux joindre des fichiers qu'à tes propres posts et tâches.");
    }
    revalidatePath("/", "layout");
    return { ok: true };
  });
}

export async function deleteAttachment(id: string): Promise<ActionResult> {
  return safeAction(async () => {
    if (!z.uuid().safeParse(id).success) throw new ActionError("Fichier introuvable.");
    const { supabase } = await actionMember();
    const { data: row } = await supabase
      .from("attachments")
      .select("id, storage_path")
      .eq("id", id)
      .maybeSingle();
    if (!row) throw new ActionError("Fichier introuvable.");
    const { data, error } = await supabase.from("attachments").delete().eq("id", id).select("id");
    if (error || !data || data.length === 0)
      throw new ActionError("Tu ne peux supprimer que les fichiers que tu as ajoutés.");
    await supabase.storage.from("attachments").remove([row.storage_path]);
    revalidatePath("/", "layout");
    return { ok: true };
  });
}
