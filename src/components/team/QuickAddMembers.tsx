"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Plus, UserPlus, X } from "lucide-react";
import { addMembersQuick } from "@/actions/members";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Field";

/** Ajout rapide : tape un prénom, Entrée, le suivant… puis « Ajouter ». */
export function QuickAddMembers({ autoFocus }: { autoFocus?: boolean }) {
  const router = useRouter();
  const [names, setNames] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLInputElement>(null);

  const push = () => {
    // Plusieurs prénoms collés d'un coup (séparés par virgule, point-virgule ou retour à la ligne)
    const parts = text
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    setNames((n) => [...n, ...parts]);
    setText("");
    ref.current?.focus();
  };

  return (
    <section
      aria-labelledby="ajout-membres"
      className="bg-surface border-line shadow-card mb-6 rounded-2xl border p-4 md:p-5"
    >
      <h2 id="ajout-membres" className="font-display flex items-center gap-2.5 text-lg font-bold">
        <span className="bg-accent-soft text-accent-strong inline-flex size-9 items-center justify-center rounded-xl">
          <UserPlus aria-hidden className="size-[18px]" />
        </span>
        Ajouter des membres
      </h2>
      <p className="text-ink-muted mt-1 text-sm">
        Tape un prénom puis Entrée, le suivant, etc. Avec un nom de famille si besoin : « Marie
        Dupont ».
      </p>

      <FormError message={error} />

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          push();
        }}
      >
        <label htmlFor="quick-prenom" className="sr-only">
          Prénom
        </label>
        <input
          id="quick-prenom"
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus={autoFocus}
          autoComplete="off"
          enterKeyHint="next"
          placeholder="Prénom"
          maxLength={100}
          className="border-line-strong bg-canvas min-h-12 min-w-0 flex-1 rounded-xl border px-4 text-base"
        />
        <Button
          type="submit"
          variant="secondary"
          disabled={text.trim() === ""}
          className="min-h-12"
        >
          <Plus aria-hidden className="size-4" />
          <span className="max-sm:sr-only">Suivant</span>
        </Button>
      </form>

      {names.length > 0 && (
        <>
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Membres à ajouter">
            {names.map((n, i) => (
              <li
                key={`${n}-${i}`}
                className="bg-accent-soft text-ink flex min-h-10 items-center gap-1 rounded-full py-1 pr-1 pl-4 text-sm font-semibold"
              >
                {n}
                <button
                  type="button"
                  aria-label={`Retirer ${n}`}
                  onClick={() => setNames((all) => all.filter((_, j) => j !== i))}
                  className="hover:bg-canvas/60 inline-flex size-9 items-center justify-center rounded-full"
                >
                  <X aria-hidden className="size-4" />
                </button>
              </li>
            ))}
          </ul>
          <Button
            className="mt-4 min-h-12"
            loading={pending}
            onClick={() => {
              setError(null);
              start(async () => {
                const res = await addMembersQuick(names);
                if (!res.ok) return setError(res.fieldErrors?._ ?? res.error);
                setNames([]);
                router.replace("/equipe");
                router.refresh();
              });
            }}
          >
            Ajouter {names.length} {names.length > 1 ? "membres" : "membre"}
          </Button>
        </>
      )}
    </section>
  );
}
