import "server-only";
import { unstable_rethrow } from "next/navigation";
import type { ZodError } from "zod";

export type ActionResult<T = undefined> =
  { ok: true; data?: T } | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Erreur dont le message peut être montré tel quel à la personne. */
export class ActionError extends Error {}

export function fieldErrorsOf(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

export function invalid(error: ZodError): ActionResult<never> {
  return {
    ok: false,
    error: "Certains champs sont à corriger.",
    fieldErrors: fieldErrorsOf(error),
  };
}

/** Enveloppe une action : renvoie un message clair au lieu de planter, laisse passer les redirections. */
export async function safeAction<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (e) {
    unstable_rethrow(e);
    if (e instanceof ActionError) return { ok: false, error: e.message };
    console.error("[action]", e);
    return { ok: false, error: "Une erreur est survenue. Réessaie dans un instant." };
  }
}
