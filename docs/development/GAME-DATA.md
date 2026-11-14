# External game data

Git contains source code, JSON catalogs, provenance and tools. Images (including
character cards and sprite art), audio, fonts and model buffers live outside the
repository. Research downloads, caches and private task backups live there too.
The developer data pack stays local. Players get the extension's media from the
[distribution repository](#publish-the-extension), and a curated export of the finished game
from a [Cloudflare R2 bucket](#host-on-cloudflare-r2). Research,
backups and the art workspace are never uploaded.

The default layout is:

```text
Codex/
  silly-teyvat/                  # source repository
  silly-teyvat-data/             # separate data pack; back this up separately
    extension/genshin-dialogue-ui/...
    art/sprites/...
    content/character-cards/...
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
   referenced uploads, lorebooks, the Aether and Lumine personas, tags, the Teyvat Slate theme and Teyvat Choices. The
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
source files plus real copies of the extension's media from the pack (about 780 MB, most of it TCG
card animations, location backgrounds and birthday CGs). The CSS design layers stay out, since
`style.css` already contains them. It never
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

Either way it first checks the player's server. A first install skips files that are already there
and reads only the export's manifest when every file is. An update skips a changed file whose local
copy already matches the release's checksum, and when nothing is left it records the release and
says **Already have it**. A first install that still needs more than 60% of the export downloads the
whole ZIP; anything smaller is read by byte range. The popup counts files and tallies those added,
already present and failed.

**Not now** is remembered for that release. **Check for game data** in Share always asks. Every
file is checked against the release before it is installed. A development copy without a release file never asks. Published source checkouts include
the manifest for reproducibility; the player install remains the distribution repository.

To publish (with `X.Y.Z` the game data version, its own number such as `1.85.0`, never the
extension's `0.NNa`, because it names the hosted files):

1. In a SillyTavern with the finished game data, run
   `node tools/export-game-data.mjs --out ../silly-teyvat-data/releases/silly-teyvat-game-data-X.Y.Z.zip --version X.Y.Z`
   (or choose **Export game data**). The CLI uses the same exporter against localhost, fails on
   missing files and excludes private settings. Only the Aether and Lumine personas are exported;
   personas made with Play as stay out.
2. Write the release manifest and the download parts this release adds, then upload them to R2
   ([below](#host-on-cloudflare-r2)):
   ```sh
   python3 tools/release-game-data.py ../silly-teyvat-data/releases/silly-teyvat-game-data-X.Y.Z.zip --version X.Y.Z \
     --chunk-dir ../silly-teyvat-data/releases/parts/vX.Y.Z \
     --chunk-base-url https://silly-teyvat-data.noetypes.workers.dev/vX.Y.Z
   python3 tools/upload-r2-parts.py extension/genshin-dialogue-ui/game-data-release.json \
     --chunk-dir ../silly-teyvat-data/releases/parts/vX.Y.Z
   ```
   `release-game-data.py` writes `extension/genshin-dialogue-ui/game-data-release.json` and
   `configured-settings.json`, keeps each unchanged file's `since` version, and refuses a different
   file under an already-published version, because players who have that version would never be
   offered it.
3. Run the [public install verification](DEVELOPMENT.md#public-install-verification).
4. Commit the release file, then push with the extension's release commit (the version moves only
   on a push to GitHub; see [AGENTS.md](../../AGENTS.md#versions-and-release-notes)) and publish
   the extension (above).

Without `--chunk-dir`, `--url` names one uploaded copy of the whole ZIP instead, for a host that
allows downloads from other sites (CORS) and byte ranges. GitHub release downloads cannot be used
for that: their download host does not send CORS headers.

Publishing also writes `configured-settings.json` beside the release manifest. It enables story
view and supplies game defaults on a new installation, strips private connection choices and
signatures, and leaves existing extension preferences untouched. Choose an included persona
for its own sprite; the developer's last active persona is never selected for the player.

Exports store bundled media assignments as portable `silly-teyvat:/` paths. Import resolves them
to the actual extension folder, and also accepts old `genshin-dialogue-ui` paths. Custom uploads
and native sprite paths retain their names.

### Host on Cloudflare R2

From 1.85.0, game data is hosted in the private R2 bucket `sillyteyvat`. A small Worker,
[`tools/r2-worker/worker.js`](../../tools/r2-worker/worker.js), serves it at
`https://silly-teyvat-data.noetypes.workers.dev` with the CORS headers and byte ranges the
downloader needs. It serves only `v<version>/<file>` keys; anything else in the bucket stays
private. `node tools/tests/test-r2-worker.mjs` runs the extension's own downloader against it.

**Only new files are uploaded.** The download parts hold file contents back to back, without the
ZIP around them, and the release manifest gives every file's offset and checksum; the extension
reads files only that way (`chunkedArchive` on a first install, `rangedArchive` on an update, and
offsets in `downloadRelease` too). When a release builds on a previous release whose parts are on
the same host, a file whose contents those parts already hold points there, and only new and
changed files go into the release's own `vX.Y.Z/` parts; identical files within an export are
stored once. A release with nothing new adds no parts. Every release's manifest therefore lists
the parts of all earlier releases it still uses, and `upload-r2-parts.py` checks those against the
bucket instead of uploading them. `node tools/tests/test-incremental-release.mjs` installs and
updates across old and new parts.

A changed or removed file leaves its old bytes in an earlier part, where a first install still
downloads them with the rest of that part. `release-game-data.py` reports how much of the hosted
bytes that is and suggests `--repack` once it passes a third: the next release then stores every
file once in new parts. After a repack, the older parts are needed only by players who have not
updated; delete them from the bucket (Cloudflare dashboard, R2, the `v…` folders) once the
testers have.

One-time setup (done 14 November 2026):

1. In the Cloudflare dashboard, create the R2 bucket (Standard storage). Leave its public access
   off and its CORS policy empty: the Worker reads the bucket directly and adds the CORS headers
   itself. If the bucket's name changes, change `bucket_name` in
   [`tools/r2-worker/wrangler.toml`](../../tools/r2-worker/wrangler.toml).
2. Under **Workers & Pages**, choose a `workers.dev` subdomain if the account has none yet.
3. Deploy (wrangler comes from npm; it asks to sign in to Cloudflare in the browser the first time):
   ```sh
   cd tools/r2-worker && npx wrangler@4 deploy
   ```
   A first deploy can fail right after the upload with "This Worker does not exist on your
   account" [code 10007]; run it again. The Worker's `name` in `wrangler.toml` is part of every
   release URL, so do not rename it. Redeploy the same way after changing `worker.js`.

Uploads use the same wrangler sign-in; no API token or other tool is needed.
[`tools/upload-r2-parts.py`](../../tools/upload-r2-parts.py) checks each new part against the
release manifest, uploads only what the bucket lacks (an interrupted upload resumes), refuses to
replace a part that is already there with different contents, then checks every part through the
Worker and a cross-site byte range on the first. `--dry-run` reports what it would upload. Keep the
current release's ZIP in `silly-teyvat-data/releases/` (it can rebuild a fresh set with
`--repack`); the uploaded parts folder can go once the release is live. Never delete an uploaded
part while an extension release that names it may still be installed.

The Workers free plan allows 100,000 requests a day, and one request is one part or one changed
file. R2 storage beyond the free 10 GB-months costs about $0.015 per GB-month, and downloads are
free. Each request reads R2 twice (size, then data), well within the free 10 million reads a month.

### Earlier hosting on GitHub (1.77.0 to 1.84.0)

Releases 1.77.0 to 1.84.0 were the whole export ZIP cut into 48 MiB parts in the
`noetypes/silly-teyvat-assets` repository, each under an immutable version tag that extension
releases up to 0.65a download from. Every release added about 2 GB to that repository's history.
The v1.79.0 tag's `release.json` still describes 1.78.0, because 1.79.0 was uploaded but never
released to players.

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

## Shrink location backgrounds

A new 1920×1080 background arrives near-lossless (about 2 MB). `tools/recompress-backgrounds.py --archive DIR`
(Pillow with WebP on `PYTHONPATH`) re-encodes the WebP and JPEG ones in the pack at quality 90, higher for
detailed pictures, keeping names, formats and pixel sizes. It copies each original into `DIR` first (keep it
under `silly-teyvat-data/backups/`), replaces the file atomically and updates `game-data.json`. Use `--dry-run`
to see sizes and PSNR first. PNG files are skipped because renaming one would break saved scenes.

## History and recovery

The initial migration removes media and `work/` from all published Git history,
retaining source history. Original commit IDs change. The original `.git` and
uncommitted patch are saved under
`silly-teyvat-data/backups/pre-migration-2026-10-29/`. Keep this local recovery
copy separate from the published repository. It intentionally retains the old
large objects and does not count toward clone size.
