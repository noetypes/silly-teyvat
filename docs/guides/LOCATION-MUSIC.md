# Location music

Open the world map and use **Music library** in its region/waypoint panel. Upload one or more audio files, give each a label, and use Preview to audition it. MP3, WAV, M4A, OGG, WebM, AAC and FLAC use the existing authenticated SillyTavern upload endpoint, with a 50 MB per-file limit. Codec support depends on the browser. Music has an independent enable toggle and volume; character voices, CG audio and battle sound effects keep their existing settings.

Select a waypoint, choose **Choose music**, check its exploration songs, then save. One song repeats; multiple songs play in shuffled cycles without an immediate repeat at a cycle boundary. Cancelling leaves the previous assignment intact. Opening a waypoint's settings does not travel there or replace the active location's music. Music follows the live travel location, including Teleport and region changes, rather than a historical scene being read.

Every waypoint, town or wilderness, can have one **Battle track**. It is excluded from exploration, loops during a fight there and stops when the fight ends or the party leaves. Exploration pauses during the fight and resumes its current song at the prior position afterward. A fight is any hostile encounter, a round on the battle board, or a duel: choosing to battle a friendly character starts the music at once and it plays until you win, flee, or send a message with Attack off. While your persona is an enemy the roles are reversed: friendly enemies start nothing and the characters around you do. A waypoint with no battle track just keeps its exploration music. A failed track is skipped or falls back to available exploration music; an all-failed list remains silent instead of retrying continuously.

Waypoints that have none get their region's open-world combat theme (`battle-music-defaults.js`, applied once by starter catalog version 20). Boss arenas keep the boss's own theme where the game gives one; the wiki lists none for the other open-world bosses, which use their region's combat music.

The library is shared across waypoints. Relabelling keeps assignments intact. Removing a library entry unlinks it from playlists and combat assignments while preserving the physical upload. An audio preview temporarily pauses location music and resumes it when the preview ends or closes. If autoplay is blocked, use **Enable audio** in Music library; blocked playback is not retried on every UI refresh.

## Stored data

- `extensionSettings.genshin_dialogue_ui.musicLibrary`: `{id, label, name, path}` entries, referencing same-origin files.
- `locationMusicEnabled` and `locationMusicVolume`: independent BGM preferences.
- `backgroundRegions[].locations[].music`: `{tracks: [library IDs], combatTrack: ID | null, formTracks?: {form name: ID}}`. A form track replaces the combat track while an enemy in the current encounter is in that form: La Signora's arena plays Chrysalis Suspirii, then Saltatio Favillae once she is the Crimson Witch of Embers. The switch happens as the battle board shows the transformation; afterwards the saved encounter keeps it. Saving the waypoint playlist keeps form tracks; removing a track from the library unlinks it. Sources: `docs/research/music/2026-11-07/boss-music.json`.

Music never alters combat rules, dice, HP or prompts. `index.js` supplies the existing combat controller's busy state and eligible live enemies. The separate player owns exploration, combat and preview channels and clears them on a chat/location change or disposal. No third-party streaming service or additional model request is involved.

## Verification

- `node tools/tests/test-location-music.mjs`: player/assignment checks for shuffle, combat resume, preview isolation, stale events, failures, autoplay, volume and library edits.
- `preview-music-tests.html`: disposable browser integration tests for upload, labelling, map entry points, playlist saves/cancellation, Wilderness gating, playback transitions, failed uploads, stale waypoint edits and cleanup.
- `preview-music.html`: disposable UI preview with sample labels and a silent fake audio adapter; no live data is changed.

Styles are in `location-music.css`, appended by `tools/build-css.py`. Raw uploaded files and extension settings must travel together when moving servers.
