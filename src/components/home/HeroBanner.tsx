import { Gear } from "@/components/ui/Gear";

/**
 * Bandeau du pôle : devise, engrenages en filigrane (le grand tourne lentement),
 * trame de points et lueur orange. Les pastilles de chiffres se glissent en enfant.
 */
export function HeroBanner({
  firstName,
  greeting,
  dateLabel,
  children,
}: {
  firstName: string;
  greeting: string;
  dateLabel: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="bg-forest text-on-forest relative mb-6 overflow-hidden rounded-2xl px-5 py-6 md:px-8 md:py-8">
      <Gear
        spin
        className="text-on-forest pointer-events-none absolute -top-16 -right-12 size-52 opacity-[0.06] md:size-80"
      />
      <div className="relative">
        <p className="text-on-forest/70 text-base first-letter:uppercase">{dateLabel}</p>
        <h1 className="font-display mt-1 text-2xl leading-tight font-bold md:text-3xl">
          {greeting}, {firstName}
        </h1>
        <p className="text-on-forest/80 mt-1 max-w-2xl text-base">
          Pôle Communication &amp; Réseau · Penser local, construire durable, impacter
          l&apos;Afrique.
        </p>
        {children && (
          <div className="mt-5 grid grid-cols-2 gap-2.5 md:flex md:flex-wrap">{children}</div>
        )}
      </div>
    </header>
  );
}

/** Pastille de chiffre du bandeau : valeur en grand, libellé, lien vers la page concernée. */
export function HeroStat({
  value,
  label,
  href,
  urgent,
}: {
  value: number;
  label: string;
  href: string;
  urgent?: boolean;
}) {
  return (
    <a
      href={href}
      className="group border-on-forest/15 bg-on-forest/[0.07] hover:bg-on-forest/15 flex min-h-12 items-center gap-3 rounded-xl border px-4 py-2.5 transition-colors"
    >
      <span
        className={`font-display text-2xl leading-none font-bold tabular-nums ${urgent && value > 0 ? "text-accent" : ""}`}
      >
        {value}
      </span>
      <span className="text-on-forest/85 text-sm leading-snug">{label}</span>
    </a>
  );
}
