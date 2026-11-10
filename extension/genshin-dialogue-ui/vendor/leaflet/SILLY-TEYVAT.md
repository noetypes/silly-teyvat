# Local Leaflet changes

The bundled Leaflet 1.9.4 ES module retains its BSD-2-Clause license in `LICENSE`.

Silly Teyvat adds an optional `easing(t)` camera option, where `t` runs from 0 to 1:

- `Map.panBy` forwards it to `PosAnimation.run` as an optional fifth argument.
- `PosAnimation` and `Map.flyTo` use it when supplied, preserving the original curves otherwise.

The world map supplies an asymmetric curve for deliberate waypoint and region navigation: acceleration over the first 10%, followed by exponentially decaying velocity. Its integrated distance is normalized to finish exactly at the destination. Dragging, inertia and ordinary zoom controls retain Leaflet's defaults.

Silly Teyvat also adds `Util.setFrameScheduler({request, cancel})`. When set, `requestAnimFrame` and `cancelAnimFrame` go through it instead of the browser, so the extension's frame-rate cap (`frame-rate.js`) paces flights, inertia and wheel zoom. Without a scheduler, frames come from the browser as before. Preserve these small, marked changes when upgrading Leaflet. Browser coverage is in `tools/tests/test-map-performance-browser.mjs`.
