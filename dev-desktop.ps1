#Requires -Version 5.1
<#
.SYNOPSIS
    Publishes the embedded backend API and runs the Protocol desktop widget.

.DESCRIPTION
    This is the one-command desktop dev loop:
      1. Publish backend/Protocol.Api as a self-contained win-x64 binary
      2. Place it where the Electron dev app expects it:
         widget/resources/api/win-x64/Protocol.Api.exe
      3. Build the widget renderer/main bundles
      4. Launch Electron in embedded API mode

    The app will create/use Protocol-Vault next to the widget folder in dev.
#>

param(
    [switch]$SkipPublish,
    [switch]$SkipBuild,
    [switch]$NoClean,
    [switch]$UseConfiguredNuGetSources
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = $PSScriptRoot
$BackendCsproj = Join-Path $RepoRoot 'backend\Protocol.Api\Protocol.Api.csproj'
$FrontendDir = Join-Path $RepoRoot 'frontend'
$WidgetDir = Join-Path $RepoRoot 'widget'
$ApiOutDir = Join-Path $WidgetDir 'resources\api\win-x64'
$ApiBinary = Join-Path $ApiOutDir 'Protocol.Api.exe'

function Write-Step([string]$Message) {
    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Assert-Tool([string]$Name, [string]$Hint) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required tool '$Name' not found. $Hint"
    }
}

Write-Step "Checking prerequisites"
Assert-Tool 'dotnet' 'Install the .NET SDK from https://dot.net'
Assert-Tool 'node' 'Install Node.js from https://nodejs.org'
Assert-Tool 'npm' 'Install Node.js; npm is bundled with it'

Write-Host "  dotnet : $(dotnet --version)"
Write-Host "  node   : $(node --version)"
Write-Host "  npm    : $(npm --version)"

if (-not $SkipPublish) {
    Write-Step "Publishing embedded Protocol.Api"

    if ((Test-Path -LiteralPath $ApiOutDir) -and -not $NoClean) {
        $resolvedApiOut = (Resolve-Path -LiteralPath $ApiOutDir).Path
        $resolvedWidget = (Resolve-Path -LiteralPath $WidgetDir).Path
        if (-not $resolvedApiOut.StartsWith($resolvedWidget, [StringComparison]::OrdinalIgnoreCase)) {
            throw "Refusing to clean unexpected API output path: $resolvedApiOut"
        }

        Remove-Item -LiteralPath $resolvedApiOut -Recurse -Force
    }

    New-Item -ItemType Directory -Path $ApiOutDir -Force | Out-Null

    $publishArgs = @(
        'publish', $BackendCsproj,
        '--configuration', 'Release',
        '--runtime', 'win-x64',
        '--self-contained', 'true',
        '-p:PublishSingleFile=true',
        '-p:IncludeNativeLibrariesForSelfExtract=true',
        '--output', $ApiOutDir
    )

    if (-not $UseConfiguredNuGetSources) {
        $publishArgs += @('--source', 'https://api.nuget.org/v3/index.json')
    }

    & dotnet @publishArgs
    if ($LASTEXITCODE -ne 0) {
        throw "dotnet publish failed with exit code $LASTEXITCODE"
    }

    if (-not (Test-Path -LiteralPath $ApiBinary)) {
        throw "Expected embedded API binary was not created: $ApiBinary"
    }

    $sizeMb = [math]::Round((Get-Item -LiteralPath $ApiBinary).Length / 1MB, 1)
    Write-Host "  API binary: $ApiBinary ($sizeMb MB)" -ForegroundColor Green
}

Push-Location $WidgetDir
try {
    if (-not $SkipBuild) {
        Push-Location $FrontendDir
        try {
            if (-not (Test-Path -LiteralPath (Join-Path $FrontendDir 'node_modules'))) {
                Write-Step "Installing frontend dependencies"
                npm install
                if ($LASTEXITCODE -ne 0) {
                    throw "frontend npm install failed with exit code $LASTEXITCODE"
                }
            }

            Write-Step "Building main app for desktop shell"
            npm run build:desktop
            if ($LASTEXITCODE -ne 0) {
                throw "frontend npm run build:desktop failed with exit code $LASTEXITCODE"
            }
        }
        finally {
            Pop-Location
        }
    }

    if (-not (Test-Path -LiteralPath (Join-Path $WidgetDir 'node_modules'))) {
        Write-Step "Installing desktop widget dependencies"
        npm install
        if ($LASTEXITCODE -ne 0) {
            throw "widget npm install failed with exit code $LASTEXITCODE"
        }
    }

    if (-not $SkipBuild) {
        Write-Step "Building desktop widget"
        npm run build
        if ($LASTEXITCODE -ne 0) {
            throw "npm run build failed with exit code $LASTEXITCODE"
        }
    }

    Write-Step "Launching desktop app with embedded API"
    Write-Host "  Embedded API path: $ApiBinary" -ForegroundColor Yellow
    Write-Host "  Vault path       : $(Join-Path $RepoRoot 'Protocol-Vault')" -ForegroundColor Yellow
    npm run electron:dev
    if ($LASTEXITCODE -ne 0) {
        throw "Electron exited with code $LASTEXITCODE"
    }
}
finally {
    Pop-Location
}
