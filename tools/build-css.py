#!/usr/bin/env python3
"""Rebuild extension/genshin-dialogue-ui/style.css: the base rules, then each design layer.

SillyTavern loads only style.css, so the layer files are appended after a marker.
Edit the layer files (teyvat-ui.css, world-map-ui.css, ui-121.css, battle.css, location-music.css, paimon-menu.css, character-identity.css, inventory.css, ui-143.css), never the
appended part of style.css, or the next build discards the change.
"""
import pathlib, sys

EXT = pathlib.Path(__file__).resolve().parent.parent / 'extension' / 'genshin-dialogue-ui'
LAYERS = sys.argv[1:] or ['teyvat-ui.css', 'world-map-ui.css', 'ui-121.css', 'battle.css', 'location-music.css', 'paimon-menu.css', 'character-identity.css', 'inventory.css', 'ui-143.css']
MARK = '\n/* @@silly-teyvat-1.19-ui@@ */\n'

style = EXT / 'style.css'
text = style.read_text()
if MARK in text:
    text = text[:text.index(MARK)]
text += MARK + '\n'.join((EXT / layer).read_text() for layer in LAYERS)
style.write_text(text)
print(f'style.css {len(text)} bytes ({", ".join(LAYERS)})')
