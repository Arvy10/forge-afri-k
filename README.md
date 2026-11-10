# Forge Afri'K — Site privé du pôle Communication & Réseau

Espace de travail interne : calendrier éditorial, membres et rôles, tâches, règles et projets.
Mobile d'abord, clair et sombre, accès réservé aux membres invités.

**Stack** : Next.js 16 (App Router) · TypeScript strict · Tailwind CSS 4 · Supabase (Auth, Postgres + RLS, Storage) · Zod · React Hook Form · date-fns (fuseau `Africa/Brazzaville`).

---

## 0. Voir le site tout de suite (aperçu visuel)

Tant que les clés Supabase ne sont **pas** renseignées, le site s'ouvre en **mode aperçu visuel** : pas de connexion, données d'exemple fictives, bandeau « Aperçu visuel » en haut, et **rien n'est enregistré** (toute modification affiche un message). Le bandeau permet de basculer entre « Avec des exemples » et « Vide (comme au départ) » pour voir les états vides.

Il s'éteint **tout seul** dès que `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` existent au moment du build : le site redevient privé, avec connexion obligatoire. Comme ces variables sont figées au build, il faut redéployer après les avoir ajoutées.

---

## 1. Ce qu'il te faut

| Élément                                                                              | Où                  |
| ------------------------------------------------------------------------------------ | ------------------- |
| Un compte [Supabase](https://supabase.com) (offre gratuite suffisante pour démarrer) | supabase.com        |
| Un hébergement Node.js : **Hostinger Business / Cloud** ou **VPS** (voir §8)         | hostinger.com       |
| Node.js 20.9 ou plus (22 recommandé) en local                                        | nodejs.org          |
| Un expéditeur d'e-mails pour les invitations (voir §3.4)                             | Resend, Brevo, etc. |

---

## 2. Créer le projet Supabase

1. Sur supabase.com : **New project**. Choisis une région proche (ex. `eu-west` / `eu-central`) et un mot de passe de base de données (garde-le dans un gestionnaire de mots de passe).
2. Ouvre **SQL Editor → New query**, colle le contenu de [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), puis **Run**. Tables, index, triggers, RLS et espaces de stockage sont créés d'un coup.
3. Nouvelle requête, colle [`supabase/seed.sql`](supabase/seed.sql), **Run**. Il charge les 6 rôles, les sections du guide, les projets et la frise. **Aucun post n'est créé** : le calendrier démarre vide. Tu peux relancer ce fichier sans risque (il ne réécrit jamais ce que l'admin a modifié).
4. Récupère les clés dans **Project settings → API** : `Project URL`, clé `anon` (publique) et clé `service_role` (**secrète**).

---

## 3. Réglages d'authentification (à ne pas sauter)

Dans **Authentication** :

### 3.1 Bloquer l'inscription publique

**Sign In / Providers → Email** : désactive **« Allow new users to sign up »**. Seul l'admin peut inviter (l'invitation passe par la clé `service_role`, côté serveur).

### 3.2 URL du site

**URL Configuration** :

- **Site URL** : l'adresse publique du site, ex. `https://pole-com.forgeafrik.org`
- **Redirect URLs** : ajoute `https://pole-com.forgeafrik.org/**` et `http://localhost:3000/**`

### 3.3 Modèles d'e-mail (obligatoire pour que les liens fonctionnent)

**Email Templates**. Remplace le lien par défaut `{{ .ConfirmationURL }}` :

- **Invite user** — lien :
  ```
  {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/definir-mot-de-passe
  ```
- **Reset password** — lien :
  ```
  {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/definir-mot-de-passe
  ```

Exemple de corps (Invite) :

```html
<h2>Bienvenue dans le pôle Communication & Réseau</h2>
<p>Tu es invité(e) à rejoindre l'espace de travail de Forge Afri'K.</p>
<p>
  <a
    href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/definir-mot-de-passe"
    >Choisir mon mot de passe</a
  >
</p>
```

### 3.4 Envoi des e-mails

Le service d'e-mail intégré de Supabase est **très limité** (quelques messages par heure, réservé aux tests). Pour de vraies invitations, configure ton propre SMTP : **Project settings → Authentication → SMTP Settings**.

