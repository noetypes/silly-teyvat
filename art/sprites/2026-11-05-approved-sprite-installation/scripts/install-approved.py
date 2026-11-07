from pathlib import Path
from collections import Counter
import hashlib
import json
import os
import shutil
import sys
import zipfile

sys.path.insert(0, '/Users/alexachan/.codex/tmp/xilonen-review-tools')
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT.parent
LIVE = Path('/Users/alexachan/Documents/ChatGPT/Test/SillyTavern/data/default-user/characters')
MESSAGE = "All accepted. Install all sprite sets into their respected folders including Fischl's new set, which should be as an alternate set to her already generated one."
TEN = 'neutral joy annoyance confusion love desire excitement sadness fear embarrassment'.split()
rows = []
sets = []


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def read(folder):
    path = BASE / folder / 'run.json'
    return path, json.loads(path.read_text())


def add(name, emotion, path, expected, manifest, destination_folder=None):
    source = Path(path)
    assert source.exists(), str(source)
    assert sha(source) == expected, str(source)
    with Image.open(source) as image:
        assert image.format == 'PNG' and 'A' in image.getbands(), str(source)
        image.load()
        dimensions = list(image.size)
    folder = destination_folder or name
    target = LIVE / folder / (emotion + '.png')
    before = sha(target) if target.exists() else None
    action = 'unchanged' if before == expected else 'replace' if before else 'add'
    rows.append({'character': name, 'emotion': emotion, 'source': str(source), 'source_manifest': str(manifest), 'sha256': expected, 'dimensions': dimensions, 'destination': str(target), 'relative_destination': str(target.relative_to(LIVE)), 'before_sha256': before, 'action': action, 'approval': {'status': 'approved', 'date': '2026-11-05', 'message': MESSAGE}})


assert not (ROOT / 'installation.json').exists()
ROOT.mkdir(exist_ok=True)
(ROOT / 'backups').mkdir(exist_ok=True)
(ROOT / 'archives').mkdir(exist_ok=True)

# Resolve the final five-character pack, including revisions made after its snapshot.
manifest, data = read('2026-11-05-five-hand-anatomy-revisions')
overrides = {
    'Zibai fear': ('2026-11-05-yunjin-zibai-expression-v004', 'Zibai fear'),
    'Yun Jin confusion': ('2026-11-05-yunjin-confusion-v005', 'Yun Jin confusion'),
}
for name in ['Xingqiu', 'Xinyan', 'Yoimiya', 'Yun Jin', 'Zibai']:
    character = data['characters'][name]
    assert character['neutral_approval']['status'] == 'approved'
    add(name, 'neutral', character['neutral']['path'], character['neutral']['sha256'], manifest)
    for emotion in TEN[1:]:
        key = name + ' ' + emotion
        source_manifest, source_data = read(overrides[key][0]) if key in overrides else (manifest, data)
        job = source_data['jobs'][key]
        add(name, emotion, job['output'], job['sha256'], source_manifest)
    sets.append({'character': name, 'folder': str(LIVE / name), 'files': 10, 'role': 'original'})

# Mizuki: approved v004 neutral, four new replacements, five unchanged expressions.
manifest, data = read('2026-11-05-mizuki-four-rejected-revisions')
name = 'Yumemizuki Mizuki'
character = data['characters'][name]
assert character['neutral_approval']['status'] == 'approved'
add(name, 'neutral', character['neutral']['path'], character['neutral']['sha256'], manifest)
for emotion in TEN[1:]:
    job = data['jobs'][name + ' ' + emotion]
    add(name, emotion, job['output'], job['sha256'], manifest)
sets.append({'character': name, 'folder': str(LIVE / name), 'files': 10, 'role': 'original'})

# Xilonen was installed previously; verify against the approved set and repair only if needed.
manifest, data = read('2026-11-05-xilonen-ten-sprites')
for record in data['sprite_manifest']:
    add('Xilonen', record['emotion'], manifest.parent / record['file'], record['sha256'], manifest)
sets.append({'character': 'Xilonen', 'folder': str(LIVE / 'Xilonen'), 'files': 10, 'role': 'original'})

