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
    <header className="bg-forest text-on-forest relative mb-7 overflow-hidden rounded-3xl px-5 py-7 shadow-[var(--shadow-lift)] md:px-9 md:py-10">
      {/* lueur + trame */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(60rem 22rem at 100% 0%, rgb(232 98 10 / 0.28), transparent 60%), radial-gradient(rgb(246 241 228 / 0.07) 1.2px, transparent 1.2px)",
          backgroundSize: "auto, 22px 22px",
        }}
      />
      <Gear
        spin
        className="text-on-forest pointer-events-none absolute -top-20 -right-14 size-60 opacity-[0.1] md:-right-4 md:size-[22rem]"
      />
      <Gear className="text-accent animate-gear-reverse pointer-events-none absolute -right-2 -bottom-16 size-36 opacity-30 max-md:hidden md:right-72 md:size-44" />
      <Gear className="text-on-forest animate-float pointer-events-none absolute right-1/3 -bottom-6 size-14 opacity-10 max-md:hidden" />

      <div className="relative">
        <p className="text-on-forest/75 text-sm font-medium first-letter:uppercase">{dateLabel}</p>
        <p className="text-on-forest/90 mt-1 text-base font-medium">
          {greeting}, <span className="text-accent font-semibold">{firstName}</span>
        </p>
        <h1 className="font-display mt-2 max-w-4xl text-3xl leading-[1.05] font-bold md:text-5xl">
          Pôle Communication <span className="text-accent">&amp;</span> Réseau
        </h1>
        <span aria-hidden className="title-bar bg-accent mt-4 block h-1 w-16 rounded-full" />
        <p className="text-on-forest/85 mt-4 max-w-xl text-sm md:text-base">
          Penser local, construire durable,{" "}
          <span className="text-accent font-semibold">impacter l&apos;Afrique</span>.
        </p>
        {children && <div className="mt-6 flex flex-wrap gap-2.5">{children}</div>}
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
      className="group border-on-forest/15 bg-on-forest/10 hover:bg-on-forest/20 flex min-h-11 items-center gap-3 rounded-2xl border px-4 py-2.5 backdrop-blur-sm transition-colors"
    >
      <span
        className={`font-display text-3xl leading-none font-bold tabular-nums ${urgent && value > 0 ? "text-accent" : ""}`}
      >
        {value}
      </span>
      <span className="text-on-forest/85 text-sm leading-tight">{label}</span>
    </a>
  );
}
