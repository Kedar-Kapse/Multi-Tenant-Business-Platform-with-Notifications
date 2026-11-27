#!/usr/bin/env bash
# Update the running app on the server to the images GitHub Actions just built.
#
# Normally run BY GITHUB (deploy job in .github/workflows/docker-publish.yml,
# through AWS Systems Manager) -- nobody needs to SSH in. By hand it is:
#   cd ~/app && git pull --ff-only && bash scripts/deploy.sh [image-tag]
#
# image-tag: the commit id GitHub built (exact version). Default: latest.
# Rollback = run it again with an older commit id.
# Every run first reads the secrets from AWS Secrets Manager (kaycare/<env>) and
# backs up the database to ~/backups (last 10 kept).
# Restore one:  gunzip -c ~/backups/<file>.sql.gz | docker exec -i postgres psql -U postgres platform_db

set -euo pipefail
cd "$(dirname "$0")/.."

export IMAGE_TAG="${1:-${IMAGE_TAG:-latest}}"
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

echo "==> Deploying image tag: $IMAGE_TAG"

# ---------------------------------------------------------------------------
# Secrets: read from AWS Secrets Manager at deploy time (one secret per
# environment, e.g. "kaycare/prod"). The server's IAM role is the only
# permission needed -- no password lives in a file or in Git.
# They are exported for this run only, so Docker Compose picks them up; the
# older copy in .env (if any) is used only when the secret cannot be read.
# ---------------------------------------------------------------------------
env_value() { grep -E "^$1=" .env 2>/dev/null | tail -1 | cut -d= -f2- || true; }
DEPLOY_ENV="${DEPLOY_ENV:-$(env_value DEPLOY_ENV)}"; DEPLOY_ENV="${DEPLOY_ENV:-prod}"
SECRET_ID="${SECRET_ID:-kaycare/$DEPLOY_ENV}"
AWS_REGION="${AWS_REGION:-$(env_value AWS_REGION)}"; AWS_REGION="${AWS_REGION:-ap-southeast-2}"
SECRET_KEYS="POSTGRES_PASSWORD KEYCLOAK_ADMIN KEYCLOAK_ADMIN_PASSWORD KEYCLOAK_AUTH_CLIENT_SECRET MAIL_PASSWORD PCC_API_CLIENT_SECRET"

aws_cli() {   # the AWS CLI if installed, otherwise the official one in Docker
  if command -v aws >/dev/null 2>&1; then aws "$@"
  else docker run --rm --network host amazon/aws-cli "$@"; fi
}

if secret_json=$(aws_cli secretsmanager get-secret-value --region "$AWS_REGION" \
      --secret-id "$SECRET_ID" --query SecretString --output text 2>/dev/null) && [ -n "$secret_json" ]; then
  # Only the known names are accepted, so the secret can never set PATH etc.
  eval "$(SECRET_KEYS="$SECRET_KEYS" python3 -c '
import json, os, shlex, sys
allowed = os.environ["SECRET_KEYS"].split()
for k, v in json.load(sys.stdin).items():
    if k in allowed:
        print(f"export {k}={shlex.quote(str(v))}")
' <<<"$secret_json")"
  echo "==> Secrets loaded from AWS Secrets Manager ($SECRET_ID)"
else
  echo "==> WARNING: could not read secret '$SECRET_ID' -- using the values in .env instead"
fi
unset secret_json

# Stop BEFORE touching anything if a required secret is missing.
if ! $COMPOSE config -q 2>/tmp/compose-config.err; then
  echo "Cannot deploy: a required setting or secret is missing:" >&2
  sed 's/^/  /' /tmp/compose-config.err >&2
  exit 1
fi

# Warn about the well-known default values (published in the public repo).
for pair in "POSTGRES_PASSWORD:postgres" "KEYCLOAK_ADMIN_PASSWORD:admin" "KEYCLOAK_AUTH_CLIENT_SECRET:hospital-a-secret-change-me"; do
  name="${pair%%:*}"; weak="${pair#*:}"
  value="${!name:-$(env_value "$name")}"
  if [ "$value" = "$weak" ]; then
    echo "==> WARNING: $name still has the well-known default value -- change it"
  fi
done

# Back up the database before anything changes: new versions may run database
# migrations (Flyway). Keeps the last 10 backups in ~/backups.
if docker ps --format '{{.Names}}' | grep -qx postgres; then
  mkdir -p "$HOME/backups"
  backup="$HOME/backups/platform_db-$(date -u +%Y%m%d-%H%M%S)-${IMAGE_TAG:0:7}.sql.gz"
  echo "==> Backing up the database to $backup"
  docker exec postgres sh -c 'pg_dump -U "${POSTGRES_USER:-postgres}" "${POSTGRES_DB:-platform_db}"' | gzip > "$backup"
  [ -s "$backup" ] || { echo "Database backup is empty - stopping the deploy" >&2; exit 1; }
  ls -1t "$HOME"/backups/platform_db-*.sql.gz | tail -n +11 | xargs -r rm -f
fi

# Images stored in AWS ECR need a login first (valid 12 hours). It uses the
# server's IAM role, so no password is involved. Docker Hub needs nothing here.
IMAGE_PREFIX="${IMAGE_PREFIX:-$(env_value IMAGE_PREFIX)}"
case "$IMAGE_PREFIX" in
  *.dkr.ecr.*.amazonaws.com*)
    ecr_host="${IMAGE_PREFIX%%/*}"
    echo "==> Logging in to AWS ECR ($ecr_host)"
    aws_cli ecr get-login-password --region "$AWS_REGION" \
      | docker login --username AWS --password-stdin "$ecr_host" >/dev/null
    export IMAGE_PREFIX ;;
esac

echo "==> Downloading images"
$COMPOSE pull --quiet

echo "==> Restarting changed containers"
$COMPOSE up -d --no-build --remove-orphans

# A changed Caddyfile (from git pull) is not picked up by "up -d" -- the file is
# mounted, not part of an image. Restart Caddy only when it really changed.
if ! docker exec caddy cat /etc/caddy/Caddyfile 2>/dev/null | cmp -s - caddy/Caddyfile; then
  echo "==> Caddyfile changed, restarting Caddy"
  $COMPOSE up -d --no-build --force-recreate caddy
fi

echo "==> Removing old unused images (keeps the disk from filling up)"
docker image prune -f >/dev/null

# Keycloak needs ~1-2 minutes after a restart. Then make sure every tenant's
# portal addresses are allowed to log in (also picks up newly added hospitals).
echo "==> Waiting for Keycloak, then allowing tenant addresses"
for attempt in $(seq 1 30); do
  if bash scripts/keycloak-tenant-urls.sh 2>/dev/null; then
    break
  fi
  if [ "$attempt" -eq 30 ]; then
    echo "Keycloak did not become ready in time" >&2
    exit 1
  fi
  sleep 10
done

echo "==> Containers"
$COMPOSE ps --format 'table {{.Name}}\t{{.Status}}'
echo "==> Done: $IMAGE_TAG is live"
