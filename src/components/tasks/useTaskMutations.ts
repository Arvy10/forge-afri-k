"use client";

import { useCallback, useOptimistic, useState, useTransition } from "react";
import { setTaskStatus } from "@/actions/tasks";
import type { TaskStatus } from "@/lib/constants";

type Statused = { id: string; statut: TaskStatus; fait_le: string | null };

/** Cocher / changer le statut : l'écran réagit tout de suite, puis revient en arrière si le serveur refuse. */
export function useTaskMutations<T extends Statused>(tasks: T[]) {
  const [optimistic, apply] = useOptimistic(
    tasks,
    (state: T[], a: { id: string; statut: TaskStatus }) =>
      state.map((t) =>
        t.id === a.id
          ? {
              ...t,
              statut: a.statut,
              fait_le: a.statut === "fait" ? new Date().toISOString() : null,
            }
          : t,
      ),
  );
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  const setStatus = useCallback(
    (id: string, statut: TaskStatus) => {
      setError(null);
      start(async () => {
        apply({ id, statut });
        const res = await setTaskStatus({ id, statut });
        if (!res.ok) setError(res.error);
      });
    },
    [apply],
  );

  return { tasks: optimistic, setStatus, error, clearError: () => setError(null) };
}
