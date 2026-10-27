# Silly Teyvat world map research

Researched and implemented on 25 October 2026. The goal was a small map for roleplay destinations, backgrounds and travel distances, without collectible databases, accounts or route tracking.

## Projects compared

| Project | Useful parts | Status and tradeoffs | Decision |
| --- | --- | --- | --- |
| [Kongying Tavern / yuan-shen-map](https://github.com/kongying-tavern/yuan-shen-map) | Genshin-focused Leaflet map and flat coordinate transformation; lightweight plain JavaScript | This public v1 repository was archived on 24 February 2023. MulanPSL-1.0. Its old tiles and collection systems are unsuitable for a current embedded map. The [current project docs](https://kongying-tavern.github.io/docs/en/index) describe a newer project. | Best architectural fit. Adapt the small CRS transformation and retain its license, then write the waypoint interface and storage for Silly Teyvat. |
| [Teyvat.moe / GenshinMap](https://github.com/EliteMasterEric/Teyvat.moe) | Complete React/Leaflet interactive map and marker UI | Archived on 2 August 2021; GPL-3.0; considerably more application infrastructure than this extension needs. [PaimonWheeWhee/genshinmap](https://github.com/PaimonWheeWhee/genshinmap) is a related fork. | Useful comparison, no code copied or runtime dependency. |
| [genshin-overlay](https://github.com/Jude-Chaer/genshin-overlay) | Current public implementation referencing HoYoLAB map metadata and tile naming | Windows/C++ overlay, GPL-3.0, includes screen integration and tracking that do not fit a browser extension. Its [map-data source](https://github.com/Jude-Chaer/genshin-overlay/blob/main/src/map_data.cpp) identifies the current tile service. | Use as a protocol reference only. No overlay code, binaries or tracking features included. |
| [Leaflet](https://leafletjs.com/download.html) | Stable pan/zoom, touch input, markers, layered tiles and [flat image coordinates](https://leafletjs.com/examples/crs-simple/crs-simple.html) | BSD-2-Clause. Stable 1.9.4 was selected instead of the 2.0 alpha. | Vendor the official 1.9.4 ES module and CSS locally. No CDN JavaScript or shared global `L`. |

The result is an integration of Leaflet and Kongying's map-coordinate approach with new Silly Teyvat waypoint, regional-background and prompt handling. It does not embed a hosted third-party map application.

## Map artwork and coordinates

The public [HoYoLAB map metadata](https://sg-public-api-static.hoyolab.com/common/map_user/ys_obc/v1/map/info?map_id=2&app_sn=ys_obc&lang=en-us) supplies the current Teyvat `detail_v2` grid. The bundled snapshot is recorded in `assets/map/map.json`:

- Map ID 2, tile version `eea752b746ae1f2e0c1988a574f2b7b0`.
- Grid 36,864 × 18,432 native units; origin at (24,206, 8,918).
- Native coordinates increase east on x and south on y. These are flat map coordinates, not geographic longitude and latitude.
- Tile path: `https://act-webstatic.hoyoverse.com/map_manage/map/2/<version>/<x>_<y>_<zoom>.webp`, where zoom suffixes are N3, N2, N1 and P0.
- All 162 N3 overview tiles are bundled locally, approximately 1.62 MB. Finer tiles load on demand. If finer tiles fail, the underlying local overview remains available.

Map artwork is © HoYoverse. Its ownership is separate from the open-source software licenses. The map displays the art credit and links to Leaflet and Kongying Tavern. The package contains no proprietary map application JavaScript, account integration or official collectible dataset.

The map version and origin are pinned together. A future art update must update the grid/origin contract and overview consistently, with coordinate migration if the origin changes. Existing waypoints should not be silently interpreted against a new origin.

## Scale and travel context

The [KeqingMains Theorycrafting Library's overworld evidence](https://library.keqingmains.com/evidence/general-mechanics/overworld), “Coordinates Units Descriptions” by Mcpie, documents official map coordinate units as metres. Silly Teyvat therefore defaults to one metre per native coordinate unit. This is an in-game map measurement, not a claim about the fictional world's full lore scale.

Distances use `hypot(destination.x-current.x, destination.y-current.y) × metresPerUnit`, not screen pixels or map zoom. The scale bar, waypoint details and system context use the same multiplier. Walking estimates divide that distance by the editable walking speed, initially 5 km/h. These are straight-line reference times, without pathfinding, elevation, water or climbing costs.

Every mapped background in every region appears in the **World scale** system block, with its region, name, description, coordinates, distance, compass direction and baseline walking time. The selected region remains locked for automatic background classification. Explicit Teleport can select another region. This lets the model understand distant destinations without interpreting a mention of one as travel.

## Storage and native integration

Waypoints are fields on regional wardrobe backgrounds, not a second parallel database. Uploaded artwork uses the existing authenticated SillyTavern user-file adapter. Linking an existing background preserves its ID and file reference. Unpinning preserves artwork and message snapshots.

The current destination and region live in per-chat travel metadata, shared by all speakers in a group. Historical scene playback can restore its own minimap position without moving the active party. Teleport records a guard for the current reply so old dialogue cannot immediately classify the party back.

The installed SillyTavern 1.19.0 source was checked for `setExtensionPrompt`, `extension_prompt_types.IN_CHAT`, `extension_prompt_roles.SYSTEM`, and `GENERATION_AFTER_COMMANDS`. **World scale** is injected with the native system role at in-chat depth zero, refreshed before prompt construction and removed when Silly Teyvat is disabled. Other prompts and the selected model's reasoning preferences are preserved.

## Included licenses

- `vendor/leaflet/LICENSE`: official Leaflet BSD-2-Clause license.
- `vendor/KONGYING-LICENSE.txt`: original MulanPSL-1.0 text from Kongying Tavern. `map-engine.js` identifies the adapted source and changes.
- HoYoverse map art and the user's supplied font/icons retain their respective ownership. No claim is made that these assets are covered by the software licenses.

## Verification

`verification.json` records automated suites and responsive integration checks. Map checks cover coordinate round trips, scale-independent distances, all-region system context, uploaded and existing background links, teleport guards, classifier-driven minimap movement, history, region changes, chat switching and cleanup. Browser checks use disposable mock chats and storage; they do not make real model requests.

## Starter encounters, 25 October 2026

The live official map anchor and point APIs include mainland Snezhnaya as well as Nod-Krai. The starter set therefore covers eight visible regions with five waypoints each. No off-map future region is added. The exact selections, cards and sources are listed in [LOCATION-CATALOG.md](LOCATION-CATALOG.md). Viewpoint/merchant/meeting-point coordinates are used where available; remaining interiors are approximate pins within official city bounds. Users can move these markers without losing artwork or home assignments.
