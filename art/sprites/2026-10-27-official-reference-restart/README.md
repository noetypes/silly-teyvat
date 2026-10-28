# Official-reference sprite restart

This run uses the repository's `SPRITE-GENERATION.md` workflow. The four neutral-v001 candidates were explicitly approved by the user with: **"All 4 are perfect, continue!"** Their exact hashes and approval records are in `run.json`.

Each expression is generated independently using two fixed image inputs:

1. The character's unaltered Official Art transparent portrait (primary identity, costume and colour reference).
2. That character's approved neutral-v001 (body proportions, relative head size and rendering reference).

No earlier run, generated body guide, expression, repair output or contact sheet is an input. The emotion prompts specify character-specific poses and body language; poses are not locked to the neutral. Furina's heart alternates use white pupils because her irises are multicoloured. Other alternates specify lighter shades of their original eye colours. Ordinary prompts contain no heart instructions.

The user performs visual review. Generated files are retained as returned, without agent-directed visual rejection, correction or regeneration. Technical file metadata is separate from visual approval. These files are reviewable artwork, not installed live SillyTavern sprites.

## Files

- `references/`: exact copied Official Art sources; original paths and SHA-256 values in `run.json`.
- `prompts/`: exact plain-text prompts and built-in tool request JSON files.
- `raw/`: unmodified generation results.
- `candidates/`: per-result provenance and review status.
- `sprites/`: emotion-only PNG filenames, including the exact approved neutral.
- `jobs.json`: expression jobs prepared after approval; per-job results are authoritative for completed work.
- `previews/`: full-body and closer-view sheets for the user's visual review.

The sheet order is: neutral, annoyance, smug, confusion, love, excitement, joy, fear, pride, desire, anger, grief, sadness, disgust, disappointment, relief, admiration, gratitude, embarrassment, caring, love-1, desire-1. Previews carry no labels on the artwork.

## User-requested revision v002

Nineteen flagged expressions are regenerated independently from Official Art and their approved neutrals. Zhongli has 20 active sprites: love-1/desire-1 were removed without regeneration. Current replacements use v002 records; older raw files remain historical only. See REVIEW-NOTES.md and revisions/2026-10-27-user-corrections-v002/feedback.json.
