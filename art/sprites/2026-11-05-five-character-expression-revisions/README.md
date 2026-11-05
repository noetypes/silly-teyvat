# Five-character expression revisions

Ten user-rejected expressions regenerated using the built-in image generation tool. The other 35 expressions and five neutrals are approved and retained byte-for-byte unchanged. All ten replacements await user review.

Removed finger counts, thumb counts and detailed hand-construction constraints from the ten new prompts. Yoimiya joy now requests a distinct forward-leaning laugh with lightly bent knees, one hand over her chest and the other arm swinging loosely to her side. This tests the user's prompting preference without claiming a verified cause for previous defects.

## Replacements-only review sheets

`previews/replacements-full-body.png` and `previews/replacements-faces.png` show five columns by two rows, left to right:

1. Zibai love; Zibai fear; Yun Jin confusion; Xinyan annoyance; Xinyan excitement.
2. Xinyan fear; Yoimiya joy; Xingqiu excitement; Xingqiu fear; Xingqiu joy.

All five complete character sets also have full-body and face sheets. Their order is neutral, joy, annoyance, confusion, love / desire, excitement, sadness, fear, embarrassment.

Sheets have transparent backgrounds and no baked labels. Individual PNGs are unchanged. Full-body previews are contained within 312 x 582 in 336 x 606 cells; faces use the deterministic source crop (16% width, 0, 84% width, 31% height), contained within 304 x 304 in 320 x 320 cells. Exact transforms are recorded in run.json.

## Deliverables and provenance

`sprites/<Character>/` contains the complete updated ten-file sets. `archives/` contains per-character ZIPs, the combined 50-sprite ZIP, a ZIP of only the ten replacements, and a complete artwork archive. Rejected originals are preserved under sources/rejected and in the previous run; they are excluded from the sprite delivery ZIPs.

Every new expression independently used its character's exact approved neutral as the sole image reference. The 35 retained generations preserve their original recorded tool arguments and prompt text, including historical wording; their source reference hashes match the same approved neutrals. The built-in tool does not expose its model ID or quality controls. Sources, exact prompts, raw outputs, approval records, hashes and technical checks are included. These are fresh regenerations, not markup edits. No live installation was requested or performed.

Technical checks confirm 50 decodable PNGs with alpha channels, matching raw and output hashes, correct sole reference hashes, and unchanged hashes for all 35 accepted expressions plus five approved neutrals. The user performs visual review; file checks do not confer approval.
