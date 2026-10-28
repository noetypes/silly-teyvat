#!/usr/bin/env python3
"""Download battle icons from the Genshin Impact Wiki (genshin-impact.fandom.com API).

Usage: build-battle-icons.py
Needs Pillow and Node (to read the movesets from combat-kits.js). Writes to
extension/genshin-dialogue-ui/assets/battle/:
  elements/   Element_<E>.svg (colour) and <E>-white.svg, plus Physical
  reactions/  one icon per elemental reaction
  skills/     the Genius Invokation skill icon for each move, or the in-game talent icon
  icons/      round character icons
  summons/    Genius Invokation summon cards matching our summons
  index.json  which move, character and summon has an icon
"""
import io, json, re, subprocess, sys, time, urllib.parse, urllib.request
from pathlib import Path
from PIL import Image

API = 'https://genshin-impact.fandom.com/api.php'
ROOT = Path(__file__).resolve().parent.parent / 'extension/genshin-dialogue-ui'
OUT = ROOT / 'assets/battle'
ELEMENTS = ['Pyro', 'Hydro', 'Anemo', 'Electro', 'Dendro', 'Cryo', 'Geo']
REACTIONS = {'Vaporize': 'Reaction Vaporize.png', 'Melt': 'Reaction Melt.png', 'Overloaded': 'Reaction Overloaded.png',
             'Superconduct': 'Reaction Superconduct.png', 'Electro-Charged': 'Reaction Electro-Charged.png', 'Frozen': 'Reaction Frozen.png',
             'Bloom': 'Reaction Bloom.png', 'Burning': 'Reaction Burning.png', 'Quicken': 'Reaction Catalyze.png',
             'Swirl': 'Reaction Swirl.png', 'Crystallize': 'Reaction Crystallize.png'}
HEADERS = {'User-Agent': 'SillyTeyvat/1.33 (battle icons)'}
slug = lambda s: re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')

def fetch(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=60) as r:
        return r.read()

def resolve(titles, width=None):
    """File title -> URL (thumbnail when width is given) for the titles that exist."""
    found = {}
    titles = list(dict.fromkeys(titles))
    for i in range(0, len(titles), 50):
        params = {'action': 'query', 'titles': '|'.join(titles[i:i + 50]), 'prop': 'imageinfo', 'iiprop': 'url', 'format': 'json'}
        if width: params['iiurlwidth'] = width
        data = json.loads(fetch(API + '?' + urllib.parse.urlencode(params)))
        names = {n['to']: n['from'] for n in data['query'].get('normalized', [])}
        for page in data['query']['pages'].values():
            info = (page.get('imageinfo') or [None])[0]
            if 'missing' in page or not info: continue
            found[names.get(page['title'], page['title'])] = info.get('thumburl') or info['url']
        time.sleep(.2)
    return found

def save_png(url, target, size=None):
    image = Image.open(io.BytesIO(fetch(url))).convert('RGBA')
    if size and max(image.size) > size: image.thumbnail((size, size), Image.LANCZOS)
    target.parent.mkdir(parents=True, exist_ok=True)
    image.save(target, 'WEBP', quality=86, method=6)
    return target.stat().st_size

def save_svg(url, target):
    text = fetch(url).decode('utf-8')
    if '<svg' not in text: raise ValueError(f'Not an SVG: {url}')
    text = re.sub(r'<script[\s\S]*?</script>', '', text)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text)
    return target.stat().st_size

def kits():
    script = """
    const K=await import(process.argv[1]);const props=JSON.parse((await import('fs')).readFileSync(process.argv[2],'utf8'));
    const out={characters:{},summons:new Set()};
    const add=(name,kit)=>{out.characters[name]=kit.moves.map(m=>m.name);for(const m of kit.moves)for(const e of m.effects||[])if(e.type==='summon')out.summons.add(e.name);};
    for(const [name,p] of Object.entries(props))if(p.playable&&p.role!=='enemy'&&!/^(Aether|Lumine)$/.test(name))add(name,K.defaultKit(name,{element:p.element}));
    for(const el of ['Anemo','Geo','Electro','Dendro','Hydro','Pyro'])add('Traveler '+el,K.travelerKit(el));
    add('Paimon',K.defaultKit('Paimon',{element:'None'}));
    console.log(JSON.stringify({characters:out.characters,summons:[...out.summons]}));
    """
    result = subprocess.run(['node', '--input-type=module', '-e', script, str(ROOT / 'combat-kits.js'), str(ROOT / 'assets/character-properties.json')], capture_output=True, text=True, check=True)
    return json.loads(result.stdout)

