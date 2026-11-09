# Character configuration and sprite wardrobe review

Reviewed 8 November 2026. Implemented in `wardrobe.js` and the `character-screen.css` design layer; rebuilt `style.css` with `tools/build-css.py`.

The elemental backdrop, character artwork, cream controls and gold accents give this screen a recognizable identity. Its main weakness was treating an editor like a decorative game screen: bright backgrounds competed with small labels, navigation consumed too much width, and common tasks sat among long upload forms. Several disclosure headings were also hidden by shared CSS, preventing users from discovering entire sections.

| Criterion | Finding | Implemented change |
| --- | --- | --- |
| Redundancy | Character name repeated in the header and editor; character navigation appeared in two places. | Keep the name in the editor and elemental identity in the header; use one pair of header arrows, retaining Q/E shortcuts. |
| Redundancy | Status text repeatedly exposed folder paths and explained actions unrelated to the current section. | Show the sprite count and set label. Preserve operation feedback and scene-specific status. |
| Legibility | Transparent forms inherited bright red, green, yellow or cyan backgrounds. Moving motes passed over controls. | Place the editor on a consistent dark slate surface, use solid input backgrounds, clearer borders and readable placeholders, and keep motes behind the editor. |
| Legibility | Tablet and phone navigation hid section names, leaving unlabelled icons. | Keep explicit accessible names and visible text. Phones show all six sections in a two-row menu. |
| Organization | Large section names and side gutters left a narrow editor. | Reduce the navigation column, widen the editor and separate its scroll area from the stage. The footer no longer overlays the form. |
| Organization | Audio and imports dominated expression editing; Burst audio appeared among sprite tools. | Fold expression audio, scene audio and sprite imports into named disclosures. Move Burst audio beside Moveset and keep it intact when the editor refreshes. |
| Discoverability | Shared rules hid summaries for Starting Trust, Starter Deck and linking an existing sprite folder. | Restore these disclosure headings and their keyboard access. |
| Task clarity | Selecting another outfit previewed it, while the same enabled “Use set” action appeared for equipped sets. | Show disabled “Equipped” for the current set and “Equip set” for a preview, with an explicit preview-only message. |
| Task clarity | Blank sprite slots did not lead directly to image selection; scene controls appeared before a scene was selected. | Open sprite imports for empty slots; hide scene details and audio until a scene is selected. Label stage settings as automatically saved. |
| Character browsing | The roster launcher was an unexplained icon; empty filters gave no recovery guidance; long names were truncated. | Label “All characters,” arrange filters in a responsive grid, wrap roster names, show an empty-result explanation, and make Reset clear search as well as filters/sort. |
| Keyboard access | Focus could leave the character browser and reach controls hidden behind it. | Make the underlying screen inert, contain Tab/Shift+Tab, expose expanded state and return focus to the launcher after Escape. |
| Aesthetics | Destructive actions looked identical to ordinary actions, and the editor changed contrast with every element. | Use restrained rose styling for removal controls and a consistent slate, ivory and gold hierarchy while preserving the elemental sky, sprites and reflections. |
| Motion | Disabling arrival animations could leave an opaque tint over the character. | Explicitly suppress the tint under both the extension's Reduce Motion setting and the OS preference. |

## Validation

- JavaScript syntax checks and `git diff --check` pass; CSS rebuilt from source layers.
- Existing browser suites: wardrobe **104**, persona **27**, persona-link **12**, staging **78**, media **73** checks pass (**294** total).
- `tools/tests/test-wardrobe-ui-browser.mjs` exercises all six sections at **1440×900, 1024×768, 901×600, 900×700, 768×1024, 390×844, 320×568 and 844×390**. It checks editor bounds, horizontal field overflow, usable scroll height, visible navigation names, character-browser space, disclosure access, outfit state, empty-slot import guidance, Burst audio placement, search recovery, focus containment and reduced-motion tint handling.
- `tools/tests/test-wardrobe-loading-browser.mjs` passes: neutral-first loading, bounded background image decoding, stale-request cancellation, prepared sprite crops, on-demand scene loading, close/reopen handling and editable empty folders.
- Visually inspected the installed desktop and phone expression editor in Chrome. Test screenshots are saved under `/private/tmp/silly-teyvat-wardrobe-review/`.

Tests use disposable preview contexts and in-memory adapters. They do not submit chats, generate artwork, or upload/delete real sprites. Mobile checks use browser viewport emulation; they do not establish physical-device or screen-reader certification.

## Live installation

The standard `sync-live.sh --check` stopped on a pre-existing data-pack checksum mismatch for `content/character-cards/paimon/Paimon.png`. Its content and catalog were left unchanged.

Before installation, the live `wardrobe.js` and `character-screen.css` were verified byte-for-byte against their original Git versions. The reviewed menu was installed as a scoped update: those two files and only the matching wardrobe layer inside live `style.css`. Other live CSS and code were preserved. Backups are under `/private/tmp/silly-teyvat-wardrobe-install-backup/`. The live manifest was left at its existing version because this was a scoped UI installation, not installation of the repository's other pending changes.

The worktree already contained substantial unrelated combat, map, music and artwork changes. Those were preserved; this review does not claim to validate or release them.
