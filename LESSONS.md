# Leçons du projet (Forge Afri'K — site du pôle Communication)

## Top règles

1. Next.js 16 : `middleware.ts` s'appelle maintenant `proxy.ts` (fonction exportée `proxy`).
2. Les variables `NEXT_PUBLIC_*` sont figées au **build** : les définir avant `next build` sur l'hébergement.
3. Ne jamais mettre la clé `service_role` dans une variable `NEXT_PUBLIC_*` ; fichier `server-only`.
4. Tester la RLS sur un vrai Postgres (`tests/rls`), pas seulement à l'œil.

### Postgres : `UPDATE … FROM` + `RETURNING` → colonnes ambiguës

- Contexte : faux backend local (`scripts/local-backend`), PostgREST-like écrit à la main.
- Symptôme : `column reference "id" is ambiguous` sur un PATCH.
- Cause : `UPDATE t SET … FROM json_populate_record(...) r` : `id` existe dans `t` et `r`.
- Solution : alias (`UPDATE … AS t`) et qualifier `WHERE` et `RETURNING` (`t.id`).
- Date : 2026-11-10 | Statut : confirmée

### `INSERT … RETURNING` ne peut pas être dans une sous-requête

- Symptôme : `syntax error at or near "into"`. Solution : passer par une CTE `with r as (insert … returning …) select … from r`.
- Date : 2026-11-10 | Statut : confirmée

### Tests de contraste : regex des noms de variables CSS

- Symptôme : faux échecs sur `--surface-2`. Cause : le regex `[a-z_-]+` n'acceptait pas les chiffres. Solution : `[a-z0-9_-]+`.
- Date : 2026-11-10 | Statut : confirmée

### Sandbox : exécuter un binaire téléchargé est refusé

- Le téléchargement + exécution de PostgREST a été bloqué par le contrôle de sécurité. Solution retenue : écrire un petit serveur de test maison au lieu de contourner.
- Date : 2026-11-10 | Statut : confirmée

### Hostinger : Turbopack plante sur PostCSS (« node process exited … status: 0 »)

- Contexte : Next.js 16.4.6, Tailwind 4 (`@tailwindcss/postcss`), build Hostinger (Node 22).
- Symptôme : `TurbopackInternalError: globals.css … creating new process`. Le même build passe en local.
- Cause : Turbopack lance PostCSS dans un sous-processus Node, que l'environnement de build de l'hébergeur ne permet pas (hypothèse sur la raison exacte).
- Solution : `"build": "next build --webpack"` (doc Next 16 : opt-out de Turbopack).
- À éviter : supposer qu'un build local réussi garantit celui de l'hébergeur ; toujours simuler une installation vierge en `NODE_ENV=production`.
- Date : 2026-11-10 | Statut : correction testée en simulation, à confirmer sur Hostinger

### Tailwind 4 : `translate`/`scale` sont des propriétés CSS séparées

- Symptôme attendu : une boîte centrée avec `-translate-x-1/2` double son décalage si un `@keyframes` anime `transform: translate(...)`.
- Solution : animer `scale` / `opacity` seulement dans les keyframes des boîtes centrées.
- Autre piège : une animation avec `fill-mode: both` laisse un `transform` qui piège les éléments `position: fixed` enfants ; utiliser `backwards` et finir à `transform: none`.
- Date : 2026-11-10 | Statut : confirmée
