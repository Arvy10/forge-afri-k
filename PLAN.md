# Plan — Site privé du pôle Communication & Réseau (Forge Afri'K)

## Choix techniques

| Sujet            | Choix                                                                                                                                             | Pourquoi                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Framework        | Next.js 16 (App Router) + React 19, TypeScript strict                                                                                             | Dernière version stable. `proxy.ts` remplace `middleware.ts`.                              |
| Style            | Tailwind CSS 4, variables CSS pour les couleurs                                                                                                   | Clair/sombre sans dupliquer chaque classe.                                                 |
| Accessibilité    | `@radix-ui/react-dialog` seulement (panneaux, tiroir)                                                                                             | Le reste est fait maison : pas de bibliothèque lourde.                                     |
| Données          | Supabase (Auth, Postgres + RLS, Storage)                                                                                                          | Les pages lisent côté serveur avec la session de la personne : la RLS s'applique toujours. |
| Écritures        | Server Actions + validation Zod côté serveur                                                                                                      | Aucune écriture ne dépend du navigateur.                                                   |
| Formulaires      | React Hook Form + `@hookform/resolvers` (mêmes schémas Zod que le serveur)                                                                        | Messages d'erreur en français.                                                             |
| Dates            | `date-fns` (locale `fr`) + `@date-fns/tz` ; dates de publication stockées en `date` simple, fuseau `Africa/Brazzaville` (UTC+1, sans heure d'été) | Pas de décalage de jour.                                                                   |
| Glisser-déposer  | HTML5 natif (ordinateur uniquement)                                                                                                               | Zéro dépendance.                                                                           |
| Markdown (guide) | `react-markdown`                                                                                                                                  | Rendu sûr par défaut.                                                                      |
| Tests            | Vitest : dates, rythme, CSV ; SQL RLS testé avec un script `pg` sur une base Postgres locale                                                      |                                                                                            |
| Invitations      | `auth.admin.inviteUserByEmail` avec la clé `service_role`, uniquement dans une Server Action réservée à l'admin                                   | La clé ne touche jamais le navigateur.                                                     |
| Hébergement      | `next start` (Node 22) ; `NEXT_OUTPUT=standalone` possible. Hostinger **Business / Cloud** (application Node.js) ou **VPS**                       | Une offre « Premium » mutualisée classique ne fait pas tourner Next.js.                    |

## Schéma de données

Enums : `content_type` (impact, patrimoine, coulisses, fun, appel_action), `channel` (instagram, tiktok, facebook), `post_status` (a_faire, en_cours, pret_a_valider, valide, publie), `task_status` (a_faire, en_cours, valide), `task_priority` (normale, haute), `access_role` (admin, member), `project_status`.

Tables demandées : `profiles`, `roles`, `profile_roles`, `posts`, `tasks`, `comments`, `attachments`, `guide_sections`, `projects`, `milestones`.
Ajouts minimaux et justifiés :

- `post_status_history` (l'historique des statuts de la fiche d'un post), alimentée par trigger ;
- `feature_interests` (le bouton « Me prévenir quand c'est prêt » des pages Bientôt) ;
- buckets Storage `attachments` et `avatars`, privés (URLs signées).

RLS : tout est lisible par un membre connecté et actif, rien sans connexion. Écriture : admin partout ; membre sur les posts/tâches dont il est responsable (ou créateur d'une tâche), sur son profil (sans pouvoir changer son niveau d'accès : trigger de garde), sur ses propres commentaires.

## Arborescence

```
supabase/{migrations/0001_init.sql, seed.sql, promote_admin.sql}
src/
  proxy.ts                      session + redirection vers /connexion
  app/
    (auth)/connexion, mot-de-passe-oublie, definir-mot-de-passe, completer-profil
    auth/confirm/route.ts       échange du lien d'invitation / de réinitialisation
    (app)/layout.tsx            barre latérale + garde de connexion
      page.tsx                  Accueil
      calendrier/               semaine · mois · liste, fiche d'un post (?post=)
      membres/ (+ [id], roles)  fiches, rôles, invitation
      taches/                   kanban + liste
      regles/                   guide
      projets/                  cartes + frise
      bibliotheque, reunions, resultats
  components/{ui,layout,calendar,...}
  lib/{supabase,dates,rhythm,schemas,csv,...}
tests/
```

## Ordre de construction (un commit par étape)

1. **Fondations** : Next, Tailwind, thème clair/sombre, polices, Supabase, migration, seed, tests de dates.
2. **Authentification et invitations**.
3. **Barre latérale et mise en page** (9 entrées, 3 « Bientôt »).
4. **Calendrier** (semaine, mois, liste, fiche, import/export CSV).
5. **Accueil**.
6. **Membres et rôles**.
7. **Tâches**.
8. **Règles et guide**.
9. **Projets**.
10. **Pages « Bientôt »**.
11. **README** (installation, Supabase, premier admin, déploiement Hostinger).

## Ce qu'il me faut de ta part (rien ne bloque le code)

- Les clés du projet Supabase (URL, clé publique, clé `service_role`) — à mettre dans `.env.local` et dans Hostinger, **jamais dans le chat**.
- Le logo (SVG ou PNG). En attendant, un engrenage dessiné à la main sert de marque.
- Ton offre Hostinger exacte (Business, Cloud ou VPS) et le domaine.
