# Five approved characters: 10-sprite sets

45 new emotion candidates generated with the built-in image generation tool, plus five unchanged user-approved neutrals: 50 transparent PNG files in total.

Characters: Xingqiu, Xinyan, Yoimiya, Yun Jin, Zibai. Zibai uses the explicitly approved previous candidate, neutral-v006, rather than neutral-v007. Mizuki was not approved and is not included.

Each set is in `sprites/<Character>/`. The neutral is approved; the nine new expressions await user review. Every expression independently references only that character's exact approved neutral. Original official portraits and model images in `sources/` are provenance, not expression inputs. No live installation was requested or performed.

## Review sheets

Each character has a full-body sheet and face sheet under `previews/`. Both use five columns and two rows, read left to right:

1. neutral, joy, annoyance, confusion, love
2. desire, excitement, sadness, fear, embarrassment

Sheets have transparent backgrounds and no baked labels. Full-body previews contain each original within a 312 x 582 area in a 336 x 606 cell. Face previews use the deterministic source crop `(16% width, 0, 84% width, 31% height)`, contained within 304 x 304 in a 320 x 320 cell. Exact transforms are recorded in `run.json`. Individual sprite PNGs are unchanged.

## Downloads and records

`archives/` contains a ZIP for each character, a combined 50-sprite ZIP, and a complete artwork archive including prompts, references, sources, raw generations, review sheets, scripts and records. The complete archive excludes other archives.

Exact prompts are in `prompts/<Character>/`; actual tool arguments, source approvals, hashes, paths and statuses are in `run.json`. The built-in tool does not expose its model ID, quality or complexity settings. No claim about its model version is made.

Technical verification confirms 50 decodable PNGs with alpha channels, matching saved hashes, unchanged approved neutrals, matching raw expression outputs, and the correct sole neutral reference for each expression. These checks do not constitute visual approval. `technical-verification.json` contains per-file dimensions and hashes. `SHA256SUMS` covers the run's non-archive artifacts except itself.
