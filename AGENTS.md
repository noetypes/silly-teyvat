# Working in Silly Teyvat

- Read the relevant project documentation before changing files and inspect Git status. Preserve unrelated local work.
- For character sprite artwork, read [SPRITE-GENERATION.md](docs/development/SPRITE-GENERATION.md) before making any generation request. Its user-approved reference and approval rules supersede the older prompt documents in the historical `2026-10-24/th` workspace.
- Sprite art work belongs in this repository under `art/sprites/`. Do not change extension code, character cards, lorebooks, personas, or the live SillyTavern installation as part of an artwork-only request.
- Never infer neutral approval from an earlier version, silence, elapsed time, or an agent's own assessment. Wait for the user's explicit approval of the current neutral before generating that character's expressions.

## Repository layout

- Keep the layout described in the root `README.md`: the extension in `extension/genshin-dialogue-ui/`, SillyTavern content in `content/`, artwork runs in `art/`, scripts in `tools/` with checks in `tools/tests/`, and documentation in `docs/` (`guides/`, `development/`, `research/`, plus review and release records). Only `README.md`, `LICENSE`, `AGENTS.md`, `.gitignore` and `game-data.json` belong at the top level.
- Every file inside `extension/genshin-dialogue-ui/` ships to players, except the CSS design layers listed in `tools/build-css.py`, which `style.css` already contains. Keep documentation in `docs/` and artwork provenance in `art/`, not in the extension folder, apart from its player `README.md`.
- Media lives in the data pack, at the same relative path as in the repository. Moving a media file means moving it in the pack too, renaming its `game-data.json` entry and running `python3 tools/game-data.py link` and `check`.

## Personas

- Only two personas ship with the game: Aether (`teyvat-persona-aether.png`) and Lumine (`teyvat-persona-lumine.png`), listed in `extension/genshin-dialogue-ui/bundled-personas.js`. Never bundle any other persona in game data, first-run settings (`configured-settings.json`), exports or releases.
- Every other persona belongs to the player who made it. They are created when someone chooses **Play as {{char}}** in Character Customization. Personas in the developer's own SillyTavern are test data, not game content.

## Versions and release notes

- Silly Teyvat is in public alpha. The extension version in `extension/genshin-dialogue-ui/manifest.json` has the form `0.NNa`: `0.50a` was the first public version, followed by `0.51a`, `0.52a`, `0.53a` and so on.
- Do not bump the version until a push to GitHub. Local commits keep the current version in `manifest.json`, however many of them change the extension; give them a plain descriptive message with no version number.
- When pushing to GitHub, and only if the commits being pushed change the extension (anything under `extension/genshin-dialogue-ui/` that players receive), first make one release commit that moves `manifest.json` to the next number. One push is one step, however many commits it carries or however small the change. There are no patch numbers (`0.51.1`), no skipped numbers, and no reused numbers. A push that only changes documentation, tools, art runs or the data pack keeps the current version.
- Name that release commit `Silly Teyvat 0.NNa: <short title>` and put the release notes in its message body, covering every extension change since the last push. Do not add version sections or a changelog to either `README.md`. The READMEs are feature overviews: update them only when what players can do or see changes.
- Ask the user before going past `0.99a`, dropping the `a`, or changing the scheme in any other way.
- The game-data release version in `game-data-release.json` (for example `1.77.0`) is separate. It names the hosted download files, so never rename it to match the extension version.
