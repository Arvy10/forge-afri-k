"use client";

import { BellRing, Check } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { setInterest } from "@/actions/interest";
import { Button } from "./Button";

export function NotifyButton({
  feature,
  initial,
}: {
  feature: "bibliotheque" | "reunions" | "resultats";
  initial: boolean;
}) {
  const [saved, setSaved] = useState(initial);
  const [optimistic, setOptimistic] = useOptimistic(saved);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  return (
    <div className="space-y-2">
      <Button
        variant={optimistic ? "secondary" : "primary"}
        aria-pressed={optimistic}
        onClick={() => {
          const next = !optimistic;
          setError(null);
          start(async () => {
            setOptimistic(next);
            const res = await setInterest(feature, next);
            if (res.ok) setSaved(next);
            else setError(res.error);
          });
        }}
      >
        {optimistic ? (
          <Check aria-hidden className="size-4" />
        ) : (
          <BellRing aria-hidden className="size-4" />
        )}
        {optimistic ? "C'est noté" : "Me prévenir quand c'est prêt"}
      </Button>
      {optimistic && (
        <p className="text-ink-muted text-xs">
          On a noté ton intérêt. Clique à nouveau pour le retirer.
        </p>
      )}
      {error && (
        <p role="alert" className="text-danger text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
