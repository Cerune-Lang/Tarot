#!/usr/bin/env bash
set -euo pipefail

# Ceruneの公式WATライブラリexampleを用いて、ブラウザ用のWasmとJSバインディングを生成。
# Usage: CERUNE_REPO=/path/to/Cerune ./scripts/build-wasm.sh
: "${CERUNE_REPO:?Set CERUNE_REPO to the cloned Cerune-Lang/Cerune checkout}" 
command -v cargo >/dev/null || { echo 'cargo is required' >&2; exit 1; }
command -v wat2wasm >/dev/null || { echo 'wabt/wat2wasm is required' >&2; exit 1; }
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/public/wasm"
mkdir -p "$OUT"
(
  cd "$CERUNE_REPO"
  cargo run --locked --example wat_library -- "$ROOT/src/tarot.ceru" "$OUT" draw_index is_reversed rank_fragment
)
wat2wasm "$OUT/library.wat" -o "$OUT/library.wasm"
echo "Generated $OUT/library.wasm and $OUT/library.mjs"
