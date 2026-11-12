"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck, Trash2, UserCheck, UserX } from "lucide-react";
import type { z } from "zod";
import { deleteMember, saveMember, setMemberActive } from "@/actions/members";
import { Button } from "@/components/ui/Button";
import { FormError, TextField } from "@/components/ui/Field";
import { MEMBER_COLORS, MEMBER_COLOR_LABEL, type MemberColor } from "@/lib/constants";
import type { RoleRow } from "@/lib/database.types";
import { flattenRoles } from "@/lib/roles";
import { memberSchema } from "@/lib/schemas";
import { cn } from "@/lib/cn";

type Input = z.input<typeof memberSchema>;

const SWATCH: Record<MemberColor, string> = {
  vert: "bg-t-impact-dot",
  orange: "bg-t-appel_action-dot",
  sable: "bg-t-patrimoine-dot",
  bleu: "bg-t-coulisses-dot",
  ambre: "bg-t-fun-dot",
};

/** Mode administrateur : nom, couleur, rôles, activation d'un membre. */
export function MemberAdminPanel({
  memberId,
  initial,
  roles,
  actif,
  isSelf,
  taskCount,
}: {
  memberId: string;
  initial: { prenom: string; nom: string; couleur: MemberColor; role_ids: string[] };
  roles: RoleRow[];
  actif: boolean;
  /** C'est la personne connectée : elle ne peut pas se supprimer. */
  isSelf: boolean;
  /** Nombre de tâches rattachées à ce membre. */
  taskCount: number;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [withTasks, setWithTasks] = useState(false);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    formState: { errors },
  } = useForm<Input, unknown, z.output<typeof memberSchema>>({
    resolver: zodResolver(memberSchema),
    defaultValues: initial,
  });
  const couleur = useWatch({ control, name: "couleur" });

  return (
    <section
      aria-labelledby="gerer"
      className="border-accent/40 bg-surface shadow-card mb-7 rounded-2xl border p-4 md:p-5"
    >
      <h2 id="gerer" className="font-display flex items-center gap-2 text-lg font-bold">
        <ShieldCheck aria-hidden className="text-accent-strong size-5" />
        Gérer ce membre
      </h2>
      <form
        noValidate
        className="mt-3 space-y-4"
        onSubmit={handleSubmit((values) => {
          setMsg(null);
          start(async () => {
            const res = await saveMember(memberId, values);
            if (!res.ok) {
              setMsg({ text: res.error, ok: false });
              for (const [k, m] of Object.entries(res.fieldErrors ?? {}))
                setError(k as keyof Input, { message: m });
              return;
            }
            setMsg({ text: "Membre enregistré.", ok: true });
            router.refresh();
          });
        })}
      >
        {msg && !msg.ok && <FormError message={msg.text} />}
        {msg?.ok && (
          <p
            role="status"
            className="bg-t-impact-bg text-t-impact-fg rounded-lg px-3 py-2.5 text-sm font-medium"
          >
            {msg.text}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Prénom"
            required
            error={errors.prenom?.message}
            {...register("prenom")}
          />
          <TextField label="Nom (facultatif)" error={errors.nom?.message} {...register("nom")} />
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Couleur de la pastille</legend>
          <div className="flex flex-wrap gap-2">
            {MEMBER_COLORS.map((c) => (
              <label
                key={c}
                className={cn(
                  "border-line-strong bg-canvas flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm font-medium",
                  couleur === c && "border-accent-strong bg-accent-soft",
                )}
              >
                <input
                  type="radio"
                  value={c}
                  className="sr-only"
                  {...register("couleur")}
                  onChange={() => setValue("couleur", c)}
                />
                <span aria-hidden className={cn("size-5 rounded-full", SWATCH[c])} />
                {MEMBER_COLOR_LABEL[c]}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Rôles (un ou plusieurs)</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {flattenRoles(roles).map(({ role: r, depth }) => (
              <label
                key={r.id}
                className="border-line-strong bg-canvas has-[:checked]:border-accent-strong has-[:checked]:bg-accent-soft flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3 text-sm"
              >
                <input
                  type="checkbox"
                  value={r.id}
                  className="accent-accent-strong size-5"
                  {...register("role_ids")}
                />
                <span className={depth === 1 ? "text-ink-muted" : "font-medium"}>
                  {depth === 1 && "↳ "}
                  {r.nom}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={pending} className="min-h-12">
            Enregistrer
          </Button>
          <Button
            variant={actif ? "ghost" : "primary"}
            className="min-h-12"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await setMemberActive(memberId, !actif);
                if (!res.ok) return setMsg({ text: res.error, ok: false });
                router.refresh();
              })
            }
          >
            {actif ? (
              <UserX aria-hidden className="size-4" />
            ) : (
              <UserCheck aria-hidden className="size-4" />
            )}
            {actif ? "Désactiver" : "Réactiver"}
          </Button>
        </div>
        <p className="text-ink-muted text-xs">
          Un membre désactivé disparaît de « Qui es-tu ? » mais garde son historique de tâches.
        </p>
      </form>

      <div className="border-line mt-6 border-t pt-4">
        <h3 className="font-display flex items-center gap-2 text-base font-bold">
          <Trash2 aria-hidden className="text-danger size-4" />
          Supprimer ce membre
        </h3>
        {isSelf ? (
          <p className="text-ink-muted mt-1 text-sm">
            Tu ne peux pas supprimer ta propre fiche. Tu peux demander à un autre administrateur, ou
            te désactiver.
          </p>
        ) : confirmDelete ? (
          <div className="mt-2 space-y-3">
            <p className="text-sm">
              Cette suppression est <strong>définitive</strong>.{" "}
              {taskCount > 0
                ? `Ce membre a ${taskCount} ${taskCount > 1 ? "tâches" : "tâche"}.`
                : "Ce membre n'a aucune tâche."}
            </p>
            {taskCount > 0 && (
              <label className="border-line-strong bg-canvas flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3 text-sm">
                <input
                  type="checkbox"
                  checked={withTasks}
                  onChange={(e) => setWithTasks(e.target.checked)}
                  className="accent-accent-strong size-5"
                />
                Supprimer aussi ses tâches (sinon elles deviennent « sans responsable »)
              </label>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="danger"
                className="min-h-12"
                loading={pending}
                onClick={() =>
                  start(async () => {
                    const res = await deleteMember(memberId, withTasks);
                    if (!res.ok) return setMsg({ text: res.error, ok: false });
                    router.push("/equipe");
                    router.refresh();
                  })
                }
              >
                Oui, supprimer définitivement
              </Button>
              <Button variant="ghost" className="min-h-12" onClick={() => setConfirmDelete(false)}>
                Annuler
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-2">
            <p className="text-ink-muted mb-2 text-sm">
              Pour garder l&apos;historique, préfère « Désactiver » ci-dessus. La suppression efface
              la personne de l&apos;équipe.
            </p>
            <Button
              variant="secondary"
              className="text-danger min-h-12"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 aria-hidden className="size-4" />
              Supprimer ce membre
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
