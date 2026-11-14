# Mitya and Valeriy full 22-sprite sets

44 transparent PNGs: each character's exact user-approved neutral plus 21 new expressions. Generated with built-in `image_gen.imagegen`, one asset per call. Every expression independently used only that character's exact approved neutral as its image reference. No official portrait, model image, previous expression or TCG artwork was supplied to expression generation.

Both neutral approvals are recorded per exact path and SHA-256 from the user message: "Both approved, generate a 22-sprite set for each based on these neutrals". All 44 exact sprite files were explicitly approved on 2026-11-13: "All approved, put them in their respective folders." They were installed into the live Mitya and Valeriy character root folders and hash-verified. `installation.json` records every source, destination, approval and action. No artwork was regenerated or visually re-reviewed during installation.

## Files

- `sprites/Mitya/` and `sprites/Valeriy/`: the individual 22-file sets. Neutral bytes are unchanged.
- `review.html`: gallery with full-body and face views, character and emotion filters, individual files and all downloads.
- `previews/`: full-body and face sheets, one of each for each character. Transparent sheets have no baked labels; read left-to-right then top-to-bottom in the order below. Face sheets use an automatic upper-silhouette crop, not visual assessment. `preview-transforms.json` records display-only crops and thumbnails; original sprites are unmodified.
- `archives/Mitya-22-sprites.zip` and `archives/Valeriy-22-sprites.zip`: simple character folders with exactly 22 PNGs each.
- `archives/valeriy-mitya-complete-artwork.zip`: both sets plus sources, prompts, raw outputs, manifest and previews.
- `references/<Character>/approved-neutral.png`: exact approved neutral, the sole expression reference.
- `prompts/`, `jobs.json`, `raw/` and `run.json`: exact prompts, actual tool arguments, original output locations, reference/output hashes, technical metadata and approval state.

## Sheet and filename order

neutral annoyance smug confusion love excitement joy fear pride desire anger grief sadness disgust disappointment relief admiration gratitude embarrassment caring love-1 desire-1

Normal expressions were prompted with normal pupils. Only `love-1` and `desire-1` request solid white heart-shaped pupils inside both open, otherwise intact colored irises. Poses and gestures were prompted individually for Mitya's sociability and curiosity and Valeriy's disciplined, measured character.

Technical verification checked exact file counts, PNG decoding and transparency, approved neutral hashes, one-reference arguments and equality of raw/delivered expression bytes. User visual approval is recorded for all sprites; live copies match their approved source hashes. Media and archives follow the external data pack layout with workspace links.

The ZIPs preserve the generation-time delivery snapshot; current approval and installation state is in `run.json` and `installation.json`.
