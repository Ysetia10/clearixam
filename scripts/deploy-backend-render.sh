#!/usr/bin/env bash
# Deploy clearixam-backend on Render using the CLI login token.
# Do NOT export RENDER_API_KEY unless it is a fresh key from:
# https://dashboard.render.com/u/settings#api-keys
set -euo pipefail

SERVICE_ID="${RENDER_SERVICE_ID:-srv-d6htap9drdic73crkq8g}"
RENDER_BIN="${RENDER_BIN:-render}"

if ! command -v "$RENDER_BIN" >/dev/null 2>&1; then
  echo "Render CLI not found. Install from https://render.com/docs/cli" >&2
  exit 1
fi

# Stale RENDER_API_KEY overrides ~/.render/cli.yaml and causes 401/unauthorized.
unset RENDER_API_KEY

if ! "$RENDER_BIN" whoami -o text >/dev/null 2>&1; then
  echo "Not logged in. Run: render login"
  exit 1
fi

echo "Deploying $SERVICE_ID (clear build cache)..."
"$RENDER_BIN" deploys create "$SERVICE_ID" --clear-cache --wait --confirm -o text

echo "Smoke check: GET https://clearixam-backend.onrender.com/health"
curl -fsS --max-time 120 "https://clearixam-backend.onrender.com/health"
echo
