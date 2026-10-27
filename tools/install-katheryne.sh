#!/bin/bash
# Install the bundled Katheryne NPC card and sprite into a SillyTavern user folder.
# Restart SillyTavern afterwards so it loads the new card.
set -euo pipefail
SRC="$(cd "$(dirname "$0")/.." && pwd)/extension/genshin-dialogue-ui/assets/npcs"
CHARS="${SILLY_TEYVAT_CHARACTERS:-$HOME/Documents/ChatGPT/Test/SillyTavern/data/default-user/characters}"
[[ -d "$CHARS" ]] || { echo "Characters folder not found: $CHARS" >&2; exit 1; }
mkdir -p "$CHARS/Katheryne"
cp "$SRC/Katheryne.png" "$CHARS/Katheryne.png"
cp "$SRC/Katheryne-neutral.png" "$CHARS/Katheryne/neutral.png"
echo "Installed Katheryne into $CHARS"
