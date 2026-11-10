"use client";

import { useState, useTransition } from "react";
import { ShieldCheck, UserX, UserCheck } from "lucide-react";
import { setMemberAccess, setMemberActive, setMemberRoles } from "@/actions/members";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import type { RoleRow } from "@/lib/database.types";

/** Outils de l'administrateur sur une fiche : rôles, niveau d'accès, activation. */
export function MemberAdminPanel({
  profileId,
  isSelf,
  roles,
  roleIds,
  accessRole,
  active,
}: {
  profileId: string;
  isSelf: boolean;
  roles: RoleRow[];
  roleIds: string[];
  accessRole: "admin" | "member";
  active: boolean;
}) {
  const [selected, setSelected] = useState(new Set(roleIds));
  const [msg, setMsg] = useState<{ text: string; tone: "error" | "info" } | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, okText: string) =>
    start(async () => {
      setMsg(null);
      const res = await fn();
      setMsg(
        res.ok ? { text: okText, tone: "info" } : { text: res.error ?? "Erreur.", tone: "error" },
      );
    });

  return (
    <section
      aria-labelledby="admin-tools"
      className="border-line bg-surface space-y-5 rounded-2xl border p-4 md:p-5"
    >
      <h2 id="admin-tools" className="font-display flex items-center gap-2 text-lg font-bold">
        <ShieldCheck aria-hidden className="size-5" />
        Gérer ce membre
      </h2>
      <Notice message={msg?.text ?? null} tone={msg?.tone} onClose={() => setMsg(null)} />

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Rôles dans le pôle</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {roles.map((r) => (
            <label
              key={r.id}
              className="border-line-strong has-[:checked]:border-accent-strong has-[:checked]:bg-accent-soft flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 text-sm"
            >
              <input
                type="checkbox"
                className="accent-accent-strong size-5"
                checked={selected.has(r.id)}
                onChange={(e) =>
                  setSelected((prev) => {
                    const next = new Set(prev);
                    if (e.target.checked) next.add(r.id);
                    else next.delete(r.id);
                    return next;
                  })
                }
              />
              {r.name}
            </label>
          ))}
        </div>
        <Button
          variant="secondary"
          loading={pending}
          onClick={() => run(() => setMemberRoles(profileId, [...selected]), "Rôles enregistrés.")}
        >
          Enregistrer les rôles
        </Button>
      </fieldset>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          disabled={pending || isSelf}
          onClick={() =>
            run(
              () => setMemberAccess(profileId, accessRole === "admin" ? "member" : "admin"),
              accessRole === "admin"
                ? "Ce membre n'est plus administrateur."
                : "Ce membre est maintenant administrateur.",
            )
          }
        >
          {accessRole === "admin" ? "Retirer l'accès administrateur" : "Passer administrateur"}
        </Button>
        <Button
          variant={active ? "ghost" : "primary"}
          disabled={pending || isSelf}
          onClick={() =>
            run(
              () => setMemberActive(profileId, !active),
              active ? "Membre désactivé : il n'a plus accès au site." : "Membre réactivé.",
            )
          }
        >
          {active ? (
            <UserX aria-hidden className="size-4" />
          ) : (
            <UserCheck aria-hidden className="size-4" />
          )}
          {active ? "Désactiver" : "Réactiver"}
        </Button>
      </div>
      {isSelf && (
        <p className="text-ink-muted text-xs">Tu ne peux pas modifier ton propre accès ici.</p>
      )}
    </section>
  );
}
