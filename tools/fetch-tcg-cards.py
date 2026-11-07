#!/usr/bin/env python3
"""Collect the Genius Invokation TCG action cards and summons from the Genshin Impact Wiki API.

Usage: fetch-tcg-cards.py [out.json]
Reads the Equipment, Event and Support card lists and the Summons list
(Genius_Invokation_TCG/Card_List/...) through action=parse, and writes one record per card:
name, group (Weapon type, Artifact, Talent, Food, Companion, Location…), dice cost, usages,
effect text, wiki page and card image file. Default output: work/tcg-cards/cards.json.
battle-items.js is written by hand from this list (Silly Teyvat's engine has its own numbers);
build-tcg-cards.py downloads the art of the cards it uses.
"""
import html, json, re, sys, time, urllib.parse, urllib.request
from pathlib import Path

API = 'https://genshin-impact.fandom.com/api.php'
HEADERS = {'User-Agent': 'SillyTeyvat/1.63 (tcg action cards)'}
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent / 'work/tcg-cards/cards.json'
LISTS = {'equipment': 'Equipment_Cards', 'event': 'Event_Cards', 'support': 'Support_Cards', 'summon': 'Summons'}

def get(params):
    url = API + '?' + urllib.parse.urlencode({**params, 'format': 'json'})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=60) as r:
                return json.load(r)
        except Exception:
            if attempt == 3: raise
            time.sleep(2 + attempt * 3)

def text(fragment):
    fragment = re.sub(r'<br\s*/?>', '\n', fragment)
    return re.sub(r'[ \t]+', ' ', html.unescape(re.sub(r'<[^>]+>', '', fragment))).replace('\xa0', ' ').replace('\xad', '').strip()

def cards(kind, page):
    body = get({'action': 'parse', 'page': f'Genius_Invokation_TCG/Card_List/{page}', 'prop': 'text'})['parse']['text']['*']
    out = []
    # Support cards and summons have an Obtainable and an Unobtainable table (PvE-only cards).
    for index, table in enumerate(re.findall(r'<table.*?</table>', body, re.S)):
        rows = re.findall(r'<tr.*?</tr>', table, re.S)
        head = [text(h) for h in re.findall(r'<th.*?</th>', rows[0], re.S)]
        for row in rows[1:]:
            cells = re.findall(r'<td.*?</td>', row, re.S)
            if len(cells) < len(head): continue
            col = dict(zip(head, cells))
            link = re.search(r'href="/wiki/([^"]+)"', col['Name'])
            image = re.search(r'data-image-name="([^"]+)"', col['Icon'])
            out.append({
                'kind': kind, 'name': text(col['Name']), 'group': [g.strip() for g in text(col.get('Group', '')).split('\n') if g.strip()],
                'cost': [{'dice': d, 'count': int(n)} for d, n in re.findall(r'title="([^"]+)">\s*(\d+)\s*<', col.get('Cost', ''))],
                'usages': text(col.get('Usage(s)', '')), 'effect': text(col['Effect']), 'obtainable': index == 0,
                'page': html.unescape(urllib.parse.unquote(link.group(1))).replace('_', ' ') if link else '',
                'file': html.unescape(image.group(1)) if image else '',
            })
    return out

def main():
    found = []
    for kind, page in LISTS.items():
        listed = cards(kind, page); found += listed
        print(f'{kind}: {len(listed)} cards', flush=True); time.sleep(.2)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(found, indent=1, ensure_ascii=False))
    print(f'{len(found)} cards -> {OUT}')

if __name__ == '__main__':
    main()
