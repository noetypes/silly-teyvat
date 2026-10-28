# Game audio assignments

The reviewed Japanese sprite voice and waypoint music catalog is in `audio-library/2026-10-28/assignments.json`. It records each source, duration, SHA-256, destination filename, sprite assignment and waypoint playlist. Media binaries and private settings backups are kept outside version control. The user-facing report and CSVs are in the task's `outputs/audio-assignments-2026-10-28/` folder.

The catalog assigns 616 short Japanese clips to 871 sprites across 121 characters, and 166 music tracks to 117 waypoint playlists. Each Wilderness waypoint receives its region's combat track. Official Art, Traveler Persona and alternate outfit folders are included. Unsupported NPC, enemy and OC sprites remain unassigned; Paimon's fear, disappointment, grief and sadness also lack a fitting brief recording in the available wiki files.

Voice clips are at most six seconds (the current maximum is 5.604 seconds). Favor movement sounds, brief reactions, skill/burst phrases and compact remarks. Read the Japanese transcript before matching a voiced line to an emotion. Keep each character's actor, use sincere/comfortable reactions for affection, and avoid forcing cheerful recordings onto sorrowful expressions. Reuse appropriate recordings across variants. The import must use the exact `folder/filename.ext` sprite key used by `spriteAudioKey` in `media-store.js`.

Music research distinguishes specific venue themes from containing-area ambience. The catalog marks custom meeting/scenery pins and area fallbacks. Do not mistake the first row of a region soundtrack table for ambient music throughout that region: those tables also contain city interiors, event music, boss cues and conditional tracks. Night Kingdom Causeway is a custom surface-access marker, so its selected ambience belongs to the Basin of Unnumbered Flames. Its pin is not an exact Night Kingdom music boundary. Do not apply Glupov's Fatui HQ music to Druzhna HQ.

## Reapplying the catalog

The importer defaults to a dry run. Point it at the downloaded media root and the intended SillyTavern user directory:

```sh
python3 tools/install-game-audio.py audio-library/2026-10-28/assignments.json \
  --media-root /path/to/audio-assignments-2026-10-28 \
  --user-dir /path/to/SillyTavern/data/default-user
```

Add `--apply --backup-dir work/audio-settings-backups` to install. All media hashes and sprite paths are validated first. It copies files to the existing `user/files` store, merges onto the latest settings, backs up settings privately and changes only audio-related fields. Existing unrelated uploads/settings, volume, cards, sprites and combat code are preserved. Changed/removed waypoints and hash mismatches stop the import for review. Reapplying the same catalog is idempotent.

Refresh the open SillyTavern client immediately after installation so its in-memory settings match the saved data. Review voices in **Characters → Sprite audio** and playlists in **Map → Music library / waypoint → Choose music**. The runtime still handles exploration shuffle and combat pause/resume through `location-music.js`; there are no combat-rule changes in this data import.

Run `python3 tools/test-game-audio-import.py` to verify the importer. Source/container checks and live HTTP/playback checks are recorded with the task deliverables.
