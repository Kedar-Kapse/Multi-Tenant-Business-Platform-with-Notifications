#!/usr/bin/env bash
# Create a PLATFORM admin: the owner of the whole platform, above every hospital.
# Platform admins sign in at  https://platform.admin.<DOMAIN>  and manage hospitals
# (tenants). Hospital admins (admin-a, admin-b, ...) cannot do that.
#
# What it does (safe to run again):
#   1. creates the "platform" realm from keycloak/realms/platform-realm.json if missing
#   2. creates the user (default: platform-admin) with the "super-admin" role
#   3. gives it a random TEMPORARY password -> Keycloak asks for a new one at first login
#   4. allows https://platform.admin.<DOMAIN> to log in (scripts/keycloak-tenant-urls.sh)
#
# Nothing secret is printed. The password is added to ~/credentials.txt (only you can read it).
#
# Run on the server (EC2 -> Connect -> Session Manager):
#   sudo -iu ubuntu
#   cd ~/app && bash scripts/create-platform-admin.sh [username]

set -euo pipefail
cd "$(dirname "$0")/.."
umask 077

REALM="platform"
USERNAME="${1:-platform-admin}"
KCADM="docker exec -i keycloak /opt/keycloak/bin/kcadm.sh"
CREDS="$HOME/credentials.txt"

echo "==> Logging in to Keycloak as the current admin"
docker exec keycloak sh -c '/opt/keycloak/bin/kcadm.sh config credentials \
  --server http://localhost:8080 --realm master \
  --user "$KEYCLOAK_ADMIN" --password "$KEYCLOAK_ADMIN_PASSWORD"' >/dev/null

if $KCADM get "realms/$REALM" >/dev/null 2>&1; then
  echo "==> Realm '$REALM' already exists"
else
  echo "==> Creating realm '$REALM'"
  $KCADM create realms -f - < keycloak/realms/platform-realm.json
fi

if [ -n "$($KCADM get users -r "$REALM" -q exact=true -q username="$USERNAME" --fields id --format csv --noquotes)" ]; then
  echo "==> User '$USERNAME' already exists -- giving it a new temporary password"
else
  echo "==> Creating user '$USERNAME'"
  $KCADM create users -r "$REALM" -s username="$USERNAME" -s enabled=true >/dev/null
fi
$KCADM add-roles -r "$REALM" --uusername "$USERNAME" --rolename super-admin

pass=$(python3 -c 'import secrets; print(secrets.token_urlsafe(18))')
$KCADM set-password -r "$REALM" --username "$USERNAME" --new-password "$pass" --temporary

touch "$CREDS" && chmod 600 "$CREDS"
{
  echo
  echo "[$REALM] platform admin -- https://platform.admin.<your domain> (temporary, change at first login)"
  echo "$USERNAME  $pass"
} >> "$CREDS"

echo "==> Allowing the platform admin portal address to log in"
bash scripts/keycloak-tenant-urls.sh

echo
echo "Done. Sign in at https://platform.admin.<your domain> as '$USERNAME'."
echo "Temporary password is in $CREDS -- open with: cat $CREDS   (don't screenshot it)"
