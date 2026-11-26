#!/usr/bin/env bash
# One-time helper for moving the passwords into AWS Secrets Manager.
#
# Writes the passwords this server uses RIGHT NOW (from .env, or the built-in
# defaults when .env does not set them) as JSON into ~/secret-kaycare-<env>.json,
# readable only by you. You paste that JSON into Secrets Manager, then delete
# the file. Keeping today's values means the app and the database keep working;
# change them afterwards with scripts/rotate-secrets.sh.
#
# Nothing secret is printed here.
#
# Run on the server (EC2 -> Connect -> Session Manager):
#   sudo -iu ubuntu
#   cd ~/app && bash scripts/export-secret-json.sh [env]      # env: prod (default) or qa

set -euo pipefail
cd "$(dirname "$0")/.."
umask 077

ENVIRONMENT="${1:-prod}"
OUT="$HOME/secret-kaycare-$ENVIRONMENT.json"

python3 - "$OUT" <<'PY'
import json, os, sys

# name -> value used today when .env does not set it (the defaults in docker-compose.yml)
DEFAULTS = {
    "POSTGRES_PASSWORD": "postgres",
    "KEYCLOAK_ADMIN": "admin",
    "KEYCLOAK_ADMIN_PASSWORD": "admin",
    "KEYCLOAK_AUTH_CLIENT_SECRET": "hospital-a-secret-change-me",
    "MAIL_PASSWORD": "",
    "PCC_API_CLIENT_SECRET": "",
}

env = {}
if os.path.exists(".env"):
    for line in open(".env"):
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")

secret = {}
for key, default in DEFAULTS.items():
    value = env.get(key, default)
    if value != "":                      # empty values are simply left out
        secret[key] = value

with open(sys.argv[1], "w") as f:
    json.dump(secret, f, indent=2)
    f.write("\n")
os.chmod(sys.argv[1], 0o600)

print("Names written:", ", ".join(secret))
weak = [k for k in ("POSTGRES_PASSWORD", "KEYCLOAK_ADMIN_PASSWORD", "KEYCLOAK_AUTH_CLIENT_SECRET")
        if secret.get(k) == DEFAULTS[k]]
if weak:
    print("Still the well-known default (change later with rotate-secrets.sh):", ", ".join(weak))
PY

echo "File: $OUT   (only you can read it)"
echo "Show it with:  cat $OUT      -- don't screenshot it. Delete it when the secret is created:  rm $OUT"
