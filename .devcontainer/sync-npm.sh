#!/usr/bin/env bash
set -euo pipefail

# Prevent accidental host-side execution from Git hooks.
# This script is intended to run inside the dev container.
if [[ ! -f /.dockerenv ]] && ! grep -qa container /proc/1/environ 2>/dev/null; then
  echo "[sync-npm] Not running inside container, skipping."
  exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
cd "$REPO_ROOT"

CACHE_DIR=".devcontainer/.cache"
HASH_FILE="$CACHE_DIR/npm-deps.hash"
FORCE=false

for arg in "$@"; do
  [[ "$arg" == "--force" ]] && FORCE=true
done

compute_hash() {
  {
    for f in package.json package-lock.json npm-shrinkwrap.json .npmrc .nvmrc .node-version; do
      [[ -f "$f" ]] && sha256sum "$f"
    done
    node --version 2>/dev/null || true
    npm --version 2>/dev/null || true
  } | sha256sum | awk '{print $1}'
}

run_npm_ci() {
  if [[ ! -f "package-lock.json" ]] && [[ ! -f "npm-shrinkwrap.json" ]]; then
    echo "[sync-npm] Error: package-lock.json or npm-shrinkwrap.json is required for npm ci." >&2
    exit 1
  fi

  echo "[sync-npm] Running npm ci..."
  npm ci

  mkdir -p "$CACHE_DIR"
  compute_hash > "$HASH_FILE"

  echo "[sync-npm] npm ci completed."
}

if $FORCE; then
  run_npm_ci
  exit 0
fi

if [[ ! -d "node_modules" ]] || [[ ! -f "node_modules/.package-lock.json" ]]; then
  echo "[sync-npm] node_modules not found or incomplete, running npm ci..."
  run_npm_ci
  exit 0
fi

CURRENT_HASH="$(compute_hash)"
if [[ ! -f "$HASH_FILE" ]] || [[ "$CURRENT_HASH" != "$(cat "$HASH_FILE")" ]]; then
  echo "[sync-npm] Dependency files changed, running npm ci..."
  run_npm_ci
  exit 0
fi

echo "[sync-npm] Dependencies up to date, skipping npm ci."
