"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info, Trash2 } from "lucide-react";
import { createPost, deletePost, updatePost } from "@/actions/posts";
import { Button } from "@/components/ui/Button";
import { FormError, SelectField, TextArea, TextField } from "@/components/ui/Field";
import {
  CHANNELS,
  CHANNEL_LABEL,
  CONTENT_TYPES,
  CONTENT_TYPE_META,
  POST_FORMATS,
  POST_FORMAT_LABEL,
  POST_STATUSES,
  POST_STATUS_LABEL,
} from "@/lib/constants";
import {
  defaultPrepDate,
  defaultTypeForDate,
  formatDayLong,
  isISODate,
  isOffRhythm,
} from "@/lib/dates";
import type { MemberLite } from "@/lib/members";
import { postSchema, type PostInput, type PostValues } from "@/lib/schemas";

type Props = {
  mode: "new" | "edit";
  postId?: string;
  defaults: PostInput;
  people: MemberLite[];
  me: { id: string | null; isAdmin: boolean };
  /** Peut modifier ce post (responsable ou admin). */
  canEdit: boolean;
  closeHref: string;
};

export function PostForm({ mode, postId, defaults, people, me, canEdit, closeHref }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [prepTouched, setPrepTouched] = useState(mode === "edit");
  const [typeTouched, setTypeTouched] = useState(mode === "edit");

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError: setFieldError,
    formState: { errors },
  } = useForm<PostInput, unknown, PostValues>({
    resolver: zodResolver(postSchema),
    defaultValues: defaults,
  });

  const date = useWatch({ control, name: "date" });
  const type = useWatch({ control, name: "type" });
  const principal = useWatch({ control, name: "canal_principal" });
  const expected = date && isISODate(date) ? defaultTypeForDate(date) : null;
  const offRhythm = date && isISODate(date) && type ? isOffRhythm(type, date) : false;
  const disabled = !canEdit || pending;

  const dateField = register("date", {
    onChange: (e) => {
      const v = e.target.value as string;
      if (!isISODate(v)) return;
      if (!prepTouched) setValue("prep_date", defaultPrepDate(v));
      const t = defaultTypeForDate(v);
      if (!typeTouched && t) setValue("type", t);
    },
  });
  const prepField = register("prep_date", { onChange: () => setPrepTouched(true) });
  const typeField = register("type", { onChange: () => setTypeTouched(true) });

  const onSubmit = handleSubmit((values) => {
    setError(null);
    setSaved(false);
    start(async () => {
      const res = mode === "new" ? await createPost(values) : await updatePost(postId!, values);
      if (!res.ok) {
        setError(res.error);
        for (const [k, msg] of Object.entries(res.fieldErrors ?? {}))
          setFieldError(k as keyof PostInput, { message: msg });
        return;
      }
      if (mode === "new") router.push(closeHref, { scroll: false });
      else {
        setSaved(true);
        router.refresh();
      }
    });
  });

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="space-y-4"
      aria-label={mode === "new" ? "Nouveau post" : "Modifier le post"}
    >
      {!canEdit && (
        <p
          role="note"
          className="bg-surface-2 text-ink flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm"
        >
          <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
          Tu peux lire ce post et le commenter. Seuls son responsable et l&apos;administrateur
          peuvent le modifier.
        </p>
      )}
      <FormError message={error} />
      {saved && (
        <p
          role="status"
          className="bg-t-impact-bg text-t-impact-fg rounded-lg px-3 py-2.5 text-sm font-medium"
        >
          Post enregistré.
        </p>
      )}

      <fieldset disabled={disabled} className="space-y-4 disabled:opacity-90">
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Date de publication"
            type="date"
            required
            error={errors.date?.message}
            {...dateField}
          />
          <TextField
            label="Heure"
            type="time"
            required
            error={errors.heure?.message}
            {...register("heure")}
          />
        </div>

        <div>
          <SelectField label="Type de contenu" required error={errors.type?.message} {...typeField}>
            {CONTENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {CONTENT_TYPE_META[t].label}
              </option>
            ))}
          </SelectField>
          {offRhythm && expected && (
            <p role="note" className="text-ink-muted mt-1.5 flex items-start gap-1.5 text-xs">
              <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              Le rythme prévoit « {CONTENT_TYPE_META[expected].label} » le{" "}
              {formatDayLong(date!).split(" ")[0]}. Tu peux garder ce choix.
            </p>
          )}
        </div>

        <TextArea
          label="Idée / scénario"
          rows={3}
          placeholder="Ce qu'on montre, ce qu'on dit…"
          error={errors.idee?.message}
          {...register("idee")}
        />

        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label="Canal principal"
            required
            error={errors.canal_principal?.message}
            {...register("canal_principal")}
          >
            {CHANNELS.map((c) => (
              <option key={c} value={c}>
                {CHANNEL_LABEL[c]}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Format"
            required
            error={errors.format?.message}
            {...register("format")}
          >
            {POST_FORMATS.map((f) => (
              <option key={f} value={f}>
                {POST_FORMAT_LABEL[f]}
              </option>
            ))}
          </SelectField>
        </div>

        <fieldset className="space-y-1.5">
          <legend className="text-sm font-medium">Autres canaux</legend>
          <div className="flex flex-wrap gap-2">
            {CHANNELS.filter((c) => c !== principal).map((c) => (
              <label
                key={c}
                className="border-line-strong bg-surface has-[:checked]:border-accent-strong has-[:checked]:bg-accent-soft inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm"
              >
                <input
                  type="checkbox"
                  value={c}
                  className="accent-accent-strong size-4"
                  {...register("autres_canaux")}
                />
                {CHANNEL_LABEL[c]}
              </label>
            ))}
          </div>
        </fieldset>

        <TextField
          label="À préparer / filmer le"
          type="date"
          hint="Calculé automatiquement : 2 jours avant la publication (le dimanche pour un post du lundi). Modifiable."
          error={errors.prep_date?.message}
          {...prepField}
        />

        <TextArea
          label="Légende (copywriting)"
          rows={5}
          hint="Rédigée le jour même de la publication."
          error={errors.legende?.message}
          {...register("legende")}
        />

        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label="Responsable"
            hint={me.isAdmin ? undefined : "Tu ne peux créer des posts que pour toi."}
            error={errors.responsable_id?.message}
            disabled={!me.isAdmin || disabled}
            {...register("responsable_id")}
          >
            <option value="">Sans responsable</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Statut"
            required
            error={errors.statut?.message}
            {...register("statut")}
          >
            {POST_STATUSES.map((s) => (
              <option key={s} value={s}>
                {POST_STATUS_LABEL[s]}
              </option>
            ))}
          </SelectField>
        </div>

        <TextField
          label="Lien du post"
          type="url"
          inputMode="url"
          placeholder="https://…"
          hint="À renseigner après la publication."
          error={errors.lien?.message}
          {...register("lien")}
        />
        <TextArea
          label="Notes"
          rows={3}
          hint="Notes internes, pas publiées."
          error={errors.notes?.message}
          {...register("notes")}
        />
      </fieldset>

      {canEdit && (
        <div className="bg-canvas/95 border-line sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-2 border-t px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
          <Button type="submit" loading={pending}>
            {mode === "new" ? "Ajouter au calendrier" : "Enregistrer"}
          </Button>
          <Button variant="ghost" onClick={() => router.push(closeHref, { scroll: false })}>
            Annuler
          </Button>
          {mode === "edit" && me.isAdmin && (
            <span className="ml-auto">
              {confirmDelete ? (
                <Button
                  variant="danger"
                  loading={pending}
                  onClick={() =>
                    start(async () => {
                      const res = await deletePost(postId!);
                      if (res.ok) router.push(closeHref, { scroll: false });
                      else setError(res.error);
                    })
                  }
                >
                  Confirmer la suppression
                </Button>
              ) : (
                <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
                  <Trash2 aria-hidden className="size-4" />
                  Supprimer
                </Button>
              )}
            </span>
          )}
        </div>
      )}
    </form>
  );
}
