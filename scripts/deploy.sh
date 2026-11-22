#!/usr/bin/env bash
# Update the running app on the server to the images GitHub Actions just built.
#
# Normally run BY GITHUB (deploy job in .github/workflows/docker-publish.yml,
# through AWS Systems Manager) -- nobody needs to SSH in. By hand it is:
#   cd ~/app && git pull --ff-only && bash scripts/deploy.sh [image-tag]
#
# image-tag: the commit id GitHub built (exact version). Default: latest.
# Rollback = run it again with an older commit id.
# Every run first backs up the database to ~/backups (last 10 kept).
# Restore one:  gunzip -c ~/backups/<file>.sql.gz | docker exec -i postgres psql -U postgres platform_db

set -euo pipefail
cd "$(dirname "$0")/.."

export IMAGE_TAG="${1:-${IMAGE_TAG:-latest}}"
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

echo "==> Deploying image tag: $IMAGE_TAG"

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
