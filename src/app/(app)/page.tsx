import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  Activity,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Flag,
  ListChecks,
  Megaphone,
  Radio,
  Users,
} from "lucide-react";
import { WeekBoard } from "@/components/calendar/WeekBoard";
import { ActivityFeed } from "@/components/home/ActivityFeed";
import { HeroBanner, HeroStat } from "@/components/home/HeroBanner";
import { MyTasksList } from "@/components/home/MyTasksList";
import { NextPostCard } from "@/components/home/NextPostCard";
import { PrepSoonList } from "@/components/home/PrepSoonList";
import { Section } from "@/components/home/Section";
import { TeamProgress } from "@/components/home/TeamProgress";
import { UpcomingProjects } from "@/components/home/UpcomingProjects";
import { buttonClass } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  addDaysISO,
  formatDayLong,
  formatWeekRange,
  isISODate,
  startOfWeekISO,
  todayISO,
  workWeekISO,
} from "@/lib/dates";
import type { ActivityRow, InfoRow, MilestoneRow, PostRow, TaskRow } from "@/lib/database.types";
import { InfoPreview } from "@/components/home/InfoPreview";
import { weekProgress, type Progress } from "@/lib/progress";
import { db } from "@/server/db";
import { fetchTaskLites } from "@/server/progress";
import { fetchPosts } from "@/server/posts";
import { requireSession } from "@/server/session";
import { getActiveTeam, getTeam } from "@/server/team";

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
  const auth = await requireSession();
  const sp = await searchParams;
  const today = todayISO();
  const raw = Array.isArray(sp.semaine) ? sp.semaine[0] : sp.semaine;
  const monday = startOfWeekISO(raw && isISODate(raw) ? raw : today);
  const me = { id: auth.memberId, isAdmin: auth.isAdmin };
  const firstName = auth.member?.prenom ?? "l'administrateur";

  return (
    <>
      <HeroBanner
        firstName={firstName}
        greeting={greeting()}
        dateLabel={`${formatDayLong(today)} ${today.slice(0, 4)}`}
      >
        <Suspense fallback={null}>
          <HeroStats today={today} monday={startOfWeekISO(today)} memberId={auth.memberId} />
        </Suspense>
      </HeroBanner>

      {/* Infos : annonces de l'administrateur */}
      <Suspense fallback={null}>
        <HomeInfos isAdmin={auth.isAdmin} />
      </Suspense>

      {/* 2. Cette semaine */}
      <section aria-labelledby="cette-semaine" className="mb-7">
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
              className="border-line-strong bg-surface hover:bg-surface-2 inline-flex size-12 items-center justify-center rounded-lg border"
            >
              <ChevronLeft aria-hidden className="size-5" />
            </Link>
            <Link href="/" className={buttonClass("secondary")}>
              Aujourd&apos;hui
            </Link>
            <Link
              href={`/?semaine=${addDaysISO(monday, 7)}`}
              aria-label="Semaine suivante"
              className="border-line-strong bg-surface hover:bg-surface-2 inline-flex size-12 items-center justify-center rounded-lg border"
            >
              <ChevronRight aria-hidden className="size-5" />
            </Link>
          </nav>
        </div>
        <Suspense key={monday} fallback={<WeekSkeleton />}>
          <ThisWeek monday={monday} me={me} today={today} />
        </Suspense>
      </section>

      {/* 3. Avancement de l'équipe */}
      <div className="stagger mb-6 grid gap-4 lg:grid-cols-5">
        <Section
          title="Avancement de l'équipe"
          icon={Users}
          id="avancement"
          href="/equipe"
          hrefLabel="Équipe"
          className="lg:col-span-3"
        >
          <Suspense fallback={<Skeleton className="h-48" />}>
            <TeamProgressBlock today={today} />
          </Suspense>
        </Section>
        <Section
          title="Mes tâches"
          icon={ListChecks}
          id="mes-taches"
          href="/mon-espace"
          hrefLabel="Mon espace"
          className="lg:col-span-2"
        >
          <Suspense fallback={<Skeleton className="h-48" />}>
            <MyOpenTasks today={today} memberId={auth.memberId} />
          </Suspense>
        </Section>
      </div>

      <div className="stagger mb-6 grid gap-4 lg:grid-cols-3">
        <Section title="Dernières activités" icon={Activity} id="activites">
          <Suspense fallback={<Skeleton className="h-48" />}>
            <RecentActivity />
          </Suspense>
        </Section>
        <Section
          title="À préparer bientôt"
          icon={CalendarClock}
          id="a-preparer"
          className="border-accent/40"
        >
          <Suspense fallback={<Skeleton className="h-48" />}>
            <PrepSoon today={today} />
          </Suspense>
        </Section>
        <Section
          title="Prochain post"
          icon={Radio}
          id="prochain-post"
          href="/calendrier"
          hrefLabel="Calendrier"
        >
          <Suspense fallback={<Skeleton className="h-64" />}>
            <NextPost today={today} />
          </Suspense>
        </Section>
      </div>

      <div className="stagger">
        <Section
          title="Projets à venir"
          icon={Flag}
          id="projets"
          href="/projets"
          hrefLabel="Projets"
        >
          <Suspense fallback={<Skeleton className="h-48" />}>
            <Upcoming />
          </Suspense>
        </Section>
      </div>
    </>
  );
}

