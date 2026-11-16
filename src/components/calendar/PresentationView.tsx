import { TypePill } from "@/components/ui/TypePill";
import { CHANNEL_LABEL } from "@/lib/constants";
import { formatDateShort, formatDayShort } from "@/lib/dates";
import type { PresentationPost, PresentationWeek } from "@/lib/presentation";

/** Largeurs des colonnes sur grand écran : Date | Post | Canal et format | Légende. */
const ROW =
  "xl:grid xl:grid-cols-[8.5rem_minmax(0,1.1fr)_minmax(0,1.2fr)_minmax(0,1.5fr)] xl:gap-x-6";

const label = "text-ink-muted text-sm font-semibold tracking-wide uppercase xl:hidden";

function Row({ post }: { post: PresentationPost }) {
  return (
    <li className={`border-line py-5 first:pt-0 last:pb-0 md:py-6 ${ROW} border-b last:border-b-0`}>
      {/* Date et type */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 xl:flex-col xl:items-start">
        <p className="text-base font-semibold whitespace-nowrap first-letter:uppercase">
          {formatDayShort(post.date)} {formatDateShort(post.date)}
        </p>
        <TypePill type={post.type} compact className="text-sm" />
      </div>

      {/* Titre court */}
      <p className="mt-2 text-lg leading-snug font-semibold xl:mt-0">{post.titreCourt}</p>

      {/* Canal et format */}
      <div className="mt-4 xl:mt-0">
        <p className={label}>Canal et format</p>
        {post.formats.length > 0 ? (
          <ul className="mt-1.5 space-y-1.5 xl:mt-0">
            {post.formats.map((f) => (
              <li key={f.canal} className="text-base leading-snug">
                <span className="font-semibold">{CHANNEL_LABEL[f.canal]}</span>
                <span className="text-ink-muted"> · </span>
                {f.format}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-muted mt-1.5 text-base xl:mt-0">—</p>
        )}
      </div>

      {/* Légende */}
      <div className="mt-4 xl:mt-0">
        <p className={label}>Légende</p>
        {post.legende ? (
          <p className="mt-1.5 text-base leading-relaxed whitespace-pre-wrap xl:mt-0">
            {post.legende}
          </p>
        ) : (
          <p className="text-ink-muted mt-1.5 text-base xl:mt-0">—</p>
        )}
      </div>
    </li>
  );
}

/** Calendrier en lecture seule, semaine par semaine, avec la ligne d'objectif de chaque semaine. */
export function PresentationView({ weeks }: { weeks: PresentationWeek[] }) {
  return (
    <div className="space-y-8">
      {weeks.map((w) => (
        <section
          key={w.semaine}
          aria-labelledby={`presentation-s${w.semaine}`}
          className="bg-surface border-line shadow-card overflow-hidden rounded-2xl border"
        >
          <header className="border-line bg-surface-2/50 border-b px-5 py-4 md:px-6">
            <p className="text-ink-muted text-sm font-semibold tracking-wide uppercase">
              Semaine {w.semaine}
            </p>
            <h2
              id={`presentation-s${w.semaine}`}
              className="font-display text-xl font-bold md:text-2xl"
            >
              {w.theme}
            </h2>
            {w.objectif && (
              <p className="border-accent mt-3 border-l-4 pl-3 text-lg leading-snug">
                <span className="font-semibold">Objectif :</span> {w.objectif}
              </p>
            )}
          </header>

          <div className="px-5 py-5 md:px-6">
            {/* En-têtes de colonnes (grand écran seulement) */}
            <div
              aria-hidden
              className={`text-ink-muted border-line mb-4 hidden border-b pb-2 text-sm font-semibold tracking-wide uppercase ${ROW}`}
            >
              <span>Date</span>
              <span>Post</span>
              <span>Canal et format</span>
              <span>Légende</span>
            </div>
            <ul>
              {w.posts.map((p) => (
                <Row key={p.id} post={p} />
              ))}
            </ul>
          </div>
        </section>
      ))}
    </div>
  );
}
