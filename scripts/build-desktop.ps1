param(
  [string]$Runtime,
  [switch]$SkipPackage
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot

if (-not $Runtime) {
  $Runtime = 'win-x64'
}

$target = switch -Regex ($Runtime) {
  '^win-' { 'win'; break }
  '^osx-' { 'mac'; break }
  default { throw "Unsupported runtime '$Runtime'. Use a Windows or macOS RID." }
}

$apiOutput = Join-Path $repoRoot "widget/resources/api/$Runtime"

Write-Host "Publishing Protocol API ($Runtime)..." -ForegroundColor Cyan
dotnet publish `
  (Join-Path $repoRoot 'backend/Protocol.Api/Protocol.Api.csproj') `
  -c Release `
  -r $Runtime `
  --self-contained true `
  -p:PublishSingleFile=true `
  -p:IncludeNativeLibrariesForSelfExtract=true `
  -o $apiOutput
if ($LASTEXITCODE -ne 0) {
  throw "dotnet publish failed."
}

Write-Host "Building desktop frontend..." -ForegroundColor Cyan
Push-Location (Join-Path $repoRoot 'frontend')
try {
  npm run build:desktop
  if ($LASTEXITCODE -ne 0) {
    throw "Desktop frontend build failed."
  }
}
finally {
  Pop-Location
}

Write-Host "Building Electron shell..." -ForegroundColor Cyan
Push-Location (Join-Path $repoRoot 'widget')
try {
  npm run build
  if ($LASTEXITCODE -ne 0) {
    throw "Electron shell build failed."
  }

  if (-not $SkipPackage) {
    Write-Host "Packaging Electron app..." -ForegroundColor Cyan
    npx electron-builder --$target
    if ($LASTEXITCODE -ne 0) {
      throw "Electron packaging failed."
    }
  }
}
finally {
  Pop-Location
}

Write-Host "Desktop build complete." -ForegroundColor Green