# Fischl's alternate includes the later longing expression and approved white hearts.
manifest, data = read('2026-11-05-fischl-full-22')
desire_manifest, desire_data = read('2026-11-05-fischl-desire-longing-revision')
for record in data['sprite_manifest']:
    emotion = record['emotion']
    if emotion == 'desire':
        selected = desire_data['generation']
        source, expected, source_manifest = selected['candidate'], selected['candidate_sha256'], desire_manifest
    elif emotion in data['selected_revisions']:
        selected = data['selected_revisions'][emotion]
        source, expected, source_manifest = selected['path'], selected['sha256'], Path(selected['manifest'])
    else:
        source, expected, source_manifest = manifest.parent / record['file'], record['sha256'], manifest
    add('Fischl', emotion, source, expected, source_manifest, 'Fischl/Regenerated')
assert not (LIVE / 'Fischl' / 'Regenerated').exists(), 'Alternate destination already exists; inspect before replacing it.'
sets.append({'character': 'Fischl', 'folder': str(LIVE / 'Fischl' / 'Regenerated'), 'files': 22, 'role': 'alternate', 'label': 'Regenerated'})
assert len(rows) == 92
assert len({row['destination'] for row in rows}) == 92

protected = {str(p): sha(p) for p in (LIVE / 'Fischl').glob('*.png')}
assert len(protected) == 22
for name in [record['character'] for record in sets]:
    p = LIVE / name / 'Official Art' / 'neutral.png'
    if p.exists():
        protected[str(p)] = sha(p)

# Save precisely selected assets in the repository before changing live files.
for row in rows:
    staged = ROOT / 'sprites' / row['relative_destination']
    staged.parent.mkdir(parents=True, exist_ok=True)
    assert not staged.exists()
    shutil.copy2(row['source'], staged)
    assert sha(staged) == row['sha256']
    row['staged'] = str(staged)
    if row['action'] == 'replace':
        backup = ROOT / 'backups' / row['relative_destination']
        backup.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(row['destination'], backup)
        assert sha(backup) == row['before_sha256']
        row['backup'] = str(backup)

report = {'date': '2026-11-05', 'user_authorization': MESSAGE, 'status': 'prepared', 'sets': sets, 'files': rows, 'actions': dict(Counter(row['action'] for row in rows)), 'protected_before': protected, 'fischl_registration': {'label': 'Regenerated', 'folder': 'Fischl/Regenerated', 'status': 'pending_ui_registration', 'equipped_set': 'preserve existing'}}
report_path = ROOT / 'installation.json'
report_path.write_text(json.dumps(report, indent=2) + '\n')

written = []
try:
    for row in rows:
        target = Path(row['destination'])
        assert (sha(target) if target.exists() else None) == row['before_sha256'], 'Destination changed during installation: ' + str(target)
        if row['action'] != 'unchanged':
            target.parent.mkdir(parents=True, exist_ok=True)
            temporary = target.with_name('.' + target.name + '.sprite-install-tmp')
            assert not temporary.exists()
            shutil.copy2(row['staged'], temporary)
            os.replace(temporary, target)
            written.append(row)
        assert sha(target) == row['sha256']
    for path, expected in protected.items():
        assert sha(path) == expected, 'Protected file changed: ' + path
except Exception as error:
    for row in reversed(written):
        target = Path(row['destination'])
        if sha(target) != row['sha256']:
            continue
        if row['action'] == 'replace':
            shutil.copy2(row['backup'], target)
        else:
            target.unlink()
    report['status'] = 'installation_failed_written_files_rolled_back'
    report['error'] = str(error)
    report_path.write_text(json.dumps(report, indent=2) + '\n')
    raise

report['status'] = 'files_installed_and_verified_alternate_registration_pending'
report['verification'] = {'installed_files_match_selected_hashes': 92, 'original_fischl_files_unchanged': 22, 'official_art_files_unchanged': 8, 'backup_hashes_verified': sum(row['action'] == 'replace' for row in rows), 'visual_review': 'User approved artwork; technical checks only.'}
with zipfile.ZipFile(ROOT / 'archives' / 'all-installed-sprite-sets.zip', 'w', compression=zipfile.ZIP_STORED) as archive:
    for row in rows:
        archive.write(row['staged'], row['relative_destination'])
with zipfile.ZipFile(ROOT / 'archives' / 'all-installed-sprite-sets.zip') as archive:
    assert archive.testzip() is None and len(archive.namelist()) == 92
report_path.write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'status': report['status'], 'sets': len(sets), 'files': len(rows), 'actions': report['actions'], 'verification': report['verification'], 'report': str(report_path)}, indent=2))
