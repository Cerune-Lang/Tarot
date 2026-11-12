#!/usr/bin/env bash
set -euo pipefail
: "${CERUNE_REPO:?Set CERUNE_REPO to the cloned Cerune-Lang/Cerune checkout}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/public/data"
TEMP="$(mktemp)"
trap 'rm -f "$TEMP"' EXIT
(cd "$CERUNE_REPO" && cargo run --quiet --locked -- run "$ROOT/src/export.ceru") > "$TEMP"
node "$ROOT/scripts/check-data.mjs" "$TEMP"
cp "$TEMP" "$ROOT/public/data/cards.txt"
echo "Updated public/data/cards.txt from Cerune"
