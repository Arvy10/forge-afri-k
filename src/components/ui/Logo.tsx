import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * Logo officiel de Forge Afri'K (fichiers dans public/brand/).
 * - full : engrenage + nom + devise
 * - pole : idem avec « Pôle Communication et réseaux sociaux »
 * - mark : engrenage seul
 */
const FILES = {
  full: {
    src: "/brand/logo.webp",
    width: 511,
    height: 247,
    alt: "Forge Afri'K — Penser local, construire durable, impacter l'Afrique",
  },
  pole: {
    src: "/brand/logo-pole.webp",
    width: 511,
    height: 424,
    alt: "Forge Afri'K — Pôle Communication et réseaux sociaux",
  },
  mark: { src: "/brand/mark.webp", width: 208, height: 206, alt: "Forge Afri'K" },
} as const;

export function Logo({
  variant = "full",
  className,
  priority,
}: {
  variant?: keyof typeof FILES;
  className?: string;
  priority?: boolean;
}) {
  const f = FILES[variant];
  return (
    <Image
      src={f.src}
      width={f.width}
      height={f.height}
      alt={f.alt}
      priority={priority}
      // Déjà optimisé (WebP léger) : évite de dépendre du service d'images de l'hébergeur.
      unoptimized
      className={cn("h-auto w-full select-none", className)}
    />
  );
}

/** Plaque crème qui porte le logo sur les fonds verts (barre latérale, connexion). */
export function LogoPlate({
  variant = "full",
  className,
  priority,
}: {
  variant?: keyof typeof FILES;
  className?: string;
  priority?: boolean;
}) {
  return (
    <span
      className={cn(
        "block rounded-2xl bg-[#f6f1e4] p-3 shadow-[0_6px_20px_-8px_rgb(0_0_0/0.45)]",
        className,
      )}
    >
      <Logo variant={variant} priority={priority} />
    </span>
  );
}
