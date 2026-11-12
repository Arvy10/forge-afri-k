# Forge Afri'K — Site du pôle Communication & Réseau (V2)

Outil de travail d'équipe, pensé pour le **téléphone** : mon espace (mes tâches, mes livrables), suivi de l'équipe avec relances, calendrier éditorial, règles et projets.

**Pas de comptes, pas d'e-mails.** Tout le pôle utilise **un code d'accès commun**, puis chacun choisit son prénom (« Qui es-tu ? »). L'ambassadeur dispose en plus d'un **code administrateur**.

**Stack** : Next.js 16 (App Router) · TypeScript strict · Tailwind CSS 4 · Supabase (Postgres + Storage, **accès uniquement par le serveur**) · `jose` (cookies signés) · `bcryptjs` · Zod · React Hook Form · date-fns (fuseau `Africa/Brazzaville`).

---

## 1. Comment fonctionne l'accès

```
Code d'accès commun  →  « Qui es-tu ? »  →  Mon espace
        (tout le pôle)      (un clic)
Mode administrateur : second code ; « Rester administrateur sur cet appareil » = 30 jours, sinon 12 heures
```

- Le code est vérifié **côté serveur**. Il n'est jamais dans le code source ni envoyé au navigateur. Il vient de la variable `ACCESS_CODE`, ou — dès que l'admin le change dans **Réglages** — d'une **empreinte bcrypt** stockée dans `pc_settings`.
- Si le code est bon, le serveur pose un **cookie signé** (`pc_session`, JWT HS256 via `jose`) : `httpOnly`, `secure` (en production), `sameSite=lax`, **30 jours**. Le mode administrateur est un second cookie (`pc_admin`) : **30 jours** si la case « Rester administrateur sur cet appareil » est cochée (par défaut), sinon **12 heures**. L'administrateur garde en plus sa propre fiche de membre (tâches, rôle) : choisir « qui il est » ne le fait jamais perdre le mode administrateur.
- **Limite d'essais** : 5 codes faux → blocage de 5 minutes, **par adresse IP** (enregistrée seulement sous forme d'empreinte salée, table `pc_login_attempts`). Même règle pour le code administrateur.
- **Changer le code** (Réglages) fait tomber toutes les autres sessions (numéro de version dans le cookie). Même effet avec « Déconnecter tous les appareils ».
- **Les données ne passent que par le serveur.** Les 15 tables `pc_*` ont la RLS activée, **aucune politique**, et les droits sont retirés à `anon` et `authenticated` : la clé publique du navigateur ne peut rien lire ni écrire. Le serveur utilise la clé `service_role` (jamais exposée au navigateur). Toutes les entrées sont validées par Zod.

### Limites de sécurité (à lire)

1. **Le code est partagé** : toute personne qui le connaît peut se faire passer pour n'importe quel membre. « Qui es-tu ? » est une déclaration, pas une preuve.
2. **Si le code fuite**, il suffit de le changer (Réglages) : toutes les sessions sont coupées.
3. **Le journal d'activité** reflète l'identité _déclarée_, pas vérifiée.
4. La limite d'essais freine les essais au hasard ; elle n'arrête pas un attaquant déterminé qui change d'adresse IP. Choisis un code assez long.
5. **N'enregistre aucune donnée sensible** : pas de téléphone, d'e-mail personnel, ni de pièce d'identité.

---

## 2. Variables d'environnement

| Variable                        | Rôle                                                                                                                | Secrète ? |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Adresse du projet Supabase                                                                                          | non       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique. Sert **uniquement** à envoyer un fichier vers une URL signée par le serveur. Ne lit **aucune** table. | non       |
| `SUPABASE_SERVICE_ROLE_KEY`     | Lit et écrit les données — **serveur uniquement**                                                                   | **oui**   |
| `ACCESS_CODE`                   | Code d'accès commun (modifiable ensuite dans Réglages)                                                              | **oui**   |
| `ADMIN_CODE`                    | Code du mode administrateur, connu du seul ambassadeur                                                              | **oui**   |
| `SESSION_SECRET`                | Signe les cookies (≥ 32 caractères, aléatoire)                                                                      | **oui**   |

Générer un secret : `openssl rand -base64 48`.

> ⚠️ Les variables `NEXT_PUBLIC_*` sont **figées au moment du build** : après les avoir changées, il faut **redéployer** (rebuild). Les autres sont lues au démarrage.
> Tant qu'il manque une variable, la page d'entrée affiche la **liste des variables manquantes** (noms seulement) au lieu de planter.

`.env.local` (non versionné) contient des **valeurs de développement** pour le faux backend local. N'utilise jamais ces valeurs en production.

---

## 3. Base de données (Supabase)

