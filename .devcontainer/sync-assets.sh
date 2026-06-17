#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
cd "$REPO_ROOT"

CACHE_DIR=".devcontainer/.cache"
HASH_FILE="$CACHE_DIR/prepare-assets.hash"
ASSETS_SCRIPT="scripts/prepare-assets.mjs"
FORCE=false
UPDATE_HASH_ONLY=false

for arg in "$@"; do
  [[ "$arg" == "--force" ]]       && FORCE=true
  [[ "$arg" == "--update-hash" ]] && UPDATE_HASH_ONLY=true
done

if [[ ! -f "$ASSETS_SCRIPT" ]]; then
  echo "[sync-assets] $ASSETS_SCRIPT not found, skipping."
  exit 0
fi

compute_hash() {
  sha256sum "$ASSETS_SCRIPT" | awk '{print $1}'
}

save_hash() {
  mkdir -p "$CACHE_DIR"
  compute_hash > "$HASH_FILE"
}

run_assets() {
  echo "[sync-assets] Running $ASSETS_SCRIPT..."
  node "$ASSETS_SCRIPT"
  save_hash
  echo "[sync-assets] $ASSETS_SCRIPT completed."
}

# Called from sync-npm.sh after npm ci: postinstall already ran the script,
# so just record the current hash without running again.
if $UPDATE_HASH_ONLY; then
  save_hash
  exit 0
fi

if $FORCE; then
  run_assets
  exit 0
fi

# Run if any expected output is missing
if [[ ! -f "public/fonts/NotoSansJP_400Regular.ttf" ]] || \
   [[ ! -f "public/report-templates/invoice_v1.pdf" ]]; then
  echo "[sync-assets] Output files missing, running $ASSETS_SCRIPT..."
  run_assets
  exit 0
fi

CURRENT_HASH="$(compute_hash)"
if [[ ! -f "$HASH_FILE" ]] || [[ "$CURRENT_HASH" != "$(cat "$HASH_FILE")" ]]; then
  echo "[sync-assets] $ASSETS_SCRIPT changed, running..."
  run_assets
  exit 0
fi

echo "[sync-assets] $ASSETS_SCRIPT up to date, skipping."
