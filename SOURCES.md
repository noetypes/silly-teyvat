# Research and implementation sources

Researched on 24 October 2026 before implementation. Three agents reviewed visual references, SillyTavern architecture and the installed UI extensions before the implementation plan was agreed.

## Genshin Impact references

- [HoYoverse Developers Discussion, 5 July 2024](https://genshin.hoyoverse.com/en/news/detail/124539). Official examples of Dialogue Review and Hide Dialogue Screen informed the blue charcoal review panel, simple divider, cream text and unobstructed scene state. The [official comparison animation](https://fastcdn.hoyoverse.com/content-v2/hk4e/124539/ab4667cb8081615cc48462c3b3d365a0_9017006064185434490.gif) was inspected visually.
- [Official version 4.8 update details](https://genshin.hoyoverse.com/m/en/news/detail/124837). Confirms the addition of Dialogue Review and Hide Dialogue Screen.
- [HoYoverse Developers Discussion, 4 December 2020](https://genshin.hoyoverse.com/en/news/detail/7170). Describes the game's Auto progression after voice-over finishes and its pause for player choices. Silly Teyvat adapts the idea to already available chat messages rather than voice timing or new generation.
- [Official HoYoverse menu screenshot](https://genshin.hoyoverse.com/id/news/detail/5865). The [original image](https://webstatic.hoyoverse.com/upload/uploadstatic/contentweb/20201004/2020100417481330774.png) informed the companion theme's blue slate, warm cream, muted gold and restrained icon tiles.

Two additional visual references are **community gameplay screenshots**, not official design specifications:

- [HoYoLAB post, 10 October 2024](https://www.hoyolab.com/article/34103759), with the [Xilonen dialogue screenshot](https://upload-os-bbs.hoyolab.com/upload/2024/10/10/251513638/a940073316fc4fea82182381a5ebd845_1720765204741596314.png). Shows the centered gold speaker, fine rule, ivory dialogue, right-side dark response pill and top-left Auto/history/hide controls.
- [HoYoLAB post, 9 October 2022](https://www.hoyolab.com/article/11806160), with the [Paimon dialogue screenshot](https://upload-os-bbs.hoyolab.com/upload/2022/10/09/82806700/18b14c8f7e0aec8ce638f8604fe02671_2113238693483302132.jpg). Shows the lower advance diamond and restrained text/divider layout.

Colors, spacing and proportions were estimated visually. They are not extracted game constants. The package does not redistribute those reference images. The user-supplied font and icons bundled for this local setup are described below.

## SillyTavern primary sources

- [UI extension developer documentation](https://docs.sillytavern.app/for-contributors/writing-extensions/). Browser-only manifest structure, `SillyTavern.getContext()`, namespaced extension settings, message/lifecycle events and cleanup hooks.
- [Native UI customization documentation](https://github.com/SillyTavern/SillyTavern-Docs/blob/main/Usage/User_Settings/uicustomization.md). Theme selection, custom CSS and native visual novel mode.
- [Context API source](https://github.com/SillyTavern/SillyTavern/blob/release/public/scripts/st-context.js). Available context, settings, event and rendering helpers.
- [Event definitions](https://github.com/SillyTavern/SillyTavern/blob/release/public/scripts/events.js). Message, chat and generation lifecycle updates.
- [STscript and Quick Reply documentation](https://docs.sillytavern.app/usage/st-script/), [Quick Reply settings HTML](https://github.com/SillyTavern/SillyTavern/blob/release/public/scripts/extensions/quick-reply/html/settings.html), [auto-execution handler](https://github.com/SillyTavern/SillyTavern/blob/release/public/scripts/extensions/quick-reply/src/AutoExecuteHandler.js), and [management commands](https://github.com/SillyTavern/SillyTavern/blob/release/public/scripts/extensions/quick-reply/src/SlashCommandHandler.js). The optional suggestion preset and its instructions were checked against installed 1.19.0 source; the documented slot-based interface is older.
- [Theme handling source](https://github.com/SillyTavern/SillyTavern/blob/release/public/scripts/power-user.js) and [theme endpoint](https://github.com/SillyTavern/SillyTavern/blob/release/src/endpoints/themes.js). Supported native theme fields and user theme storage.
- [Native HTML](https://github.com/SillyTavern/SillyTavern/blob/release/public/index.html), [core CSS](https://github.com/SillyTavern/SillyTavern/blob/release/public/style.css), [VN-dependent CSS](https://github.com/SillyTavern/SillyTavern/blob/release/public/css/toggle-dependent.css) and [mobile CSS](https://github.com/SillyTavern/SillyTavern/blob/release/public/css/mobile-styles.css). Message, composer, drawer, expression and responsive layout selectors.

Implementation details were verified against the user's **installed SillyTavern 1.19.0 source**, rather than assuming the linked moving release branch will stay identical. No private chat contents were needed for planning.

## Local compatibility inspection

- [Prome VN Extension](https://github.com/Bronya-Rand/Prome-VN-Extension), installed version 1.2.4. Local manifest, startup, Sheld controls, observers and sprite CSS were read. Prome controls native VN mode and sprite effects; Silly Teyvat leaves those settings and transforms in place.
- [Guinevere UI Extension](https://github.com/Bronya-Rand/Guinevere-UI-Extension), installed version 2.0.0-beta1. Local loader and included Google Messages theme were read. Full replacement themes can relocate native drawers and hide the normal top bar, which is why overlapping HTML/JavaScript layouts are documented as a compatibility limitation.

## Faithful cues and SillyTavern adaptations

| Based on inspected game UI | Adapted for SillyTavern |
| --- | --- |
| Centered gold speaker, thin gold divider, ivory text and lower gradient | Native chat messages remain editable and keep their normal Markdown/media rendering. |
| Small gold advance diamond | Advances through nonempty paragraphs/newlines, then existing loaded messages, without requesting a model continuation. |
| Top-left Auto, review and hide controls | Auto browses existing messages; no voice timing, autoplay generation or automatic choice activation. |
| Dark response pills | Integrated model-generated player choices send through native chat. Other Quick Reply sets keep their configured actions. |
| White top-right menu glyphs | Version 1.4 uses the user-supplied WebP glyphs and keeps the existing SillyTavern drawer actions. |
| Blue charcoal Dialogue Review | The native chat transcript provides editing, swiping, copying and other existing message tools. |
| Navy, cream and muted gold menu palette | Native SillyTavern settings, inputs, cards and drawers receive the companion theme. |
| Landscape gameplay references | Portrait layout, safe-area spacing, long model prose, keyboard focus and reduced motion are new adaptations. |

Decorative panels are written in CSS. Version 1.4 bundles the user-supplied icon assets and installed font described below. No remote font or rendering service is needed.

## Version 1.2 choices and HUD references

- [HoYoLAB gameplay HUD screenshot](https://www.hoyolab.com/article/30573251) and [gameplay/menu reference](https://www.hoyolab.com/article/8402486). Community examples on the official community platform informed the white icon row and menu motifs. The included SVGs are original redraws, not extracted textures.
- [DeepSeek thinking-mode API documentation](https://api-docs.deepseek.com/guides/thinking_mode/). Explicit `thinking: {type: disabled}` for the current Custom DeepSeek model. Hiding reasoning is not a substitute for this provider parameter.
- [SillyTavern Chat Completion implementation](https://github.com/SillyTavern/SillyTavern/blob/release/public/scripts/openai.js), [server forwarding](https://github.com/SillyTavern/SillyTavern/blob/release/src/endpoints/backends/chat-completions.js), and [native send/generation flow](https://github.com/SillyTavern/SillyTavern/blob/release/public/script.js). Verified against installed 1.19.0: cloned connection settings, per-request provider extras, CSRF headers, native message sending and automatic-trigger generation.

The version 1.2 implementation no longer uses the old Quick Reply generator script. The empty compatibility preset removes the old Teyvat set’s actions without changing other sets. A live request with a disposable public scene returned three valid options and zero reported reasoning tokens using the selected main connection.


## Silly Teyvat 1.3 icon refinement (25 October 2026)

- HoYoLAB, “These three icons resemble three of the Four Shades?”: https://www.hoyolab.com/article/39934829 . Viewed the published three-symbol HUD image directly. Used its large four-point Wish sparkle with two smaller offset sparkles, compass and wing silhouettes as drawing references.
- Gamepur, “All Genshin Impact Icons and Meanings”: https://www.gamepur.com/guides/all-genshin-impact-icons-and-meanings . Viewed its numbered gameplay screenshot for top-right order, visual weight, Journal, Backpack and Traveler-head Character silhouette.
- Genshin Impact Wiki, Character Menu: https://genshin-impact.fandom.com/wiki/Character/Menu . Search result identifies the white Traveler-head icon; direct page access was unavailable.

The extension uses original SVG redraws, not downloaded game icon files. Native technical integration was checked against this installed SillyTavern's `expressions/index.js`, `st-context.js` and Prome VN sprite CSS.


## Silly Teyvat 1.4 supplied assets and native APIs (25 October 2026)

The current HUD replaces the earlier SVG redraws with the user's supplied WebP files from `Downloads/Icons`, plus the separately supplied `AI Response Formatting.webp`. These include the Paimon launcher, Aether/Lumine persona icons and all nine native drawer icons. Original files are copied without image edits.

The user-installed `Library/Fonts/zh-cn.ttf` identifies itself as **HYWenHei 85W**, family HYWenHei, PostScript HYWenHei-HEW, copyright Beijing HANYI KEYIN Information Technology Co. It is copied as `assets/fonts/HYWenHei.ttf` for this fan VN setup and served locally to mobile browsers. The font and supplied icons are their respective owners' assets.

Wardrobe operations use the installed SillyTavern 1.19.0 `/api/sprites/get`, `/upload` and `/delete` endpoints, `expressionOverrides`, `expressions.custom` and native CSRF headers. Outfit folders support `Character` or `Character/Outfit`. Sprite deletion targets the precise filename stem, preserving other variants; a session-local file backup supports Undo. No core server changes are required.

Preview artwork comes from the user's original fan VN sprite packs. The wardrobe fixture and all browser regression checks use mock storage and never mutate actual sprite folders. An additional API check uploaded, removed and restored a file in an isolated temporary QA folder, then removed that QA folder. Original character sprites were untouched.

## Silly Teyvat 1.6 native staging (25 October 2026)

[Prome VN Extension source](https://github.com/Bronya-Rand/Prome-VN-Extension) and the installed 1.2.4 modules were inspected for feature behavior: automatic group staging, speaker focus, sprite scaling, shadows, speaking shake, avatar emulation, visible-member limits, persona sprites and letterboxing. Its world/character tint is excluded as requested. Prome is AGPL-3.0; Silly Teyvat's `staging.js` and `staging.css` are independently written implementations of those behaviors, not copied Prome modules, and have no Prome runtime dependency. Existing Silly Teyvat history and hide controls provide the corresponding reading features.

Group rosters and disabled members are read from the installed SillyTavern context; folder overrides use native Character Expressions settings. Persona staging uses an isolated renderer entry and does not add Prome's fake persona card to group records. Presentation snapshots preserve exact sizes, variants, placement, focus and shadows per visited page. Whole-message expression mode adds a per-response/per-swipe classification cache alongside those snapshots. Timed token-burst tests use an injected animation clock to verify the text reveal ceiling without model calls.


## Silly Teyvat 1.7 wardrobe slots and regeneration (25 October 2026)

Installed `public/scripts/st-context.js` exposes the normal `generate` helper. The installed `public/script.js` and `public/scripts/group-chats.js` were inspected: the group wrapper converts `regenerate` to `normal`, while preserving `swipe`, and supports a numeric `force_chid`. The native group-wide regenerate helper removes the final group batch. The corner control therefore saves the current reply and its metadata as a swipe, prepares the next slot and calls `generate('swipe', {force_chid})`. This excludes just the latest reply from the model context and keeps an unsent composer draft untouched. Failed or canceled empty generations restore the complete previous message. Single-character chats retain native `generate('regenerate')` behavior. Earlier replies cannot be regenerated through this button because native regeneration would otherwise remove later dialogue. Normal model and reasoning settings are preserved.

Empty wardrobe slots are settings metadata scoped to the sprite folder or character CG collection. No placeholder media files are uploaded, and blank CG entries are filtered out before runtime classification. Browser checks use in-memory upload/generation adapters and explicitly delayed image decoding to check atomic image swaps, stale loads and group sprite retention. Root overscroll locking leaves browser zoom enabled and keeps menu scrolling within its own containers. Responsive testing is a phone-size browser viewport, not physical iOS pinch-zoom testing.


## Silly Teyvat 1.8 regional backgrounds and dialogue controls (25 October 2026)

The installed `src/endpoints/backgrounds.js` and `public/scripts/backgrounds.js` were inspected to verify authenticated `POST /api/backgrounds/all`, its `{images:[{filename,isAnimated}],config}` response, and `/backgrounds/<encoded filename>` serving paths. Native library assignments reference those original files; new uploads use the existing user-file adapter. No core files or native background folders are modified.

The independent background classifier reuses the existing isolated classification transport, with its own prompt, profile, model choice and reasoning-bypass setting. Region membership is enforced after classification as well as in the offered options. Travel state lives in per-chat metadata and location snapshots in per-message/per-swipe metadata. Background layers sit below sprites and scene CGs and disappear when disabled.

The genuine native Stop element remains the generation source of truth and keeps its existing abort handler. Its position follows the measured navigation-arrow row, which also determines Regenerate dimensions. Input focus uses the outer composer border rather than an inner textarea outline. No native generation controls are replaced by proxy model calls.

## Silly Teyvat 1.9 world map and minimap (25 October 2026)

See [MAP-RESEARCH.md](MAP-RESEARCH.md) for the project comparison, map grid, scale evidence and integration decisions. [Kongying Tavern v1](https://github.com/kongying-tavern/yuan-shen-map) supplied the flat Leaflet CRS approach, adapted in `map-engine.js` with its MulanPSL-1.0 license retained. Official [Leaflet 1.9.4](https://leafletjs.com/download.html) ES module/CSS and BSD-2-Clause license are bundled locally. Teyvat.moe and genshin-overlay were protocol/architecture references, with no GPL application code copied.

Current [HoYoLAB metadata](https://sg-public-api-static.hoyolab.com/common/map_user/ys_obc/v1/map/info?map_id=2&app_sn=ys_obc&lang=en-us) pins the Teyvat grid, origin and tile version. The local N3 overview and remotely loaded detail tiles are HoYoverse artwork, credited in the map. [KeqingMains' coordinate evidence](https://library.keqingmains.com/evidence/general-mechanics/overworld) informs the default one-metre native coordinate scale; a configurable multiplier supports larger roleplay distances.

Native system-role injection, in-chat depth zero and the pre-generation event were checked against this installed SillyTavern's `public/script.js`, `public/scripts/events.js` and `st-context.js`. The map does not replace the user's system prompt or send chat content to the tile host. Regenerate now reuses the exact choice-refresh SVG path and shares its navigation-arrow baseline while tracking the visible dialogue box's right edge.

## Location encounters and starter backgrounds (1.10.0)

Native group integration follows SillyTavern’s `scripts/bookmarks.js` solo-to-group header and speaker metadata format, `scripts/group-chats.js` group update/open APIs and generation wrapper events, and authenticated `/api/groups` and `/api/chats/group/save` endpoints. The original solo chat is preserved as a separate file.

Forty image candidates, their original download URLs, lore references, coordinates and coordinate methods are recorded individually in [LOCATION-CATALOG.md](LOCATION-CATALOG.md) and the machine-readable `extension/genshin-dialogue-ui/assets/world-locations/catalog.json`. These image files have separate rights from the extension’s code. Several are community screenshots hosted on HoYoLAB; source hosting does not imply a blanket redistribution license. Replace a candidate with your own screenshot if preferred. The Silvermoon Hall candidate is a credited environment render from the linked Open3DLab project.


## Wilderness combat research (26 October 2026)

See [COMBAT.md](COMBAT.md) for official TCG references. Version 1.16.1 replaces the original reconstruction with the user-supplied textured glTF model. The folder has no creator/license document; the third-party mesh is not relicensed as MIT. [Bundled asset provenance](extension/genshin-dialogue-ui/assets/dice/README.md) and [Three.js glTF loader documentation](https://threejs.org/docs/pages/GLTFLoader.html) describe the model and local MIT-licensed runtime. [Character research](CHARACTER-RESEARCH.md) records Luna Max metadata sources and explicit unverified fields.


## Opening and enemy sprite update (26 October 2026)

Version 1.17 adds an opening-location lock before asynchronous loading, shared default encounter chances with explicit per-waypoint overrides, and deterministic action-driven enemy sprite handling. GPT-6.1 Terra High agents used the built-in imagegen skill/tool to produce 40 transparent fan-art sprites across the 20 existing enemy cards. Each attacking sprite used its own new neutral as the design reference; existing playable-character proportion guides were not used. The separate enemy sprite pack retains all prompts, per-enemy research URLs, alpha audits and file hashes. Appearance sources and fan interpretations remain distinct from canon.


## Sword toggle and native send integration (26 October 2026)

The installed SillyTavern `public/script.js` awaits `USER_MESSAGE_RENDERED` after saving and displaying the user message, before assembling the response prompt. The extension uses that awaited hook to resolve an armed attack while preserving the original words. Its suggested-reply adapter already calls native `sendMessageAsUser` before `generate`, so both paths share the same hook. No native SillyTavern source files were modified.

The installed `public/scripts/group-chats.js` can draft a speaker before the user-send hook. Lethal results temporarily disable that defeated group member and stop an already drafted generation, preventing another reply by a defeated enemy while normal cast cleanup unloads it. Nonlethal results continue into the normal response without an extra quiet generation. The sword SVG is original project code.
- Genshin Impact Wiki namecards: https://genshin-impact.fandom.com/api.php (`Namecard Background <name>.png` files), downloaded at 640 px by `tools/build-namecards.py` for the Paimon menu. Namecard artwork belongs to HoYoverse.
- Skill medallion glyphs: derived locally from the Genius Invokation skill icons already downloaded by `tools/build-battle-icons.py`, by `tools/build-skill-glyphs.py` (no extra downloads).
- Genshin Impact Wiki Paimon menu icons (`Icon Events`, `Icon Adventurer Handbook`, `Icon Character`, `Icon Map`, `Icon Photo Mode`, `Icon Community`, `Icon Photo Mode Settings`, `Icon Character Card`, `Icon Back`, `Icon Settings`), downloaded by `tools/build-menu-icons.py`. Icon artwork belongs to HoYoverse.

## World map badges and catalog 14

- Waypoint badges (`assets/icons/map-badge-*.webp`): `people` is the Genshin Impact Wiki file `Icon Dialogue Talk White.png` (the in-game dialogue glyph); `wilderness` is the HoYoLAB interactive map's Hilichurl enemy-category icon (map label 55, from the public `label/tree` endpoint); `boss` is the Genshin Impact Wiki file `Domain Keeper Icon.png`. Each was shrunk to at most 64 px. Icon artwork belongs to HoYoverse.
- Catalog 14 backgrounds: Genshin Impact Wiki API location images and HoYoLAB interactive-map viewpoint and Teleport Waypoint photos, one source per entry in [LOCATION-CATALOG.md](LOCATION-CATALOG.md). Music: wiki Soundtrack Usage for track choice; audio from the kuutar OST library, listed in `audio-library/2026-11-06/map-music.json`.
- Map art: HoYoLAB tile version `bd70cde160dbd523926208d9fa8961a1` overview tiles (see [MAP-RESEARCH.md](MAP-RESEARCH.md)).

## Loading screen

- Region emblems (`assets/regions/`) are the white `Emblem_<Region>_White` files from the [Genshin Impact Wiki API](https://genshin-impact.fandom.com/api.php), downloaded by `tools/fetch-region-emblems.py` into the external data pack. Layout and colours follow the game's loading screen, estimated visually. Element icons reuse the battle assets.

## Starter scene artworks

- Scene CGs: every character birthday artwork on the [Genshin Impact Wiki](https://genshin-impact.fandom.com/wiki/Category:Character_Birthday_Artwork) (473 files from 2020 to 2026, plus the original eight), Columbina's illustration and two anecdote wallpapers, the Maslenitsa 2023 to 2025 artworks (for Teucer and Tartaglia) and the Traveler's Memories of the Moon wallpaper. Paimon's 2023 party artwork is also a scene for Aether and Lumine. `tools/fetch-cgs.py` downloads each record's wiki file through the [API](https://genshin-impact.fandom.com/api.php) at 1600 px and saves WebP under `assets/cgs/` (external data pack); the wiki file name is recorded in `assets/cgs/catalog.json`. The artwork belongs to HoYoverse/COGNOSPHERE; the scene labels, classifications and descriptions are original project text, written after viewing each image. Characters with no birthday artwork and no suitable illustration (Illuga, Katheryne, Lohen, Odette, Prune, Sandrone, Tonia, Varka, Vesna, Alyosha and the enemy cards) have no starter scenes; their wiki images are text banners or infographics.

## Trust, gifts and new cards (31 October 2026)

- Character likes and dislikes in `character-tastes.js` come from the Favorite Food and Least Favorite Food lines on each character's `/Voice-Overs` page on the [Genshin Impact Wiki](https://genshin-impact.fandom.com/wiki/Genshin_Impact_Wiki), matched to the nearest card. Entries marked `guessed` are partly or wholly made up. The notes are paraphrased, not quoted.
- The 29 new item cards are the members of [Category:Food Cards](https://genshin-impact.fandom.com/wiki/Category:Food_Cards) and [Category:Item Cards](https://genshin-impact.fandom.com/wiki/Category:Item_Cards) that were not already in the game, without the Mystique Soup variants. `tools/build-tcg-cards.py --missing-items` downloads their art.
- Paimon's first meeting follows the [Paimon](https://genshin-impact.fandom.com/wiki/Paimon) and [Wanderer's Trail](https://genshin-impact.fandom.com/wiki/Wanderer%27s_Trail) wiki pages, which say she was fished out of the water and would have drowned. Silly Teyvat sets the rescue in a whirlpool in Starfell Lake.

## Art refresh (31 October 2026)

- 27 location images under about 1,500 px wide were replaced with larger wiki images after a visual review, recorded per location in `catalog.json`. The Komore Teahouse image is cropped to remove a development caption, and Wanmin Restaurant is cropped from Liyue Harbor concept art to leave out the Traveler and Paimon. Replaced files are kept in `silly-teyvat-data/backups/replaced-media-2026-10-31/`.
- Nothing suitable was found for Dunanna Forward Station, Maroon Basin, Underground Research Center, Place of Illusory Drawings, Barrowmoss Barrens, Tidesong Cavern or Xianyun's Liyue Harbor scene, so they are unchanged. Sretomorozsk keeps its concept art, which suits a scene better than the larger overlook.
- Burst splash art: the wiki's `Character <Name> Full Wish.png` files match the existing art at the same size, because the game's wish art has a 2048 by 1024 canvas. 71 images under 1,400 px were rebuilt from those lossless files at higher quality. Chevreuse, Chongyun and Ganyu use different art from the wiki's and were left alone. The wiki's larger `<Name> Portrait.png` files lack the Elemental Burst effects, so they were not used.

