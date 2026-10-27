#!/bin/bash
# Install the extension into a live SillyTavern user folder.
# Other agents may update the live copy too: run with --check first and integrate
# any live-only changes before installing (see DEVELOPMENT.md).
set -euo pipefail
SRC="$(cd "$(dirname "$0")/.." && pwd)/extension/genshin-dialogue-ui"
DST="${SILLY_TEYVAT_LIVE:-$HOME/Documents/ChatGPT/Test/SillyTavern/data/default-user/extensions/genshin-dialogue-ui}"
if [[ "${1:-}" == "--check" ]]; then
    diff -rq --exclude .DS_Store "$SRC" "$DST" && echo "Live matches the repository."
    exit 0
fi
[[ -d "$DST" ]] || { echo "Live extension not found: $DST" >&2; exit 1; }
rsync -a --exclude .DS_Store "$SRC/" "$DST/"
echo "Installed to $DST"
