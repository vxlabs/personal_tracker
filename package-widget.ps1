#Requires -Version 5.1
<#
.SYNOPSIS
    Builds and packages the Protocol desktop widget with an embedded API binary.
.DESCRIPTION
    1. Publishes the .NET 8 backend as a self-contained win-x64 single-file exe
       into widget/resources/api/win-x64/
    2. Builds the Electron renderer + main bundles
    3. Runs electron-builder to produce a Windows NSIS installer in widget/release/
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot   = $PSScriptRoot
$BackendCsproj = Join-Path $RepoRoot 'backend\Protocol.Api\Protocol.Api.csproj'
$ApiOutDir  = Join-Path $RepoRoot 'widget\resources\api\win-x64'
$WidgetDir  = Join-Path $RepoRoot 'widget'

function Write-Step([string]$msg) {
    Write-Host "`n==> $msg" -ForegroundColor Cyan
}

function Assert-Tool([string]$name, [string]$hint) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        Write-Error "Required tool '$name' not found. $hint"
    }
}

# ── Prerequisites ────────────────────────────────────────────────────────────
Write-Step "Checking prerequisites"
Assert-Tool 'dotnet' 'Install the .NET 8 SDK from https://dot.net'
Assert-Tool 'node'   'Install Node.js from https://nodejs.org'
Assert-Tool 'npm'    'Install Node.js (npm is bundled with it)'

$dotnetVer = (dotnet --version)
Write-Host "  dotnet : $dotnetVer"
Write-Host "  node   : $(node --version)"
Write-Host "  npm    : $(npm --version)"

# ── Step 1: Publish .NET API ─────────────────────────────────────────────────
Write-Step "Publishing Protocol.Api (self-contained, win-x64)"

if (Test-Path $ApiOutDir) {
    Write-Host "  Cleaning $ApiOutDir"
    Remove-Item $ApiOutDir -Recurse -Force
}
New-Item -ItemType Directory -Path $ApiOutDir -Force | Out-Null

dotnet publish $BackendCsproj `
    --configuration Release `
    --runtime win-x64 `
    --self-contained true `
    -p:PublishSingleFile=true `
    -p:IncludeNativeLibrariesForSelfExtract=true `
    --output $ApiOutDir

if ($LASTEXITCODE -ne 0) { Write-Error "dotnet publish failed (exit $LASTEXITCODE)" }

$apiBinary = Join-Path $ApiOutDir 'Protocol.Api.exe'
if (-not (Test-Path $apiBinary)) {
    Write-Error "Expected binary not found after publish: $apiBinary"
}
Write-Host "  Binary : $apiBinary ($([math]::Round((Get-Item $apiBinary).Length / 1MB, 1)) MB)"

# ── Step 2: Install npm dependencies ─────────────────────────────────────────
Write-Step "Installing widget npm dependencies"
Push-Location $WidgetDir
try {
    npm ci --prefer-offline
    if ($LASTEXITCODE -ne 0) { Write-Error "npm ci failed" }
} finally {
    Pop-Location
}

# ── Step 3: Build Electron bundles ───────────────────────────────────────────
Write-Step "Building Electron renderer + main"
Push-Location $WidgetDir
try {
    npm run build
    if ($LASTEXITCODE -ne 0) { Write-Error "npm run build failed" }
} finally {
    Pop-Location
}

# ── Step 4: Package with electron-builder ────────────────────────────────────
Write-Step "Packaging with electron-builder (Windows NSIS)"
Push-Location $WidgetDir
try {
    npm run package:win
    if ($LASTEXITCODE -ne 0) { Write-Error "electron-builder failed" }
} finally {
    Pop-Location
}

# ── Done ─────────────────────────────────────────────────────────────────────
$releaseDir = Join-Path $WidgetDir 'release'
Write-Host "`n" -NoNewline
Write-Host "Done! Installer written to: $releaseDir" -ForegroundColor Green
Get-ChildItem $releaseDir -Filter '*.exe' | ForEach-Object {
    Write-Host "  $($_.Name)  ($([math]::Round($_.Length / 1MB, 1)) MB)" -ForegroundColor Green
}
