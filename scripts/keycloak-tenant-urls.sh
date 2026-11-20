#!/usr/bin/env bash
# Allow every tenant's portal addresses to log in through Keycloak.
#
# For each realm (= tenant) except "master", adds to its platform-frontend client:
#   redirect URIs  https://<realm>.{app,admin,patient}.<DOMAIN>/*
#   web origins    https://<realm>.{app,admin,patient}.<DOMAIN>
# Existing entries (e.g. localhost for development) are kept, duplicates skipped,
# so it is safe to run again -- e.g. after adding a new hospital realm.
#
# Run on the server, inside the project folder:
#   bash scripts/keycloak-tenant-urls.sh
# DOMAIN is read from .env (DOMAIN=kapse.online).

set -euo pipefail
cd "$(dirname "$0")/.."

DOMAIN="${DOMAIN:-$(grep -E '^DOMAIN=' .env 2>/dev/null | tail -1 | cut -d= -f2-)}"
if [ -z "$DOMAIN" ]; then
  echo "DOMAIN is not set. Add DOMAIN=<your domain> to .env" >&2
  exit 1
fi

KCADM="docker exec -i keycloak /opt/keycloak/bin/kcadm.sh"

# Log in with the admin user the container was started with (never typed here).
docker exec keycloak sh -c '/opt/keycloak/bin/kcadm.sh config credentials \
  --server http://localhost:8080 --realm master \
  --user "$KEYCLOAK_ADMIN" --password "$KEYCLOAK_ADMIN_PASSWORD"' >/dev/null

realms=$($KCADM get realms --fields realm --format csv --noquotes | grep -vx master)

for realm in $realms; do
  client_id=$($KCADM get clients -r "$realm" -q clientId=platform-frontend \
                --fields id --format csv --noquotes)
  if [ -z "$client_id" ]; then
    echo "$realm: no platform-frontend client, skipped"
    continue
  fi

  $KCADM get "clients/$client_id" -r "$realm" \
    | python3 -c '
import json, sys
realm, domain = sys.argv[1], sys.argv[2]
client = json.load(sys.stdin)
hosts = [f"https://{realm}.{portal}.{domain}" for portal in ("app", "admin", "patient")]
redirects = client.get("redirectUris", [])
origins = client.get("webOrigins", [])
redirects += [h + "/*" for h in hosts if h + "/*" not in redirects]
origins += [h for h in hosts if h not in origins]
print(json.dumps({"redirectUris": redirects, "webOrigins": origins}))
' "$realm" "$DOMAIN" \
    | $KCADM update "clients/$client_id" -r "$realm" -f -

  echo "$realm: allowed https://$realm.{app,admin,patient}.$DOMAIN"
done
