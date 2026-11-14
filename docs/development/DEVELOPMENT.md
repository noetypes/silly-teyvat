# Developing Silly Teyvat

The SillyTavern extension lives in `extension/genshin-dialogue-ui/`. Character cards, the Teyvat Slate theme and the Teyvat Choices quick replies are in `content/`.

Media lives in the separate `silly-teyvat-data` folder. After cloning, run
`python3 tools/game-data.py link`; see [GAME-DATA.md](GAME-DATA.md) for relocation,
verification and adding assets. Never commit media binaries or research caches.

## Workflow

1. Edit files in `extension/genshin-dialogue-ui/`. Put CSS changes in a layer file (`teyvat-ui.css`, `world-map-ui.css`, `ui-121.css`, `battle.css`, `location-music.css`, `paimon-menu.css`, `character-identity.css`, `inventory.css`, `trust.css`, `ui-143.css`, `ui-144.css`, `ui-146.css`, `ui-154.css`, `character-screen.css`, `ui-159.css`, `ui-161.css`, `ui-162.css`, `ui-163.css`, `card-search.css`), then run `tools/build-css.py`. Never hand-edit the appended part of `style.css`. In `settings.html`, each `<h4>` starts a section that gets its own Reset; mark a fine-tuning row with `data-advanced` to fold it into the tab's Advanced drawer (`settings-ui.js`). Keep explanations in `title` tooltips rather than notes.
2. Run `node --check` on every changed `.js` file.
3. Run `bash tools/sync-live.sh --check`. If the live copy has changes this repository doesn't, another agent has updated it: bring those changes into the repository first, and commit them separately. The check compares content through external media links.
4. Install with `tools/sync-live.sh`. Set `SILLY_TEYVAT_LIVE` to use a different SillyTavern folder.
5. Open `http://localhost:8000/scripts/extensions/third-party/genshin-dialogue-ui/preview.html` and run the `preview-*-tests.js` suites. In a background tab, shim `requestAnimationFrame` with `setTimeout` first, or the tests stall.
6. Commit without changing the version: describe the change in the commit message, not the README. The version in `manifest.json` moves only when pushing to GitHub, in one release commit per push that follows the `0.NNa` scheme in [AGENTS.md](../../AGENTS.md#versions-and-release-notes) (`0.50a`, `0.51a`, `0.52a`, …) and carries the release notes for everything since the last push. Update the feature overview in both `README.md` files (repository root and extension) only when a feature is added, removed or changes what players see.
7. To release to players, run `python3 tools/build-dist.py --commit` and push the distribution repository. See [GAME-DATA.md](GAME-DATA.md#publish-the-extension).

## Switching Silly Teyvat off

The **Silly Teyvat** switch at the top of its settings calls `dispose()` and remounts only the settings panel, so SillyTavern runs as if the extension were not installed. Anything `initialize()` adds — elements, body classes, observers, event listeners, extension prompts, prompt order — must be removed again in `dispose()`. SillyTavern still loads `style.css`, so scope every rule to a `body.gi-*` class, a `#gi-` element or one of the extension's own class prefixes, never to SillyTavern's elements alone. The feature sets below that switch are listed in `feature-switches.js`; each turns a group of existing settings on or off together.

## Tester packages

`tools/sync-live.sh` writes `package-files.json` into the installed extension. The browser cannot list a folder, so **Export extension** reads this inventory. Run `node tools/tests/test-share-package.mjs` after changing the export or import code, and `node tools/tests/test-game-data-update.mjs` after changing published game data (`game-data-update.js`, `tools/release-game-data.py`). See [GAME-DATA.md](GAME-DATA.md#share-with-testers) for what each package contains. An import merges the tester's settings into the player's, so anything saved in settings that is later drawn as markup must be cleaned where it is read: `node tools/tests/test-saved-kits.mjs` checks that saved movesets reach the battle screen only as numbers and known words, and that a plain save round-trips unchanged.

## Public install verification

Use a separate empty SillyTavern profile to check the player path, never the live development profile:

```sh
# In the SillyTavern server folder, using its existing dependencies:
node server.js --dataRoot /tmp/teyvat-release-test/data --port 8002 --listen false --browserLaunchEnabled false
# In this repository, with Playwright available on NODE_PATH:
node tools/tests/test-release-install-browser.mjs --server http://localhost:8002 --install
```

The browser test uses SillyTavern's native GitHub installer, accepts the automatic game-data offer,
installs the public hosted pack, reloads, opens Klee and checks the world map. It checks the new
installation starts with story view enabled and that bundled backgrounds use the distribution's
folder name. Screenshots and counts go under `/tmp/silly-teyvat-release-install/` by default
(`--out` changes it). Allow time and disk space for the full real download. The test refuses port
8000 and rejects nonempty character libraries when installing.

## Responsive interface checks

Run `node tools/tests/test-starter-cgs.mjs` for the bundled scene artworks and keyboard detection. To add a starter scene, add a record with its wiki file name to `assets/cgs/catalog.json` (with `"display": "frame"` unless the artwork is 16:9, so it opens in a frame rather than replacing the background), run `python3 tools/fetch-cgs.py` (needs Pillow) and then `python3 tools/game-data.py migrate --only extension/genshin-dialogue-ui/assets/cgs`.

Run `node tools/tests/test-ui-layout-browser.mjs` with Playwright available on `NODE_PATH`. It mounts a disposable four-member, three-enemy board and a crowded seven-member board with summons on both sides at nine desktop and mobile viewports, checks bounds, control separation and that no card overlaps another card, a summon, played card or control, and saves screenshots under `work/ui-review-2026-10-28/layout/`. The preview's **Responsive battle demo** provides the same board for manual resizing. No model or native chat write is involved.

## Performance checks

Run `node tools/tests/test-map-performance-browser.mjs --cpu 4` for a populated map (240 waypoints and 240 character cards), or add `--mobile --cpu 6` for a phone viewport and a smaller tile cache. It measures synchronous selection cost and pan frames, and checks stable list nodes, roster/cache invalidation, decoded tile reuse, retrying failed tiles, camera interruption, reduced motion and disposal. `--baseline` only records timings. Like the other browser checks, it needs Playwright on `NODE_PATH` and the preview served on port 8765 (or `IDENTITY_PREVIEW_URL`). Tile requests are mocked locally; these are rendering measurements, not a network-speed test.

The map check also reports Chrome's graphics feature status and measures whole-world waypoint flights (frame times, marker style writes, script/style/layout cost). It verifies marker positions and stacking against stock Leaflet, unchanged-position writes, keyboard focus, compositing hints released on close and the fallback without 3D transforms. It also checks that a waypoint chosen mid-flight starts a new flight from where the camera is (Leaflet would otherwise reset the view, because the zoom is between steps), that pins move with the map on every flight frame (pins and tiles are placed unrounded while the camera moves, `exactFrame` in `map-engine.js`) and, on desktop, that wheel zoom keeps Leaflet's half-level steps. On a flight or a pinch the pins are drawn on one canvas (`flightPins` in `map-engine.js`) and the markers wait, hidden, until the camera stops; the detailed tiles load only where a flight lands (`warm`), never along the way. Do not animate `box-shadow`, `filter` or other painted properties on pins or badges (fade an extra layer's `opacity` instead), and keep `filter: none` on map tiles: Leaflet's `filter: inherit` re-styles every tile on every camera frame. See [2026-11-13-region-flights.md](../performance/2026-11-13-region-flights.md). The open map hints only its shared camera and tile levels for compositing; do not add `will-change` to every pin/tile or force a discrete GPU. Browser acceleration, driver policy and actual graphics hardware remain outside the extension's control. Phone runs emulate viewport, memory and CPU limits on the test machine, not a physical phone GPU.

Run `node tools/tests/bench-perf.mjs` (Playwright on `NODE_PATH`, the preview served as in the workflow above). It slows the CPU four times, as a stand-in for a phone, and times opening the menu, the map and the Characters screen, streaming a reply into a 100-message chat, and an automatic battle with a crowded board. Each line gives main-thread script, style, layout and task time, long tasks (over 50 ms), elements added, and frame times; a line ending in `OVER` missed a budget at the top of the script, and the exit code is then 1. Use `--cpu 6` for a harsher test, `--only map,menu` for some scenarios, and `--json` for a record.

Keep chat length out of the cost of a frame. Never anchor a `:has()` rule on `#chat`, `#sheld` or `body`: SillyTavern keeps every message in `#chat`, and a `:has()` anchor is re-checked on every text change inside it, which re-styles all messages each time the reply is revealed or streamed (at 600 messages that was ~7 ms a frame instead of ~0.4). Toggle a class from `refresh()` and style by that (as `body.gi-welcome` does) instead. In JS, look messages up with `getElementsByClassName` on `#chat` and scope button lookups to `#gi-root`/`#gi-settings`; a `document.querySelectorAll` walks the whole transcript on each refresh.

What these numbers do not show: SillyTavern itself takes about 3.2 s of a 4× slowed page's 3.5 s boot, and the extension's own start (about 108 module files, 1.9 MB of JavaScript, 0.6 MB compressed) adds about 0.2 s, so the extension's start-up is not where a phone loses time. What does cost is repeated work during play (a redraw per streamed word, thousands of map elements) and first-use stalls (creating the sound engine, decoding sprites).

Flows with several phases (a card that is a list, details, a place picker or an editor; a battle that is in intro, your turn, the enemy's turn or the result) are written as machines with `createMachine` in `machine.js`: name the states, list the events each accepts, put entry and exit work in one place. Do not add a second boolean beside one; add a state.

## Sprites

SillyTavern serves sprites from `data/default-user/characters/<Name>/` (and `<Name>/<Outfit>/`). Anything the extension remembers about a sprite is keyed by folder and name without the extension (`sprite-files.js`: `spriteAudioKey`, `spriteLocation`, `healSceneSources`), so the same sprite may be a PNG or a WebP. Never build a key from a file name by hand; use `spriteAudioKey`.

`tools/convert-sprites.py --archive DIR` converts sprite PNGs to WebP quality 90 and archives the originals (see its header for what it skips). Run it after installing newly generated sprites; it only converts what is still a PNG. `art/sprites/` holds the generation runs and their hashes and is never converted. Checks: `node tools/tests/test-sprite-files.mjs` and `node tools/tests/test-sprite-files-browser.mjs`.

Enemy and NPC circular portraits are non-generative crops recorded in
`art/sprites/2026-11-09-enemy-npc-head-icons/run.json`. Rebuild with
`python3 tools/build-sprite-head-icons.py` (Pillow), then migrate that run and
`extension/genshin-dialogue-ui/assets/avatar-icons` into the data pack.
`node tools/tests/test-sprite-head-icons-browser.mjs` checks full catalog coverage,
transparency, card-name aliases and shared wardrobe/combat/map portraits; it uses
the same Playwright setup and `IDENTITY_PREVIEW_URL` as the other browser checks.
