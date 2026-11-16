"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MessageSquarePlus, X } from "lucide-react";
import { sendMessage } from "@/actions/notifications";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Field";

const IDEAS = [
  "Il manque encore la légende de ton post.",
  "Peux-tu mettre à jour l'état de tes tâches ?",
  "Il me manque un élément pour avancer : peux-tu me le donner ?",
];

/** Envoyer un court message à quelqu'un : il le recevra dans sa cloche. */
export function SendMessageDialog({ toId, toName }: { toId: string; toName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [texte, setTexte] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setTexte("");
          setError(null);
          setSent(false);
        }
      }}
    >
      <Dialog.Trigger className="border-line-strong bg-surface hover:bg-surface-2 inline-flex min-h-12 items-center gap-2 rounded-xl border px-4 text-base font-semibold">
        <MessageSquarePlus aria-hidden className="size-5" />
        Envoyer un message
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="rx-overlay fixed inset-0 z-[60] bg-black/50" />
        <Dialog.Content
          aria-describedby="msg-desc"
          className="rx-dialog bg-canvas text-ink fixed inset-x-0 bottom-0 z-[70] max-h-[92dvh] overflow-y-auto rounded-t-2xl p-5 shadow-2xl md:inset-auto md:top-1/2 md:left-1/2 md:w-[30rem] md:max-w-[92vw] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl"
        >
          <div className="mb-2 flex items-start justify-between gap-3">
            <Dialog.Title className="font-display text-xl font-bold">
              Message pour {toName}
            </Dialog.Title>
            <Dialog.Close
              className="hover:bg-surface-2 -mt-1 -mr-2 inline-flex size-12 items-center justify-center rounded-lg"
              aria-label="Fermer"
            >
              <X aria-hidden className="size-5" />
            </Dialog.Close>
          </div>
          <p id="msg-desc" className="text-ink-muted mb-4 text-base">
            {toName} le verra dans sa cloche de notifications, avec ton nom.
          </p>

          {sent ? (
            <div className="space-y-4">
              <p
                role="status"
                className="bg-t-impact-bg text-t-impact-fg rounded-xl px-4 py-3 text-base font-semibold"
              >
                Message envoyé à {toName}.
              </p>
              <Button className="min-h-12 w-full" onClick={() => setOpen(false)}>
                Fermer
              </Button>
            </div>
          ) : (
            <form
              noValidate
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                setError(null);
                start(async () => {
                  const res = await sendMessage({ to: toId, texte });
                  if (!res.ok) return setError(res.fieldErrors?.texte ?? res.error);
                  setSent(true);
                  router.refresh();
                });
              }}
            >
              <FormError message={error} />
              <ul className="flex flex-wrap gap-2" aria-label="Idées de messages">
                {IDEAS.map((idea) => (
                  <li key={idea}>
                    <button
                      type="button"
                      onClick={() => setTexte(idea)}
                      className="border-line-strong bg-surface hover:bg-surface-2 min-h-12 rounded-xl border px-3 text-left text-base"
                    >
                      {idea}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="space-y-1.5">
                <label htmlFor="msg-texte" className="text-base font-medium">
                  Ton message
                </label>
                <textarea
                  id="msg-texte"
                  rows={4}
                  maxLength={600}
                  value={texte}
                  onChange={(e) => setTexte(e.target.value)}
                  className="border-line-strong bg-surface w-full rounded-xl border p-3 text-base"
                />
              </div>
              <Button
                type="submit"
                loading={pending}
                disabled={texte.trim() === ""}
                className="min-h-12 w-full"
              >
                Envoyer
              </Button>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
