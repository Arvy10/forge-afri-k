"use client";

import { Moon, Sun } from "lucide-react";
import { IconButton } from "@/components/ui/Button";

function currentTheme(): "light" | "dark" {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

/** Interrupteur clair / sombre. Clair par défaut ; le choix est mémorisé dans un cookie pour éviter le flash au chargement. */
export function ThemeToggle({ className }: { className?: string }) {
  return (
    <IconButton
      label="Changer de thème (clair ou sombre)"
      className={className}
      onClick={() => {
        const next = currentTheme() === "dark" ? "light" : "dark";
        document.documentElement.dataset.theme = next;
        document.cookie = `theme=${next}; path=/; max-age=31536000; samesite=lax`;
      }}
    >
      <Sun aria-hidden className="theme-icon-sun size-5" />
      <Moon aria-hidden className="theme-icon-moon size-5" />
    </IconButton>
  );
}
