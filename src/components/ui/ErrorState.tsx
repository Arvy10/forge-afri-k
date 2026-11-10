"use client";

import { Button } from "./Button";
import { Illustration } from "./Illustration";

/** État d'erreur : message clair + possibilité de réessayer. */
export function ErrorState({
  title = "Quelque chose n'a pas fonctionné",
  description = "Vérifie ta connexion puis réessaie. Si le problème continue, préviens l'ambassadeur.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="border-line-strong flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-12 text-center"
    >
      <Illustration kind="error" />
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="text-ink-muted max-w-md text-sm">{description}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Réessayer
        </Button>
      )}
    </div>
  );
}
