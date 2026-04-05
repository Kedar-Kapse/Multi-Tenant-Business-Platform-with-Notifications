@echo off
REM =============================================================================
REM Multi-Tenant Business Platform — One-Shot Build & Run (Windows)
REM =============================================================================
REM No Maven or Node.js installation needed — Docker handles everything.
REM Just run this script with Docker Desktop running.
REM =============================================================================

echo ==============================================
echo   Multi-Tenant Business Platform
echo   Building ^& Starting All Services
echo ==============================================
echo.

REM Check Docker
docker --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not installed. Please install Docker Desktop.
    pause
    exit /b 1
)

echo [1/3] Stopping existing containers...
docker compose down --remove-orphans 2>nul

echo.
echo [2/3] Building all services (this may take 10-15 minutes on first run)...
docker compose build --parallel

echo.
echo [3/3] Starting all services...
docker compose up -d

echo.
echo ==============================================
echo   All services are starting!
echo ==============================================
echo.
echo   Wait 60-90 seconds for all services to initialize.
echo.
echo   Admin Portal:     http://localhost:3000
echo   Provider Portal:  http://localhost:3001
echo   Patient Portal:   http://localhost:3002
echo   API Gateway:      http://localhost:8085
echo   Keycloak Admin:   http://localhost:8080/admin  (admin/admin)
echo.
echo   Default Login: test / test
echo.
pause
