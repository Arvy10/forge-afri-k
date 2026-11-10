"use client";

import { Plus } from "lucide-react";

/** Bouton flottant (mobile) : place le curseur dans la ligne de création rapide. */
export function QuickAddFab() {
  return (
    <button
      type="button"
      aria-label="Ajouter une tâche"
      onClick={() => {
        const input = document.getElementById("quick-title") as HTMLInputElement | null;
        input?.scrollIntoView({ behavior: "smooth", block: "center" });
        input?.focus();
      }}
      className="bg-accent-strong text-on-accent fixed right-4 bottom-20 z-20 inline-flex size-14 items-center justify-center rounded-full shadow-lg md:hidden"
    >
      <Plus aria-hidden className="size-6" />
    </button>
  );
}
