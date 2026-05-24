#!/usr/bin/env bash
set -euo pipefail

runner="npx expo"

case "${1:-}" in
  --ios)
    $runner start --ios
    ;;
  --android)
    $runner start --android
    ;;
  --web)
    $runner start --web
    ;;
  --dev-client)
    $runner start --dev-client
    ;;
  --tunnel)
    $runner start --tunnel
    ;;
  --export-web)
    $runner export --platform web
    ;;
  --help)
    echo "Usage: ./script/build_and_run.sh [--ios|--android|--web|--dev-client|--tunnel|--export-web]"
    ;;
  *)
    $runner start
    ;;
esac
