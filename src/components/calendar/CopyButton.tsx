"use client";

import { useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/cn";

/** Copie un texte dans le presse-papiers (avec une solution de secours pour les vieux navigateurs). */
export function CopyButton({ text, label = "Copier" }: { text: string; label?: string }) {
  const [state, setState] = useState<"idle" | "done" | "error">("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const flash = (next: "done" | "error") => {
    setState(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2200);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      return flash("done");
    } catch {
      /* on essaie la méthode de secours ci-dessous */
    }
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.cssText = "position:fixed;opacity:0;top:0;left:0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      flash(ok ? "done" : "error");
    } catch {
      flash("error");
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-5 text-base font-semibold transition-colors",
        state === "done"
          ? "bg-t-impact-bg text-t-impact-fg border-[var(--success)]"
          : "border-line-strong bg-surface hover:bg-surface-2",
      )}
    >
      {state === "done" ? (
        <Check aria-hidden className="size-5" />
      ) : (
        <Copy aria-hidden className="size-5" />
      )}
      <span aria-live="polite">
        {state === "done"
          ? "Copié !"
          : state === "error"
            ? "Copie impossible : sélectionne le texte"
            : label}
      </span>
    </button>
  );
}
