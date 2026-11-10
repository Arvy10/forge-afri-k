import Link from "next/link";
import { Illustration } from "@/components/ui/Illustration";
import { buttonClass } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <Illustration kind="map" />
      <h1 className="font-display text-2xl font-bold">Cette page n&apos;existe pas</h1>
      <p className="text-ink-muted max-w-sm text-sm">
        Le lien est peut-être ancien, ou la personne ou le post a été supprimé.
      </p>
      <Link href="/" className={buttonClass("primary")}>
        Retour à l&apos;accueil
      </Link>
    </main>
  );
}
