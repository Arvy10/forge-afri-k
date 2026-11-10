"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Film, Image as ImageIcon, Paperclip, Trash2 } from "lucide-react";
import {
  deleteAttachment,
  prepareAttachmentUpload,
  registerAttachment,
} from "@/actions/attachments";
import { Button, IconButton } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { createClient } from "@/lib/supabase/client";
import type { AttachmentView } from "@/lib/posts-data";

type Parent = { post_id: string } | { task_id: string };

function iconFor(mime: string) {
  if (mime.startsWith("image/")) return ImageIcon;
  if (mime.startsWith("video/")) return Film;
  return FileText;
}
const size = (b: number) =>
  b > 1e6 ? `${(b / 1e6).toFixed(1)} Mo` : `${Math.max(1, Math.round(b / 1e3))} Ko`;

/** Pièces jointes d'un post ou d'une tâche. Les fichiers partent directement vers Supabase Storage. */
export function AttachmentsPanel({
  parent,
  items,
  canUpload,
  me,
}: {
  parent: Parent;
  items: AttachmentView[];
  canUpload: boolean;
  me: { id: string; isAdmin: boolean };
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();

  async function upload(files: FileList) {
    setError(null);
    const supabase = createClient();
    for (const file of Array.from(files)) {
      setBusy(file.name);
      const prep = await prepareAttachmentUpload({
        ...parent,
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
      });
      if (!prep.ok || !prep.data) {
        setError(prep.ok ? "Envoi impossible." : prep.error);
        break;
      }
      const { error: upErr } = await supabase.storage
        .from("attachments")
        .uploadToSignedUrl(prep.data.path, prep.data.token, file, { contentType: file.type });
      if (upErr) {
        setError(`« ${file.name} » n'a pas pu être envoyé. Vérifie ta connexion.`);
        break;
      }
      const reg = await registerAttachment({
        ...parent,
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        path: prep.data.path,
      });
      if (!reg.ok) {
        setError(reg.error);
        break;
      }
    }
    setBusy(null);
    if (input.current) input.current.value = "";
    router.refresh();
  }

  return (
    <section aria-labelledby="pj" className="space-y-3">
      <h3 id="pj" className="font-display flex items-center gap-2 text-base font-bold">
        <Paperclip aria-hidden className="size-4" />
        Pièces jointes{" "}
        <span className="text-ink-muted font-sans text-sm font-normal">({items.length})</span>
      </h3>
      <Notice message={error} onClose={() => setError(null)} />
      {items.length === 0 ? (
        <p className="text-ink-muted text-sm">
          Aucun fichier pour l&apos;instant (visuels, vidéos, brouillons).
        </p>
      ) : (
        <ul className="divide-line border-line bg-surface divide-y rounded-xl border">
          {items.map((a) => {
            const Icon = iconFor(a.mime_type);
            const canDelete = me.isAdmin || a.uploaded_by === me.id;
            return (
              <li key={a.id} className="flex items-center gap-3 px-3 py-1.5">
                <Icon aria-hidden className="text-ink-muted size-5 shrink-0" />
                <div className="min-w-0 flex-1">
                  {a.url ? (
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block min-h-6 truncate text-sm font-medium underline-offset-4 hover:underline"
                    >
                      {a.file_name}
                    </a>
                  ) : (
                    <span className="block truncate text-sm font-medium">{a.file_name}</span>
                  )}
                  <span className="text-ink-muted text-xs">{size(a.size_bytes)}</span>
                </div>
                {canDelete && (
                  <IconButton
                    label={`Supprimer ${a.file_name}`}
                    onClick={() =>
                      start(async () => {
                        const res = await deleteAttachment(a.id);
                        if (!res.ok) setError(res.error);
                        else router.refresh();
                      })
                    }
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </IconButton>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {canUpload && (
        <>
          <input
            ref={input}
            type="file"
            multiple
            className="sr-only"
            aria-label="Choisir des fichiers à joindre"
            onChange={(e) => e.target.files && upload(e.target.files)}
          />
          <Button variant="secondary" loading={!!busy} onClick={() => input.current?.click()}>
            <Paperclip aria-hidden className="size-4" />
            {busy ? `Envoi de ${busy}…` : "Ajouter des fichiers"}
          </Button>
        </>
      )}
    </section>
  );
}
