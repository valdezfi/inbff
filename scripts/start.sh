#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# inBFF — Linux server startup script
# Usage:
#   chmod +x scripts/start.sh
#   ./scripts/start.sh          # production (npm start)
#   ./scripts/start.sh dev      # development (npm run dev)
#   ./scripts/start.sh build    # build only
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# ── Ensure data directory exists (JSON fallback DB) ───────────────────────────
mkdir -p "$ROOT_DIR/data"

# ── Copy .env.example → .env.local if no env file exists ─────────────────────
if [ ! -f "$ROOT_DIR/.env.local" ]; then
  echo "[start.sh] No .env.local found — copying from .env.example"
  cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env.local"
  echo "[start.sh] ⚠  Edit .env.local and fill in your secrets before production use."
fi

# ── Install dependencies ───────────────────────────────────────────────────────
echo "[start.sh] Installing dependencies..."
npm ci

MODE="${1:-prod}"

case "$MODE" in
  dev)
    echo "[start.sh] Starting development server..."
    exec npm run dev
    ;;
  build)
    echo "[start.sh] Building for production..."
    exec npm run build
    ;;
  prod|*)
    echo "[start.sh] Building and starting production server..."
    npm run build
    exec npm start
    ;;
esac
