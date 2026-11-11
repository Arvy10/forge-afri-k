"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { TASK_STATUSES, TASK_STATUS_LABEL } from "@/lib/constants";
import type { MemberLite } from "@/lib/members";
import { hasTaskFilters, tasksHref, type TaskQuery } from "@/lib/tasks-params";
import { cn } from "@/lib/cn";

const DUE_LABEL = {
  retard: "En retard",
  semaine: "Cette semaine",
  plus_tard: "Plus tard",
  sans: "Sans date",
} as const;

export function TaskFilters({
  query,
  members,
  canUseMe,
}: {
  query: TaskQuery;
  members: MemberLite[];
  canUseMe: boolean;
}) {
  const router = useRouter();
  const go = (patch: Parameters<typeof tasksHref>[1]) =>
    router.replace(tasksHref(query, patch), { scroll: false });
  const select =
    "border-line-strong bg-surface min-h-12 w-full rounded-xl border px-3 text-base md:text-sm";
  const seg = (active: boolean) =>
    cn(
      "inline-flex min-h-12 items-center rounded-lg px-4 text-sm font-semibold",
      active ? "bg-forest text-on-forest" : "text-ink-muted hover:text-ink",
    );

  return (
    <div className="mb-5 space-y-3">
      <nav
        aria-label="Affichage"
        className="border-line-strong bg-surface inline-flex rounded-xl border p-1"
      >
        <Link
          href={tasksHref(query, { vue: "liste" })}
          aria-current={query.vue === "liste" ? "page" : undefined}
          className={seg(query.vue === "liste")}
        >
          Liste
        </Link>
        <Link
          href={tasksHref(query, { vue: "kanban" })}
          aria-current={query.vue === "kanban" ? "page" : undefined}
          className={seg(query.vue === "kanban")}
        >
          Kanban
        </Link>
      </nav>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <label className="space-y-1 text-xs font-medium">
          Pour
          <select
            className={select}
            value={query.membre ?? ""}
            onChange={(e) => go({ membre: e.target.value || null })}
          >
            <option value="">Toute l&apos;équipe</option>
            {canUseMe && <option value="moi">Moi</option>}
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs font-medium">
          Statut
          <select
            className={select}
            value={query.statut ?? ""}
            onChange={(e) => go({ statut: (e.target.value || null) as never })}
          >
            <option value="">Tous</option>
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {TASK_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs font-medium">
          Échéance
          <select
            className={select}
            value={query.ech ?? ""}
            onChange={(e) => go({ ech: (e.target.value || null) as never })}
          >
            <option value="">Toutes</option>
            {(Object.keys(DUE_LABEL) as (keyof typeof DUE_LABEL)[]).map((k) => (
              <option key={k} value={k}>
                {DUE_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
        {hasTaskFilters(query) && (
          <div className="flex items-end">
            <Link
              href={tasksHref({ vue: query.vue })}
              className="text-accent-strong inline-flex min-h-12 items-center gap-1.5 text-sm font-semibold underline underline-offset-4"
            >
              <X aria-hidden className="size-4" />
              Effacer
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
