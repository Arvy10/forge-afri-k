import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Download, Plus } from "lucide-react";
import { CalendarToolbar } from "@/components/calendar/CalendarToolbar";
import { ImportDialog } from "@/components/calendar/ImportDialog";
import { ListView } from "@/components/calendar/ListView";
import { MonthGrid } from "@/components/calendar/MonthGrid";
import { PostSheet } from "@/components/calendar/PostSheet";
import { TypeLegend } from "@/components/calendar/TypeLegend";
import { WeekBoard } from "@/components/calendar/WeekBoard";
import { buttonClass } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { requireMember } from "@/lib/auth";
import {
  calendarHref,
  parseCalendarQuery,
  rangeFor,
  type CalendarQuery,
} from "@/lib/calendar-params";
import { DEFAULT_PUBLISH_TIME } from "@/lib/constants";
import { getTeam, toLite, type PersonLite } from "@/lib/data";
import {
  addDaysISO,
  defaultPrepDate,
  defaultTypeForDate,
  formatMonthYear,
  formatWeekRange,
  isoWeekday,
  startOfWeekISO,
  todayISO,
  workWeekISO,
} from "@/lib/dates";
import { fetchPostDetail, fetchPosts } from "@/lib/posts-data";
import type { PostInput } from "@/lib/schemas";

export const metadata: Metadata = { title: "Calendrier éditorial" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function periodLabel(q: CalendarQuery): string {
  if (q.vue === "semaine") return `Semaine ${formatWeekRange(startOfWeekISO(q.date))}`;
  if (q.vue === "mois") return formatMonthYear(q.date);
  return `${formatMonthYear(q.date)} · par semaine`;
}

export default async function CalendarPage({ searchParams }: { searchParams: SearchParams }) {
  const { profile, isAdmin } = await requireMember();
  const today = todayISO();
  const query = parseCalendarQuery(await searchParams, today);
  const team = await getTeam();
  const people = team.filter((m) => m.active).map(toLite);
  const me = { id: profile.id, isAdmin };

  // Clé de la zone principale : ne change pas quand on ouvre ou ferme une fiche.
  const bodyKey = [query.vue, query.date, query.type, query.canal, query.statut, query.resp].join(
    "|",
  );

  return (
    <>
      <PageHeader
        title="Calendrier éditorial"
        description={<>5 posts par semaine · Publication à 8h00 · Instagram, TikTok, Facebook</>}
        actions={
          <>
            {isAdmin && <ImportDialog />}
            {isAdmin && (
              <a href="/calendrier/export" className={buttonClass("secondary")}>
                <Download aria-hidden className="size-4" />
                Exporter en CSV
              </a>
            )}
            <Link
              href={calendarHref(query, { post: "new", d: null })}
              scroll={false}
              className={buttonClass("primary")}
            >
              <Plus aria-hidden className="size-4" />
              Ajouter un post
            </Link>
          </>
        }
      />

      <div className="mb-4">
        <TypeLegend />
      </div>

      <CalendarToolbar
        query={query}
        today={today}
        periodLabel={periodLabel(query)}
        people={people}
      />

      <Suspense key={bodyKey} fallback={<BoardSkeleton />}>
        <CalendarBody query={query} people={people} me={me} today={today} />
      </Suspense>

      {/* Bouton flottant (mobile) */}
      <Link
        href={calendarHref(query, { post: "new", d: null })}
        scroll={false}
        aria-label="Ajouter un post"
        className="bg-accent-strong text-on-accent fixed right-4 bottom-20 z-20 inline-flex size-14 items-center justify-center rounded-full shadow-lg md:hidden"
      >
        <Plus aria-hidden className="size-6" />
      </Link>

      {query.post && (
        <Suspense fallback={null}>
          <SheetLoader query={query} people={people} me={me} today={today} />
        </Suspense>
      )}
    </>
  );
}

async function CalendarBody({
  query,
  people,
  me,
  today,
}: {
  query: CalendarQuery;
  people: PersonLite[];
  me: { id: string; isAdmin: boolean };
  today: string;
}) {
  const { supabase } = await requireMember();
  const range = rangeFor(query);
  const posts = await fetchPosts(supabase, range, query, me.id);

  if (query.vue === "semaine")
    return (
      <WeekBoard
        days={workWeekISO(query.date)}
        posts={posts}
        people={people}
        me={me}
        today={today}
        query={query}
      />
    );
  if (query.vue === "mois")
    return (
      <MonthGrid
        from={range.from}
        to={range.to}
        monthPrefix={query.date.slice(0, 7)}
        posts={posts}
        today={today}
        query={query}
      />
    );
  return <ListView posts={posts} people={people} me={me} today={today} query={query} />;
}

async function SheetLoader({
  query,
  people,
  me,
  today,
}: {
  query: CalendarQuery;
  people: PersonLite[];
  me: { id: string; isAdmin: boolean };
  today: string;
}) {
  const { supabase } = await requireMember();
  const closeHref = calendarHref(query, { post: null, d: null });

  if (query.post === "new") {
    // Par défaut : la date demandée, sinon le prochain jour ouvré.
    let date = query.d ?? today;
    if (!query.d && isoWeekday(date) > 5) date = addDaysISO(date, 8 - isoWeekday(date));
    const defaults: PostInput = {
      date,
      type: defaultTypeForDate(date) ?? "impact",
      canal_principal: "instagram",
      autres_canaux: ["tiktok", "facebook"],
      format: "video_9_16",
      idee: "",
      prep_date: defaultPrepDate(date),
      heure: DEFAULT_PUBLISH_TIME,
      legende: "",
      responsable_id: me.id,
      statut: "a_faire",
      lien: "",
      notes: "",
    };
    return (
      <PostSheet mode="new" defaults={defaults} people={people} me={me} closeHref={closeHref} />
    );
  }

  const detail = await fetchPostDetail(supabase, query.post!);
  if (!detail) redirect(closeHref);
  const p = detail.post;
  const defaults: PostInput = {
    date: p.date,
    type: p.type,
    canal_principal: p.canal_principal,
    autres_canaux: p.autres_canaux,
    format: p.format,
    idee: p.idee,
    prep_date: p.prep_date ?? "",
    heure: p.heure.slice(0, 5),
    legende: p.legende,
    responsable_id: p.responsable_id ?? "",
    statut: p.statut,
    lien: p.lien ?? "",
    notes: p.notes,
  };
  void today;
  return (
    <PostSheet
      mode="edit"
      defaults={defaults}
      detail={detail}
      people={people}
      me={me}
      closeHref={closeHref}
    />
  );
}

function BoardSkeleton() {
  return (
    <div role="status" aria-label="Chargement du calendrier" className="grid gap-3 md:grid-cols-5">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="bg-surface-2/50 space-y-3 rounded-2xl p-2">
          <Skeleton className="h-14" />
          <Skeleton className="h-36" />
          {i % 2 === 0 && <Skeleton className="h-36" />}
        </div>
      ))}
      <span className="sr-only">Chargement…</span>
    </div>
  );
}
