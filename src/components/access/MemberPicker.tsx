"use client";

import { useState, useTransition } from "react";
import { ChevronRight } from "lucide-react";
import { chooseMember } from "@/actions/access";
import { Avatar } from "@/components/ui/Avatar";
import { FormError } from "@/components/ui/Field";
import type { MemberLite } from "@/lib/members";
import { cn } from "@/lib/cn";

/** Grandes cartes tactiles : un clic = « je suis cette personne ». */
export function MemberPicker({ members }: { members: MemberLite[] }) {
  const [error, setError] = useState<string | null>(null);
  const [choosing, setChoosing] = useState<string | null>(null);
  const [, start] = useTransition();

  return (
    <div>
      <FormError message={error} />
      <ul className="stagger grid gap-3 sm:grid-cols-2">
        {members.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              disabled={choosing !== null}
              onClick={() => {
                setError(null);
                setChoosing(m.id);
                start(async () => {
                  const res = await chooseMember(m.id);
                  // En cas de succès le serveur redirige vers « Mon espace ».
                  if (res && !res.ok) {
                    setError(res.error);
                    setChoosing(null);
                  }
                });
              }}
              className={cn(
                "border-line-strong bg-surface lift flex min-h-20 w-full items-center gap-4 rounded-2xl border p-3 text-left transition-colors",
                "hover:border-accent-strong disabled:opacity-60",
                choosing === m.id && "border-accent-strong bg-accent-soft",
              )}
            >
              <Avatar name={m.name} color={m.couleur} size="lg" />
              <span className="min-w-0 flex-1">
                <span className="font-display block truncate text-lg font-bold">{m.name}</span>
                <span className="text-ink-muted block truncate text-sm">
                  {m.roleNames.join(" · ") || "Rôle à définir"}
                </span>
              </span>
              <ChevronRight aria-hidden className="text-ink-muted size-5 shrink-0" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
