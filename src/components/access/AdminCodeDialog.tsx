"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ShieldCheck, X } from "lucide-react";
import { enterAdminMode } from "@/actions/access";
import { Button, buttonClass } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Field";

/** Saisie du code administrateur (second code, connu seulement de l'ambassadeur). */
export function AdminCodeDialog({
  trigger,
  triggerClassName,
  onDoneHref,
}: {
  trigger: React.ReactNode;
  triggerClassName?: string;
  /** Page à ouvrir une fois le mode administrateur activé (sinon on reste sur place). */
  onDoneHref?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setCode("");
          setError(null);
        }
      }}
    >
      <Dialog.Trigger className={triggerClassName ?? buttonClass("secondary")}>
        {trigger}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="rx-overlay fixed inset-0 z-[60] bg-black/50" />
        <Dialog.Content
          aria-describedby="admin-desc"
          className="rx-dialog bg-canvas text-ink fixed inset-x-0 bottom-0 z-[70] rounded-t-2xl p-5 shadow-2xl md:inset-auto md:top-1/2 md:left-1/2 md:w-[26rem] md:max-w-[92vw] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <Dialog.Title className="font-display flex items-center gap-2 text-xl font-bold">
              <ShieldCheck aria-hidden className="text-accent-strong size-5" />
              Mode administrateur
            </Dialog.Title>
            <Dialog.Close
              className="hover:bg-surface-2 -mt-1 -mr-2 inline-flex size-12 items-center justify-center rounded-lg"
              aria-label="Fermer"
            >
              <X aria-hidden className="size-5" />
            </Dialog.Close>
          </div>
          <p id="admin-desc" className="text-ink-muted mb-4 text-sm">
            Entre le code administrateur. Le mode reste actif 12 heures.
          </p>
          <form
            noValidate
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              start(async () => {
                const res = await enterAdminMode({ code });
                if (!res.ok) return setError(res.fieldErrors?.code ?? res.error);
                setOpen(false);
                if (onDoneHref) router.push(onDoneHref);
                else router.refresh();
              });
            }}
          >
            <FormError message={error} />
            <div className="space-y-1.5">
              <label htmlFor="admin-code" className="text-sm font-medium">
                Code administrateur
              </label>
              <input
                id="admin-code"
                type="password"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoComplete="off"
                autoFocus
                className="border-line-strong bg-surface min-h-12 w-full rounded-xl border px-4 text-base"
              />
            </div>
            <Button
              type="submit"
              loading={pending}
              disabled={code.trim() === ""}
              className="min-h-12 w-full"
            >
              Activer
            </Button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
