# Protocol App — Deploy Script for Windows Server
# Run this from the repo root: .\deploy.ps1
# Requirements: Docker Desktop (or Docker Engine) installed and running

param(
    [switch]$Build   # Force rebuild of images even if no changes
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ProjectRoot = $PSScriptRoot

Write-Host "=== Protocol Deploy ===" -ForegroundColor Cyan
Write-Host "Root: $ProjectRoot"

# Verify Docker is running
try {
    docker info | Out-Null
} catch {
    Write-Error "Docker is not running. Start Docker Desktop and retry."
    exit 1
}

Set-Location $ProjectRoot

# Pull latest code (skip if you deploy by copying files manually)
# git pull origin main

# Stop existing containers
Write-Host "`nStopping existing containers..." -ForegroundColor Yellow
docker compose down --remove-orphans

# Build and start
if ($Build) {
    Write-Host "`nBuilding images (forced)..." -ForegroundColor Yellow
    docker compose build --no-cache
} else {
    Write-Host "`nBuilding images..." -ForegroundColor Yellow
    docker compose build
}

Write-Host "`nStarting containers..." -ForegroundColor Yellow
docker compose up -d

# Wait a moment then show status
Start-Sleep -Seconds 3
Write-Host "`nContainer status:" -ForegroundColor Cyan
docker compose ps

# Health check
Write-Host "`nHealth check..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost/api/health" -UseBasicParsing -TimeoutSec 10
    Write-Host "Backend: OK — $($response.Content)" -ForegroundColor Green
} catch {
    Write-Host "Backend health check failed — check logs:" -ForegroundColor Red
    docker compose logs backend --tail 30
}

Write-Host "`nDone. App running at http://localhost" -ForegroundColor Green
Write-Host "Logs: docker compose logs -f"
