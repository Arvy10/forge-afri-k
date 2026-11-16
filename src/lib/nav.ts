import {
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  ClipboardCheck,
  Flag,
  House,
  Library,
  Megaphone,
  ListChecks,
  MessagesSquare,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  /** Libellé court de la barre d'onglets mobile. */
  short?: string;
  icon: LucideIcon;
  soon?: boolean;
  /** Présent dans la barre du bas sur mobile. */
  primary?: boolean;
  adminOnly?: boolean;
  /** Masqué pour un observateur (il n'a pas d'espace de travail). */
  hideForObserver?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/accueil", label: "Accueil", icon: House, primary: true },
  {
    href: "/mon-espace",
    label: "Mon espace",
    icon: ClipboardCheck,
    primary: true,
    hideForObserver: true,
  },
  { href: "/calendrier", label: "Calendrier", icon: CalendarDays, primary: true },
  { href: "/equipe", label: "Équipe", icon: Users, primary: true },
  { href: "/infos", label: "Infos", icon: Megaphone },
  { href: "/taches", label: "Toutes les tâches", short: "Tâches", icon: ListChecks },
  { href: "/regles", label: "Règles et guide", icon: BookOpenCheck },
  { href: "/projets", label: "Projets Forge Afri'K", icon: Flag },
  { href: "/bibliotheque", label: "Bibliothèque", icon: Library, soon: true },
  { href: "/reunions", label: "Réunions", icon: MessagesSquare, soon: true },
  { href: "/resultats", label: "Résultats", icon: BarChart3, soon: true },
  { href: "/reglages", label: "Administration", icon: Settings, adminOnly: true },
];

export function navFor(isAdmin: boolean, isObserver = false): NavItem[] {
  return NAV_ITEMS.filter((i) => (!i.adminOnly || isAdmin) && !(isObserver && i.hideForObserver));
}

export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
