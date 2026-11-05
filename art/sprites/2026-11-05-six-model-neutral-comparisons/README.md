# Six model-reference neutral comparisons

The attached in-game models supply character design, exact costume construction, and body proportions. Each corresponding installed official portrait supplies illustrated art style only. Original reference files were copied unchanged and their hashes recorded.

Each character has a new full-body neutral candidate, its old installed neutral copied for comparison, an exact prompt, a raw generation, and a labeled comparison. The original installed neutrals were preserved. No expressions were generated.

## Comparison labels

Every comparison shows **Old neutral** on the left and **New neutral** on the right. Labels exist only on the comparison sheets, never on the individual transparent sprite PNGs. Transparent margins are trimmed only for the comparison thumbnails, then proportionally fitted within equal-size cells. This normalizes preview framing without stretching anatomy. Exact transforms are recorded in `run.json`.

The overview order is Xingqiu, Xinyan, Yoimiya across the top row, then Yumemizuki Mizuki, Yun Jin and Zibai across the bottom row.

All six candidates require explicit approval of their exact file/hash before expression generation or installation. The built-in image tool did not report a model ID or expose quality/complexity controls.

## Folders

- `candidates/<Character>/neutral-v001.png`: new transparent neutral.
- `old/<Character>/neutral.png`: exact installed old-neutral snapshot.
- `comparisons/`: labeled per-character old/new pairs and six-character overview.
- `references/<Character>/`: unchanged model and official-art sources.
- `prompts/<Character>/`: exact generation prompts.
- `raw/<Character>/`: unaltered copies of returned generation files.
- `run.json`: references, arguments, outputs, hashes, approval and preview transforms.

## Review update

The user accepted Xinyan and Xingqiu. Yun Jin, Zibai and Yoimiya have revised candidates in `2026-11-05-neutral-and-white-heart-revisions`; those new exact files are pending user review. Mizuki remains pending. The existing complete ZIP preserves its original review snapshot.
