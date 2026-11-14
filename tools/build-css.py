#!/usr/bin/env python3
"""Rebuild extension/genshin-dialogue-ui/style.css: the base rules, then each design layer in LAYERS.

SillyTavern loads only style.css, so the layer files are appended after a marker. Edit the layer
files, never the appended part of style.css, or the next build discards the change. A new layer goes
into LAYERS below; order matters, since a later layer wins over an earlier one.

The layers are build inputs only: tools/build-dist.py leaves them out of the player distribution,
because style.css already contains them.
"""
import pathlib
import sys

EXT = pathlib.Path(__file__).resolve().parent.parent / 'extension' / 'genshin-dialogue-ui'
LAYERS = [
    'teyvat-ui.css', 'world-map-ui.css', 'refinements.css', 'battle.css', 'location-music.css',
    'paimon-menu.css', 'character-identity.css', 'inventory.css', 'trust.css', 'mobile-interface.css',
    'combat-hud.css', 'loading-and-media.css', 'card-drops.css', 'character-screen.css',
    'gallery-and-settings.css', 'battle-board.css', 'battle-weapons.css', 'battle-equipment.css',
    'card-search.css',
]
MARK = '\n/* @@silly-teyvat-1.19-ui@@ */\n'


def build(layers=LAYERS):
    style = EXT / 'style.css'
    text = style.read_text()
    if MARK in text:
        text = text[:text.index(MARK)]
    text += MARK + '\n'.join((EXT / layer).read_text() for layer in layers)
    style.write_text(text)
    return text


if __name__ == '__main__':
    layers = sys.argv[1:] or LAYERS
    print(f'style.css {len(build(layers))} bytes ({", ".join(layers)})')
