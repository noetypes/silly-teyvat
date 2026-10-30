# Developing Silly Teyvat

The SillyTavern extension lives in `extension/genshin-dialogue-ui/`. The Teyvat Slate theme is in `theme/`, and Teyvat Choices quick replies are in `quick-replies/`.

Media lives in the separate `silly-teyvat-data` folder. After cloning, run
`python3 tools/game-data.py link`; see [GAME-DATA.md](GAME-DATA.md) for relocation,
verification and adding assets. Never commit media binaries or research caches.

## Workflow

1. Edit files in `extension/genshin-dialogue-ui/`. Put CSS changes in a layer file (`teyvat-ui.css`, `world-map-ui.css`, `ui-121.css`, `battle.css`, `location-music.css`, `paimon-menu.css`, `character-identity.css`, `inventory.css`, `ui-143.css`, `ui-144.css`, `ui-146.css`), then run `tools/build-css.py`. Never hand-edit the appended part of `style.css`.
2. Run `node --check` on every changed `.js` file.
3. Run `bash tools/sync-live.sh --check`. If the live copy has changes this repository doesn't, another agent has updated it: bring those changes into the repository first, and commit them separately. The check compares content through external media links.
4. Install with `tools/sync-live.sh`. Set `SILLY_TEYVAT_LIVE` to use a different SillyTavern folder.
5. Open `http://localhost:8000/scripts/extensions/third-party/genshin-dialogue-ui/preview.html` and run the `preview-*-tests.js` suites. In a background tab, shim `requestAnimationFrame` with `setTimeout` first, or the tests stall.
6. Commit with the version bump in `manifest.json` and a short section at the top of the extension `README.md`.

## Tester packages

`tools/sync-live.sh` writes `package-files.json` into the installed extension. The browser cannot list a folder, so **Export extension** reads this inventory. Run `node tools/test-share-package.mjs` after changing the export or import code. See [GAME-DATA.md](GAME-DATA.md#share-with-testers) for what each package contains.

## Responsive interface checks

Run `node tools/test-starter-cgs.mjs` for the bundled scene artworks and keyboard detection.

Run `node tools/test-ui-layout-browser.mjs` with Playwright available on `NODE_PATH`. It mounts a disposable four-member, three-enemy board at nine desktop and mobile viewports, checks bounds and control separation, and saves screenshots under `work/ui-review-2026-10-28/layout/`. The preview's **Responsive battle demo** provides the same board for manual resizing. No model or native chat write is involved.
