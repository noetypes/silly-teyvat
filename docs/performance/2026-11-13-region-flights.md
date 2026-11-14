# Region flights on the world map — 2026-11-13

Choosing a region in the map's top selector flew the camera there in visible
steps. The cause was not the camera curve. Four separate per-frame costs were
stacked on top of each other. Each was measured, removed and measured again.

## What a flight cost

Fixture: the real starter catalog (269 waypoints in 8 regions), 240 character
cards, tiles served locally. Nine region flights in a row (Mondstadt → Sumeru →
Inazuma → Natlan → Snezhnaya → Liyue → Teyvat → Fontaine → Mondstadt),
starting from a close view (zoom −1.5) in which the detailed tiles are showing.

1. **Detailed tiles requested for everything the flight passed over.** The
   detailed tile layer kept its take-off zoom level for the whole flight and
   asked for every tile under the zoomed-out view on every frame:
   about 7,800 requests and 55,000 tile elements for nine flights.
2. **Every marker re-placed on every frame.** Leaflet writes each waypoint's
   transform and z-index on every zoom frame: about 20,000 style writes per
   flight for the ~250 waypoints of a region view.
3. **Every tile re-styled on every frame.** Leaflet's stylesheet gives tiles
   `filter: inherit`, left over from old Internet Explorer. Inheriting a
   property that is not normally inherited makes each tile depend on its
   parent's style, and a tile level's transform changes every frame. About 250
   elements were re-styled per frame.
4. **The boss badge glow animated `box-shadow`.** It re-styled and repainted
   every boss badge on every frame the map was open, including those in the
   hidden list and those too far out to see.

## Changes

- `map-engine.js`: the detailed tile layer (`rest: true`) loads nothing on
  flight and pinch frames. It switches to the landing zoom on `moveend`.
  `warm()` loads and decodes the tiles of the destination into the shared pool
  as the flight starts, so they are there on landing. The overview layer
  covers the journey as before.
- `map-engine.js`: `flightPins()` draws the pins on one canvas while the camera
  flies or a pinch is in progress, at the same unrounded positions as the tiles
  (rounded on the first and last frame, as the markers are). The markers are
  hidden where they stand and each is placed once on landing. A wheel or button
  zoom during a flight hands back to the markers at the canvas's positions
  before Leaflet's CSS zoom animation starts, and keyboard focus on a marker is
  restored. Each pin look is drawn once into a cached stamp.
- `world-map-ui.css`: map tiles get `filter: none`. The boss glow fades a
  second shadow's opacity, a compositor-only animation, instead of animating
  `box-shadow`. It stops when the map is zoomed out past the badges, and is
  paused with the other pin animations while the camera moves.
- `world-map.js`: the detail card and every click reuse the rosters and
  waypoint list that `refresh()` caches, instead of rebuilding them from all
  cards and regions on each click.

## Results

Flights from a close view, as above; frame times are main-thread frame
intervals.

| | Before | After |
| --- | ---: | ---: |
| Desktop 4× CPU: p95 frame | 133 ms | 16.8 ms |
| Desktop 4× CPU: frames over 50 ms | 91 | 5 |
| Desktop 4× CPU: detailed tile requests | 7,783 | 162 |
| Desktop 4× CPU: marker/tile style writes | 93,353 | 5,766 |
| Desktop 4× CPU: style recalculation | 4.6 s | 1.3 s |
| Desktop 4× CPU: main-thread task time | 22.1 s | 10.9 s |
| Phone 6× CPU: p95 frame | 450 ms | 16.8 ms |
| Phone 6× CPU: frames over 50 ms | 87 | 5 |
| Phone 6× CPU: long tasks | 47 | 7 |

Flights from the zoomed-out view (no detailed tiles) went from 296 frames over
25 ms to 12, and style recalculation from 7.7 s to 1.0 s. Choosing a waypoint
in the list costs 14–30 ms of script on a 2 GB phone profile at 6×, down from
45–60 ms.

What remains per flight is one long task of 60–80 ms at landing (the markers
re-entering view and the destination's tiles being attached). This is a single
step at the end of the flight, not a stutter during it.

## Checks

`node tools/tests/test-map-performance-browser.mjs --cpu 4` and
`--mobile --cpu 6` pass. New checks cover: pins drawn on the canvas at the
tiles' positions on every flight frame; markers hidden during a flight and
placed once on landing; focus kept; a wheel zoom during a flight starting each
marker's glide where its pin was; a pinch drawn on the canvas and handed back;
flights loading the landing's detailed tiles only; tiles not inheriting
`filter`. Of the 33 preview suites, 32 pass. `enemy-region` fails "wilderness
and homes never overlap" only with the uncommitted Mitya and Valeriy home data
in the working tree. With the committed data and these changes it passes.

The numbers come from headless Chrome on the development Mac with emulated CPU
slowdown, not from a physical phone.
