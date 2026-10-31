#!/usr/bin/env python3
"""Install this user-approved artwork pack into the live SillyTavern character folders."""

import datetime
import hashlib
import json
import os
import shutil
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parent
LIVE = Path('/Users/alexachan/Documents/ChatGPT/Test/SillyTavern/data/default-user/characters')
BACKUPS = LIVE.parent / 'backups'
CHARACTERS = ('Amber', 'Barbara', 'Columbina')
APPROVAL = 'All approved, put the in.'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


run_path = ROOT / 'run.json'
run = json.loads(run_path.read_text())
manifest = json.loads((ROOT / 'manifest.json').read_text())
assert run['status'] == 'generated_pending_user_visual_review'
assert tuple(manifest['characters']) == CHARACTERS
changes = []
for character in CHARACTERS:
    directory = LIVE / character
    assert directory.is_dir() and not directory.is_symlink()
    assert len(manifest['characters'][character]) == 22
    for emotion, item in manifest['characters'][character].items():
        source = ROOT / item['path']
        assert source.is_file() and sha(source) == item['sha256']
        destination = directory / f'{emotion}.png'
        assert not destination.is_symlink()
        before = sha(destination) if destination.exists() else None
        action = 'already_installed' if before == item['sha256'] else ('replace' if before else 'add')
        changes.append({
            'character': character,
            'emotion': emotion,
            'source': str(source),
            'source_sha256': item['sha256'],
            'destination': str(destination),
            'previous_sha256': before,
            'action': action,
        })

backup_root = None
if any(item['action'] == 'replace' for item in changes):
    stamp = datetime.datetime.now().strftime('%Y-%m-%d-%H%M%S')
    backup_root = BACKUPS / f'silly-teyvat-amber-barbara-columbina-sheets-{stamp}'
    assert not backup_root.exists()
    for item in changes:
        if item['action'] != 'replace':
            continue
        destination = Path(item['destination'])
        backup = backup_root / item['character'] / destination.name
        backup.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(destination, backup)
        assert sha(backup) == item['previous_sha256']
        item['backup'] = str(backup)

for item in changes:
    if item['action'] == 'already_installed':
        continue
    destination = Path(item['destination'])
    fd, temp = tempfile.mkstemp(prefix=f'.{destination.stem}-', suffix='.png', dir=destination.parent)
    os.close(fd)
    try:
        shutil.copy2(item['source'], temp)
        assert sha(Path(temp)) == item['source_sha256']
        os.replace(temp, destination)
    finally:
        if os.path.exists(temp):
            os.unlink(temp)

for item in changes:
    assert sha(Path(item['destination'])) == item['source_sha256']

report = {
    'approval_message': APPROVAL,
    'installed_at_local': datetime.datetime.now().astimezone().isoformat(),
    'source_run': str(run_path),
    'live_root': str(LIVE),
    'backup_root': str(backup_root) if backup_root else None,
    'counts': {action: sum(item['action'] == action for item in changes)
               for action in ('already_installed', 'add', 'replace')},
    'files': changes,
}
(ROOT / 'installation.json').write_text(json.dumps(report, indent=2) + '\n')
run['approval'] = {'status': 'approved', 'message': APPROVAL}
run['status'] = 'approved_and_installed'
run['installation'] = {'report': str(ROOT / 'installation.json'), 'counts': report['counts']}
run_path.write_text(json.dumps(run, indent=2) + '\n')
print(json.dumps(report['counts']))
