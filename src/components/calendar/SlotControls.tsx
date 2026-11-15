"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CalendarClock, HandHeart, Link2 } from "lucide-react";
import { updateSlot } from "@/actions/slots";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { POST_STATUSES, POST_STATUS_LABEL, type PostStatus } from "@/lib/constants";
import type { SlotRow } from "@/lib/database.types";
import { formatDayLong } from "@/lib/dates";
import type { MemberLite } from "@/lib/members";

const field =
  "border-line-strong bg-surface text-ink min-h-12 w-full rounded-xl border px-3 text-base focus-visible:outline-offset-2";

/** Responsable, statut, lien du post et date de préparation d'un créneau. */
export function SlotControls({
  slot,
  people,
  me,
}: {
  slot: Pick<SlotRow, "id" | "responsable_id" | "statut" | "lien" | "a_preparer_le">;
  people: MemberLite[];
  me: { id: string | null; isAdmin: boolean };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [responsable, setResponsable] = useState(slot.responsable_id ?? "");
  const [statut, setStatut] = useState<PostStatus>(slot.statut);
  const [lien, setLien] = useState(slot.lien ?? "");
  const [prep, setPrep] = useState(slot.a_preparer_le ?? "");

  const taken = slot.responsable_id !== null && slot.responsable_id !== me.id;
  const canEdit = me.isAdmin || (!!me.id && !taken);
  const canClaim = !me.isAdmin && !!me.id && slot.responsable_id === null;
  const options = me.isAdmin
    ? people
    : people.filter((p) => p.id === me.id || p.id === slot.responsable_id);
  const owner = people.find((p) => p.id === (slot.responsable_id ?? ""));

  const save = (patch: Parameters<typeof updateSlot>[1], onFail: () => void) =>
    start(async () => {
      setError(null);
      setSaved(false);
      const res = await updateSlot(slot.id, patch);
      if (!res.ok) {
        onFail();
        setError(res.fieldErrors?.lien ?? res.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });

  return (
    <div className="border-line bg-canvas/60 mt-5 space-y-4 rounded-2xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg font-bold">Suivi de ce post</h3>
        {owner && (
          <span className="flex items-center gap-2 text-base">
            <Avatar name={owner.name} color={owner.couleur} size="sm" />
            {owner.name}
          </span>
        )}
      </div>

      {canClaim && (
        <Button
          className="min-h-12 w-full sm:w-auto"
          loading={pending}
          onClick={() => {
            setResponsable(me.id!);
            save({ responsable_id: me.id }, () => setResponsable(""));
          }}
        >
          <HandHeart aria-hidden className="size-5" />
          Je m&apos;en occupe
        </Button>
      )}

      {!canEdit && (
        <p className="text-ink-muted text-base">
          Ce post est pris en charge par {owner?.name ?? "quelqu'un d'autre"}.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor={`resp-${slot.id}`} className="text-base font-medium">
            Responsable
          </label>
          <select
            id={`resp-${slot.id}`}
            value={responsable}
            disabled={!canEdit || pending}
            onChange={(e) => {
              const before = responsable;
              setResponsable(e.target.value);
              save({ responsable_id: e.target.value || null }, () => setResponsable(before));
            }}
            className={field}
          >
            <option value="">Personne pour l&apos;instant</option>
            {options.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor={`statut-${slot.id}`} className="text-base font-medium">
            Statut
          </label>
          <select
            id={`statut-${slot.id}`}
            value={statut}
            disabled={!canEdit || pending || (!me.isAdmin && !slot.responsable_id && !responsable)}
            onChange={(e) => {
              const before = statut;
              const next = e.target.value as PostStatus;
              setStatut(next);
              save({ statut: next }, () => setStatut(before));
            }}
            className={field}
          >
            {POST_STATUSES.map((s) => (
              <option key={s} value={s}>
                {POST_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <label
            htmlFor={`lien-${slot.id}`}
            className="flex items-center gap-2 text-base font-medium"
          >
            <Link2 aria-hidden className="size-4" />
            Lien du post publié
          </label>
          <div className="flex gap-2">
            <input
              id={`lien-${slot.id}`}
              type="url"
              inputMode="url"
              value={lien}
              disabled={!canEdit || pending}
              placeholder="https://…"
              onChange={(e) => setLien(e.target.value)}
              className={field}
            />
            <Button
              variant="secondary"
              className="min-h-12 shrink-0"
              disabled={!canEdit || lien.trim() === (slot.lien ?? "")}
              loading={pending}
              onClick={() => save({ lien: lien.trim() || null }, () => setLien(slot.lien ?? ""))}
            >
              Enregistrer
            </Button>
          </div>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <label
            htmlFor={`prep-${slot.id}`}
            className="flex items-center gap-2 text-base font-medium"
          >
            <CalendarClock aria-hidden className="size-4" />À préparer le
            {prep && <span className="text-ink-muted font-normal">({formatDayLong(prep)})</span>}
          </label>
          <input
            id={`prep-${slot.id}`}
            type="date"
            value={prep}
            disabled={!canEdit || pending}
            onChange={(e) => {
              const before = prep;
              setPrep(e.target.value);
              save({ a_preparer_le: e.target.value || null }, () => setPrep(before));
            }}
            className={`${field} sm:max-w-xs`}
          />
        </div>
      </div>

      <p
        role={error ? "alert" : "status"}
        className={
          error ? "text-danger text-base font-medium" : "text-t-impact-fg min-h-6 text-base"
        }
      >
        {error ?? (saved && !pending ? "Enregistré." : "")}
      </p>
    </div>
  );
}
