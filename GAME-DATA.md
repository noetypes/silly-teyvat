# External game data

Git contains source code, JSON catalogs, provenance and tools. Images (including
character cards and sprite art), audio, fonts and model buffers live outside the
repository. Research downloads, caches and private task backups live there too.
The data pack is local and is not uploaded to GitHub. Only the extension's own media goes out,
inside the [distribution repository](#publish-the-extension).

The default layout is:

```text
Codex/
  silly-teyvat/                  # source repository
  silly-teyvat-data/             # separate data pack; back this up separately
    extension/genshin-dialogue-ui/...
    art/sprites/...
    character-cards/...
    work/                       # archived research workspace
    backups/                    # original Git history and migration recovery data
```

Set `SILLY_TEYVAT_DATA=/absolute/path/to/silly-teyvat-data` for another location,
or pass `--data-root /absolute/path` to the tools. Preserve the pack's relative
paths when copying it. The pack must be available on the SillyTavern server;
phones and other browsers do not need their own copy.

## Set up a checkout

Obtain the data pack separately, place it beside the clone (or set the environment
variable), then run:

```sh
python3 tools/game-data.py link
python3 tools/game-data.py check
bash tools/sync-live.sh
bash tools/sync-live.sh --check
```

`game-data.json` records every shipped media path, byte count and SHA-256. Link
and install validate the entire pack first, fail on missing or modified files,
and refuse to overwrite different local media. Workspace media and installed
extension media are ignored absolute symbolic links to the external pack.
Changing the pack's location requires rerunning `link` and `sync-live.sh`.
The tools require Python 3.11 or later and a filesystem with symbolic links.

Installation copies source files and creates media links in the live extension.
SillyTavern serves them through the original authenticated, same-origin extension
URLs: JavaScript, CSS, JSON catalogs, glTF texture references and saved scenes
need no URL changes. Keep the pack available while the server is running.
Native character folders, user uploads, chats and settings remain in SillyTavern's
own data directory. A plain source-only clone or ZIP is insufficient to run the
extension without the separate pack.

## Share with testers

The **Share** tab in the extension settings makes two ZIP files. Testers need both.

1. **Export extension** contains the installed extension, its media and your settings. The tester
   unzips it into `data/default-user/extensions/`, keeping the `genshin-dialogue-ui` folder name,
   and reloads SillyTavern. A first run takes on the packaged settings; an existing install keeps
   its own.
2. **Export game data** contains the game's character cards and settings, sprite sets, scenes,
   referenced uploads, lorebooks, personas, tags, the Teyvat Slate theme and Teyvat Choices. The
   tester chooses **Import game data** and reloads when it finishes. Import adds whatever is new
   and keeps the rest unless told to replace it.

Chats, saved journeys, API keys, connection profiles, the namecard signature and cards unrelated to
the game are left out. Files stay uncompressed, up to the 4 GB ZIP limit. Large downloads need a
normal browser window; private windows can fail silently.

Sets, scenes and audio are discovered from the whole of the settings, so anything added in
Character Customization exports automatically. A browser cannot list folders, so a sprite folder
copied in by hand must be registered as a set. `tools/sync-live.sh` warns about any that are not.

## Publish the extension

Players install from a separate distribution repository. SillyTavern installs an extension by
cloning a repository with `manifest.json` at its root, so this one holds the installed extension:
source files plus real copies of the extension's media from the pack (about 290 MB). It never
holds the art workspace, character cards or other game data. SillyTavern names the installed
folder after the repository, and the extension works under any folder name.

```sh
python3 tools/build-dist.py --commit     # builds ../silly-teyvat-dist and commits "Silly Teyvat <version>"
git -C ../silly-teyvat-dist push
```

Run it after committing a release here, including any new `game-data-release.json` (below). It
validates the extension's media against `game-data.json`, copies only what changed and removes
files that left the extension. Pass `--out` for another location. Every push is an update that
SillyTavern offers to players.

## Publish game data with a release

A player who installs or updates the extension is offered the matching game data. Each version
can carry `game-data-release.json`, which names the hosted **Export game data** ZIP, its size and
the version in which each file last changed. On load, Silly Teyvat compares it with the version
recorded in the player's settings:

- **No game data recorded:** it asks to download the whole ZIP and shows its size. Anything the
  player already has is kept.
- **An older version recorded:** it asks to download only what changed, with that size. It reads
  those files from the hosted ZIP by byte range, or downloads the whole ZIP if the host refuses
  ranges. Changed cards, sprites, files, lorebooks, the theme and quick replies replace the
  player's copies. Everything else, including their own preferences, is kept.

**Not now** is remembered for that release. **Check for game data** in Share always asks. Every
file is checked against the release before it is installed. A source checkout has no release
file, so it never asks.

To publish:

1. In a SillyTavern with the finished game data, choose **Export game data**.
2. Upload the ZIP unchanged to a host that allows downloads from other sites (CORS) and byte ranges.
   Use a new address for every release, for example a file named after the version. Players on
   older versions read their offsets from the old address.
3. Run `python3 tools/release-game-data.py path/to/export.zip --url https://…`. It writes
   `extension/genshin-dialogue-ui/game-data-release.json` and keeps each unchanged file's version
   from the previous release. It refuses a different file under an already-published version,
   because players who have that version would never be offered it.
4. Commit the release file with the extension version bump, then publish the extension (above).

GitHub release downloads cannot be used: they send no CORS headers, so a browser cannot fetch
them. Hugging Face (a dataset repository) and Cloudflare R2 (with a CORS rule) both work.

## Add or update media

Create media at its usual workspace path, replacing an existing link with a new
regular file when making a revision. Run `python3 tools/game-data.py migrate` to
move new files into the pack, verify the copies, create compatibility links and
update the manifest. A bare `migrate` takes every media file in the repository, sprite
runs under `art/sprites/` that are still work in progress included. Preview it with
`--dry-run`, or name what to move with `--only PATH` (repeatable, for example
`--only extension/genshin-dialogue-ui/assets`). If it stops part way, what it already moved
stays recorded in the manifest. Existing different pack files are protected: archive the
old version outside the repository before replacing it. Commit the resulting
manifest/catalog/source changes. Keep media binaries out of Git.

The archived `work/` and artwork `installations/` directories are ignored
compatibility links. They are not part
of the distributable pack manifest and may contain private settings or research
downloads. Do not publish it or the `backups/` directory.

## History and recovery

The initial migration removes media and `work/` from all published Git history,
retaining source history. Original commit IDs change. The original `.git` and
uncommitted patch are saved under
`silly-teyvat-data/backups/pre-migration-2026-10-29/`. Keep this local recovery
copy separate from the published repository. It intentionally retains the old
large objects and does not count toward clone size.
