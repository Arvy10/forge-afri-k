import type { Metadata } from "next";
import { Check, X } from "lucide-react";
import { GuideEditor } from "@/components/guide/GuideEditor";
import { bulletItems, Markdown } from "@/components/guide/Markdown";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireMember } from "@/lib/auth";
import { CONTENT_TYPES, CONTENT_TYPE_META } from "@/lib/constants";
import { TypePill } from "@/components/ui/TypePill";
import type { GuideSectionRow } from "@/lib/database.types";

export const metadata: Metadata = { title: "Règles et guide" };

export default async function GuidePage() {
  const { supabase, isAdmin } = await requireMember();
  const { data } = await supabase.from("guide_sections").select("*").order("ordre");
  const sections = (data ?? []) as GuideSectionRow[];
  const by = new Map(sections.map((s) => [s.slug, s]));
  const todo = by.get("a-faire");
  const dont = by.get("a-ne-pas-faire");
  const others = sections.filter((s) => s.slug !== "a-faire" && s.slug !== "a-ne-pas-faire");

  if (sections.length === 0)
    return (
      <>
        <PageHeader title="Règles et guide" />
        <EmptyState
          illustration="book"
          title="Le guide est vide"
          description="Les règles du pôle apparaîtront ici. Exécute le fichier supabase/seed.sql pour charger le contenu de départ."
        />
      </>
    );

  return (
    <>
      <PageHeader
        title="Règles et guide"
        description="Les repères communs du pôle : à lire avant de publier."
      />

      <div className="mb-8 grid gap-4 md:grid-cols-2">
        {[
          { s: todo, tone: "ok" as const },
          { s: dont, tone: "no" as const },
        ].map(({ s, tone }) =>
          s ? (
            <section
              key={s.id}
              aria-labelledby={`s-${s.slug}`}
              className={`bg-surface rounded-2xl border-2 p-4 md:p-5 ${tone === "ok" ? "border-[var(--t-impact-dot)]" : "border-danger"}`}
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2
                  id={`s-${s.slug}`}
                  className="font-display flex items-center gap-2 text-xl font-bold"
                >
                  <span
                    className={`inline-flex size-8 items-center justify-center rounded-full ${tone === "ok" ? "bg-t-impact-bg text-t-impact-fg" : "bg-danger-soft text-danger"}`}
                  >
                    {tone === "ok" ? (
                      <Check aria-hidden className="size-5" strokeWidth={3} />
                    ) : (
                      <X aria-hidden className="size-5" strokeWidth={3} />
                    )}
                  </span>
                  {s.titre}
                </h2>
                {isAdmin && <GuideEditor id={s.id} titre={s.titre} contenu={s.contenu} />}
              </div>
              <ul className="space-y-2.5">
                {bulletItems(s.contenu).map((item) => (
                  <li key={item} className="flex gap-3 text-sm md:text-base">
                    {tone === "ok" ? (
                      <Check
                        aria-hidden
                        className="text-success mt-1 size-4 shrink-0"
                        strokeWidth={3}
                      />
                    ) : (
                      <X aria-hidden className="text-danger mt-1 size-4 shrink-0" strokeWidth={3} />
                    )}
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null,
        )}
      </div>

      <div className="stagger grid gap-4 lg:grid-cols-2">
        {others.map((s, i) => (
          <section
            key={s.id}
            aria-labelledby={`s-${s.slug}`}
            className="bg-surface border-line shadow-card rounded-2xl border p-4 md:p-5"
          >
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <h2 id={`s-${s.slug}`} className="font-display text-xl font-bold">
                <span className="text-accent-strong mr-2 tabular-nums">{i + 2}.</span>
                {s.titre}
              </h2>
              {isAdmin && <GuideEditor id={s.id} titre={s.titre} contenu={s.contenu} />}
            </div>
            {s.slug === "rythme" && (
              <ul className="mb-3 flex flex-wrap gap-1.5" aria-label="Types de contenu">
                {CONTENT_TYPES.map((t) => (
                  <li key={t} title={CONTENT_TYPE_META[t].description}>
                    <TypePill type={t} />
                  </li>
                ))}
              </ul>
            )}
            <Markdown>{s.contenu}</Markdown>
          </section>
        ))}
      </div>
    </>
  );
}
