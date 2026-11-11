import { describe, expect, it } from "vitest";
import {
  afterFailure,
  lockedMinutes,
  MAX_TRIES,
  triesLeft,
  type AttemptState,
} from "@/server/attempts";

const T0 = new Date("2026-11-11T10:00:00Z");
const after = (min: number) => new Date(T0.getTime() + min * 60_000);

describe("limite d'essais", () => {
  it("compte les échecs et annonce les essais restants", () => {
    let state: AttemptState | null = null;
    const left: number[] = [];
    for (let i = 0; i < MAX_TRIES - 1; i++) {
      state = afterFailure(state, after(i));
      left.push(triesLeft(state));
      expect(lockedMinutes(state, after(i))).toBe(0);
    }
    expect(left).toEqual([4, 3, 2, 1]);
  });
  it("5 échecs d'affilée : blocage de 5 minutes", () => {
    let state: AttemptState | null = null;
    for (let i = 0; i < 5; i++) state = afterFailure(state, after(i / 10));
    expect(lockedMinutes(state, after(0.5))).toBe(5);
    expect(lockedMinutes(state, after(3))).toBeGreaterThan(0);
    expect(lockedMinutes(state, after(5.6))).toBe(0); // blocage terminé
  });
  it("après le blocage, le compteur repart de zéro", () => {
    let state: AttemptState | null = null;
    for (let i = 0; i < 5; i++) state = afterFailure(state, after(0));
    const next = afterFailure(state, after(6));
    expect(next.tries).toBe(1);
    expect(next.locked_until).toBeNull();
  });
  it("après 15 minutes sans échec, le compteur est remis à zéro", () => {
    let state = afterFailure(null, after(0));
    state = afterFailure(state, after(1));
    expect(state.tries).toBe(2);
    expect(afterFailure(state, after(20)).tries).toBe(1);
  });
  it("pas de blocage sans échec enregistré", () => {
    expect(lockedMinutes(null, T0)).toBe(0);
  });
});
