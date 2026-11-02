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

## Interface sounds

The Genshin Impact Wiki does not host the game's menu sounds, so `extension/genshin-dialogue-ui/assets/ui-sound/` holds clips from the user's own unpacked `GenshinAudio-master` sound banks. Those clips have no names. The first six were identified by correlating their waveforms with a screen recording of the game's menus. The rest were picked by the user from a review folder of candidates that sounded alike. Every clip is used as it comes from the bank, with no editing.

| File | Source | Where it plays | How it was found |
| --- | --- | --- | --- |
| `screen` | `Banks/Banks10/Banks10_97` | opening menus, unless listed below | the character screen opening in the recording |
| `section-artifact` | `Banks/Banks8/Banks8_384` | opening the inventory and changing its tabs | Artifacts in the recording |
| `section-constellation` | `Banks/Banks30/Banks30_393` | every Character Customization section, at 70% | Constellation in the recording |
| `section-profile` | `Banks/Banks16/Banks16_873` | choosing a character; opening the namecard panel at 40% | Profile in the recording |
| `map` | `Banks/Banks0/Banks0_171` | opening the map and the Paimon menu | the Paimon menu opening in the recording |
| `press` | `Banks/Banks4/Banks4_626` | ordinary buttons | pressing Character in the recording |
| `drawer` | `Minimum/Minimum_18` | SillyTavern's settings buttons, from the top bar or the Paimon menu | pressing Character in the recording |
| `close` | `Banks/Banks22/Banks22_325` | closing menus and drawers; switching a toggle off | the user's pick |
| `toggle-on` | `Banks/Banks22/Banks22_629` | switching a toggle on | the user's pick |
| `choice` | `Minimum/Minimum_16` | dialogue choices | the user's pick |
| `use` | `Banks/Banks2/Banks2_26` | using an item | the user's pick |
| `trust-up` | `Minimum/Minimum_2` | a character's trust rising | the user's pick |
| `waypoint` | `Banks/Banks21/Banks21_1041` | choosing a waypoint, from the map or its list | the user's pick |
| `teleport` | `Banks/Banks12/Banks12_728` | the teleport wash | the user's pick |

`ui-sound.js` plays them. Sending a message, trust falling, the region banner, the Teleport button itself, hovering and moving through dialogue text are deliberately silent. The user rejected sounds shaped from grains of the clips, and clean synthesised bells before them, as too far from the game. The user also rejected `Banks0_707` as a hover sound and `Banks31_639` as a press, character switch, waypoint and teleport sound.

`Banks21_665` matched Weapons and is unused. Do not use `Banks10_620` or `Banks15_253`: both contain speech after a short opening, which a match on the opening alone cannot see. Check a candidate's whole length for speech before adding it. The bank paths are relative to `GeneratedSoundBanks/Game/`, and the files are in the data pack with the other media.
