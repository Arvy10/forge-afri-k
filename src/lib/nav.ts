import {
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  Flag,
  House,
  Library,
  ListChecks,
  MessagesSquare,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  soon?: boolean;
  /** Présent dans la barre du bas sur mobile. */
  primary?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Accueil", icon: House, primary: true },
  { href: "/calendrier", label: "Calendrier", icon: CalendarDays, primary: true },
  { href: "/membres", label: "Membres et rôles", icon: Users, primary: true },
  { href: "/taches", label: "Tâches", icon: ListChecks, primary: true },
  { href: "/regles", label: "Règles et guide", icon: BookOpenCheck },
  { href: "/projets", label: "Projets Forge Afri'K", icon: Flag },
  { href: "/bibliotheque", label: "Bibliothèque", icon: Library, soon: true },
  { href: "/reunions", label: "Réunions", icon: MessagesSquare, soon: true },
  { href: "/resultats", label: "Résultats", icon: BarChart3, soon: true },
];

export function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
