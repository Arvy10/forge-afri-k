"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BellRing, Check, Copy, X } from "lucide-react";
import { nudgeTask } from "@/actions/tasks";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Field";

/** Relancer : enregistre la relance, puis propose un message court à copier (WhatsApp). */
export function NudgeDialog({
  taskId,
  taskTitle,
  prenom,
}: {
  taskId: string;
  taskTitle: string;
  prenom: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const reset = () => {
    setNote("");
    setMessage(null);
    setCopied(false);
    setError(null);
  };

  async function copy() {
    if (!message) return;
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
    } catch {
      // Navigateur sans accès au presse-papiers : on sélectionne le texte pour une copie manuelle.
      (document.getElementById("nudge-message") as HTMLTextAreaElement | null)?.select();
      setError("Copie automatique impossible : le texte est sélectionné, copie-le à la main.");
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          const sent = message !== null;
          reset();
          if (sent) router.refresh();
        }
      }}
    >
      <Dialog.Trigger className="border-accent/50 text-accent-strong hover:bg-accent-soft inline-flex min-h-12 items-center gap-2 rounded-lg border px-4 text-sm font-semibold">
        <BellRing aria-hidden className="size-4" />
        Relancer
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="rx-overlay fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content
          aria-describedby="nudge-desc"
          className="rx-dialog bg-canvas fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-2xl p-5 shadow-2xl md:inset-auto md:top-1/2 md:left-1/2 md:w-[30rem] md:max-w-[92vw] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl"
        >
          <div className="mb-1 flex items-start justify-between gap-3">
            <Dialog.Title className="font-display text-xl font-bold">
              Relancer {prenom}
            </Dialog.Title>
            <Dialog.Close
              className="hover:bg-surface-2 -mt-1 -mr-2 inline-flex size-12 items-center justify-center rounded-lg"
              aria-label="Fermer"
            >
              <X aria-hidden className="size-5" />
            </Dialog.Close>
          </div>
          <p id="nudge-desc" className="text-ink-muted mb-4 line-clamp-2 text-sm">
            Tâche « {taskTitle} ».
          </p>
          <FormError message={error} />

          {message === null ? (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                setError(null);
                start(async () => {
                  const res = await nudgeTask({ task_id: taskId, note });
                  if (!res.ok) return setError(res.error);
                  setMessage(res.data!.message);
                });
              }}
            >
              <div className="space-y-1.5">
                <label htmlFor="nudge-note" className="text-sm font-medium">
                  Un mot en plus (facultatif)
                </label>
                <textarea
                  id="nudge-note"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={500}
                  className="border-line-strong bg-surface w-full rounded-xl border px-4 py-3 text-base"
                  placeholder="Ex. On en a besoin avant la réunion."
                />
              </div>
              <Button type="submit" loading={pending} className="min-h-12 w-full">
                <BellRing aria-hidden className="size-4" />
                Enregistrer la relance
              </Button>
              <p className="text-ink-muted text-xs">
                La relance apparaît dans l&apos;espace de {prenom}. Aucun message n&apos;est envoyé
                automatiquement.
              </p>
            </form>
          ) : (
            <div className="space-y-3">
              <p
                role="status"
                className="bg-t-impact-bg text-t-impact-fg flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium"
              >
                <Check aria-hidden className="size-4" />
                Relance enregistrée. Tu peux copier le message pour l&apos;envoyer sur WhatsApp.
              </p>
              <label htmlFor="nudge-message" className="sr-only">
                Message de rappel
              </label>
              <textarea
                id="nudge-message"
                readOnly
                rows={6}
                value={message}
                className="border-line-strong bg-surface w-full rounded-xl border px-4 py-3 text-base"
              />
              <Button onClick={copy} className="min-h-12 w-full">
                {copied ? (
                  <Check aria-hidden className="size-4" />
                ) : (
                  <Copy aria-hidden className="size-4" />
                )}
                {copied ? "Message copié" : "Copier le message"}
              </Button>
              <Dialog.Close className="text-ink-muted hover:text-ink min-h-12 w-full text-sm underline underline-offset-4">
                Fermer
              </Dialog.Close>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