Les migrations sont dans `supabase/migrations/` (à rejouer dans l'ordre, sur un projet vierge) :

| Fichier                             | Contenu                                                                                                                                                                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20261111000001_pc_schema.sql`      | 14 tables `pc_*` (15 avec la migration suivante), types énumérés, index, triggers (`updated_at`, `fait_le`, journal d'activité), RLS sans politique, droits retirés à `anon`/`authenticated`, bucket privé `pc-livrables` |
| `20261111000002_pc_seed.sql`        | Les 6 modèles de rôles, le guide, les projets, la frise. **Aucun membre, tâche ni post.**                                                                                                                                 |
| `20261112000001_pc_roles_infos.sql` | Sous-rôles (`pc_roles.parent_id`) et table `pc_infos` (annonces de l'administrateur), mêmes protections (RLS sans politique).                                                                                             |

Tables : `pc_members`, `pc_roles`, `pc_member_roles`, `pc_tasks`, `pc_task_deliverables`, `pc_nudges`, `pc_posts`, `pc_activity`, `pc_guide_sections`, `pc_projects`, `pc_milestones`, `pc_settings`, `pc_infos`, plus `pc_login_attempts` (limite d'essais) et `pc_feature_interests` (bouton « Me prévenir » des pages Bientôt).

**Appliquer** : Supabase → _SQL Editor_ → coller chaque fichier, dans l'ordre. (Le projet utilisé par ce dépôt est « forge afri'k » ; les migrations n'ont créé que des tables `pc_*` et ne touchent à rien d'autre.)

**Vérifier que la clé publique ne lit rien** (appel réel à l'API) :

```bash
./scripts/check-public-key.sh https://xxxx.supabase.co <clé publique>
```

Chaque ligne doit afficher `HTTP 401/403` (ou une liste vide), jamais de données.

---

## 4. Première utilisation

**Administrateur (Arvy)**

1. Ouvre le site, tape le **code d'accès**.
2. Sur « Qui es-tu ? » (vide), touche **« Je suis l'administrateur »** et saisis le **code administrateur**.
3. Page **Équipe → Ajouter des membres** : tape un prénom, Entrée, le suivant… puis « Ajouter ». (« Marie Dupont » → prénom + nom.)
4. Ouvre la fiche d'une personne pour choisir sa **couleur** et ses **rôles**, puis **ajoute ses tâches** (bouton « Ajouter une tâche »).
5. Choisis ensuite qui tu es (menu → « Ce n'est pas moi, changer ») pour avoir ton propre espace.

**Un membre**

1. Ouvre le site, tape le code d'accès, touche son prénom → **Mon espace**.
2. **Coche** ses tâches d'un geste ; **dépose un livrable** (fichier depuis le téléphone, ou lien Drive/WeTransfer pour les vidéos lourdes — 50 Mo maximum par fichier).
3. Dans **Équipe**, il voit l'avancement de chacun et peut **relancer** : la relance apparaît dans l'espace de la personne, et un **message prêt à copier** est proposé pour WhatsApp (aucun envoi automatique).

**Règles par défaut** (réglables dans _Réglages_) : tout le monde voit tout ; chacun coche ses propres tâches et dépose ses livrables ; **tout membre peut ajouter une tâche à n'importe qui** (l'admin peut le réserver à lui seul) ; seuls l'admin supprime, réassigne et change les rôles.

**Calendrier** : vide au départ. L'admin peut **importer un CSV** (modèle téléchargeable, aperçu et erreurs avant enregistrement) ou **exporter** le calendrier. Règles automatiques : type selon le jour (lundi Impact … vendredi Appel à l'action), préparation 2 jours avant (le dimanche pour le lundi), publication à 8h00.

---

## 5. Développement local

```bash
npm install
npm run dev               # http://localhost:3000  (variables dans .env.local)
npm run typecheck && npm run lint && npm test
```

**Tester sans compte Supabase** : `scripts/local-backend/server.mjs` est un faux Supabase (API de données branchée sur un vrai Postgres avec les vraies migrations, et stockage de fichiers en mémoire). Il ne sert qu'au développement.

```bash
createdb pc_dev && psql pc_dev -f tests/rls/supabase_stub.sql \
  -f supabase/migrations/20261111000001_pc_schema.sql -f supabase/migrations/20261111000002_pc_seed.sql \
  -f supabase/migrations/20261112000001_pc_roles_infos.sql
DATABASE_URL=postgres://localhost/pc_dev npm run dev:local-backend
```

**Tests** : dates et rythme, progression de la semaine, message de relance, journal d'activité, filtres, CSV, contraste AA, **jetons de session** (signature, expiration, falsification), **limite d'essais**, **accès refusé sans cookie valide**. Les tests de **base de données** (RLS, triggers, contraintes) tournent sur un Postgres de test :

```bash
createdb pc_test
RLS_TEST_DATABASE_URL=postgres://localhost/pc_test npm test
```

---

## 6. Déployer sur Hostinger

**Il faut un hébergement Node.js** (les routes serveur et la vérification du code en ont besoin). D'après la documentation Hostinger : **Business ou Cloud** (application Node.js) ou **VPS**. Les offres d'entrée de gamme (Single / Premium) ne font pas tourner Next.js.

1. hPanel → _Sites web → Ajouter → Applications Web Node.js_ → dépôt GitHub, branche **`main`**.
2. Réglages : framework **Next.js**, **Node 22**, build `npm run build`, démarrage `npm start`.
3. **Variables d'environnement** (§2) : les **6**, avant le build.
4. Déploie. Ouvre le site : tu dois voir l'écran du code d'accès. S'il liste des variables manquantes, ajoute-les puis **redéploie**.
5. Ajoute ton domaine + le certificat SSL.

Le script de build utilise `next build --webpack` : le compilateur par défaut (Turbopack) ne démarre pas son sous-processus PostCSS sur le serveur de build d'Hostinger. Vérifié sur une installation vierge, en mode production, avec 768 Mo de mémoire.

**Mises à jour** : pousse sur `main`, redéploie. **Changer un code** : `ADMIN_CODE` et `SESSION_SECRET` se changent dans les variables (puis redémarrage) ; le **code d'accès** se change dans _Réglages_ (sans redéployer).

---

## 7. Ce que contient le site

- **Accueil** : bandeau, la semaine du calendrier, avancement de l'équipe, mes tâches, dernières activités, à préparer bientôt, prochain post, projets à venir.
- **Mon espace** : progression de la semaine, tâches regroupées (En retard · Cette semaine · Plus tard · Faites), grande case à cocher, livrables, relances reçues.
- **Équipe** : une carte par membre avec sa barre de progression et le signal de retard ; fiche en lecture ; relance ; (admin) ajout rapide, couleur, rôles, activation.
- **Toutes les tâches** : cartes sur mobile, **tableau triable** sur ordinateur, ou Kanban ; filtres par membre, statut, échéance.
- **Calendrier** : semaine, mois, liste (cartes sur mobile, tableau sur ordinateur).
- **Règles et guide**, **Projets Forge Afri'K** (modifiables en mode administrateur), pages **Bientôt** (Bibliothèque, Réunions, Résultats).
- **Rôles** (page Équipe → Rôles) : qui fait quoi, avec **sous-rôles** ; plusieurs personnes peuvent porter le même rôle ; les rôles sans titulaire sont signalés. La mission de chaque rôle s'affiche dans **Mon espace**, y compris pour l'administrateur.
- **Infos** : annonces publiées par l'administrateur (épinglées, avec date de mise à jour) ; les dernières apparaissent aussi sur l'Accueil.
- **Administration** (page Réglages, admin) : qui peut ajouter des tâches, code d'accès, **créer / modifier / supprimer les rôles** et leurs sous-rôles, **supprimer un membre** (avec ou sans ses tâches ; on ne peut pas supprimer sa propre fiche), export CSV des tâches.
- **Importer un calendrier** (page Calendrier, admin) : on **colle** le tableau copié depuis Notion, Excel ou Google Sheets (ou directement un **fichier Excel .xlsx** — première feuille — ou CSV ; les lignes de titre au-dessus du tableau sont ignorées). Aucune IA : des règles lisent les colonnes (par leur titre, ou à défaut par leur contenu) et les dates en français (`16/11`, `16 nov.`, `lundi 16 novembre`…). Si le tableau n'a que « lundi, mardi… », on indique la **semaine de départ** et chaque ligne est placée au bon jour ; un retour à « lundi » passe à la semaine suivante. Les colonnes reconnues se corrigent à la main, un aperçu précède l'import, rien n'est ajouté sans confirmation. Code : `src/lib/paste-import.ts` (testé dans `tests/paste-import.test.ts`).

Les écrans se **rafraîchissent seuls** (toutes les 30 secondes et au retour sur l'onglet). Les cases à cocher et les statuts réagissent immédiatement, avec retour en arrière si le serveur refuse.

## 8. Limites connues

- Pas de photo de profil (pastille colorée avec l'initiale).
- Pas de commentaires ni de pièces jointes sur les posts du calendrier (hors du périmètre V2) ; les livrables sont rattachés aux **tâches**.
- Pas de notification automatique : la relance fournit un message à copier.
- Les jalons de la frise (Projets) se modifient en base.
- Fichiers : 50 Mo maximum (limite de l'offre gratuite Supabase) ; au-delà, coller un lien.
- L'adresse IP vient de l'en-tête `x-forwarded-for` du proxy de l'hébergeur.

## 9. Arborescence

```
supabase/migrations/   schéma pc_* et textes réels
src/proxy.ts           premier filtre : cookie signé obligatoire (sauf /acces)
src/server/            session, jetons, code d'accès, limite d'essais, accès base, chargements
src/actions/           Server Actions (validation Zod, droits)
src/app/(entree)/      /acces et /qui-es-tu
src/app/(app)/         accueil, mon-espace, equipe, taches, calendrier, regles, projets, reglages, Bientôt
src/components/        ui · layout · tasks · team · calendar · home · access · settings
src/lib/               dates, progression, relance, CSV, schémas Zod
tests/                 unitaires, sécurité, RLS (Postgres)
scripts/               check-public-key.sh, faux Supabase local
```
