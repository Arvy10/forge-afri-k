import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { SlotSection } from "@/components/calendar/SlotSection";
import { TypePill } from "@/components/ui/TypePill";
import { dayHeadline, splitSlots } from "@/lib/calendar";
import { CONTENT_TYPE_META } from "@/lib/constants";
import { formatDayLong, isISODate, todayISO } from "@/lib/dates";
import { getDays } from "@/server/calendar";
import { requireSession } from "@/server/session";
import { getWorkers } from "@/server/team";

export const metadata: Metadata = { title: "Fiche du jour" };

const nav =
  "border-line-strong bg-surface hover:bg-surface-2 inline-flex min-h-12 items-center gap-2 rounded-xl border px-4 text-base font-semibold";

export default async function DayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!isISODate(date)) notFound();
  const auth = await requireSession();
  const [days, people] = await Promise.all([getDays(), getWorkers()]);
  const i = days.findIndex((d) => d.date === date);
  const day = days[i];
  if (!day) notFound();
  const prev = days[i - 1];
  const next = days[i + 1];
  const today = todayISO();
  const { main, extra } = splitSlots(day);
  const readOnly = auth.isObserver && !auth.isAdmin;
  const me = { id: readOnly ? null : auth.memberId, isAdmin: auth.isAdmin, readOnly };

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href={`/calendrier?semaine=${day.semaine}`}
        className="text-accent-strong mb-4 inline-flex min-h-12 items-center gap-1.5 text-base font-semibold underline-offset-4 hover:underline"
      >
        <ChevronLeft aria-hidden className="size-5" />
        Calendrier · semaine {day.semaine}
      </Link>

      <header className="mb-6">
        <p className="text-ink-muted text-base font-medium">
          <span className="inline-flex items-center gap-2">
            <CalendarDays aria-hidden className="size-4 shrink-0" />
            <span className="first-letter:uppercase">{formatDayLong(day.date)}</span>
          </span>
          <span className="block sm:ml-2 sm:inline">
            <span aria-hidden className="hidden sm:inline">
              ·{" "}
            </span>
            Semaine {day.semaine} : {day.theme_semaine}
          </span>
        </p>
        <h1 className="font-display mt-2 flex flex-wrap items-center gap-3 text-3xl leading-tight font-bold md:text-4xl">
          {dayHeadline(day, CONTENT_TYPE_META[day.type_de_contenu].label, today)}
          <TypePill type={day.type_de_contenu} className="text-sm" />
        </h1>
        <span aria-hidden className="bg-accent mt-3 block h-1 w-12 rounded-full" />
        <p className="mt-3 text-lg">{day.consigne_du_jour}</p>
      </header>

      <div className="space-y-6">
        {main && <SlotSection day={day} slot={main} people={people} me={me} today={today} />}
        {extra && <SlotSection day={day} slot={extra} people={people} me={me} today={today} />}
      </div>

      <nav
        aria-label="Jour précédent ou suivant"
        className="mt-8 flex flex-wrap justify-between gap-3"
      >
        {prev ? (
          <Link href={`/calendrier/${prev.date}`} className={nav}>
            <ChevronLeft aria-hidden className="size-5" />
            {prev.jour} {prev.date.split("-").reverse().slice(0, 2).join("/")}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={`/calendrier/${next.date}`} className={nav}>
            {next.jour} {next.date.split("-").reverse().slice(0, 2).join("/")}
            <ChevronRight aria-hidden className="size-5" />
          </Link>
        )}
      </nav>
    </div>
  );
}
