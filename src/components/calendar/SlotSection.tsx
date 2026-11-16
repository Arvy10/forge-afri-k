import { Quote } from "lucide-react";
import { StatusPill } from "@/components/ui/StatusPill";
import { CHANNEL_LABEL, type Channel } from "@/lib/constants";
import { isSlotLate, type DayWithSlots } from "@/lib/calendar";
import { cn } from "@/lib/cn";
import type { SlotRow } from "@/lib/database.types";
import { formatTime } from "@/lib/dates";
import type { MemberLite } from "@/lib/members";
import { CopyButton } from "./CopyButton";
import { PriorityBadge } from "./DayCard";
import { SlotControls } from "./SlotControls";

const NETWORKS: Channel[] = ["tiktok", "instagram", "facebook"];
const NETWORK_TONE: Record<Channel, string> = {
  tiktok: "border-t-coulisses-dot bg-t-coulisses-bg/50",
  instagram: "border-t-appel_action-dot bg-t-appel_action-bg/50",
  facebook: "border-t-impact-dot bg-t-impact-bg/50",
};

/** Un créneau en détail : titre, idée, étapes, accroche, légende à copier, formats par réseau, suivi. */
export function SlotSection({
  day,
  slot,
  people,
  me,
  today,
}: {
  day: Pick<DayWithSlots, "date">;
  slot: SlotRow;
  people: MemberLite[];
  me: { id: string | null; isAdmin: boolean; readOnly?: boolean };
  today: string;
}) {
  const main = slot.priorite === "obligatoire";
  const late = isSlotLate(slot, today);
  const steps = Array.isArray(slot.comment_faire) ? slot.comment_faire : [];
  return (
    <section
      aria-labelledby={`slot-${slot.id}`}
      className={cn(
        "rounded-3xl border p-4 shadow-sm md:p-6",
        main ? "bg-surface border-accent-strong/50 border-2" : "bg-surface/70 border-line",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <PriorityBadge priorite={slot.priorite} />
        <time className="font-display text-2xl font-bold tabular-nums">
          {formatTime(slot.heure)}
        </time>
        <span className="text-ink-muted text-base">
          {slot.moment === "matin" ? "le matin" : "le soir"} · {slot.genre}
        </span>
        <StatusPill status={slot.statut} className="ml-auto text-sm" />
      </div>

      <h2
        id={`slot-${slot.id}`}
        className="font-display mt-3 text-2xl leading-snug font-bold md:text-3xl"
      >
        {slot.titre}
      </h2>
      {late && (
        <p className="bg-accent-soft text-accent-strong mt-3 rounded-xl px-3 py-2 text-base font-semibold">
          La préparation est en retard : ce post devait être prêt avant le{" "}
          {slot.a_preparer_le!.split("-").reverse().join("/")}.
        </p>
      )}
      {slot.idee && <p className="mt-3 text-lg leading-relaxed">{slot.idee}</p>}

      {steps.length > 0 && (
        <div className="mt-6">
          <h3 className="font-display text-xl font-bold">Comment faire</h3>
          <ol className="mt-3 space-y-3">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-base leading-relaxed">
                <span
                  aria-hidden
                  className="bg-forest text-on-forest mt-0.5 grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold"
                >
                  {i + 1}
                </span>
                <span>
                  <span className="sr-only">Étape {i + 1} : </span>
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {slot.accroche && (
        <div className="mt-6">
          <h3 className="font-display text-xl font-bold">Accroche</h3>
          <p className="border-accent mt-2 flex gap-3 rounded-r-xl border-l-4 bg-[color:var(--surface-2)] px-4 py-3 text-lg font-semibold">
            <Quote aria-hidden className="text-accent-strong mt-1 size-5 shrink-0" />
            {slot.accroche}
          </p>
        </div>
      )}

      {slot.legende && (
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-xl font-bold">Légende prête</h3>
            <CopyButton text={slot.legende} label="Copier la légende" />
          </div>
          <p className="border-line bg-canvas mt-2 rounded-xl border p-4 text-base leading-relaxed whitespace-pre-wrap">
            {slot.legende}
          </p>
        </div>
      )}

      <div className="mt-6">
        <h3 className="font-display text-xl font-bold">{main ? "Les trois formats" : "Formats"}</h3>
        <ul className="mt-3 grid gap-3 md:grid-cols-3">
          {NETWORKS.map((n) => {
            const text = slot.formats?.[n];
            if (!text) return null;
            const skipped = text.trim().toLowerCase() === "non nécessaire";
            return (
              <li
                key={n}
                className={cn(
                  "rounded-2xl border-l-4 p-4",
                  NETWORK_TONE[n],
                  skipped && "opacity-60",
                )}
              >
                <p className="font-display text-lg font-bold">{CHANNEL_LABEL[n]}</p>
                <p className="mt-1 text-base leading-relaxed">{text}</p>
              </li>
            );
          })}
        </ul>
      </div>

      <SlotControls slot={slot} people={people} me={me} />
      <span className="sr-only">Jour du post : {day.date}</span>
    </section>
  );
}
