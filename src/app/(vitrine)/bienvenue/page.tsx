import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Gear } from "@/components/ui/Gear";
import { Logo } from "@/components/ui/Logo";

export const metadata: Metadata = {
  title: "Bienvenue",
  description: "Forge Afri'K · Pôle Communication & Réseau.",
};

const d = (n: number) => ({ "--d": n }) as React.CSSProperties;
const i = (n: number) => ({ "--i": n }) as React.CSSProperties;

/** Les phrases du grand titre : la première est le nom du pôle, les autres sont la devise. */
const LINES = [
  <>
    Pôle Communication <span className="text-[var(--lp-orange-deep)]">&amp;&nbsp;Réseau</span>
  </>,
  <>
    Penser <span className="text-[var(--lp-orange-deep)]">local.</span>
  </>,
  <>
    Construire <span className="text-[var(--lp-orange-deep)]">durable.</span>
  </>,
  <>
    Impacter <span className="text-[var(--lp-orange-deep)]">l&apos;Afrique.</span>
  </>,
];

export default function WelcomePage() {
  return (
    <div className="lp">
      {/* Fond */}
      <div aria-hidden className="lp-aurora">
        <div className="lp-blob lp-blob-1" />
        <div className="lp-blob lp-blob-2" />
        <div className="lp-blob lp-blob-3" />
      </div>
      <div aria-hidden className="lp-dots" />
      <Gear className="lp-gear" />
      <div aria-hidden className="lp-vignette" />
      <div aria-hidden className="lp-grain" />

      {/* Barre en verre dépoli */}
      <header className="px-3 pt-3 sm:px-6 sm:pt-5">
        <nav
          aria-label="Navigation"
          className="lp-glass lp-drop mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 rounded-full pr-2.5 pl-3"
        >
          <Link
            href="/bienvenue"
            className="flex min-h-12 items-center gap-3"
            aria-label="Forge Afri'K"
          >
            <span className="grid size-11 place-items-center rounded-full bg-white p-1.5 shadow-[0_2px_8px_rgb(27_52_9/0.15)]">
              <Logo variant="mark" priority />
            </span>
            <span className="hidden text-sm leading-tight font-semibold sm:block">
              Forge Afri&apos;K
              <span className="block text-xs font-normal text-[var(--lp-muted)]">
                Pôle Communication &amp; Réseau
              </span>
            </span>
          </Link>
          <Link
            href="/acces"
            className="lp-link inline-flex min-h-12 items-center rounded-full bg-[var(--lp-ink)] px-6 text-sm font-semibold text-[#f8f4ea]"
          >
            Connexion
          </Link>
        </nav>
      </header>

      {/* Section unique */}
      <main className="flex flex-1 flex-col items-center px-5 pb-10 text-center sm:pb-14">
        <div className="flex w-full flex-1 flex-col items-center justify-center gap-7 py-10 sm:gap-9">
          <div className="lp-rise w-44 sm:w-56" style={d(0)}>
            <Logo variant="full" priority />
          </div>

          <h1 className="font-display w-full max-w-4xl text-[2.6rem] leading-[1.06] font-bold tracking-tight sm:text-6xl lg:text-7xl">
            <span className="sr-only">Forge Afri&apos;K · Pôle Communication et Réseau</span>
            <span aria-hidden className="lp-stack lp-rise" style={d(1)}>
              {LINES.map((line, n) => (
                <span key={n} style={i(n)} className="block text-balance">
                  {line}
                </span>
              ))}
            </span>
          </h1>
        </div>

        <div className="lp-rise flex flex-col items-center gap-3" style={d(3)}>
          <Link
            href="/acces"
            className="lp-enter inline-flex min-h-14 items-center justify-center gap-2.5 rounded-full px-9 text-base font-semibold"
          >
            Entrer dans le pôle
            <ArrowRight aria-hidden className="lp-arrow size-5" />
          </Link>
          <p className="text-xs text-[var(--lp-muted)]">
            Espace réservé aux membres de l&apos;équipe
          </p>
        </div>
      </main>
    </div>
  );
}
