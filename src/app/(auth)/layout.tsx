import { Gear } from "@/components/ui/Gear";
import { LogoPlate } from "@/components/ui/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-forest relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-10">
      <Gear
        spin
        className="text-on-forest pointer-events-none absolute -top-24 -right-24 size-[26rem] opacity-[0.06]"
      />
      <Gear className="text-accent animate-gear-reverse pointer-events-none absolute -bottom-32 -left-20 size-80 opacity-[0.1]" />
      <main className="relative w-full max-w-md">
        <div
          className="mx-auto mb-6 w-60 sm:w-72"
          style={{ animation: "rise 0.7s cubic-bezier(0.2,0.7,0.2,1) backwards" }}
        >
          <LogoPlate variant="pole" priority />
        </div>
        <div
          className="bg-surface text-ink rounded-2xl p-6 shadow-[var(--shadow-lift)] sm:p-8"
          style={{ animation: "rise 0.7s 0.12s cubic-bezier(0.2,0.7,0.2,1) backwards" }}
        >
          {children}
        </div>
        <p className="text-on-forest/70 mt-6 text-center text-xs">
          Espace privé : réservé aux membres du pôle.
        </p>
      </main>
    </div>
  );
}
