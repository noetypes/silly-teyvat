# Mitya and Valeriy accepted TCG style revisions

Fresh 2026-11-13 candidates made with built-in `image_gen.imagegen`. The user's model screenshots supply identity and costume. Lisa's genuine TCG card for Mitya and Tartaglia's genuine TCG card for Valeriy supply the art style of the whole illustration: facial rendering, contours, color shapes, restrained shading, texture, graphic backgrounds, composition and frame.

The prompts explicitly request the same Genius Invokation illustration style throughout, rather than merely a similar card border. Original generations and earlier runs remain preserved. Both exact trimmed illustrations were explicitly accepted on 2026-11-13: "TCG cards accepted." Their file hashes and approval are recorded in generation.json. Both are now installed as native character portraits and battle artwork; see `content/character-cards/snezhnaya-2026-11-12/installation.json` for exact paths and hashes.

`generation.json` contains exact arguments, prompts, reference roles and hashes. `raw/` preserves original image bytes. `trimmed/` applies the genuine TCG alpha outline with `tools/trim-card-corners.py`, preserving every RGB pixel; see `trimmed/trim-report.json`. Shared review: `../../sprites/2026-11-13-valeriy-mitya-model-neutrals/review.html`.
