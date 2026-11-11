import Link from "next/link";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusPill } from "@/components/ui/StatusPill";
import { TypePill } from "@/components/ui/TypePill";
import { cn } from "@/lib/cn";
import { formatDayLong, formatTime } from "@/lib/dates";
import type { MemberLite } from "@/lib/members";
import type { PostRow } from "@/lib/database.types";
import { Countdown } from "./Countdown";

export function NextPostCard({
  post,
  responsable,
}: {
  post: PostRow | null;
  responsable: MemberLite | null;
}) {
  if (!post)
    return (
      <EmptyState
        compact
        illustration="calendar"
        title="Aucun post à venir"
        description="Ajoute le prochain post pour lancer le compte à rebours."
        action={
          <Link
            href="/calendrier?post=new"
            className="border-line-strong bg-surface hover:bg-surface-2 inline-flex min-h-11 items-center rounded-lg border px-3 text-sm font-semibold"
          >
            Ajouter un post
          </Link>
        }
      />
    );

  const steps = [
    { label: "Légende rédigée", done: post.legende.trim() !== "" },
    {
      label: "Visuel ou vidéo prêt",
      done: ["pret_a_valider", "valide", "publie"].includes(post.statut),
    },
    { label: "Validé par le pôle", done: ["valide", "publie"].includes(post.statut) },
  ];
  const remaining = steps.filter((s) => !s.done).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <TypePill type={post.type} />
        <StatusPill status={post.statut} />
      </div>
      <div>
        <p className="text-ink-muted flex items-center gap-1.5 text-xs font-medium">
          <Clock aria-hidden className="size-3.5" />
          Publication {formatDayLong(post.date)} à {formatTime(post.heure)}
        </p>
        <Countdown date={post.date} time={post.heure} />
      </div>
      <Link
        href={`/calendrier?post=${post.id}&date=${post.date}`}
        className="line-clamp-2 block min-h-11 text-sm font-medium underline-offset-4 hover:underline"
      >
        {post.idee || <span className="text-ink-muted italic">Idée à définir</span>}
      </Link>
      <div>
        <p className="mb-1.5 text-xs font-semibold">
          {remaining === 0 ? "Tout est prêt" : `Reste à faire : ${remaining}`}
        </p>
        <ul className="space-y-1">
          {steps.map((s) => (
            <li
              key={s.label}
              className={cn(
                "flex items-center gap-2 text-sm",
                s.done ? "text-ink-muted" : "font-medium",
              )}
            >
              {s.done ? (
                <CheckCircle2 aria-hidden className="text-success size-4" />
              ) : (
                <Circle aria-hidden className="text-ink-muted size-4" />
              )}
              <span className={s.done ? "line-through" : undefined}>{s.label}</span>
              <span className="sr-only">{s.done ? " (fait)" : " (à faire)"}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="flex items-center gap-2 text-sm">
        {responsable ? (
          <>
            <Avatar name={responsable.name} color={responsable.couleur} size="sm" />
            <span>
              Responsable : <strong>{responsable.name}</strong>
            </span>
          </>
        ) : (
          <span className="text-ink-muted italic">Aucun responsable pour ce post</span>
        )}
      </p>
    </div>
  );
}
