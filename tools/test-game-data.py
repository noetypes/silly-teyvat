#!/usr/bin/env python3
"""Regression checks for data loss protection, relocation and deployment."""
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('game_data', Path(__file__).with_name('game-data.py'))
data = importlib.util.module_from_spec(spec)
spec.loader.exec_module(data)


class ExternalDataTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.repo = self.base / 'repo'
        self.repo.mkdir()
        self.pack = self.base / 'pack'
        self.name = 'extension/genshin-dialogue-ui/assets/test.png'
        self.media = self.repo / self.name
        self.media.parent.mkdir(parents=True)
        self.media.write_bytes(b'original-image')
        self.old_repo, self.old_manifest = data.REPO, data.MANIFEST
        data.REPO, data.MANIFEST = self.repo, self.repo / 'game-data.json'
        self.addCleanup(self.restore)

    def restore(self):
        data.REPO, data.MANIFEST = self.old_repo, self.old_manifest

    def test_round_trip_and_relocation(self):
        data.migrate(self.pack)
        files = data.entries()
        self.assertTrue(self.media.is_symlink())
        self.assertEqual(self.media.read_bytes(), b'original-image')
        moved = self.base / 'new-pack'
        self.pack.rename(moved)
        self.assertFalse(self.media.exists())
        data.link(moved, files, self.repo)
        self.assertEqual(self.media.read_bytes(), b'original-image')
        self.assertEqual(data.link(moved, files, self.repo), 0)

    def test_corrupt_pack_changes_nothing(self):
        data.migrate(self.pack)
        self.media.unlink()
        (self.pack / self.name).write_bytes(b'corrupt')
        with self.assertRaisesRegex(ValueError, 'Content mismatch'):
            data.link(self.pack, data.entries(), self.repo)
        self.assertFalse(self.media.is_symlink())

    def test_conflicting_local_media_is_preserved(self):
        data.migrate(self.pack)
        self.media.unlink()
        self.media.write_bytes(b'new-local-art')
        with self.assertRaisesRegex(ValueError, 'Refusing to replace'):
            data.link(self.pack, data.entries(), self.repo)
        self.assertEqual(self.media.read_bytes(), b'new-local-art')
        with self.assertRaisesRegex(ValueError, 'Different data already exists'):
            data.migrate(self.pack)
        self.assertEqual((self.pack / self.name).read_bytes(), b'original-image')

    def test_missing_pack_and_path_traversal(self):
        with self.assertRaisesRegex(ValueError, 'Missing'):
            data.validate(self.pack, {self.name: {'bytes': 1, 'sha256': ''}})
        with self.assertRaisesRegex(ValueError, 'Unsafe data path'):
            data.source(self.pack, '../outside')
        with self.assertRaisesRegex(ValueError, 'outside the repository'):
            data.migrate(self.repo / 'data')

    def test_live_install_uses_external_links(self):
        data.migrate(self.pack)
        tools = self.repo / 'tools'
        tools.mkdir()
        for name in ['game-data.py', 'sync-live.py']:
            (tools / name).write_bytes((self.old_repo / 'tools' / name).read_bytes())
        extension = self.repo / 'extension/genshin-dialogue-ui'
        (extension / 'index.js').write_text('export const test = true;\n')
        live = self.base / 'live'
        live.mkdir()
        command = ['python3', str(tools / 'sync-live.py'), '--data-root', str(self.pack), '--live', str(live)]
        subprocess.run(command, check=True, capture_output=True)
        self.assertTrue((live / 'assets/test.png').is_symlink())
        self.assertEqual((live / 'index.js').read_text(), 'export const test = true;\n')
        subprocess.run(command + ['--check'], check=True, capture_output=True)


if __name__ == '__main__':
    unittest.main()
