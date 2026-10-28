#!/usr/bin/env python3
import importlib.util
from copy import deepcopy
from hashlib import sha256
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('game_audio', Path(__file__).with_name('install-game-audio.py'))
audio = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audio)


class AudioImportTests(unittest.TestCase):
    def fixture(self):
        settings = {'unrelated': {'nested': [1, 2, 3]}, 'extension_settings': {'another_extension': {'keep': True}, 'genshin_dialogue_ui': {
            'spriteVolume': 0, 'locationMusicVolume': 0, 'combatDifficulty': 'hard',
            'spriteAudioFiles': {'Other/neutral.png': [{'path': '/user/files/user.ogg'}]},
            'musicLibrary': [{'id': 'user', 'path': '/user/files/user.ogg', 'label': 'My existing upload'}],
            'backgroundRegions': [{'name': 'Mondstadt', 'locations': [{'id': 'forest', 'wilderness': True, 'residents': ['Venti.png'], 'waypoint': {'x': 12, 'y': 34}}, {'id': 'town', 'wilderness': False}]}],
        }}}
        library = [{'id': 'normal', 'path': '/user/files/normal.ogg'}, {'id': 'battle', 'path': '/user/files/battle.ogg'}]
        plan = {'id': 'fixture', 'files': [], 'musicLibrary': library, 'sprites': [{'key': 'Venti/neutral.png', 'character': 'Venti', 'clips': [{'id': 'voice', 'path': '/user/files/voice.ogg'}]}], 'waypoints': [{'id': key, 'region': 'Mondstadt', 'tracks': ['normal'], 'combatTrack': 'battle'} for key in ['forest', 'town']], 'unassigned_sprites': []}
        return settings, plan

    def test_preserves_unrelated_settings_and_existing_user_audio(self):
        settings, plan = self.fixture()
        before = deepcopy(settings)
        merged = audio.merge_settings(settings, plan)
        self.assertEqual(settings, before)
        prefs = merged['extension_settings']['genshin_dialogue_ui']
        self.assertEqual(merged['unrelated'], settings['unrelated'])
        self.assertEqual(merged['extension_settings']['another_extension'], {'keep': True})
        self.assertEqual((prefs['spriteVolume'], prefs['locationMusicVolume'], prefs['combatDifficulty']), (0, 0, 'hard'))
        self.assertEqual(prefs['musicLibrary'][0]['label'], 'My existing upload')
        self.assertEqual(prefs['spriteAudioFiles']['Other/neutral.png'], before['extension_settings']['genshin_dialogue_ui']['spriteAudioFiles']['Other/neutral.png'])
        forest = prefs['backgroundRegions'][0]['locations'][0]
        self.assertEqual((forest['residents'], forest['waypoint']), (['Venti.png'], {'x': 12, 'y': 34}))

    def test_idempotence_and_live_wilderness_gating(self):
        settings, plan = self.fixture()
        merged = audio.merge_settings(settings, plan)
        self.assertEqual(audio.merge_settings(merged, plan), merged)
        locations = merged['extension_settings']['genshin_dialogue_ui']['backgroundRegions'][0]['locations']
        self.assertEqual(locations[0]['music'], {'tracks': ['normal'], 'combatTrack': 'battle'})
        self.assertIsNone(locations[1]['music']['combatTrack'])
        locations[1]['wilderness'] = True
        updated = audio.merge_settings(merged, plan)
        self.assertEqual(updated['extension_settings']['genshin_dialogue_ui']['backgroundRegions'][0]['locations'][1]['music']['combatTrack'], 'battle')

    def test_stale_waypoint_and_colliding_music_id_are_rejected(self):
        settings, plan = self.fixture()
        plan['waypoints'][0]['id'] = 'removed'
        with self.assertRaisesRegex(ValueError, 'no longer exists'):
            audio.merge_settings(settings, plan)
        settings, plan = self.fixture()
        plan['musicLibrary'][0]['id'] = 'user'
        with self.assertRaisesRegex(ValueError, 'another upload'):
            audio.merge_settings(settings, plan)

    def test_apply_backs_up_settings_copies_uploads_and_does_not_repeat(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            user, media, backups = root / 'user', root / 'media', root / 'backups'
            user.mkdir(); media.mkdir()
            (user / 'characters' / 'Venti').mkdir(parents=True)
            (user / 'characters' / 'Venti' / 'neutral.png').write_bytes(b'untouched sprite')
            settings, plan = self.fixture()
            original = json.dumps(settings).encode()
            (user / 'settings.json').write_bytes(original)
            for name, category in [('normal', 'music'), ('battle', 'music'), ('voice', 'voice')]:
                raw = b'OggS fixture ' + name.encode()
                (media / (name + '.ogg')).write_bytes(raw)
                plan['files'].append({'file': name + '.ogg', 'target': name + '.ogg', 'sha256': sha256(raw).hexdigest(), 'bytes': len(raw), 'category': category, 'duration': 1, 'media': {'path': '/user/files/' + name + '.ogg'}})
            path = media / 'plan.json'; path.write_text(json.dumps(plan))
            result = audio.install(path, media, user, backups, True)
            self.assertEqual(Path(result['backup']).read_bytes(), original)
            self.assertEqual(Path(result['backup']).stat().st_mode & 0o777, 0o600)
            self.assertEqual(result['copied_files'], 3)
            saved = (user / 'settings.json').read_bytes()
            repeat = audio.install(path, media, user, backups, True)
            self.assertEqual(repeat['copied_files'], 0)
            self.assertEqual((user / 'settings.json').read_bytes(), saved)
            self.assertEqual((user / 'characters' / 'Venti' / 'neutral.png').read_bytes(), b'untouched sprite')
            (media / 'voice.ogg').write_bytes(b'tampered')
            with self.assertRaisesRegex(ValueError, 'hash mismatch'):
                audio.install(path, media, user)
            self.assertEqual((user / 'settings.json').read_bytes(), saved)


if __name__ == '__main__':
    unittest.main()
