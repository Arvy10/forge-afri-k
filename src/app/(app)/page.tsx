import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { HeroBanner } from "@/components/home/HeroBanner";
import { MyTasks } from "@/components/home/MyTasks";
import { NextPostCard } from "@/components/home/NextPostCard";
import { PrepSoonList } from "@/components/home/PrepSoonList";
import { Section } from "@/components/home/Section";
import { TeamStrip } from "@/components/home/TeamStrip";
import { UpcomingProjects } from "@/components/home/UpcomingProjects";
import { WeekBoard } from "@/components/calendar/WeekBoard";
import { buttonClass } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { requireMember } from "@/lib/auth";
import { getRoles, getTeam, toLite } from "@/lib/data";
import {
  addDaysISO,
  formatWeekRange,
  isISODate,
  startOfWeekISO,
  todayISO,
  workWeekISO,
} from "@/lib/dates";
import { fetchPosts } from "@/lib/posts-data";
import type { MilestoneRow, PostRow, TaskRow } from "@/lib/database.types";

export const metadata: Metadata = { title: "Accueil" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function greeting(now = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat("fr-FR", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: "Africa/Brazzaville",
    }).format(now),
  );
  return hour >= 18 || hour < 4 ? "Bonsoir" : "Bonjour";
}

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const { profile, isAdmin } = await requireMember();
  const sp = await searchParams;
  const today = todayISO();
  const raw = Array.isArray(sp.semaine) ? sp.semaine[0] : sp.semaine;
  const weekDate = raw && isISODate(raw) ? raw : today;
  const monday = startOfWeekISO(weekDate);
  const me = { id: profile.id, isAdmin };
  const firstName = (profile.full_name || profile.email).split(/[\s@]/)[0]!;

  return (
    <>
      <HeroBanner firstName={firstName} greeting={greeting()} />

      {/* 2. Cette semaine */}
      <section aria-labelledby="cette-semaine" className="mb-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="cette-semaine" className="font-display text-xl font-bold md:text-2xl">
              {monday === startOfWeekISO(today) ? "Cette semaine" : "Semaine choisie"}
            </h2>
            <p className="text-ink-muted text-sm">{formatWeekRange(monday)}</p>
          </div>
          <nav aria-label="Changer de semaine" className="flex items-center gap-2">
            <Link
              href={`/?semaine=${addDaysISO(monday, -7)}`}
              aria-label="Semaine précédente"
              className="border-line-strong bg-surface hover:bg-surface-2 inline-flex size-11 items-center justify-center rounded-lg border"
            >
              <ChevronLeft aria-hidden className="size-5" />
            </Link>
            <Link href="/" className={buttonClass("secondary")}>
              Aujourd&apos;hui
            </Link>
            <Link
              href={`/?semaine=${addDaysISO(monday, 7)}`}
              aria-label="Semaine suivante"
              className="border-line-strong bg-surface hover:bg-surface-2 inline-flex size-11 items-center justify-center rounded-lg border"
            >
              <ChevronRight aria-hidden className="size-5" />
            </Link>
          </nav>
        </div>
        <Suspense key={monday} fallback={<WeekSkeleton />}>
          <ThisWeek monday={monday} me={me} today={today} />
        </Suspense>
      </section>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Section title="Prochain post" id="prochain-post" href="/calendrier" hrefLabel="Calendrier">
          <Suspense fallback={<Skeleton className="h-64" />}>
            <NextPost today={today} />
          </Suspense>
        </Section>
        <Section title="Mes tâches" id="mes-taches" href="/taches" hrefLabel="Toutes">
          <Suspense fallback={<Skeleton className="h-48" />}>
            <MyOpenTasks today={today} />
          </Suspense>
        </Section>
        <Section title="À préparer bientôt" id="a-preparer" className="border-accent/40">
          <Suspense fallback={<Skeleton className="h-48" />}>
            <PrepSoon today={today} />
          </Suspense>
        </Section>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Section title="Membres du pôle" id="membres" href="/membres" className="xl:col-span-2">
          <Suspense fallback={<Skeleton className="h-32" />}>
            <Team />
          </Suspense>
        </Section>
        <Section title="Projets à venir" id="projets" href="/projets" hrefLabel="Projets">
          <Suspense fallback={<Skeleton className="h-48" />}>
            <Upcoming />
          </Suspense>
        </Section>
      </div>
    </>
  );
}

async function ThisWeek({
  monday,
  me,
  today,
}: {
  monday: string;
  me: { id: string; isAdmin: boolean };
  today: string;
}) {
  const { supabase } = await requireMember();
  const [posts, team] = await Promise.all([
    fetchPosts(supabase, { from: monday, to: addDaysISO(monday, 6) }, {}, me.id),
    getTeam(),
  ]);
  return (
    <WeekBoard
      days={workWeekISO(monday)}
      posts={posts}
      people={team.filter((m) => m.active).map(toLite)}
      me={me}
      today={today}
      query={{ vue: "semaine", date: monday }}
      allowDrag={false}
    />
  );
}

async function NextPost({ today }: { today: string }) {
  const { supabase } = await requireMember();
  const { data } = await supabase
    .from("posts")
    .select("*")
    .gte("date", today)
    .neq("statut", "publie")
    .order("date")
    .order("heure")
    .limit(1);
  const post = ((data ?? [])[0] as PostRow | undefined) ?? null;
  const team = await getTeam();
  const who = post?.responsable_id ? team.find((m) => m.id === post.responsable_id) : undefined;
  return <NextPostCard post={post} responsable={who ? toLite(who) : null} />;
}

async function MyOpenTasks({ today }: { today: string }) {
  const { supabase, profile } = await requireMember();
  const { data } = await supabase
    .from("tasks")
    .select("*")
    .eq("responsable_id", profile.id)
    .neq("statut", "valide")
    .order("echeance", { nullsFirst: false })
    .limit(6);
  return <MyTasks tasks={(data ?? []) as TaskRow[]} today={today} />;
}

async function PrepSoon({ today }: { today: string }) {
  const { supabase } = await requireMember();
  const tomorrow = addDaysISO(today, 1);
  // Les posts dont la préparation est dépassée (et pas commencée) remontent aussi : c'est le plus urgent.
  const { data } = await supabase
    .from("posts")
    .select("*")
    .lte("prep_date", tomorrow)
    .gte("date", today)
    .in("statut", ["a_faire", "en_cours", "pret_a_valider"])
    .order("prep_date")
    .order("date")
    .limit(8);
  const team = await getTeam();
  const posts = ((data ?? []) as PostRow[]).filter(
    (p) => p.statut === "a_faire" || (p.prep_date ?? "") >= today,
  );
  return <PrepSoonList posts={posts} people={team.map(toLite)} today={today} />;
}

async function Team() {
  const [team, roles] = await Promise.all([getTeam(), getRoles()]);
  return <TeamStrip members={team.filter((m) => m.active)} roles={roles} />;
}

async function Upcoming() {
  const { supabase } = await requireMember();
  const { data } = await supabase
    .from("milestones")
    .select("*")
    .neq("statut", "realise")
    .order("ordre");
  return <UpcomingProjects milestones={(data ?? []) as MilestoneRow[]} />;
}

function WeekSkeleton() {
  return (
    <div role="status" aria-label="Chargement de la semaine" className="grid gap-3 md:grid-cols-5">
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-40" />
      ))}
    </div>
  );
}
