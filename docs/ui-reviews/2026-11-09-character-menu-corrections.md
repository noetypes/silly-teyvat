# Character menu corrections — 9 November 2026

Implemented the requested follow-up using the supplied Genshin character-menu screenshots as visual references.

- Restored element/name breadcrumbs (`Hydro / Sigewinne`, `Pyro / Klee`); characters without an element show only their name.
- Grouped Q, the portrait strip and E into one unit centered on the screen independently of the heading and close button. Sparse and overflowing rosters use the same center. Smaller screens put this unit on its own centered row.
- Restored visible Q/E/W/S controls and retained their keyboard and click actions.
- Restricted portrait scrolling and touch panning to the horizontal axis, disabled native image dragging, and reset vertical scroll when centering a selection. Removed the inherited extra scale on the selected button; the portrait itself already enlarges. The selected portrait and its rim now fit inside the strip at every tested viewport.
- Reduced Expression audio and Add sprites headers to 34px plus their border, with a custom disclosure triangle and vertically centered text.
- Organized the expanded sprite importer with a consistent 12px gap between controls and actions, including the Add sprites button and custom-expression row.
- Changed empty-scene footer text to `No scene artwork for [name].`

## Verification

`tools/tests/test-wardrobe-ui-browser.mjs` checks all six sections at 1440×900, 1024×768, 901×600, 900×700, 768×1024, 390×844, 320×568 and 844×390. Additional checks cover heading values, centered sparse/overflowing rosters, equal Q/E gaps, visible Q/E/W/S buttons and their actions, selected-portrait bounds, vertical scroll prevention, a simulated vertical touch drag, compact/centered disclosure headers, upload spacing, exact empty-scene wording and the existing keyboard/focus flows.

The wardrobe (104 checks) and persona (27 checks) preview suites pass. The sprite-loading suite passes its neutral-first, stale-load cancellation, crop stability, scene loading and close/reopen checks. Syntax checks, CSS regeneration and `git diff --check` pass.

Screenshots and before-install file snapshots are under `/private/tmp/wardrobe-corrections-2026-11-09/`. The same pre-existing Paimon image checksum mismatch still blocks the full installer. The live update is limited to the reviewed wardrobe JavaScript, character-screen CSS, and its exact layer in built CSS, with guards against overwriting concurrent live edits. Unrelated work and media are preserved.
