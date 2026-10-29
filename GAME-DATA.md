# External game data

Git contains source code, JSON catalogs, provenance and tools. Images (including
character cards and sprite art), audio, fonts and model buffers live outside the
repository. Research downloads, caches and private task backups live there too.
The data pack is local and is not uploaded to GitHub.

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

## Add or update media

Create media at its usual workspace path, replacing an existing link with a new
regular file when making a revision. Run `python3 tools/game-data.py migrate` to
move new files into the pack, verify the copies, create compatibility links and
update the manifest. Existing different pack files are protected: archive the
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
