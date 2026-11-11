#!/usr/bin/env bash
# Vérifie qu'un appel DIRECT à l'API Supabase avec la clé PUBLIQUE ne lit ni n'écrit aucune table pc_*.
# Usage : ./scripts/check-public-key.sh https://xxxx.supabase.co <clé publique (anon ou publishable)>
# Résultat attendu : chaque ligne affiche HTTP 401 ou 403 (ou une liste vide []), jamais de données.
set -u
URL="${1:?URL du projet manquante}"
KEY="${2:?clé publique manquante}"
TABLES="pc_members pc_roles pc_member_roles pc_posts pc_tasks pc_task_deliverables pc_nudges pc_activity pc_guide_sections pc_projects pc_milestones pc_settings pc_login_attempts pc_feature_interests"
bad=0
for t in $TABLES; do
  body=$(curl -s -m 20 -w '\n%{http_code}' "$URL/rest/v1/$t?select=*&limit=1" -H "apikey: $KEY" -H "Authorization: Bearer $KEY")
  code=$(echo "$body" | tail -1); data=$(echo "$body" | head -n -1)
  if [ "$code" = "200" ] && [ "$data" != "[]" ]; then echo "PROBLEME  $t : des données sont lisibles !"; bad=1; else echo "ok        $t -> HTTP $code"; fi
done
code=$(curl -s -m 20 -o /dev/null -w '%{http_code}' -X POST "$URL/rest/v1/pc_members" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" -d '{"prenom":"intrus"}')
if [ "$code" = "201" ] || [ "$code" = "200" ]; then echo "PROBLEME  écriture acceptée sur pc_members !"; bad=1; else echo "ok        écriture refusée -> HTTP $code"; fi
exit $bad
