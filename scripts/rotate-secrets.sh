#!/usr/bin/env bash
# Replace every password/secret that is published in this (public) repository
# with a new random one, on the server only. Run once after the first deploy,
# and again any time a secret may have leaked.
#
# What it changes:
#   1. Seed users from keycloak/realms/*.json (admin-a/admin123, dr.smith/...)
#      -> new random TEMPORARY password: Keycloak asks for a new one at first login.
#      Users created through the app are not touched.
#   2. platform-backend client secret of every realm -> regenerated.
#   3. Keycloak master admin password (was "admin") -> new random one.
#   .env is updated (KEYCLOAK_ADMIN_PASSWORD, KEYCLOAK_AUTH_CLIENT_SECRET) and the
#   services that use them are restarted.
#
# Nothing is printed. New passwords go to ~/credentials.txt (only you can read it).
# Look at it with:  cat ~/credentials.txt     (don't screenshot or share it)
#
# Run on the server (EC2 -> Connect -> Session Manager):
#   sudo -iu ubuntu
#   cd ~/app && bash scripts/rotate-secrets.sh

set -euo pipefail
cd "$(dirname "$0")/.."
umask 077

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
KCADM="docker exec -i keycloak /opt/keycloak/bin/kcadm.sh"
CREDS="$HOME/credentials.txt"

newpass() { python3 -c 'import secrets; print(secrets.token_urlsafe(18))'; }

# Set KEY=VALUE in .env (replace the line or add it). Value never printed.
set_env() {
  touch .env && chmod 600 .env
  python3 - "$1" "$2" <<'PY'
import sys
key, value = sys.argv[1], sys.argv[2]
lines = open(".env").read().splitlines()
lines = [l for l in lines if not l.startswith(key + "=")] + [f"{key}={value}"]
open(".env", "w").write("\n".join(lines) + "\n")
PY
}

env_value() { grep -E "^$1=" .env 2>/dev/null | tail -1 | cut -d= -f2- || true; }

echo "==> Logging in to Keycloak as the current admin"
docker exec keycloak sh -c '/opt/keycloak/bin/kcadm.sh config credentials \
  --server http://localhost:8080 --realm master \
  --user "$KEYCLOAK_ADMIN" --password "$KEYCLOAK_ADMIN_PASSWORD"' >/dev/null

{
  echo "# Written by scripts/rotate-secrets.sh on $(date -u '+%Y-%m-%d %H:%M UTC')"
  echo "# Seed users: temporary passwords, Keycloak asks for a new one at first login."
  echo
} > "$CREDS"
chmod 600 "$CREDS"

# --- 1. Seed users whose passwords are in the repo ---
for file in keycloak/realms/*.json; do
  realm=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["realm"])' "$file")
  echo "==> $realm: new passwords for the repo's test users"
  echo "[$realm]" >> "$CREDS"
  for user in $(python3 -c 'import json,sys; print(" ".join(u["username"] for u in json.load(open(sys.argv[1])).get("users", [])))' "$file"); do
    pass=$(newpass)
    if ! $KCADM set-password -r "$realm" --username "$user" --new-password "$pass" --temporary 2>/dev/null; then
      echo "    $user: not found, skipped"
      continue
    fi
    echo "$user  $pass" >> "$CREDS"
  done
  echo >> "$CREDS"
done

# --- 2. platform-backend client secret of every realm ---
current_default=$(env_value KEYCLOAK_AUTH_CLIENT_SECRET)
current_default=${current_default:-hospital-a-secret-change-me}   # docker-compose.yml default
for realm in $($KCADM get realms --fields realm --format csv --noquotes | grep -vx master); do
  id=$($KCADM get clients -r "$realm" -q clientId=platform-backend --fields id --format csv --noquotes)
  [ -n "$id" ] || continue
  old=$($KCADM get "clients/$id/client-secret" -r "$realm" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("value",""))')
  $KCADM create "clients/$id/client-secret" -r "$realm" >/dev/null
  new=$($KCADM get "clients/$id/client-secret" -r "$realm" | python3 -c 'import json,sys; print(json.load(sys.stdin)["value"])')
  echo "==> $realm: platform-backend client secret regenerated"
  # The services use one default secret: keep pointing it at the same realm as before.
  if [ "$old" = "$current_default" ]; then
    set_env KEYCLOAK_AUTH_CLIENT_SECRET "$new"
  fi
done

# --- 3. Master admin password (last: the steps above still use the old login) ---
admin_pass=$(newpass)
docker exec -e NEW_PASS="$admin_pass" keycloak sh -c '/opt/keycloak/bin/kcadm.sh set-password \
  -r master --username "$KEYCLOAK_ADMIN" --new-password "$NEW_PASS"'
set_env KEYCLOAK_ADMIN_PASSWORD "$admin_pass"
{
  echo "[master] Keycloak admin console (only via tunnel, not public)"
  echo "admin  $admin_pass"
} >> "$CREDS"
echo "==> Keycloak master admin password changed"

echo "==> Restarting the services that use these secrets"
$COMPOSE up -d --no-build >/dev/null 2>&1

echo
echo "Done. New passwords are in $CREDS (readable only by you)."
echo "Open it with: cat $CREDS   -- do not screenshot or share it."
