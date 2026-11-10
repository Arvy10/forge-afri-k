"use client";

import { useCallback, useOptimistic, useState, useTransition } from "react";
import { movePost, setPostStatus } from "@/actions/posts";
import type { PostStatus } from "@/lib/constants";
import type { ISODate } from "@/lib/dates";
import type { PostRow } from "@/lib/database.types";

type Action =
  { kind: "status"; id: string; statut: PostStatus } | { kind: "move"; id: string; date: ISODate };

/**
 * Changements de statut et déplacements « optimistes » : l'écran réagit tout de suite,
 * puis revient en arrière avec un message si le serveur refuse.
 */
export function usePostMutations(posts: PostRow[]) {
  const [optimisticPosts, apply] = useOptimistic(posts, (state: PostRow[], a: Action) =>
    state.map((p) =>
      p.id !== a.id ? p : a.kind === "status" ? { ...p, statut: a.statut } : { ...p, date: a.date },
    ),
  );
  const [, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const setStatus = useCallback(
    (id: string, statut: PostStatus) => {
      setError(null);
      start(async () => {
        apply({ kind: "status", id, statut });
        const res = await setPostStatus({ id, statut });
        if (!res.ok) setError(res.error);
      });
    },
    [apply],
  );

  const move = useCallback(
    (id: string, date: ISODate) => {
      setError(null);
      start(async () => {
        apply({ kind: "move", id, date });
        const res = await movePost({ id, date });
        if (!res.ok) setError(res.error);
      });
    },
    [apply],
  );

  return { posts: optimisticPosts, setStatus, move, error, clearError: () => setError(null) };
}
