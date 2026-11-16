import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { DayCard } from "@/components/calendar/DayCard";
import { PresentationView } from "@/components/calendar/PresentationView";
import { TypeLegend } from "@/components/calendar/TypeLegend";
import { WeekNav } from "@/components/calendar/WeekNav";
import { buttonClass } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { defaultWeek, groupWeeks } from "@/lib/calendar";
import { cn } from "@/lib/cn";
import { buildPresentation } from "@/lib/presentation";
import { formatDayLong, todayISO } from "@/lib/dates";
import { getDays } from "@/server/calendar";
import { requireSession } from "@/server/session";
import { getActiveTeam } from "@/server/team";

export const metadata: Metadata = { title: "Calendrier éditorial" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CalendarPage({ searchParams }: { searchParams: SearchParams }) {
  const auth = await requireSession();
  const today = todayISO();
  const [days, team, sp] = await Promise.all([getDays(), getActiveTeam(), searchParams]);
  const weeks = groupWeeks(days);

  if (weeks.length === 0)
    return (
      <>
        <PageHeader title="Calendrier éditorial" />
        <EmptyState
          illustration="calendar"
          title="Le calendrier est vide"
          description="Aucun jour n'a encore été chargé."
        />
      </>
    );

  const presentation = (Array.isArray(sp.vue) ? sp.vue[0] : sp.vue) === "presentation";
  const raw = Array.isArray(sp.semaine) ? sp.semaine[0] : sp.semaine;
  const asked = raw ? weeks.find((w) => String(w.semaine) === raw) : undefined;
  const week = asked ?? defaultWeek(weeks, today)!;
  const people = new Map(team.map((m) => [m.id, m]));
  const first = weeks[0]!.from;
  const last = weeks[weeks.length - 1]!.to;

  return (
    <>
      <PageHeader
        title="Calendrier éditorial"
        description={`Du ${formatDayLong(first)} au ${formatDayLong(last)} : un post obligatoire par jour sur les trois réseaux, et un petit post en plus si on peut.`}
        actions={
          auth.isAdmin ? (
            <Link
              href="/calendrier/export"
              prefetch={false}
              className={buttonClass("secondary", "min-h-12")}
            >
              <Download aria-hidden className="size-4" />
              Exporter en CSV
            </Link>
          ) : undefined
        }
      />

      <nav
        aria-label="Choisir la vue"
        className="border-line-strong bg-surface mb-4 inline-flex gap-1 rounded-xl border p-1"
      >
        {[
          ["planning", "Planning", "/calendrier"],
          ["presentation", "Présentation", "/calendrier?vue=presentation"],
        ].map(([id, label, href]) => (
          <Link
            key={id}
            href={href!}
            aria-current={(presentation ? "presentation" : "planning") === id ? "page" : undefined}
            className={cn(
              "inline-flex min-h-12 items-center rounded-lg px-5 text-base font-semibold",
              (presentation ? "presentation" : "planning") === id
                ? "bg-forest text-on-forest"
                : "text-ink-muted hover:bg-surface-2",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>

      {presentation ? (
        <PresentationView weeks={buildPresentation(weeks)} />
      ) : (
        <div className="space-y-4">
          <TypeLegend />
          <WeekNav weeks={weeks} current={week} />

          <header>
            <h2 className="font-display text-2xl font-bold">
              Semaine {week.semaine} <span className="text-ink-muted font-medium">·</span>{" "}
              <span className="text-accent-strong">{week.theme}</span>
            </h2>
          </header>

          <ul className="stagger grid grid-cols-1 gap-4 lg:grid-cols-2">
            {week.days.map((day) => (
              <li key={day.id} className="min-w-0">
                <DayCard day={day} people={people} today={today} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