def main():
    data = kits()
    index = {'elements': [], 'reactions': {}, 'skills': {}, 'icons': {}, 'summons': {}}
    total = 0
    # Elements: coloured and white SVGs, and the TCG Physical icon.
    titles = [f'File:Element {e}.svg' for e in ELEMENTS] + [f'File:Element {e} White.svg' for e in ELEMENTS]
    urls = resolve(titles)
    for e in ELEMENTS:
        total += save_svg(urls[f'File:Element {e}.svg'], OUT / 'elements' / f'{e}.svg')
        total += save_svg(urls[f'File:Element {e} White.svg'], OUT / 'elements' / f'{e}-white.svg')
        index['elements'].append(e)
    physical = resolve(['File:Element Physical TCG.png'], 128)
    if physical: total += save_png(physical['File:Element Physical TCG.png'], OUT / 'elements' / 'Physical.webp', 128)
    # Reactions
    urls = resolve([f'File:{f}' for f in REACTIONS.values()], 96)
    for name, f in REACTIONS.items():
        if f'File:{f}' in urls:
            total += save_png(urls[f'File:{f}'], OUT / 'reactions' / f'{slug(name)}.webp', 96); index['reactions'][name] = f'{slug(name)}.webp'
    # Skills: the TCG character-card skill icon first, then the in-game talent icon.
    moves = sorted({m for ms in data['characters'].values() for m in ms})
    variants = lambda m: list(dict.fromkeys([m, m.replace(':', ''), re.sub(r'\s*:\s*', ' ', m)]))
    tcg = resolve([f'File:{v} Character Card Skill.png' for m in moves for v in variants(m)], 128)
    talent = resolve([f'File:Talent {v}.png' for m in moves for v in variants(m)], 128)
    for m in moves:
        url = next((tcg[f'File:{v} Character Card Skill.png'] for v in variants(m) if f'File:{v} Character Card Skill.png' in tcg), None)
        kind = 'tcg'
        if not url:
            url = next((talent[f'File:Talent {v}.png'] for v in variants(m) if f'File:Talent {v}.png' in talent), None); kind = 'talent'
        if not url: continue
        total += save_png(url, OUT / 'skills' / f'{slug(m)}.webp', 128); index['skills'][m] = {'file': f'{slug(m)}.webp', 'kind': kind}
    # Round character icons.
    names = [n for n in data['characters'] if not n.startswith('Traveler')] + ['Aether', 'Lumine']
    urls = resolve([f'File:{n} Icon.png' for n in names], 128)
    for n in names:
        if f'File:{n} Icon.png' in urls:
            total += save_png(urls[f'File:{n} Icon.png'], OUT / 'icons' / f'{slug(n)}.webp', 128); index['icons'][n] = f'{slug(n)}.webp'
    # Summon cards.
    urls = resolve([f'File:{s} Summon.png' for s in data['summons']], 200)
    for s in data['summons']:
        if f'File:{s} Summon.png' in urls:
            total += save_png(urls[f'File:{s} Summon.png'], OUT / 'summons' / f'{slug(s)}.webp', 240); index['summons'][s] = f'{slug(s)}.webp'
    (OUT / 'index.json').write_text(json.dumps(index, indent=1, ensure_ascii=False))
    missing = [m for m in moves if m not in index['skills']]
    print(f"{len(index['skills'])}/{len(moves)} skill icons ({sum(v['kind'] == 'tcg' for v in index['skills'].values())} TCG), {len(index['icons'])} character icons, "
          f"{len(index['summons'])}/{len(data['summons'])} summons, {len(index['reactions'])} reactions, {total / 1e6:.1f} MB")
    print('No icon:', ', '.join(missing), file=sys.stderr)

if __name__ == '__main__':
    main()
