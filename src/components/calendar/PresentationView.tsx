import { Target } from "lucide-react";
import { TypePill } from "@/components/ui/TypePill";
import { CHANNEL_LABEL } from "@/lib/constants";
import { formatDayLong } from "@/lib/dates";
import type { PresentationPost, PresentationWeek } from "@/lib/presentation";

function Post({ post }: { post: PresentationPost }) {
  return (
    <article className="bg-surface border-line shadow-card rounded-2xl border p-4 md:p-5">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h4 className="font-display text-lg font-bold first-letter:uppercase">
          {formatDayLong(post.date)}
        </h4>
        <TypePill type={post.type} className="text-sm" />
      </header>

      <p className="mt-2 text-lg leading-snug font-semibold">{post.titreCourt}</p>

      <dl className="mt-3 grid gap-3 sm:grid-cols-[8rem_1fr]">
        <dt className="text-ink-muted text-base font-semibold">Canal</dt>
        <dd className="text-base">
          {post.formats.length > 0
            ? post.formats.map((f) => CHANNEL_LABEL[f.canal]).join(" · ")
            : "—"}
        </dd>

        <dt className="text-ink-muted text-base font-semibold">Format</dt>
        <dd>
          {post.formats.length > 0 ? (
            <ul className="space-y-1.5 text-base">
              {post.formats.map((f) => (
                <li key={f.canal}>
                  <span className="font-semibold">{CHANNEL_LABEL[f.canal]}</span> : {f.format}
                </li>
              ))}
            </ul>
          ) : (
            "—"
          )}
        </dd>

        <dt className="text-ink-muted text-base font-semibold">Légende</dt>
        <dd className="text-base leading-relaxed whitespace-pre-wrap">{post.legende ?? "—"}</dd>
      </dl>
    </article>
  );
}

/** Calendrier en lecture seule, semaine par semaine, avec la ligne d'objectif de chaque semaine. */
export function PresentationView({ weeks }: { weeks: PresentationWeek[] }) {
  return (
    <div className="mx-auto max-w-4xl space-y-10">
      {weeks.map((w) => (
        <section key={w.semaine} aria-labelledby={`presentation-s${w.semaine}`}>
          <header className="mb-4">
            <h2 id={`presentation-s${w.semaine}`} className="font-display text-2xl font-bold">
              Semaine {w.semaine} <span className="text-ink-muted font-medium">·</span>{" "}
              <span className="text-accent-strong">{w.theme}</span>
            </h2>
            {w.objectif && (
              <p className="bg-accent-soft text-ink mt-2 flex items-start gap-2.5 rounded-xl px-4 py-3 text-lg font-medium">
                <Target aria-hidden className="text-accent-strong mt-1 size-5 shrink-0" />
                <span>
                  <span className="font-bold">Objectif :</span> {w.objectif}
                </span>
              </p>
            )}
          </header>
          <ul className="grid grid-cols-1 gap-4">
            {w.posts.map((p) => (
              <li key={p.id} className="min-w-0">
                <Post post={p} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
