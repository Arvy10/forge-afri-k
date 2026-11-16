import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Activity, CalendarClock, Flag, ListChecks, Megaphone, Radio, Users } from "lucide-react";
import { ActivityFeed } from "@/components/home/ActivityFeed";
import { HeroBanner, HeroStat } from "@/components/home/HeroBanner";
import { MyTasksList } from "@/components/home/MyTasksList";
import { NextPostCard } from "@/components/home/NextPostCard";
import { PrepSoonList } from "@/components/home/PrepSoonList";
import { Section } from "@/components/home/Section";
import { TeamProgress } from "@/components/home/TeamProgress";
import { UpcomingProjects } from "@/components/home/UpcomingProjects";
import { WeekStrip } from "@/components/home/WeekStrip";
import { buttonClass } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { defaultWeek, groupWeeks, nextMandatory, prepSoon } from "@/lib/calendar";
import { formatDayLong, todayISO } from "@/lib/dates";
import type { ActivityRow, InfoRow, MilestoneRow, TaskRow } from "@/lib/database.types";
import { InfoPreview } from "@/components/home/InfoPreview";
import { weekProgress, type Progress } from "@/lib/progress";
import { db } from "@/server/db";
import { fetchTaskLites } from "@/server/progress";
import { getDays } from "@/server/calendar";
import { requireSession } from "@/server/session";
import { getActiveTeam, getTeam, getWorkers } from "@/server/team";

export const metadata: Metadata = { title: "Accueil" };

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

export default async function HomePage() {
  const auth = await requireSession();
  const today = todayISO();
  const me = { id: auth.memberId, isAdmin: auth.isAdmin };
  void me;
  const firstName = auth.member?.prenom ?? "l'administrateur";
  // Un observateur consulte : pas de « mes tâches » (il n'a pas d'espace de travail).
  const observer = auth.isObserver && !auth.isAdmin;

  return (
    <>
      <HeroBanner
        firstName={firstName}
        greeting={greeting()}
        dateLabel={`${formatDayLong(today)} ${today.slice(0, 4)}`}
      >
        <Suspense fallback={null}>
          <HeroStats today={today} memberId={observer ? null : auth.memberId} />
        </Suspense>
      </HeroBanner>

      {/* Infos : annonces de l'administrateur */}
      <Suspense fallback={null}>
        <HomeInfos isAdmin={auth.isAdmin} />
      </Suspense>

      {/* 2. Cette semaine */}
      <section aria-labelledby="cette-semaine" className="mb-7">
        <Suspense fallback={<WeekSkeleton />}>
          <ThisWeek today={today} />
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
          className={observer ? "lg:col-span-5" : "lg:col-span-3"}
        >
          <Suspense fallback={<Skeleton className="h-48" />}>
            <TeamProgressBlock today={today} />
          </Suspense>
        </Section>
        {!observer && (
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
        )}
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
            <NextPost />
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
async function HeroStats({ today, memberId }: { today: string; memberId: string | null }) {
  const [days, tasks] = await Promise.all([getDays(), fetchTaskLites()]);
  const week = defaultWeek(groupWeeks(days), today);
  const mandatory = (week?.days ?? []).flatMap((d) =>
    d.slots.filter((s) => s.priorite === "obligatoire"),
  );
  const published = mandatory.filter((s) => s.statut === "publie").length;
  const prepCount = prepSoon(days, today).filter(
    ({ slot }) => slot.priorite === "obligatoire",
  ).length;
  const team = weekProgress(tasks, today);
  const mine = memberId
    ? tasks.filter((t) => t.member_id === memberId && t.statut !== "fait").length
    : null;
  return (
    <>
      <HeroStat
        value={mandatory.length}
        label={`posts obligatoires cette semaine${published ? ` (${published} publié${published > 1 ? "s" : ""})` : ""}`}
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

async function ThisWeek({ today }: { today: string }) {
  const weeks = groupWeeks(await getDays());
  const week = defaultWeek(weeks, today);
  if (!week)
    return <p className="text-ink-muted text-base">Le calendrier est vide pour l&apos;instant.</p>;
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="cette-semaine" className="font-display text-xl font-bold md:text-2xl">
            {week.from <= today && today <= week.to ? "Cette semaine" : `Semaine ${week.semaine}`}
          </h2>
          <p className="text-ink-muted text-base">
            Semaine {week.semaine} · {week.theme}
          </p>
        </div>
        <Link
          href={`/calendrier?semaine=${week.semaine}`}
          className={buttonClass("secondary", "min-h-12")}
        >
          Voir le calendrier
        </Link>
      </div>
      <WeekStrip days={week.days} today={today} />
    </>
  );
}

async function TeamProgressBlock({ today }: { today: string }) {
  const [team, tasks] = await Promise.all([getWorkers(), fetchTaskLites()]);
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

async function NextPost() {
  const [days, team] = await Promise.all([getDays(), getActiveTeam()]);
  const next = nextMandatory(days);
  const who = next?.slot.responsable_id
    ? (team.find((m) => m.id === next.slot.responsable_id) ?? null)
    : null;
  return <NextPostCard next={next} responsable={who} />;
}

async function PrepSoon({ today }: { today: string }) {
  const [days, team] = await Promise.all([getDays(), getActiveTeam()]);
  return <PrepSoonList items={prepSoon(days, today)} people={team} today={today} />;
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
