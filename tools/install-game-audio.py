#!/usr/bin/env python3
"""Import reviewed audio into SillyTavern's user-file store and existing audio settings.

Dry run by default. This changes data only; it never installs extension/combat code.
"""
import argparse
from copy import deepcopy
from datetime import datetime, timezone
from hashlib import sha256
import json
import os
from pathlib import Path
import tempfile


def merge_settings(settings, plan):
    result = deepcopy(settings)
    prefs = result.setdefault('extension_settings', {}).setdefault('genshin_dialogue_ui', {})
    library = prefs.setdefault('musicLibrary', [])
    existing = {track['id']: track for track in library}
    for track in plan['musicLibrary']:
        old = existing.get(track['id'])
        if old and old['path'] != track['path']:
            raise ValueError('Music ID already belongs to another upload: ' + track['id'])
        if old is None:
            library.append(deepcopy(track))
            existing[track['id']] = track
    locations = {}
    for region in prefs.get('backgroundRegions', []):
        for location in region.get('locations', []):
            if location['id'] in locations:
                raise ValueError('Duplicate live waypoint ID: ' + location['id'])
            locations[location['id']] = (region['name'], location)
    for row in plan['waypoints']:
        if row['id'] not in locations:
            raise ValueError('Waypoint no longer exists: ' + row['id'])
        region, location = locations[row['id']]
        if region != row['region']:
            raise ValueError('Waypoint changed region; review its music again: ' + row['id'])
        ids = row['tracks'] + [row['combatTrack']]
        if not row['tracks'] or any(track not in existing for track in ids):
            raise ValueError('Waypoint references an unavailable music file: ' + row['id'])
        if row['combatTrack'] in row['tracks']:
            raise ValueError('Combat track is present in exploration: ' + row['id'])
        location['music'] = {
            'tracks': list(dict.fromkeys(row['tracks'])),
            'combatTrack': row['combatTrack'] if location.get('wilderness') else None,
        }
    audio = prefs.setdefault('spriteAudioFiles', {})
    for row in plan['sprites']:
        if not row['clips']:
            raise ValueError('Empty sprite audio assignment: ' + row['key'])
        audio[row['key']] = deepcopy(row['clips'])
    prefs['spriteAudio'] = True
    prefs['locationMusicEnabled'] = True
    prefs['gameAudioPack'] = {'id': plan['id'], 'sprites': len(plan['sprites']), 'waypoints': len(plan['waypoints'])}
    return result


def validate_files(plan, media_root, user_root):
    media_root = media_root.resolve()
    targets = set()
    for entry in plan['files']:
        source = (media_root / entry['file']).resolve()
        source.relative_to(media_root)
        target = entry['target']
        if Path(target).name != target or target in targets:
            raise ValueError('Unsafe or duplicate upload filename: ' + target)
        targets.add(target)
        raw = source.read_bytes()
        if len(raw) != entry['bytes'] or sha256(raw).hexdigest() != entry['sha256']:
            raise ValueError('Audio size/hash mismatch: ' + entry['file'])
        if not 0 < len(raw) <= 50 * 1024 * 1024:
            raise ValueError('Audio exceeds the upload size limit: ' + entry['file'])
        expected = '/user/files/' + target
        if entry['media']['path'] != expected:
            raise ValueError('Unexpected upload URL: ' + entry['file'])
        if entry['category'] == 'voice' and not 0 < entry['duration'] <= 6:
            raise ValueError('Voice clip exceeds six seconds: ' + entry['file'])
    for row in plan['sprites']:
        sprite = (user_root / 'characters' / row['key']).resolve()
        sprite.relative_to((user_root / 'characters').resolve())
        if not sprite.is_file():
            raise ValueError('Sprite no longer exists: ' + row['key'])
        if any(Path(clip['path']).name not in targets for clip in row['clips']):
            raise ValueError('Sprite references an unstaged upload: ' + row['key'])


def atomic_write(target, raw, mode=0o600):
    fd, temporary = tempfile.mkstemp(prefix='.' + target.name + '-', dir=target.parent)
    try:
        with os.fdopen(fd, 'wb') as stream:
            stream.write(raw)
            stream.flush()
            os.fsync(stream.fileno())
        os.chmod(temporary, mode)
        os.replace(temporary, target)
    finally:
        Path(temporary).unlink(missing_ok=True)


def install(plan_path, media_root, user_root, backup_dir=None, apply=False):
    plan_raw = plan_path.read_bytes()
    plan = json.loads(plan_raw)
    settings_path = user_root / 'settings.json'
    baseline = settings_path.read_bytes()
    merged = merge_settings(json.loads(baseline), plan)
    validate_files(plan, media_root, user_root)
    summary = {
        'plan_id': plan['id'], 'plan_sha256': sha256(plan_raw).hexdigest(),
        'media_files': len(plan['files']), 'voice_files': sum(x['category'] == 'voice' for x in plan['files']),
        'music_files': len(plan['musicLibrary']), 'sprite_assignments': len(plan['sprites']),
        'characters_voiced': len({row['character'] for row in plan['sprites']}),
        'waypoints': len(plan['waypoints']), 'unassigned_sprites': len(plan['unassigned_sprites']),
        'mode': 'apply' if apply else 'dry-run',
    }
    if not apply:
        return summary
    if backup_dir is None:
        raise ValueError('--backup-dir is required when applying audio assignments')
    backup_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
    uploads = user_root / 'user' / 'files'
    uploads.mkdir(parents=True, exist_ok=True)
    copied = 0
    for entry in plan['files']:
        source, target = media_root / entry['file'], uploads / entry['target']
        if target.exists():
            if sha256(target.read_bytes()).hexdigest() != entry['sha256']:
                raise ValueError('Existing upload has different content: ' + target.name)
            continue
        # Publish complete files, with the same final path as /api/files/upload.
        atomic_write(target, source.read_bytes(), 0o644)
        copied += 1
    # Rebase onto the latest settings after copying media, preserving concurrent unrelated edits.
    for attempt in range(3):
        baseline = settings_path.read_bytes()
        merged = merge_settings(json.loads(baseline), plan)
        if settings_path.read_bytes() != baseline:
            continue
        stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S.%fZ')
        backup = backup_dir / ('settings-before-game-audio-' + stamp + '.json')
        if merged != json.loads(baseline):
            atomic_write(backup, baseline)
            if settings_path.read_bytes() != baseline:
                continue
            atomic_write(settings_path, (json.dumps(merged, ensure_ascii=False, indent=4) + '\n').encode(), settings_path.stat().st_mode & 0o777)
            summary['backup'] = str(backup)
        break
    else:
        raise RuntimeError('Settings are changing continuously; media is staged, settings were not overwritten')
    summary.update(copied_files=copied, settings_sha256=sha256(settings_path.read_bytes()).hexdigest())
    return summary


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('plan', type=Path)
    parser.add_argument('--media-root', type=Path, help='Defaults to the plan directory')
    parser.add_argument('--user-dir', type=Path, required=True)
    parser.add_argument('--backup-dir', type=Path)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    print(json.dumps(install(args.plan, args.media_root or args.plan.parent, args.user_dir, args.backup_dir, args.apply), indent=2))


if __name__ == '__main__':
    main()
