# Wardrobe stage, form alignment and Required Trust

Follow-up implemented 9 November 2026.

- Desktop uses balanced outer columns with a narrower slate editor, placing the sprite stage at exactly half the viewport width. The expression grid keeps compact tiles within the resized panel.
- Q/E indicators remain. W/S indicators are removed; their keyboard shortcuts still switch sections.
- Removed the decorative tab streak and cleared the tab-transition class when changing character. A tab's former selection no longer leaves a line around its heading, including under reduced motion.
- Replaced the footer's flat dark band with a continuous bottom-to-top shade, darkest at the bottom. Controls remain above this non-interactive gradient.
- Moveset labels now use consistent column flow, and dropdowns and text/number inputs share the same 38px height, padding and alignment.
- Both sprite and scene Required Trust fields now use an interactive five-heart meter built from the Trust menu's existing heart renderer, mask and colors. Click a heart to set a whole-heart requirement; × clears it. Arrow keys retain the original field precision (half hearts for sprites, tenths for scenes); Home/End select zero/five. Previously saved fractions display with partial hearts and remain unchanged until edited.

## Validation

The responsive browser check covers all six sections at eight desktop, tablet and phone viewports. It asserts full-screen centering of desktop sprites, aligned Moveset inputs/dropdowns, Q/E without W/S indicators, absence of the header streak after character changes, and the prior portrait, disclosure, upload and focus checks.

New interaction checks verify whole/partial heart rendering, immediate persistence to the existing sprite and scene settings, switching expressions/scenes/characters without mixing requirements, zero/five keyboard endpoints, and clearing values. The existing wardrobe (104), persona (27) and Trust (305) suites pass: **436 checks**. Sprite loading/cropping and stale-request checks pass. JavaScript syntax, CSS regeneration and whitespace checks pass.

Snapshots, screenshots and checks are under `/private/tmp/wardrobe-hearts-2026-11-09/`. The normal sync check still encounters the pre-existing Paimon image checksum mismatch. Installation updates only the reviewed wardrobe/Trust files and their exact built CSS layers, with before-install snapshots and guards against concurrent live edits. Other source work and media remain intact.
