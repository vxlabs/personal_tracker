# Protocol App — IIS Deploy Script for Windows Server
# Run as Administrator from the repo root: .\deploy-iis.ps1
#
# One-time prerequisites (script checks and reminds you):
#   1. IIS installed (Windows Feature: Web-Server)
#   2. IIS URL Rewrite module  — https://www.iis.net/downloads/microsoft/url-rewrite
#   3. IIS Application Request Routing (ARR) — https://www.iis.net/downloads/microsoft/application-request-routing
#   4. .NET 8 Hosting Bundle — https://dotnet.microsoft.com/en-us/download/dotnet/8.0
#   5. Node.js 20+ (for building frontend)

param(
    [string]$SiteName    = "Protocol",
    [string]$DeployRoot  = "C:\protocol",
    [string]$BackendPort = "5000",
    [string]$FrontendPort = "80"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ApiDir      = "$DeployRoot\api"
$FrontendDir = "$DeployRoot\frontend"
$ServiceName = "ProtocolApi"
$ProjectRoot = $PSScriptRoot

# ── Helpers ────────────────────────────────────────────────────────────────────

function Write-Step([string]$msg) {
    Write-Host "`n=== $msg ===" -ForegroundColor Cyan
}

function Assert-Command([string]$cmd, [string]$installHint) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Write-Error "$cmd not found. $installHint"
        exit 1
    }
}

function Assert-Admin {
    if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
        ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        Write-Error "Run this script as Administrator."
        exit 1
    }
}

# ── Preflight ──────────────────────────────────────────────────────────────────

Assert-Admin

Write-Step "Checking prerequisites"

# .NET SDK (for build)
Assert-Command "dotnet" "Install .NET 8 SDK from https://dotnet.microsoft.com/download/dotnet/8.0"

# Node.js (for frontend build)
Assert-Command "node" "Install Node.js 20+ from https://nodejs.org"
Assert-Command "npm"  "npm should ship with Node.js"

# IIS
$iisFeature = Get-WindowsFeature -Name "Web-Server" -ErrorAction SilentlyContinue
if ($iisFeature -and -not $iisFeature.Installed) {
    Write-Error "IIS is not installed. Run: Install-WindowsFeature -Name Web-Server -IncludeManagementTools"
    exit 1
}

# WebAdministration module
if (-not (Get-Module -ListAvailable -Name WebAdministration)) {
    Write-Error "WebAdministration module missing. Install IIS Management Tools."
    exit 1
}
Import-Module WebAdministration

# URL Rewrite
$rewriteKey = "HKLM:\SOFTWARE\Microsoft\IIS Extensions\URL Rewrite"
if (-not (Test-Path $rewriteKey)) {
    Write-Error "IIS URL Rewrite module not installed.`nDownload: https://www.iis.net/downloads/microsoft/url-rewrite"
    exit 1
}

# ARR
$arrKey = "HKLM:\SOFTWARE\Microsoft\IIS Extensions\Application Request Routing"
if (-not (Test-Path $arrKey)) {
    Write-Error "IIS Application Request Routing (ARR) not installed.`nDownload: https://www.iis.net/downloads/microsoft/application-request-routing"
    exit 1
}

Write-Host "All prerequisites satisfied." -ForegroundColor Green

# ── Build Frontend ─────────────────────────────────────────────────────────────

Write-Step "Building frontend"

Set-Location "$ProjectRoot\frontend"
npm ci
npm run build

Write-Host "Frontend built." -ForegroundColor Green

# ── Publish Backend ────────────────────────────────────────────────────────────

Write-Step "Publishing backend"

Set-Location "$ProjectRoot\backend\Protocol.Api"
dotnet publish -c Release -r win-x64 --self-contained false -o $ApiDir

Write-Host "Backend published to $ApiDir" -ForegroundColor Green

# ── Deploy Frontend Files ──────────────────────────────────────────────────────

Write-Step "Deploying frontend files"

if (-not (Test-Path $FrontendDir)) {
    New-Item -ItemType Directory -Path $FrontendDir | Out-Null
}

# Robocopy: mirror dist/ → FrontendDir (removes deleted files too)
robocopy "$ProjectRoot\frontend\dist" $FrontendDir /MIR /NFL /NDL /NJH /NJS | Out-Null
Write-Host "Frontend deployed to $FrontendDir" -ForegroundColor Green

# ── Windows Service (Backend) ──────────────────────────────────────────────────

Write-Step "Installing backend as Windows Service"

$exePath = "$ApiDir\Protocol.Api.exe"

