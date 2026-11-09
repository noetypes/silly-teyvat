# Paimon circular face icon

Close, face-centred crop of Paimon's installed neutral sprite, as requested.
The face midpoint is `(456, 411)` in the original 1024 × 1536 image; the square
crop is 380px wide, resized to a 256px icon. Original alpha is retained beneath
the antialiased circular mask. No image generation or sprite changes.

`references/neutral.webp` preserves the exact installed source. `run.json` records
its original path, hashes and framing. `icons/paimon.png` is the transparent PNG;
the lossless WebP in the shared avatar catalog supplies wardrobe, combat,
inventory, Trust and linked-persona circular portraits. The separate Paimon menu
launcher is unchanged.

Rebuild with `python3 tools/build-sprite-head-icons.py --run
art/sprites/2026-11-09-paimon-face-icon` (Pillow required). Media is registered in
the external pack. Installed without changing version `0.52a`, per the user's
explicit instruction.
