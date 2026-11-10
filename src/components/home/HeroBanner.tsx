import { Gear } from "@/components/ui/Gear";

/** Bandeau du pôle : devise, engrenage en filigrane (la seule animation marquante du site). */
export function HeroBanner({ firstName, greeting }: { firstName: string; greeting: string }) {
  return (
    <header className="bg-forest text-on-forest relative mb-6 overflow-hidden rounded-3xl px-5 py-7 md:px-8 md:py-9">
      <Gear
        spin
        className="text-on-forest pointer-events-none absolute -top-16 -right-12 size-56 opacity-[0.09] md:-right-6 md:size-80"
      />
      <Gear className="text-accent pointer-events-none absolute -bottom-10 left-1/2 size-28 opacity-[0.12] max-md:hidden" />
      <p className="text-on-forest/80 relative text-sm font-medium">
        {greeting}, {firstName}
      </p>
      <h1 className="font-display relative mt-1 text-2xl font-bold md:text-4xl">
        Pôle Communication &amp; Réseau
      </h1>
      <p className="text-on-forest/85 relative mt-2 max-w-xl text-sm md:text-base">
        Penser local, construire durable,{" "}
        <span className="text-accent font-semibold">impacter l&apos;Afrique</span>.
      </p>
    </header>
  );
}
