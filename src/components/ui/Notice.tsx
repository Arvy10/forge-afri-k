"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/cn";

/** Bandeau d'erreur qui disparaît tout seul (changement de statut, déplacement, etc.). */
export function Notice({
  message,
  onClose,
  tone = "error",
}: {
  message: string | null;
  onClose: () => void;
  tone?: "error" | "info";
}) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 7000);
    return () => clearTimeout(t);
  }, [message, onClose]);
  if (!message) return null;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "mb-3 flex items-start justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
        tone === "error" ? "bg-danger-soft text-danger" : "bg-accent-soft text-ink",
      )}
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer le message"
        className="-m-2 inline-flex size-11 shrink-0 items-center justify-center rounded-lg"
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  );
}
