import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccessForm } from "@/components/access/AccessForm";
import { envProblems } from "@/lib/env";
import { safeNext } from "@/lib/safe-redirect";
import { getAuth } from "@/server/session";

export const metadata: Metadata = { title: "Code d'accès" };

export default async function AccessPage({
  searchParams,
}: {
  searchParams: Promise<{ suite?: string }>;
}) {
  const { suite } = await searchParams;
  const problems = envProblems();

  // Site pas encore configuré : on le dit clairement (noms de variables seulement, jamais de valeurs).
  if (problems.length > 0) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-bold">Le site n&apos;est pas encore configuré</h1>
        <p className="text-ink-muted text-sm">
          Il manque des variables d&apos;environnement sur l&apos;hébergement :
        </p>
        <ul className="bg-surface-2 space-y-1 rounded-xl px-4 py-3 font-mono text-sm">
          {problems.map((p) => (
            <li key={p.name}>
              <strong>{p.name}</strong> <span className="text-ink-muted">{p.problem}</span>
            </li>
          ))}
        </ul>
        <p className="text-ink-muted text-sm">
          Ajoute-les puis relance un déploiement complet (voir le README).
        </p>
      </div>
    );
  }

  // Déjà entré : inutile de redemander le code.
  const auth = await getAuth();
  if (auth.valid) redirect(auth.member ? safeNext(suite, "/") : "/qui-es-tu");

  return <AccessForm suite={suite ? safeNext(suite, "/") : undefined} />;
}
