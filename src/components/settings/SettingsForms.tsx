"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { KeyRound, LogOut } from "lucide-react";
import { changeAccessCode, signOutEveryone } from "@/actions/settings";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Field";

function Ok({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <p
      role="status"
      className="bg-t-impact-bg text-t-impact-fg rounded-lg px-3 py-2.5 text-sm font-medium"
    >
      {text}
    </p>
  );
}

/** Changer le code d'accès / déconnecter tout le monde. */
export function AccessCodeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [confirmAll, setConfirmAll] = useState(false);

  return (
    <div className="space-y-5">
      <form
        noValidate
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          setOk(null);
          start(async () => {
            const res = await changeAccessCode({ code, confirm });
            if (!res.ok)
              return setError(res.fieldErrors?.code ?? res.fieldErrors?.confirm ?? res.error);
            setCode("");
            setConfirm("");
            setOk("Code changé. Les autres appareils devront saisir le nouveau code.");
            router.refresh();
          });
        }}
      >
        <FormError message={error} />
        <Ok text={ok} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="new-code" className="text-sm font-medium">
              Nouveau code d&apos;accès
            </label>
            <input
              id="new-code"
              type="password"
              autoComplete="new-password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="border-line-strong bg-canvas min-h-12 w-full rounded-xl border px-4 text-base"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="confirm-code" className="text-sm font-medium">
              Confirme le code
            </label>
            <input
              id="confirm-code"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="border-line-strong bg-canvas min-h-12 w-full rounded-xl border px-4 text-base"
            />
          </div>
        </div>
        <p className="text-ink-muted text-xs">
          6 caractères minimum. Le code est enregistré haché : personne, pas même
          l&apos;administrateur, ne peut le relire. Choisis-en un facile à dire à voix haute.
        </p>
        <Button
          type="submit"
          loading={pending}
          disabled={code === "" || confirm === ""}
          className="min-h-12"
        >
          <KeyRound aria-hidden className="size-4" />
          Changer le code
        </Button>
      </form>

      <div className="border-line border-t pt-4">
        <p className="mb-2 text-sm font-medium">Un appareil perdu ou un code qui a fuité ?</p>
        {confirmAll ? (
          <Button
            variant="danger"
            loading={pending}
            className="min-h-12"
            onClick={() =>
              start(async () => {
                const res = await signOutEveryone();
                if (!res.ok) return setError(res.error);
                setConfirmAll(false);
                setOk("Tout le monde est déconnecté (sauf toi). Pense aussi à changer le code.");
                router.refresh();
              })
            }
          >
            Confirmer : déconnecter tout le monde
          </Button>
        ) : (
          <Button variant="secondary" className="min-h-12" onClick={() => setConfirmAll(true)}>
            <LogOut aria-hidden className="size-4" />
            Déconnecter tous les appareils
          </Button>
        )}
      </div>
    </div>
  );
}
