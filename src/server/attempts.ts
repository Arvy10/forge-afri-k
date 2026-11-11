/**
 * Limite d'essais du code (pure, testable).
 * 5 échecs d'affilée → blocage de 5 minutes. Le compteur repart de zéro après 15 minutes sans échec.
 */
export const MAX_TRIES = 5;
export const LOCK_MINUTES = 5;
export const WINDOW_MINUTES = 15;

export type AttemptState = { tries: number; window_start: string; locked_until: string | null };

const min = (n: number) => n * 60_000;

/** Combien de minutes (arrondies au-dessus) reste-t-il de blocage ? 0 = pas bloqué. */
export function lockedMinutes(state: AttemptState | null, now: Date): number {
  if (!state?.locked_until) return 0;
  const left = new Date(state.locked_until).getTime() - now.getTime();
  return left > 0 ? Math.ceil(left / 60_000) : 0;
}

/** État après un échec. */
export function afterFailure(state: AttemptState | null, now: Date): AttemptState {
  const expired =
    !state ||
    now.getTime() - new Date(state.window_start).getTime() > min(WINDOW_MINUTES) ||
    (state.locked_until !== null && new Date(state.locked_until).getTime() <= now.getTime());
  const tries = (expired ? 0 : state.tries) + 1;
  const window_start = expired ? now.toISOString() : state!.window_start;
  if (tries >= MAX_TRIES) {
    return {
      tries: 0,
      window_start: now.toISOString(),
      locked_until: new Date(now.getTime() + min(LOCK_MINUTES)).toISOString(),
    };
  }
  return { tries, window_start, locked_until: null };
}

/** Essais restants avant blocage, après l'état donné. */
export function triesLeft(state: AttemptState): number {
  return Math.max(0, MAX_TRIES - state.tries);
}
