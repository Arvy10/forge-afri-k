import type { Metadata } from "next";
import { CalendarDays, Check, ShieldAlert, Users } from "lucide-react";
import { ProjectEditor } from "@/components/projects/ProjectEditor";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireMember } from "@/lib/auth";
import { PROJECT_STATUS_LABEL, type ProjectStatus } from "@/lib/constants";
import { cn } from "@/lib/cn";
import type { MilestoneRow, ProjectRow } from "@/lib/database.types";

export const metadata: Metadata = { title: "Projets Forge Afri'K" };

const STATUS_TONE: Record<ProjectStatus, string> = {
  a_decider: "bg-surface-2 text-ink",
  en_preparation: "bg-t-coulisses-bg text-t-coulisses-fg",
  etudes_en_preparation: "bg-t-patrimoine-bg text-t-patrimoine-fg",
  realise: "bg-t-impact-bg text-t-impact-fg",
  date_annoncee: "bg-t-appel_action-bg text-t-appel_action-fg",
};

export default async function ProjectsPage() {
  const { supabase, isAdmin } = await requireMember();
  const [{ data: projects }, { data: milestones }] = await Promise.all([
    supabase.from("projects").select("*").order("ordre"),
    supabase.from("milestones").select("*").order("ordre"),
  ]);
  const list = (projects ?? []) as ProjectRow[];
  const steps = (milestones ?? []) as MilestoneRow[];

  return (
    <>
      <PageHeader
        title="Projets Forge Afri'K"
        description="De quoi on parle quand on publie : où en est chaque projet, et ce qu'on peut dire ou pas."
      />

      {list.length === 0 ? (
        <EmptyState
          illustration="map"
          title="Aucun projet enregistré"
          description="Les projets de l'association apparaîtront ici (supabase/seed.sql charge la liste de départ)."
        />
      ) : (
        <ul className="mb-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => (
            <li
              key={p.id}
              className="bg-surface border-line shadow-card flex flex-col gap-3 rounded-2xl border p-4 md:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold",
                    STATUS_TONE[p.statut],
                  )}
                >
                  {PROJECT_STATUS_LABEL[p.statut]}
                </span>
                {isAdmin && <ProjectEditor project={p} />}
              </div>
              <h2 className="font-display text-lg leading-snug font-bold">{p.titre}</h2>
              {p.date_label && (
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <CalendarDays aria-hidden className="text-accent-strong size-4" />
                  {p.date_label}
                </p>
              )}
              <p className="text-ink-muted text-sm">{p.description}</p>
              {p.prudence && (
                <p
                  role="note"
                  className="bg-accent-soft text-ink flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm"
                >
                  <ShieldAlert aria-hidden className="text-accent-strong mt-0.5 size-4 shrink-0" />
                  <span>
                    <strong>Prudence :</strong> {p.prudence}
                  </span>
                </p>
              )}
              <p className="text-ink-muted mt-auto flex items-center gap-2 text-xs">
                <Users aria-hidden className="size-3.5" />
                Pôle pilote : {p.pole_pilote || "à définir"}
              </p>
            </li>
          ))}
        </ul>
      )}

      <section aria-labelledby="feuille-de-route">
        <h2 id="feuille-de-route" className="font-display text-xl font-bold md:text-2xl">
          Feuille de route
        </h2>
        <p className="text-ink-muted mt-1 mb-5 text-sm">
          Objectifs de travail, pas des dates définitivement arrêtées.
        </p>
        {steps.length === 0 ? (
          <EmptyState compact illustration="map" title="Pas encore de feuille de route" />
        ) : (
          <ol className="grid gap-4 md:grid-cols-5">
            {steps.map((m, i) => (
              <li key={m.id} className="relative">
                {/* trait de liaison (ordinateur) */}
                {i < steps.length - 1 && (
                  <span
                    aria-hidden
                    className="bg-line-strong absolute top-3 left-8 hidden h-0.5 w-[calc(100%-1rem)] md:block"
                  />
                )}
                <div className="flex gap-3 md:block">
                  <span
                    aria-hidden
                    className={cn(
                      "relative inline-flex size-7 shrink-0 items-center justify-center rounded-full border-2",
                      m.statut === "realise"
                        ? "border-success bg-success text-canvas"
                        : i === steps.length - 1
                          ? "border-accent bg-accent-soft"
                          : "border-line-strong bg-surface",
                    )}
                  >
                    {m.statut === "realise" && <Check className="size-4" strokeWidth={3} />}
                  </span>
                  <div className="md:mt-3">
                    <p className="text-ink-muted text-xs font-semibold">{m.periode}</p>
                    <h3 className="font-display text-base font-bold">{m.titre}</h3>
                    <p className="text-ink-muted text-sm">{m.description}</p>
                    {m.statut === "realise" && (
                      <p className="text-success mt-1 text-xs font-semibold">Réalisé</p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}
