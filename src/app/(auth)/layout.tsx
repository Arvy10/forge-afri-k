import { Gear } from "@/components/ui/Gear";
import { Logo } from "@/components/ui/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-forest relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-10">
      <Gear
        spin
        className="text-on-forest pointer-events-none absolute -top-24 -right-24 size-[26rem] opacity-[0.06]"
      />
      <Gear className="text-accent pointer-events-none absolute -bottom-32 -left-20 size-80 opacity-[0.08]" />
      <main className="relative w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-1 text-center">
          <Logo light />
          <p className="text-on-forest/80 text-sm">Pôle Communication &amp; Réseau</p>
        </div>
        <div className="bg-surface text-ink rounded-2xl p-6 shadow-[var(--shadow)] sm:p-8">
          {children}
        </div>
        <p className="text-on-forest/70 mt-6 text-center text-xs">
          Espace privé : réservé aux membres du pôle.
        </p>
      </main>
    </div>
  );
}
