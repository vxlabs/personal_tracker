#!/bin/bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME="${1:-osx-arm64}"
SKIP_PACKAGE="${SKIP_PACKAGE:-0}"

case "$RUNTIME" in
  win-*) TARGET="win" ;;
  osx-*) TARGET="mac" ;;
  *)
    echo "Unsupported runtime '$RUNTIME'. Use a Windows or macOS RID." >&2
    exit 1
    ;;
esac

API_OUTPUT="$REPO_ROOT/widget/resources/api/$RUNTIME"

echo "Publishing Protocol API ($RUNTIME)..."
dotnet publish \
  "$REPO_ROOT/backend/Protocol.Api/Protocol.Api.csproj" \
  -c Release \
  -r "$RUNTIME" \
  --self-contained true \
  -p:PublishSingleFile=true \
  -p:IncludeNativeLibrariesForSelfExtract=true \
  -o "$API_OUTPUT"

echo "Building desktop frontend..."
(
  cd "$REPO_ROOT/frontend"
  npm run build:desktop
)

echo "Building Electron shell..."
(
  cd "$REPO_ROOT/widget"
  npm run build

  if [ "$SKIP_PACKAGE" != "1" ]; then
    echo "Packaging Electron app..."
    npx electron-builder --"$TARGET"
  fi
)

echo "Desktop build complete."
