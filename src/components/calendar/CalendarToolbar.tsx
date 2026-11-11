"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Filter, X } from "lucide-react";
import {
  CHANNELS,
  CHANNEL_LABEL,
  CONTENT_TYPES,
  CONTENT_TYPE_META,
  POST_STATUSES,
  POST_STATUS_LABEL,
} from "@/lib/constants";
import {
  calendarHref,
  hasFilters,
  shiftDate,
  VIEWS,
  type CalendarQuery,
  type View,
} from "@/lib/calendar-params";
import { cn } from "@/lib/cn";
import { buttonClass } from "@/components/ui/Button";
import type { MemberLite } from "@/lib/members";

const VIEW_LABEL: Record<View, string> = { semaine: "Semaine", mois: "Mois", liste: "Liste" };

export function CalendarToolbar({
  query,
  today,
  periodLabel,
  people,
}: {
  query: CalendarQuery;
  today: string;
  periodLabel: string;
  people: MemberLite[];
}) {
  const router = useRouter();
  const go = (patch: Parameters<typeof calendarHref>[1]) =>
    router.replace(calendarHref(query, { ...patch, post: null, d: null }), { scroll: false });
  const nav =
    "border-line-strong bg-surface hover:bg-surface-2 inline-flex size-11 items-center justify-center rounded-lg border";
  const select =
    "border-line-strong bg-surface text-ink min-h-11 w-full rounded-lg border px-3 text-base md:text-sm";
  const filtersOn = hasFilters(query);

  return (
    <div className="mb-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Sélecteur de vue */}
        <nav
          aria-label="Vue du calendrier"
          className="border-line-strong bg-surface inline-flex rounded-lg border p-0.5"
        >
          {VIEWS.map((v) => (
            <Link
              key={v}
              href={calendarHref(query, { vue: v, post: null, d: null })}
              aria-current={query.vue === v ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center rounded-md px-4 text-sm font-semibold",
                query.vue === v ? "bg-forest text-on-forest" : "text-ink-muted hover:text-ink",
              )}
            >
              {VIEW_LABEL[v]}
            </Link>
          ))}
        </nav>

        {/* Précédent / aujourd'hui / suivant */}
        <div className="flex items-center gap-2">
          <Link
            href={calendarHref(query, { date: shiftDate(query, -1), post: null, d: null })}
            className={nav}
            aria-label="Période précédente"
          >
            <ChevronLeft aria-hidden className="size-5" />
          </Link>
          <Link
            href={calendarHref(query, { date: today, post: null, d: null })}
            className={buttonClass("secondary")}
          >
            Aujourd&apos;hui
          </Link>
          <Link
            href={calendarHref(query, { date: shiftDate(query, 1), post: null, d: null })}
            className={nav}
            aria-label="Période suivante"
          >
            <ChevronRight aria-hidden className="size-5" />
          </Link>
        </div>
      </div>

      <p className="font-display text-lg font-semibold first-letter:uppercase" aria-live="polite">
        {periodLabel}
      </p>

      <details className="group" open={filtersOn || undefined}>
        <summary className="text-ink-muted hover:text-ink flex min-h-11 w-fit list-none items-center gap-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">
          <Filter aria-hidden className="size-4" />
          Filtres
          {filtersOn && (
            <span className="bg-accent-strong text-on-accent rounded-full px-2 py-0.5 text-[11px]">
              actifs
            </span>
          )}
        </summary>
        <div className="mt-2 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <label className="space-y-1 text-xs font-medium">
            Type de contenu
            <select
              className={select}
              value={query.type ?? ""}
              onChange={(e) => go({ type: (e.target.value || null) as never })}
            >
              <option value="">Tous</option>
              {CONTENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {CONTENT_TYPE_META[t].label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium">
            Canal
            <select
              className={select}
              value={query.canal ?? ""}
              onChange={(e) => go({ canal: (e.target.value || null) as never })}
            >
              <option value="">Tous</option>
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {CHANNEL_LABEL[c]}
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
              {POST_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {POST_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium">
            Responsable
            <select
              className={select}
              value={query.resp ?? ""}
              onChange={(e) => go({ resp: e.target.value || null })}
            >
              <option value="">Tous</option>
              <option value="moi">Moi</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          {filtersOn && (
            <div className="flex items-end">
              <Link
                href={calendarHref({ vue: query.vue, date: query.date }, {})}
                className="text-accent-strong inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold underline underline-offset-4"
              >
                <X aria-hidden className="size-4" />
                Effacer les filtres
              </Link>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
