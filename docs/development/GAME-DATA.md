# External game data

Git contains source code, JSON catalogs, provenance and tools. Images (including
character cards and sprite art), audio, fonts and model buffers live outside the
repository. Research downloads, caches and private task backups live there too.
The developer data pack stays local. Players get the extension's media from the
[distribution repository](#publish-the-extension), and a curated export of the finished game
from the [public assets repository](https://github.com/noetypes/silly-teyvat-assets). Research,
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

To publish:

1. In a SillyTavern with the finished game data, choose **Export game data**, or run
   `node tools/export-game-data.mjs --out ../silly-teyvat-data/releases/silly-teyvat-game-data-VERSION.zip`.
   The CLI uses the same exporter against localhost, fails on missing files and excludes private settings.
   Only the Aether and Lumine personas are exported; personas made with Play as stay out.
2. Upload the ZIP unchanged to a host that allows downloads from other sites (CORS) and byte ranges.
   Use a new address for every release, for example a file named after the version. Players on
   older versions read their offsets from the old address.
3. Run `python3 tools/release-game-data.py path/to/export.zip --url https://… --version X.Y.Z`. The
   game data version is its own number (`1.77.0`, then `1.78.0`, …), never the extension's `0.NNa`
   version, because it names the hosted files. It writes
   `extension/genshin-dialogue-ui/game-data-release.json` and keeps each unchanged file's version
   from the previous release. It refuses a different file under an already-published version,
   because players who have that version would never be offered it.
4. Commit the release file, then push with the extension's release commit (the version moves only on a push to GitHub; see [AGENTS.md](../../AGENTS.md#versions-and-release-notes)) and publish the extension (above).

GitHub release downloads cannot be used directly: their download host does not send the
necessary CORS headers. Hugging Face (a dataset repository), Cloudflare R2 (with a CORS rule),
and GitHub **raw files** support browser downloads.

### Current GitHub assets hosting

Publishing also writes `configured-settings.json` beside the release manifest. It enables story
view and supplies game defaults on a new installation, strips private connection choices and
signatures, and leaves existing extension preferences untouched. Choose an included persona
for its own sprite; the developer's last active persona is never selected for the player.

The first complete public game pack is **1.77.0** (2,088,135,982 bytes). It contains 273 cards,
2,424 sprites, 928 uploaded files, 15 personas, two lorebooks, the theme and quick replies. Thirteen
of those personas were made with Play as and should not have shipped; from 0.51a the extension
installs only Aether and Lumine from it, and the next game data release leaves the others out.
Map backgrounds and other extension-owned media ship in the distribution repository.

The assets repository holds the exported ZIP in 48 MiB parts, under an immutable version tag.
The extension verifies and installs these parts one at a time on first install, keeping at most
two parts in its download cache, and can read changed
files by byte range across part boundaries on updates. No GitHub login or extra server plugin
is needed. Keep old tags and their files available: the extension downloads every release from its
own tag, so never delete or move a tag. The `main` branch holds only the current release's parts.
Once a new release is tagged, `git rm` the previous version's parts in the next assets commit, and
delete its ZIP from `silly-teyvat-data/releases/`. Each release adds about 2 GB, and the parts under
the tag can rebuild it exactly (`cat` the parts in order; the result matches `sha256` in the tag's
`release.json`). Check a release before deleting its ZIP: the v1.79.0 tag's `release.json` still
describes 1.78.0, because 1.79.0 was uploaded but never released to players.

```sh
node tools/export-game-data.mjs --out ../silly-teyvat-data/releases/silly-teyvat-game-data-1.77.0.zip --version 1.77.0
python3 tools/release-game-data.py ../silly-teyvat-data/releases/silly-teyvat-game-data-1.77.0.zip --version 1.77.0 \
  --url https://raw.githubusercontent.com/noetypes/silly-teyvat-assets/v1.77.0/silly-teyvat-game-data-1.77.0-001.part \
  --chunk-dir ../silly-teyvat-assets \
  --chunk-base-url https://raw.githubusercontent.com/noetypes/silly-teyvat-assets/v1.77.0
```

For future releases, make the extension's release commit (the version bump that goes with a push) first, replace the version in these commands,
commit/tag/push the assets, then commit the source manifest and build/push the distribution.
Verify an anonymous browser can fetch full parts and byte ranges from the tag's raw URLs.
`--chunk-mb` controls the part size. The `--url` value names the first part; `chunks` in the release
manifest describes the complete archive. Files with unchanged checksums retain their `since`
version. Published chunks are immutable: the tool refuses to overwrite different existing parts.

Exports store bundled media assignments as portable `silly-teyvat:/` paths. Import resolves them
to the actual extension folder, and also accepts old `genshin-dialogue-ui` paths. Custom uploads
and native sprite paths retain their names.

### Host on Cloudflare R2

The GitHub assets repository grows by about 2 GB with every release. R2 stores the same parts
without that history and with free downloads. The bucket stays private: a small Worker,
[`tools/r2-worker/worker.js`](../../tools/r2-worker/worker.js), serves it at a free
`workers.dev` address with the CORS headers and byte ranges the downloader needs. It serves only
`v<version>/<file>` keys, and anything else in the bucket stays private. The extension takes any
`https://` host, so switching needs no extension change: only the URLs in the release manifest
change. `node tools/tests/test-r2-worker.mjs` runs the extension's own downloader against the
Worker.

One-time setup:

1. In the Cloudflare dashboard, create the R2 bucket (Standard storage). Leave its public access
   off; the Worker reads it directly. If its name is not `silly-teyvat-data`, change
   `bucket_name` in [`tools/r2-worker/wrangler.toml`](../../tools/r2-worker/wrangler.toml).
2. Under **Workers & Pages**, choose a `workers.dev` subdomain if the account has none yet.
3. Deploy (wrangler comes from npm; it asks to sign in to Cloudflare in the browser the first time):
   ```sh
   cd tools/r2-worker && npx wrangler@4 deploy
   ```
   It prints the address, `https://silly-teyvat-data.<subdomain>.workers.dev`. The Worker's
   `name` in `wrangler.toml` is part of every release URL, so do not rename it later.
4. For uploads, create an R2 API token with **Object Read & Write** on this bucket only, then
   `brew install rclone` and `rclone config` a remote named `r2`: type `s3`, provider `Cloudflare`,
   the token's two keys, endpoint `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.

Each release (with `W` the Worker address and `X.Y.Z` the game data version), after the export:

```sh
python3 tools/release-game-data.py ../silly-teyvat-data/releases/silly-teyvat-game-data-X.Y.Z.zip --version X.Y.Z \
  --url W/vX.Y.Z/silly-teyvat-game-data-X.Y.Z-001.part \
  --chunk-dir ../silly-teyvat-data/releases/parts/vX.Y.Z \
  --chunk-base-url W/vX.Y.Z
rclone copy ../silly-teyvat-data/releases/parts/vX.Y.Z r2:silly-teyvat-data/vX.Y.Z \
  --immutable --s3-no-check-bucket
curl -sI -H 'Origin: http://localhost:8000' -H 'Range: bytes=0-99' W/vX.Y.Z/silly-teyvat-game-data-X.Y.Z-001.part
```

`--immutable` refuses to replace a part that is already uploaded. The `curl` answer must be
`206` with `Content-Range: bytes 0-99/…` and `Access-Control-Allow-Origin: *`; then run the
[public install verification](DEVELOPMENT.md#public-install-verification) before committing the
release manifest and building the distribution. Never delete an uploaded version while an
extension release that names it may still be installed. Keep the GitHub assets repository and its
tags too: players on releases that point there still download from it. After the switch, stop
adding releases to it.

The Workers free plan allows 100,000 requests a day, and one request is one part or one changed
file. R2 storage beyond the free 10 GB-months costs about $0.015 per GB-month, and downloads are
free. Each request reads R2 twice (size, then data), well within the free 10 million reads a month.

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
