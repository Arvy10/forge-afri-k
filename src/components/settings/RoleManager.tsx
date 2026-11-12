"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { createRole, deleteRole, saveRole } from "@/actions/members";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Field";
import type { RoleRow } from "@/lib/database.types";
import { roleTree } from "@/lib/roles";
import { cn } from "@/lib/cn";

type Draft = { nom: string; parent_id: string; mission: string; ne_fait_pas: string };
const field = "border-line-strong bg-canvas w-full rounded-xl border px-3 text-base";

/** Formulaire d'un rôle : création ou modification (nom, rôle parent, mission, « ne fait pas »). */
function RoleForm({
  role,
  roles,
  holders,
  onDone,
  nested,
}: {
  role?: RoleRow;
  roles: RoleRow[];
  holders?: number;
  onDone?: () => void;
  nested?: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>({
    nom: role?.nom ?? "",
    parent_id: role?.parent_id ?? "",
    mission: role?.mission ?? "",
    ne_fait_pas: role?.ne_fait_pas ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, start] = useTransition();
  const set = (k: keyof Draft, v: string) => setDraft((d) => ({ ...d, [k]: v }));
  const hasChildren = !!role && roles.some((r) => r.parent_id === role.id);
  // Un parent possible : un rôle principal, autre que celui-ci ; et seulement si celui-ci n'a pas de sous-rôles.
  const parents = roles.filter((r) => !r.parent_id && r.id !== role?.id);
  const dirty =
    !role ||
    draft.nom !== role.nom ||
    draft.parent_id !== (role.parent_id ?? "") ||
    draft.mission !== role.mission ||
    draft.ne_fait_pas !== role.ne_fait_pas;

  return (
    <form
      noValidate
      className={cn(
        "border-line bg-surface space-y-3 rounded-2xl border p-4",
        nested && "bg-canvas",
      )}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setOk(null);
        start(async () => {
          const res = role ? await saveRole({ id: role.id, ...draft }) : await createRole(draft);
          if (!res.ok) return setError(res.fieldErrors?.nom ?? res.error);
          setOk(role ? "Rôle enregistré." : "Rôle créé.");
          if (!role) setDraft({ nom: "", parent_id: "", mission: "", ne_fait_pas: "" });
          router.refresh();
          onDone?.();
        });
      }}
    >
      <FormError message={error} />
      {ok && (
        <p
          role="status"
          className="bg-t-impact-bg text-t-impact-fg rounded-lg px-3 py-2.5 text-sm font-medium"
        >
          {ok}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor={`nom-${role?.id ?? "new"}`} className="text-sm font-medium">
            Nom du rôle
          </label>
          <input
            id={`nom-${role?.id ?? "new"}`}
            value={draft.nom}
            onChange={(e) => set("nom", e.target.value)}
            maxLength={80}
            className={cn(field, "min-h-12")}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`parent-${role?.id ?? "new"}`} className="text-sm font-medium">
            Sous-rôle de…
          </label>
          <select
            id={`parent-${role?.id ?? "new"}`}
            value={draft.parent_id}
            disabled={hasChildren}
            onChange={(e) => set("parent_id", e.target.value)}
            className={cn(field, "min-h-12")}
          >
            <option value="">Aucun (rôle principal)</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nom}
              </option>
            ))}
          </select>
          {hasChildren && (
            <p className="text-ink-muted text-xs">
              Ce rôle a des sous-rôles : il reste un rôle principal.
            </p>
          )}
        </div>
      </div>
      <div className="space-y-1.5">
        <label htmlFor={`mission-${role?.id ?? "new"}`} className="text-sm font-medium">
          Mission : ce que fait ce rôle
        </label>
        <textarea
          id={`mission-${role?.id ?? "new"}`}
          rows={2}
          value={draft.mission}
          onChange={(e) => set("mission", e.target.value)}
          maxLength={1000}
          className={cn(field, "py-2.5")}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor={`nfp-${role?.id ?? "new"}`} className="text-sm font-medium">
          Ce que ce rôle ne fait pas
        </label>
        <textarea
          id={`nfp-${role?.id ?? "new"}`}
          rows={2}
          value={draft.ne_fait_pas}
          onChange={(e) => set("ne_fait_pas", e.target.value)}
          maxLength={1000}
          placeholder="À renseigner avec l'équipe"
          className={cn(field, "py-2.5")}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="submit"
          variant={role ? "secondary" : "primary"}
          loading={pending}
          disabled={!dirty || draft.nom.trim() === ""}
          className="min-h-12"
        >
          {role ? <Save aria-hidden className="size-4" /> : <Plus aria-hidden className="size-4" />}
          {role ? "Enregistrer" : "Créer le rôle"}
        </Button>
        {role && (
          <span className="ml-auto">
            {confirmDelete ? (
              <Button
                variant="danger"
                loading={pending}
                className="min-h-12"
                onClick={() =>
                  start(async () => {
                    const res = await deleteRole(role.id);
                    if (!res.ok) return setError(res.error);
                    router.refresh();
                  })
                }
              >
                Confirmer la suppression
              </Button>
            ) : (
              <Button variant="ghost" className="min-h-12" onClick={() => setConfirmDelete(true)}>
                <Trash2 aria-hidden className="size-4" />
                Supprimer
              </Button>
            )}
          </span>
        )}
      </div>
      {role && confirmDelete && (
        <p className="text-danger text-sm">
          Le rôle sera retiré{" "}
          {holders
            ? `à ${holders} ${holders > 1 ? "personnes" : "personne"}`
            : "de ceux qui le portent"}
          .{hasChildren ? " Ses sous-rôles deviendront des rôles principaux." : ""}
        </p>
      )}
    </form>
  );
}

/** Gestion des rôles (administrateur) : créer, modifier, supprimer, avec sous-rôles. */
export function RoleManager({
  roles,
  holders,
}: {
  roles: RoleRow[];
  holders: Record<string, number>;
}) {
  const [adding, setAdding] = useState(false);
  const tree = roleTree(roles);
  return (
    <div className="space-y-4">
      {tree.map(({ role, children }) => (
        <div key={role.id} className="space-y-3">
          <RoleForm role={role} roles={roles} holders={holders[role.id]} />
          {children.length > 0 && (
            <div className="border-line ml-4 space-y-3 border-l-2 pl-4">
              {children.map((c) => (
                <RoleForm key={c.id} role={c} roles={roles} holders={holders[c.id]} nested />
              ))}
            </div>
          )}
        </div>
      ))}
      {adding ? (
        <div>
          <h3 className="font-display mb-2 text-base font-bold">Nouveau rôle</h3>
          <RoleForm roles={roles} onDone={() => setAdding(false)} />
        </div>
      ) : (
        <Button className="min-h-12" onClick={() => setAdding(true)}>
          <Plus aria-hidden className="size-4" />
          Ajouter un rôle
        </Button>
      )}
    </div>
  );
}
