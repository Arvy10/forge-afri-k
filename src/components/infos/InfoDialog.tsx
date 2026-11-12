"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pencil, Plus, X } from "lucide-react";
import { createInfo, updateInfo } from "@/actions/infos";
import { Button, buttonClass } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Field";
import type { InfoRow } from "@/lib/database.types";

/** Publier ou modifier une info (mode administrateur). Le texte accepte une mise en forme simple. */
export function InfoDialog({ info }: { info?: InfoRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [titre, setTitre] = useState(info?.titre ?? "");
  const [contenu, setContenu] = useState(info?.contenu ?? "");
  const [epingle, setEpingle] = useState(info?.epingle ?? false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        className={
          info
            ? "text-ink-muted hover:text-ink hover:bg-surface-2 inline-flex min-h-12 items-center gap-1.5 rounded-lg px-3 text-sm font-medium"
            : buttonClass("primary")
        }
      >
        {info ? <Pencil aria-hidden className="size-4" /> : <Plus aria-hidden className="size-4" />}
        {info ? "Modifier" : "Publier une info"}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="rx-overlay fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content
          aria-describedby="info-desc"
          className="rx-dialog bg-canvas fixed inset-x-0 bottom-0 z-50 max-h-[94dvh] overflow-y-auto rounded-t-2xl p-5 shadow-2xl md:inset-auto md:top-1/2 md:left-1/2 md:w-[36rem] md:max-w-[92vw] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <Dialog.Title className="font-display text-xl font-bold">
              {info ? "Modifier l'info" : "Publier une info"}
            </Dialog.Title>
            <Dialog.Close
              className="hover:bg-surface-2 -mt-1 -mr-2 inline-flex size-12 items-center justify-center rounded-lg"
              aria-label="Fermer"
            >
              <X aria-hidden className="size-5" />
            </Dialog.Close>
          </div>
          <p id="info-desc" className="text-ink-muted mb-4 text-sm">
            Tout le monde la verra sur l&apos;Accueil et dans « Infos », avec la date de mise à
            jour.
          </p>
          <form
            noValidate
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              start(async () => {
                const res = info
                  ? await updateInfo({ id: info.id, titre, contenu, epingle })
                  : await createInfo({ titre, contenu, epingle });
                if (!res.ok)
                  return setError(res.fieldErrors?.titre ?? res.fieldErrors?.contenu ?? res.error);
                setOpen(false);
                if (!info) {
                  setTitre("");
                  setContenu("");
                  setEpingle(false);
                }
                router.refresh();
              });
            }}
          >
            <FormError message={error} />
            <div className="space-y-1.5">
              <label htmlFor="info-titre" className="text-sm font-medium">
                Titre
              </label>
              <input
                id="info-titre"
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                maxLength={160}
                autoFocus
                className="border-line-strong bg-surface min-h-12 w-full rounded-xl border px-4 text-base"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="info-contenu" className="text-sm font-medium">
                Texte
              </label>
              <textarea
                id="info-contenu"
                rows={7}
                value={contenu}
                onChange={(e) => setContenu(e.target.value)}
                maxLength={10000}
                className="border-line-strong bg-surface w-full rounded-xl border px-4 py-3 text-base"
              />
              <p className="text-ink-muted text-xs">
                Une ligne commençant par « - » fait une puce ; **gras** pour insister.
              </p>
            </div>
            <label className="border-line-strong bg-surface flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3 text-sm">
              <input
                type="checkbox"
                checked={epingle}
                onChange={(e) => setEpingle(e.target.checked)}
                className="accent-accent-strong size-5"
              />
              Épingler en haut (reste visible en premier)
            </label>
            <Button
              type="submit"
              loading={pending}
              disabled={titre.trim() === ""}
              className="min-h-12 w-full"
            >
              {info ? "Enregistrer" : "Publier"}
            </Button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
