"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const EVERY_MS = 30_000;

/**
 * Actualisation légère : toutes les 30 secondes (onglet visible) et dès qu'on revient sur l'onglet,
 * pour que chacun voie l'avancement des autres. Ne perd rien de ce qui est en cours de saisie.
 */
export function LiveRefresh() {
  const router = useRouter();
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible" && navigator.onLine) router.refresh();
    };
    const id = setInterval(refresh, EVERY_MS);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("online", refresh);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("online", refresh);
    };
  }, [router]);
  return null;
}
