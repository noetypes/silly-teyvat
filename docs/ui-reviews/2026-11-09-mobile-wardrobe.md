# Mobile Character menu and sprite wardrobe

Implemented 9 November 2026.

- Portrait section tabs and mobile character sorting/filtering each occupy one horizontal scrolling row. Selecting a section by keyboard also reveals it in the row or rail.
- Mobile character controls show left/right arrows; desktop retains Q/E hints. Accessible names and keyboard shortcuts remain available.
- Selected portraits, expression tiles, scene tiles and character-browser cards have padding for their selection glow.
- The slate omits the repeated character name and sprite/scene caption. Portrait allocates the recovered space to a taller sprite stage.
- The character-browser title and close button occupy their own grid row; search and filters occupy the following row without overlapping the close button.
- Mobile landscape places sections vertically on the left, the sprite in the middle and a wider slate on the right. All Characters becomes a compact icon. The element/name heading has a separate header column from portraits and truncates long names.

Validation uses `node tools/tests/test-wardrobe-ui-browser.mjs` at 1440×900, 1024×768, 901×600, 900×700, 768×1024, 390×844, 320×568, 844×390, 568×320 and 932×430. It checks all six sections, usable editor bounds, control alignment, scrolling navigation and filters, mobile arrows, selection-glow clearance, landscape column separation, compact browser access, search/close separation, import disclosures, keyboard focus and Trust editing. Screenshots were visually reviewed for portrait and landscape.

The wardrobe, persona and Trust preview suites and the sprite-loading/cropping/stale-request browser checks also pass. JavaScript syntax, CSS regeneration and whitespace checks pass. Disposable fixtures do not modify native chats or settings.

Screenshots and before-install source/live backups are under `/private/tmp/wardrobe-mobile-2026-11-09/`. The standard sync check encounters the existing `content/character-cards/paimon/Paimon.png` checksum mismatch. Installation is limited to the reviewed wardrobe JavaScript/CSS, README and the exact generated wardrobe CSS layer, guarded against concurrent live edits.
