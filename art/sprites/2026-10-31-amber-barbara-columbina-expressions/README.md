# Amber, Barbara, and Columbina expression packs

Each character has 22 individual transparent PNGs under `sprites/`, a full-body contact sheet, a face contact sheet, and a ZIP archive. Contact sheets are arranged in this row-major order, four columns per row:

1. neutral, annoyance, smug, confusion
2. love, excitement, joy, fear
3. pride, desire, anger, grief
4. sadness, disgust, disappointment, relief
5. admiration, gratitude, embarrassment, caring
6. love-1, desire-1

The neutral files are unchanged copies of the exact neutrals explicitly approved in `2026-10-29-missing-neutrals/run.json`. Every expression was generated independently from that character's approved neutral alone. Expression prompts allow distinct poses and gestures. After the user's proportion feedback, the active expression files were generated with `-v002` prompts that require each body to be at least as petite as its approved neutral. Earlier expression attempts remain under `raw/` and `revisions/v001/` for provenance; they are not inputs to the revised generation.

`run.json` records tool arguments, source paths, hashes, the user's feedback, and approval. `manifest.json` lists the active sprites and technical file metadata. `sources.json` records the approved neutral sources. The user approved all active sprites and requested installation. `installation.json` records the live destinations and verified hashes: 63 expression PNGs were added, and the three existing neutral PNGs already matched the approved files.