### 3.5 Mot de passe

**Sign In / Providers → Email** : longueur minimale 10 (le site l'exige aussi côté formulaire).

---

## 4. Créer le premier administrateur (Arvy)

1. **Authentication → Users → Add user → Create new user** : ton e-mail + un mot de passe, coche **Auto Confirm User**.
2. Ouvre [`supabase/promote_admin.sql`](supabase/promote_admin.sql), remplace `REMPLACE-MOI@exemple.com` par ton adresse, colle dans le **SQL Editor** et lance.
3. Tu te connectes ensuite sur le site ; la première fois, il te demande de compléter ton profil (nom, photo, rôle).

Ensuite, **tout le reste passe par le site** : Membres et rôles → **Inviter un membre**.

---

## 5. Lancer en local

```bash
git clone https://github.com/Arvy10/forge-afri-k.git
cd forge-afri-k
npm install
cp .env.example .env.local     # puis remplis les 4 variables
npm run dev                    # http://localhost:3000
```

Variables (`.env.local`) :

| Variable                        | Rôle                                                   | Secrète ? |
| ------------------------------- | ------------------------------------------------------ | --------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | URL du projet Supabase                                 | non       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clé publique (la RLS protège les données)              | non       |
| `SUPABASE_SERVICE_ROLE_KEY`     | inviter / bloquer des comptes — **serveur uniquement** | **oui**   |
| `NEXT_PUBLIC_SITE_URL`          | adresse publique du site, sans `/` final               | non       |

> ⚠️ Les variables `NEXT_PUBLIC_*` sont **intégrées au code au moment du build** : si tu les changes, il faut refaire `npm run build`.
> La clé `service_role` n'est jamais préfixée par `NEXT_PUBLIC_` et n'est lue que par `src/lib/supabase/admin.ts` (marqué `server-only`).

### Vérifications

```bash
npm run typecheck     # TypeScript strict
npm run lint          # ESLint
npm test              # dates, rythme, CSV, contraste AA, redirections
```

**Tests des règles de sécurité (RLS)** — ils tournent sur un vrai Postgres (jamais sur ta base Supabase) :

```bash
createdb rls_test
RLS_TEST_DATABASE_URL=postgres://postgres@localhost:5432/rls_test npm test
```

Ils vérifient notamment : un visiteur ne lit rien ; un membre ne modifie que ses posts et tâches ; il ne peut ni se promouvoir admin ni changer d'e-mail ; un membre désactivé ne voit plus rien ; seul l'admin modifie règles et projets.

### Tester l'interface sans compte Supabase (facultatif)

`scripts/local-backend/` contient un faux Supabase local (connexion + API de données branchée sur un vrai Postgres, **avec la vraie RLS**). Il sert uniquement au développement ; voir l'en-tête de `server.mjs`. Les photos et pièces jointes (Storage) n'y sont pas simulées.

---

## 6. Ce que fait le site

- **Accueil** : la semaine en cours, prochain post avec compte à rebours jusqu'à 8h00, mes tâches (case à cocher), posts à préparer aujourd'hui/demain, équipe, jalons.
- **Calendrier** : vues Semaine (glisser-déposer sur ordinateur), Mois, Liste groupée par semaine ; filtres ; fiche d'un post (historique des statuts, commentaires, pièces jointes, tâches liées) ; **export CSV** et **import CSV** (admin).
- **Membres et rôles** : fiches, rôles (avec rôles « sans titulaire »), invitation, désactivation.
- **Tâches** : Kanban et liste, filtre « Mes tâches » par défaut, création en une ligne, charge de l'équipe (admin).
- **Règles et guide** / **Projets Forge Afri'K** : lecture pour tous, modification par l'admin.
- **Bibliothèque, Réunions, Résultats** : pages « Bientôt » avec bouton « Me prévenir ».

**Règles automatiques** : type par défaut selon le jour (lundi Impact … vendredi Appel à l'action), préparation 2 jours avant (le dimanche pour un post du lundi), heure 08:00, signal orange si la préparation est dépassée et le statut encore « À faire ».

### Importer le calendrier Excel (18 posts)

1. Excel → **Fichier → Enregistrer sous → CSV (séparateur : point-virgule)**.
2. Sur le site : Calendrier → **Importer un CSV**. La première ligne doit contenir les titres de colonnes (au minimum `Date`). Les noms utilisés par l'export sont reconnus : `Date`, `Type de contenu`, `Canal principal`, `Autres canaux`, `Format`, `Idée / scénario`, `À préparer / filmer le`, `Heure de publication`, `Légende (copywriting)`, `Responsable`, `Statut`, `Lien du post`.
3. Le site **vérifie d'abord** et liste les lignes à corriger ; rien n'est ajouté tant que tu ne confirmes pas. Les numéros sont attribués automatiquement. Un responsable est reconnu par son nom ou son e-mail.

---

## 7. Sécurité en bref

- Site privé : aucune page ni donnée sans connexion (`src/proxy.ts` + RLS sur **toutes** les tables).
- Pas d'inscription publique ; invitations par l'admin uniquement.
- Admin : tout. Membre : lit tout, modifie ses posts/tâches/profil/commentaires. Un trigger empêche un membre de changer son niveau d'accès.
- Toutes les entrées sont validées côté serveur avec Zod (mêmes schémas que les formulaires).
- Fichiers : espaces de stockage **privés**, accès par liens signés temporaires (1 h).
- En-têtes de sécurité et `noindex` sur tout le site.
- Aucun secret dans le dépôt ; `.env*` est ignoré par git.

---

## 8. Déployer sur Hostinger

### Quelle offre ?

D'après la documentation Hostinger : **Next.js tourne sur les offres « Business Web Hosting » et « Cloud » (Startup, Professional, Enterprise), via « Node.js Web App ». Un VPS convient aussi**, avec une installation manuelle. Les offres d'hébergement web d'entrée de gamme (Single / Premium) **ne font pas tourner Next.js** (pas de Node.js) : il faudrait passer à Business ou à un VPS. Vérifie les offres actuelles sur hostinger.com avant d'acheter.

> Je n'ai pas pu tester le déploiement sur un compte Hostinger réel : les noms exacts des menus hPanel peuvent avoir changé. Les paramètres à saisir (Node 22, `npm run build`, `npm start`, variables) restent les mêmes.

### Ce qui a été vérifié pour l'hébergement

Simulation d'un serveur vierge : `npm ci` en mode production (sans dépendances de développement), puis `npm run build` **sans aucune variable d'environnement**, puis `npm start` — tout passe. Sans variables, le site répond « Configuration Supabase manquante » au lieu de planter ; avec elles, un visiteur non connecté est renvoyé vers `/connexion` sur toutes les pages privées. Les dépendances nécessaires au build (Tailwind, PostCSS, TypeScript) sont dans `dependencies`, et `.nvmrc` indique Node 22.

> **Si le build échoue chez Hostinger avec « Turbopack … node process exited »** : c'est le sous-processus PostCSS de Turbopack qui ne démarre pas sur leur serveur. Le script `build` utilise donc `next build --webpack` (compilateur classique), vérifié sur une installation vierge avec 768 Mo de mémoire.

### Option A — Hostinger Business ou Cloud (application Node.js)

1. **Dépôt** : le code est sur GitHub (`Arvy10/forge-afri-k`). Tu peux aussi envoyer un ZIP.
2. hPanel → **Sites web → Ajouter un site web → Applications Web Node.js** → **Importer un dépôt GitHub** (autorise l'accès) → choisis le dépôt et la branche `main`.
3. Réglages :
   - **Framework** : Next.js
   - **Version de Node.js** : 22
   - **Commande de build** : `npm run build`
   - **Commande de démarrage** : `npm start`
4. **Variables d'environnement** — à renseigner **avant** le premier build (les `NEXT_PUBLIC_*` sont figées au build) :
   ```
   NEXT_PUBLIC_SUPABASE_URL=…
   NEXT_PUBLIC_SUPABASE_ANON_KEY=…
   SUPABASE_SERVICE_ROLE_KEY=…
   NEXT_PUBLIC_SITE_URL=https://ton-domaine
   ```
5. Lance le déploiement. Hostinger fournit le port via la variable `PORT` (Next.js la respecte).
6. **Domaine + HTTPS** : associe ton domaine / sous-domaine ; active le certificat SSL gratuit.
7. Retourne dans Supabase (§3.2) et mets l'URL définitive dans **Site URL** et **Redirect URLs**.
8. **Mises à jour** : pousse sur la branche → redéploie depuis hPanel (ou active le déploiement automatique).

Si le build échoue faute de mémoire, construis en local (`npm run build`) et envoie le projet (dossiers `.next`, `public`, `package.json`, `package-lock.json`, `next.config.ts`) par ZIP, puis lance `npm ci --omit=dev` et `npm start` depuis le terminal de l'hébergement.

### Option B — VPS Hostinger (Ubuntu)

```bash
# 1. Node 22, git, nginx, pm2
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git nginx
sudo npm install -g pm2

# 2. Code + variables
git clone https://github.com/Arvy10/forge-afri-k.git /var/www/forge-afrik
cd /var/www/forge-afrik
cp .env.example .env.local && nano .env.local     # remplis les 4 variables
npm ci && npm run build

# 3. Lancement permanent
pm2 start npm --name forge-afrik -- start        # écoute sur le port 3000
pm2 save && pm2 startup
```

Nginx (`/etc/nginx/sites-available/forge-afrik`) :

```nginx
server {
  server_name pole-com.forgeafrik.org;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/forge-afrik /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d pole-com.forgeafrik.org   # HTTPS gratuit
```

Mise à jour : `cd /var/www/forge-afrik && git pull && npm ci && npm run build && pm2 restart forge-afrik`.

---

## 9. Après la mise en ligne

- [ ] Je me connecte (admin) et je vois l'Accueil.
- [ ] J'invite un membre ; il reçoit l'e-mail, choisit son mot de passe, complète son profil.
- [ ] J'ajoute un post et je le vois en semaine, mois et liste.
- [ ] Un visiteur non connecté est renvoyé vers la page de connexion.
- [ ] Sauvegardes : activées dans Supabase (offre Pro) ou export régulier du calendrier en CSV.

## Identité visuelle

- **Logo** : fichiers dans `public/brand/` (`logo.webp`, `logo-pole.webp`, `mark.webp`), extraits du visuel fourni ; favicon dans `src/app/icon.png`. Pour le remplacer, garde les mêmes noms de fichiers.
- **Thème** : le site est **clair par défaut**, quel que soit le réglage de l'appareil. Le mode sombre se choisit avec l'interrupteur (le choix est mémorisé).
- **Animations** : apparition échelonnée des blocs, soulèvement des cartes au survol, panneaux qui glissent, engrenage qui tourne lentement (accueil), compte à rebours « en direct ». Elles sont toutes coupées si l'appareil demande de réduire les animations.

## 10. Limites connues

- Le logo vient d'une image JPEG fournie (fond retiré automatiquement) : si tu as le fichier d'origine en SVG ou PNG transparent, il sera plus net.
- Les rappels « Me prévenir quand c'est prêt » enregistrent seulement l'intérêt (pas de notification).
- Les jalons de la frise (Projets) se modifient en base ; les projets et le guide se modifient depuis le site.
- Taille maximale d'une pièce jointe : 50 Mo (limite de l'offre gratuite Supabase).
- Les cartes d'un post ne se glissent pas au doigt sur mobile (le changement de jour se fait dans la fiche) ; le glisser-déposer est prévu pour l'ordinateur.

## 11. Arborescence

```
supabase/            migration, seed, promotion admin
src/proxy.ts         protège toutes les pages (session Supabase)
src/app/(auth)/      connexion, mot de passe, profil à compléter
src/app/(app)/       accueil, calendrier, membres, tâches, règles, projets, « Bientôt »
src/actions/         Server Actions (validation Zod, droits)
src/components/      ui · layout · calendar · tasks · members · home · guide · projects
src/lib/             dates & rythme, CSV, schémas Zod, accès Supabase
tests/               dates, CSV, paramètres, contraste AA, RLS (Postgres)
scripts/local-backend faux Supabase local (développement uniquement)
```
