#!/usr/bin/env python3
"""Collect the Genius Invokation TCG enemy character cards from the Genshin Impact Wiki API.

Usage: fetch-tcg-enemies.py [out.json]
Reads the "Unobtainable" table of Genius_Invokation_TCG/Card_List/Character_Cards (the 57
monster, Fatui, Eremite, Kairagi and Nobushi cards used by the game's PvE challenges), then
each card page for its health, element and skills, the card art's original URL, and the
matching enemy page's archive description. Writes JSON (default work/tcg-enemies/cards.json)
for build-tcg-enemy-cards.py.
"""
import html, json, re, sys, time, urllib.parse, urllib.request
from pathlib import Path

API = 'https://genshin-impact.fandom.com/api.php'
HEADERS = {'User-Agent': 'SillyTeyvat/1.40 (tcg enemies)'}
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent / 'work/tcg-enemies/cards.json'

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
    fragment = re.sub(r'<br\s*/?>', ' ', fragment)
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', fragment))).replace('\xad', '').replace(' .', '.').replace(' ,', ',').strip()

def card_list():
    page = get({'action': 'parse', 'page': 'Genius_Invokation_TCG/Card_List/Character_Cards', 'prop': 'text'})['parse']['text']['*']
    table = re.findall(r'<table.*?</table>', page, re.S)[1]
    cards = []
    for row in re.findall(r'<tr.*?</tr>', table, re.S)[1:]:
        cells = [text(c) for c in re.findall(r'<td.*?</td>', row, re.S)]
        page_title = html.unescape(urllib.parse.unquote(re.search(r'href="/wiki/([^"]+)"', row).group(1))).replace('_', ' ')
        cards.append({'name': cells[1], 'health': int(cells[2]), 'element': cells[3], 'faction': cells[5], 'page': page_title})
    return cards

def skills(page_title):
    """The card's skills table: name, kind, dice cost and text. Later tables (transformed forms) are kept separately."""
    page = get({'action': 'parse', 'page': page_title, 'prop': 'text'})['parse']['text']['*']
    start = page.find('id="Skills"')
    end = page.find('id="Stage_Appearances"', start)
    section = page[start:end if end > 0 else None]
    tables = []
    for table in re.findall(r'<table.*?</table>', section, re.S):
        rows = []
        for row in re.findall(r'<tr.*?</tr>', table, re.S):
            cells = re.findall(r'<td.*?</td>', row, re.S)
            # Each skill row is followed by a full-width row with its text.
            if len(cells) == 1 and rows: rows[-1]['text'] = (rows[-1]['text'] + ' ' + text(cells[0])).strip(); continue
            if len(cells) < 4: continue
            costs = re.findall(r'title="([^"]+)">\s*(\d+)\s*<', cells[3])
            rows.append({'name': text(cells[1]), 'kind': text(cells[2]), 'cost': [int(n) for _, n in costs], 'dice': [t for t, _ in costs], 'text': ''})
        if rows: tables.append(rows)
    return tables

def enemy_page(card):
    return re.sub(r' - (Ousia|Pneuma)$', '', card['name'])

def description(title):
    data = get({'action': 'query', 'titles': title, 'prop': 'revisions', 'rvprop': 'content', 'rvslots': 'main', 'redirects': 1})
    page = next(iter(data['query']['pages'].values()))
    if 'revisions' not in page: return '', {}
    wiki = page['revisions'][0]['slots']['main']['*']
    found = re.search(r'\{\{Description\|(.*?)\|\[\[', wiki, re.S)
    desc = found.group(1) if found else ''
    desc = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]*)\]\]', r'\1', desc)
    desc = re.sub(r'\{\{[^}|]*\|([^}]*)\}\}', r'\1', desc)
    desc = re.sub(r"'{2,}", '', re.sub(r'<br\s*/?>', '\n', desc)).strip()
    info = dict(re.findall(r'^\|\s*(title|type|family|group|dmgtype)\s*=\s*(.*?)\s*$', wiki, re.M))
    return desc, info

def images(titles):
    found = {}
    for i in range(0, len(titles), 40):
        data = get({'action': 'query', 'titles': '|'.join(titles[i:i + 40]), 'prop': 'pageimages', 'piprop': 'original'})
        for page in data['query']['pages'].values():
            if page.get('original'): found[page['title']] = page['original']['source']
    return found

def main():
    cards = card_list()
    art = images([c['page'] for c in cards])
    for card in cards:
        card['image'] = art.get(card['page'], '')
        card['skills'] = skills(card['page'])
        card['description'], card['enemy'] = description(enemy_page(card))
        print(f"{card['name']}: {len(card['skills'][0]) if card['skills'] else 0} skills, {'art' if card['image'] else 'NO ART'}, {'desc' if card['description'] else 'no desc'}", flush=True)
        time.sleep(.15)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(cards, indent=1, ensure_ascii=False))
    print(f'{len(cards)} cards -> {OUT}')

if __name__ == '__main__':
    main()
