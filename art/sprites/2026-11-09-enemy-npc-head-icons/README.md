# Enemy and NPC circular head icons

150 transparent portraits: 104 enemies and 46 NPCs, covering every enemy and
non-playable character in the bundled character properties catalog.

These are non-generative square head crops of the installed neutral sprites.
Each has individual framing recorded relative to the sprite's visible alpha
bounds. Cropping, Lanczos resizing and an antialiased circular alpha mask retain
the source transparency; no background is added. Original sprite art is unchanged.
This work does not establish approval of any source neutral or expressions.

`run.json` records original paths, source hashes, framing coordinates, exact pixel
crops and output hashes. `icons/` holds 256px PNGs; the extension uses lossless
WebP copies with content-addressed filenames in `assets/avatar-icons/`. Names
containing colons also have aliases matching SillyTavern's sanitized card names.
`previews/` shows the complete final set on slate circles. Earlier framing passes
are preserved in `draft-v1/` and `draft-v2/`; `sources-*.jpg` shows source framing.
All media is kept in the external pack and registered in `game-data.json`.

Rebuild with `python3 tools/build-sprite-head-icons.py` (Pillow required). Rebuilds
check source hashes and refuse to overwrite different outputs. Archive a previous
framing pass before changing its coordinates. Migrate only this run and
`extension/genshin-dialogue-ui/assets/avatar-icons` afterward, per GAME-DATA.md.