if (-not (Test-Path $exePath)) {
    Write-Error "Backend executable not found at $exePath. Did the publish succeed?"
    exit 1
}

$svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue

if ($svc) {
    Write-Host "Stopping existing service..." -ForegroundColor Yellow
    Stop-Service -Name $ServiceName -Force
    Start-Sleep -Seconds 2

    # Update binary path in case it changed
    sc.exe config $ServiceName binPath= `"$exePath`" | Out-Null
    Write-Host "Service updated."
} else {
    Write-Host "Creating service '$ServiceName'..."
    sc.exe create $ServiceName `
        binPath= `"$exePath`" `
        DisplayName= "Protocol App API" `
        start= auto | Out-Null

    sc.exe description $ServiceName "Protocol personal discipline tracker backend API" | Out-Null
    Write-Host "Service created."
}

# Set environment variable for the service
# ASPNETCORE_ENVIRONMENT and port
[Environment]::SetEnvironmentVariable("ASPNETCORE_ENVIRONMENT", "Production", "Machine")
[Environment]::SetEnvironmentVariable("ASPNETCORE_URLS", "http://localhost:$BackendPort", "Machine")

Write-Host "Starting service..."
Start-Service -Name $ServiceName
Start-Sleep -Seconds 3

$svc = Get-Service -Name $ServiceName
Write-Host "Service status: $($svc.Status)" -ForegroundColor $(if ($svc.Status -eq 'Running') { 'Green' } else { 'Red' })

# ── IIS Site ───────────────────────────────────────────────────────────────────

Write-Step "Configuring IIS site"

# Enable ARR proxy at server level
Set-WebConfigurationProperty -PSPath "MACHINE/WEBROOT/APPHOST" `
    -Filter "system.webServer/proxy" -Name "enabled" -Value "True"

# Remove existing site if present
if (Test-Path "IIS:\Sites\$SiteName") {
    Write-Host "Removing existing site '$SiteName'..."
    Remove-Website -Name $SiteName
}

# Remove existing app pool if present
if (Test-Path "IIS:\AppPools\$SiteName") {
    Remove-WebAppPool -Name $SiteName
}

# Create app pool (No Managed Code — static files + proxy only)
New-WebAppPool -Name $SiteName | Out-Null
Set-ItemProperty "IIS:\AppPools\$SiteName" -Name managedRuntimeVersion -Value ""
Set-ItemProperty "IIS:\AppPools\$SiteName" -Name processModel.identityType -Value 4  # ApplicationPoolIdentity

# Create site
New-Website -Name $SiteName `
    -Port $FrontendPort `
    -PhysicalPath $FrontendDir `
    -ApplicationPool $SiteName | Out-Null

Write-Host "IIS site '$SiteName' created on port $FrontendPort" -ForegroundColor Green

# Grant app pool read access to the frontend directory
$acl = Get-Acl $FrontendDir
$poolIdentity = "IIS AppPool\$SiteName"
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
    $poolIdentity, "ReadAndExecute", "ContainerInherit,ObjectInherit", "None", "Allow"
)
$acl.SetAccessRule($rule)
Set-Acl $FrontendDir $acl
Write-Host "Permissions set for $poolIdentity"

# ── Health Check ───────────────────────────────────────────────────────────────

Write-Step "Health check"

Start-Sleep -Seconds 2

try {
    $r = Invoke-WebRequest -Uri "http://localhost:$BackendPort/api/health" -UseBasicParsing -TimeoutSec 10
    Write-Host "Backend direct:  OK — $($r.Content)" -ForegroundColor Green
} catch {
    Write-Host "Backend direct health check failed. Check service logs:" -ForegroundColor Red
    Write-Host "  Event Viewer → Windows Logs → Application (source: Protocol.Api)"
}

try {
    $r = Invoke-WebRequest -Uri "http://localhost:$FrontendPort/api/health" -UseBasicParsing -TimeoutSec 10
    Write-Host "Through IIS/ARR: OK — $($r.Content)" -ForegroundColor Green
} catch {
    Write-Host "IIS proxy health check failed. Verify ARR is enabled and URL Rewrite rules are loaded." -ForegroundColor Yellow
}

Write-Host "`nDone. App: http://localhost:$FrontendPort" -ForegroundColor Green
Write-Host ""
Write-Host "Useful commands:"
Write-Host "  Restart backend:  Restart-Service $ServiceName"
Write-Host "  Backend logs:     Event Viewer → Windows Logs → Application"
Write-Host "  IIS logs:         C:\inetpub\logs\LogFiles\"