/** Pastilles de chiffres du bandeau : l'essentiel en un coup d'œil. */
async function HeroStats({
  today,
  monday,
  memberId,
}: {
  today: string;
  monday: string;
  memberId: string | null;
}) {
  const tomorrow = addDaysISO(today, 1);
  const [week, prep, tasks] = await Promise.all([
    db()
      .from("pc_posts")
      .select("id, statut")
      .gte("date", monday)
      .lte("date", addDaysISO(monday, 6)),
    db()
      .from("pc_posts")
      .select("id, prep_date, statut")
      .lte("prep_date", tomorrow)
      .gte("date", today)
      .in("statut", ["a_faire", "en_cours", "pret_a_valider"]),
    fetchTaskLites(),
  ]);
  const posts = (week.data ?? []) as Pick<PostRow, "id" | "statut">[];
  const published = posts.filter((p) => p.statut === "publie").length;
  const prepCount = ((prep.data ?? []) as Pick<PostRow, "id" | "prep_date" | "statut">[]).filter(
    (p) => p.statut === "a_faire" || (p.prep_date ?? "") >= today,
  ).length;
  const team = weekProgress(tasks, today);
  const mine = memberId
    ? tasks.filter((t) => t.member_id === memberId && t.statut !== "fait").length
    : null;
  return (
    <>
      <HeroStat
        value={posts.length}
        label={`posts cette semaine${published ? ` (${published} publié${published > 1 ? "s" : ""})` : ""}`}
        href="/calendrier"
      />
      <HeroStat value={prepCount} label="à préparer d'ici demain" href="#a-preparer" urgent />
      <HeroStat
        value={team.late}
        label={team.late > 1 ? "tâches en retard dans l'équipe" : "tâche en retard dans l'équipe"}
        href="/taches?ech=retard"
        urgent
      />
      {mine !== null && (
        <HeroStat value={mine} label="tâches ouvertes pour toi" href="/mon-espace" />
      )}
    </>
  );
}

async function HomeInfos({ isAdmin }: { isAdmin: boolean }) {
  const { data } = await db()
    .from("pc_infos")
    .select("*")
    .order("epingle", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(3);
  const infos = (data ?? []) as InfoRow[];
  if (infos.length === 0 && !isAdmin) return null;
  return (
    <div className="mb-6">
      <Section
        title="Infos"
        icon={Megaphone}
        id="infos"
        href="/infos"
        hrefLabel={isAdmin ? "Gérer" : "Toutes"}
      >
        <InfoPreview infos={infos} isAdmin={isAdmin} />
      </Section>
    </div>
  );
}

async function ThisWeek({
  monday,
  me,
  today,
}: {
  monday: string;
  me: { id: string | null; isAdmin: boolean };
  today: string;
}) {
  const [posts, people] = await Promise.all([
    fetchPosts({ from: monday, to: addDaysISO(monday, 6) }, {}, me.id),
    getActiveTeam(),
  ]);
  return (
    <WeekBoard
      days={workWeekISO(monday)}
      posts={posts}
      people={people}
      me={me}
      today={today}
      query={{ vue: "semaine", date: monday }}
      allowDrag={false}
    />
  );
}

async function TeamProgressBlock({ today }: { today: string }) {
  const [team, tasks] = await Promise.all([getActiveTeam(), fetchTaskLites()]);
  const byMember = new Map<string, Progress>(
    team.map((m) => [
      m.id,
      weekProgress(
        tasks.filter((t) => t.member_id === m.id),
        today,
      ),
    ]),
  );
  const overall = weekProgress(
    tasks.filter((t) => team.some((m) => m.id === t.member_id)),
    today,
  );
  return <TeamProgress members={team} byMember={byMember} overall={overall} />;
}

async function MyOpenTasks({ today, memberId }: { today: string; memberId: string | null }) {
  if (!memberId)
    return (
      <p className="text-ink-muted text-sm">
        Choisis qui tu es dans{" "}
        <Link
          href="/qui-es-tu"
          className="text-accent-strong font-semibold underline underline-offset-4"
        >
          Qui es-tu ?
        </Link>{" "}
        pour voir tes tâches.
      </p>
    );
  const { data } = await db()
    .from("pc_tasks")
    .select("*")
    .eq("member_id", memberId)
    .neq("statut", "fait")
    .order("echeance", { nullsFirst: false })
    .limit(6);
  return <MyTasksList tasks={(data ?? []) as TaskRow[]} today={today} />;
}

async function RecentActivity() {
  const [{ data }, team] = await Promise.all([
    db().from("pc_activity").select("*").order("created_at", { ascending: false }).limit(8),
    getTeam(),
  ]);
  return (
    <ActivityFeed
      items={(data ?? []) as ActivityRow[]}
      names={new Map(team.map((m) => [m.id, m.prenom]))}
    />
  );
}

async function NextPost({ today }: { today: string }) {
  const { data } = await db()
    .from("pc_posts")
    .select("*")
    .gte("date", today)
    .neq("statut", "publie")
    .order("date")
    .order("heure")
    .limit(1);
  const post = ((data ?? [])[0] as PostRow | undefined) ?? null;
  const team = await getActiveTeam();
  return (
    <NextPostCard
      post={post}
      responsable={
        post?.responsable_id ? (team.find((m) => m.id === post.responsable_id) ?? null) : null
      }
    />
  );
}

async function PrepSoon({ today }: { today: string }) {
  const tomorrow = addDaysISO(today, 1);
  // Les posts dont la préparation est dépassée (et pas commencée) remontent aussi : c'est le plus urgent.
  const { data } = await db()
    .from("pc_posts")
    .select("*")
    .lte("prep_date", tomorrow)
    .gte("date", today)
    .in("statut", ["a_faire", "en_cours", "pret_a_valider"])
    .order("prep_date")
    .order("date")
    .limit(8);
  const team = await getActiveTeam();
  const posts = ((data ?? []) as PostRow[]).filter(
    (p) => p.statut === "a_faire" || (p.prep_date ?? "") >= today,
  );
  return <PrepSoonList posts={posts} people={team} today={today} />;
}

async function Upcoming() {
  const { data } = await db()
    .from("pc_milestones")
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
