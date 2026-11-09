# Map hardware acceleration audit — 2026-11-09

The map already uses Leaflet's 3D transforms, viewport culling, decoded image
reuse and memory-bounded tile caches. The test Chrome browser reports GPU
compositing, rasterization and multiple raster threads enabled. This is a report
about the test process; an extension cannot establish or override the graphics
settings of every player's browser.

## Changes in 1.76.4

- Prepare the open map's shared camera pane and tile levels for compositing with
  `will-change: transform`. Closing the dialog removes those hints. Individual
  pins and tiles do not request separate layers.
- Skip repeated rounded marker positions through a local Leaflet marker
  subclass. Preserve stacking-offset updates, icon changes, culling/reinsertion,
  keyboard access, and Leaflet's existing behavior for draggable/hovering pins.
  The vendor library is unchanged.
- Add long camera-flight timing, graphics capability reporting, and regression
  checks for those behaviors to the existing map browser suite.

These are small rendering changes. Controlled runs remained near 60 fps before
and after; they do **not** demonstrate an FPS increase. The new hints let the
browser prepare shared layers, and repeated stationary marker updates now
produce no style writes. Long flights still require CPU work to position pins.
The GPU need not be fully occupied for the map to run smoothly.

## Validation

Fixture: 240 waypoints and 240 character cards, deterministic local tile
responses. Native chat and settings are not written.

| Test | CPU slowdown | Pan p95 | Flight p95 | Selection range |
| --- | ---: | ---: | ---: | ---: |
| Desktop, 1440 × 900 | 4× | 16.7 ms | 16.7 ms | 12.4–26.5 ms |
| Phone emulation, 412 × 915, 2 GB cache policy | 6× | 16.8 ms | 16.7 ms | 20.0–45.6 ms |

Both complete suites passed: stable list nodes; stock-Leaflet-equivalent pin
positions/stacking after zoom, movement, icon changes and reattachment; no style
writes for unchanged positions; keyboard focus; compositing hint cleanup;
mutable roster/cache invalidation; decoded tile reuse; failed tile retries;
camera interruption and easing; reduced motion; reopening; disposal; and
positioning without 3D transforms. Phone emulation uses the desktop GPU, so this
is not a physical phone hardware benchmark or a network-speed benchmark.

Commands (Playwright provided through `NODE_PATH`, local preview on port 8765):

```
node tools/test-map-performance-browser.mjs --cpu 4
node tools/test-map-performance-browser.mjs --mobile --cpu 6
```

JavaScript syntax checks, CSS bundle/source agreement, and `git diff --check`
passed. The regular live-sync preflight is blocked by a pre-existing media
checksum mismatch for `character-cards/paimon/Paimon.png`. A separate read-only
comparison found no live-only extension source files and only the intended map
source changes plus existing local README additions. The targeted installer
backs up and verifies the six update files without modifying media or other
extension code.

Installed and hash-verified the six files in the live SillyTavern extension as
version 1.76.4. Previous versions are backed up under
`/private/tmp/silly-teyvat-map-compositing-install/backup`. Reload SillyTavern to
load the changed modules and stylesheet.

## References

- [Leaflet 1.9.4 animation behavior](https://leafletjs.com/reference-1.9.4.html).
- [MDN: will-change hints and memory tradeoffs](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/will-change).
- [MDN: browser rendering and compositing](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/How_browsers_work).
