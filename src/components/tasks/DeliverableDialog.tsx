"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRef, useState, useTransition } from "react";
import { FileUp, Link2, Upload, X } from "lucide-react";
import {
  addDeliverableLink,
  prepareDeliverableUpload,
  registerDeliverableFile,
} from "@/actions/deliverables";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Field";
import { createUploadClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/cn";
import { useRouter } from "next/navigation";

const MAX_BYTES = 50 * 1024 * 1024;

/** Dépôt d'un livrable : un fichier (téléphone ou ordinateur) ou un lien (Drive, WeTransfer…). */
export function DeliverableDialog({ taskId, taskTitle }: { taskId: string; taskTitle: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"fichier" | "lien">("fichier");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [nom, setNom] = useState("");
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  const reset = () => {
    setError(null);
    setBusy(null);
    setUrl("");
    setNom("");
    setMode("fichier");
  };
  const done = () => {
    setOpen(false);
    reset();
    router.refresh();
  };

  async function upload(files: FileList) {
    setError(null);
    const supabase = createUploadClient();
    for (const file of Array.from(files)) {
      if (file.size > MAX_BYTES) {
        setError(
          `« ${file.name} » dépasse 50 Mo. Dépose-le sur Drive ou WeTransfer, puis colle le lien.`,
        );
        setMode("lien");
        return;
      }
      setBusy(file.name);
      const prep = await prepareDeliverableUpload({
        task_id: taskId,
        file_name: file.name,
        mime_type: file.type || "application/octet-stream",
        size_bytes: file.size,
      });
      if (!prep.ok || !prep.data) {
        setBusy(null);
        return setError(prep.ok ? "Envoi impossible." : prep.error);
      }
      const { error: upErr } = await supabase.storage
        .from("pc-livrables")
        .uploadToSignedUrl(prep.data.path, prep.data.token, file, {
          contentType: file.type || undefined,
        });
      if (upErr) {
        setBusy(null);
        return setError(
          `« ${file.name} » n'a pas pu être envoyé. Vérifie ta connexion ou colle un lien à la place.`,
        );
      }
      const reg = await registerDeliverableFile({
        task_id: taskId,
        file_name: file.name,
        mime_type: file.type || "application/octet-stream",
        size_bytes: file.size,
        path: prep.data.path,
      });
      if (!reg.ok) {
        setBusy(null);
        return setError(reg.error);
      }
    }
    setBusy(null);
    if (input.current) input.current.value = "";
    done();
  }

  const tab = (value: "fichier" | "lien", label: string, Icon: typeof FileUp) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === value}
      onClick={() => setMode(value)}
      className={cn(
        "inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-semibold",
        mode === value ? "bg-forest text-on-forest" : "text-ink-muted",
      )}
    >
      <Icon aria-hidden className="size-4" />
      {label}
    </button>
  );

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <Dialog.Trigger className="border-line-strong bg-surface hover:bg-surface-2 inline-flex min-h-12 items-center gap-2 rounded-lg border px-4 text-sm font-semibold">
        <Upload aria-hidden className="size-4" />
        Déposer un livrable
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="rx-overlay fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content
          aria-describedby="deliv-desc"
          className="rx-dialog bg-canvas fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-2xl p-5 shadow-2xl md:inset-auto md:top-1/2 md:left-1/2 md:w-[30rem] md:max-w-[92vw] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl"
        >
          <div className="mb-1 flex items-start justify-between gap-3">
            <Dialog.Title className="font-display text-xl font-bold">
              Déposer un livrable
            </Dialog.Title>
            <Dialog.Close
              className="hover:bg-surface-2 -mt-1 -mr-2 inline-flex size-12 items-center justify-center rounded-lg"
              aria-label="Fermer"
            >
              <X aria-hidden className="size-5" />
            </Dialog.Close>
          </div>
          <p id="deliv-desc" className="text-ink-muted mb-4 line-clamp-2 text-sm">
            Pour la tâche « {taskTitle} ».
          </p>

          <div
            role="tablist"
            aria-label="Type de livrable"
            className="border-line-strong bg-surface mb-4 flex gap-1 rounded-xl border p-1"
          >
            {tab("fichier", "Fichier", FileUp)}
            {tab("lien", "Lien", Link2)}
          </div>
          <FormError message={error} />

          {mode === "fichier" ? (
            <div className="space-y-3">
              <input
                ref={input}
                type="file"
                multiple
                className="sr-only"
                aria-label="Choisir des fichiers"
                onChange={(e) => e.target.files && upload(e.target.files)}
              />
              <Button
                className="min-h-14 w-full text-base"
                loading={!!busy}
                onClick={() => input.current?.click()}
              >
                <FileUp aria-hidden className="size-5" />
                {busy ? `Envoi de ${busy}…` : "Choisir un fichier"}
              </Button>
              <p className="text-ink-muted text-xs">
                Photo, vidéo, PDF, document… 50 Mo maximum. Pour un fichier plus lourd, utilise
                l&apos;onglet « Lien ».
              </p>
            </div>
          ) : (
            <form
              noValidate
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                setError(null);
                start(async () => {
                  const res = await addDeliverableLink({ task_id: taskId, url, nom });
                  if (!res.ok) return setError(res.fieldErrors?.url ?? res.error);
                  done();
                });
              }}
            >
              <div className="space-y-1.5">
                <label htmlFor="deliv-url" className="text-sm font-medium">
                  Lien (Drive, WeTransfer…)
                </label>
                <input
                  id="deliv-url"
                  type="url"
                  inputMode="url"
                  placeholder="https://…"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="border-line-strong bg-surface min-h-12 w-full rounded-xl border px-4 text-base"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="deliv-nom" className="text-sm font-medium">
                  Nom (facultatif)
                </label>
                <input
                  id="deliv-nom"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Ex. Vidéo montée v2"
                  maxLength={200}
                  className="border-line-strong bg-surface min-h-12 w-full rounded-xl border px-4 text-base"
                />
              </div>
              <Button
                type="submit"
                loading={pending}
                disabled={url.trim() === ""}
                className="min-h-12 w-full"
              >
                Enregistrer le lien
              </Button>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
