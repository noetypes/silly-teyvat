#!/bin/bash
# Install the extension into a live SillyTavern user folder.
# Other agents may update the live copy too: run with --check first and integrate
# any live-only changes before installing (see DEVELOPMENT.md).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DST="${SILLY_TEYVAT_LIVE:-$HOME/Documents/ChatGPT/Test/SillyTavern/data/default-user/extensions/genshin-dialogue-ui}"
exec python3 "$ROOT/tools/sync-live.py" --live "$DST" "$@"
