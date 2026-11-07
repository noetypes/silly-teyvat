"""Install the 18 approved TCG enemy neutrals and La Signora's Crimson Witch of Embers sprite.

Each sprite goes to SillyTavern's sanitized character folder (the card file name, colons removed).
A name with a colon also gets a relative directory alias under its display name, because the
sprite API returns the unsanitized name in image URLs (see 2026-11-06-nobushi-visibility-fix).
crimson_witch.png is not an expression label: only Silly Teyvat's form change asks for it.
"""
import hashlib, json, os, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
CHARS = Path(os.environ.get('ST_CHARACTERS', '/Users/alexachan/Documents/ChatGPT/Test/SillyTavern/data/default-user/characters'))
HERE = Path(__file__).resolve().parents[1]
approved = json.loads((ROOT / 'art/sprites/2026-11-07-signora-crimson-witch/approved-enemies.json').read_text())
CRIMSON = ROOT / 'art/sprites/2026-11-07-signora-crimson-witch-face-perspective/candidates/La Signora/neutral-v003.png'
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()

jobs = [(c['name'], Path(c['candidate']), 'neutral.png', c['candidate_sha256']) for c in approved['characters']]
jobs.append(('La Signora', CRIMSON, 'crimson_witch.png', sha(CRIMSON)))
records, aliases = [], []
for name, source, filename, expected in jobs:
    if sha(source) != expected: sys.exit(f'{source} does not match its approved hash')
    folder = CHARS / name.replace(':', '')
    if not (CHARS / f'{folder.name}.png').exists(): sys.exit(f'No character card for {name}')
    folder.mkdir(exist_ok=True)
    dest = folder / filename
    before = sha(dest) if dest.exists() else None
    shutil.copyfile(source, dest)
    records.append({'character': name, 'file': filename, 'source': str(source), 'sha256': expected, 'destination': str(dest), 'before_sha256': before, 'action': 'replace' if before else 'add'})
    if ':' in name:
        alias = CHARS / name
        if not alias.exists(): alias.symlink_to(folder.name, target_is_directory=True)
        if alias.is_symlink() and os.readlink(alias) == folder.name and {'alias': str(alias), 'target': folder.name} not in aliases: aliases.append({'alias': str(alias), 'target': folder.name})
(HERE / 'installation.json').write_text(json.dumps({'date': '2026-11-07', 'user_request': '18 sprites were generated for the new TCG enemies, plus an extra for Signora\'s Crimson Witch of Embers form ... she should be using the sprite corresponding with the Crimson Witch of Embers form - unlike other characters, this should be the only way that sprite can be used as opposed to classification.', 'neutral_approval': approved['approving_message'], 'crimson_witch_candidate': 'neutral-v003 (latest revision, after the user\'s face-perspective note on v002)', 'files': records, 'aliases': aliases}, indent=2) + '\n')
print(len(records), 'files,', len(aliases), 'aliases')
