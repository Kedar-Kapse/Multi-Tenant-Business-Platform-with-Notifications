#!/bin/bash
# =============================================================================
# Multi-Tenant Business Platform — One-Shot Build & Run
# =============================================================================
# This script builds ALL services and starts the entire platform.
# No pre-installed Maven or Node.js required — Docker handles everything.
#
# Usage:
#   chmod +x build-and-run.sh
#   ./build-and-run.sh
# =============================================================================

set -e

echo "=============================================="
echo "  Multi-Tenant Business Platform"
echo "  Building & Starting All Services"
echo "=============================================="
echo ""

# Check Docker is available
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed. Please install Docker Desktop."
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo "ERROR: Docker Compose is not available. Please update Docker Desktop."
    exit 1
fi

echo "[1/3] Stopping existing containers..."
docker compose down --remove-orphans 2>/dev/null || true

echo ""
echo "[2/3] Building all services (this may take 10-15 minutes on first run)..."
echo "       - 6 Spring Boot microservices (Maven multi-stage build)"
echo "       - 3 React portals (Node.js multi-stage build)"
echo "       - PostgreSQL, Keycloak, Redis, Kafka (pre-built images)"
echo ""
docker compose build --parallel

echo ""
echo "[3/3] Starting all services..."
docker compose up -d

echo ""
echo "=============================================="
echo "  All services are starting!"
echo "=============================================="
echo ""
echo "  Wait 60-90 seconds for all services to initialize."
echo ""
echo "  Service URLs:"
echo "  ─────────────────────────────────────────────"
echo "  Admin Portal:     http://localhost:3000"
echo "  Provider Portal:  http://localhost:3001"
echo "  Patient Portal:   http://localhost:3002"
echo "  API Gateway:      http://localhost:8085"
echo "  Keycloak Admin:   http://localhost:8080/admin  (admin/admin)"
echo "  Eureka Dashboard: http://localhost:8761"
echo "  ─────────────────────────────────────────────"
echo ""
echo "  Default Login: test / test"
echo ""
echo "  Run 'docker compose logs -f' to watch startup logs."
echo "  Run 'docker compose down' to stop everything."
echo ""
