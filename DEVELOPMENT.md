# Developing Silly Teyvat

The SillyTavern extension lives in `extension/genshin-dialogue-ui/`. The Teyvat Slate theme is in `theme/`, and Teyvat Choices quick replies are in `quick-replies/`.

## Workflow

1. Edit files in `extension/genshin-dialogue-ui/`. Put CSS changes in a layer file (`teyvat-ui.css`, `world-map-ui.css`, `ui-121.css`), then run `tools/build-css.py`. Never hand-edit the appended part of `style.css`.
2. Run `node --check` on every changed `.js` file.
3. Run `tools/sync-live.sh --check`. If the live copy has changes this repository doesn't, another agent has updated it: bring those changes into the repository first, and commit them separately.
4. Install with `tools/sync-live.sh`. Set `SILLY_TEYVAT_LIVE` to use a different SillyTavern folder.
5. Open `http://localhost:8000/scripts/extensions/third-party/genshin-dialogue-ui/preview.html` and run the `preview-*-tests.js` suites. In a background tab, shim `requestAnimationFrame` with `setTimeout` first, or the tests stall.
6. Commit with the version bump in `manifest.json` and a short section at the top of the extension `README.md`.
