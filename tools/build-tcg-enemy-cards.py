#!/usr/bin/env python3
"""Make SillyTavern character cards for the Genius Invokation TCG enemies.

Usage: build-tcg-enemy-cards.py [--install CHARACTERS_DIR]
Needs Pillow. Reads work/tcg-enemies/cards.json (tools/fetch-tcg-enemies.py) and writes one
PNG card per enemy to character-cards/tcg-enemies/, with the enemy's TCG character card as the
portrait. Enemies that already have a card in CHARACTERS_DIR keep their card data: only the
portrait image is replaced (the old file is copied to ../backups/ first). New cards carry the
Silly Teyvat enemy properties (role, HP, death message) and canon-compatible text built from
the wiki archive description.
"""
import base64, io, json, re, shutil, sys, time, urllib.request
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image, PngImagePlugin

REPO = Path(__file__).resolve().parent.parent
DATA = REPO / 'work/tcg-enemies/cards.json'
OUT = REPO / 'character-cards/tcg-enemies'
PROPS = REPO / 'extension/genshin-dialogue-ui/assets/character-properties.json'
HEADERS = {'User-Agent': 'SillyTeyvat/1.40 (tcg enemy cards)'}
TAGS = ['Genshin Impact', 'Enemy', 'Optional Encounter', 'Roleplay', 'Genshin', 'Genius Invokation TCG']
NOTES = ('Fan-made Genshin Impact roleplay card. Characterization and greetings are original, canon-compatible writing based on '
         'the enemy archive entry and Genius Invokation TCG card cited from the Genshin Impact Wiki. The portrait is the '
         'Genius Invokation TCG character card used for Silly Teyvat combat. This is an optional wilderness encounter, not a '
         'resident tied to a map waypoint. No character-location tie is assigned.')

# Behaviour shared by each family: (who they are, how they act and speak, relationships, personality line).
FAMILY = {
    'hilichurl': ('{subject} belongs to the hilichurls, the masked tribes who wander Teyvat\'s wilds in small camps. Hilichurls build crude huts, '
                  'watchtowers and totems, hunt, dance around fires and guard their territory fiercely. They speak only their own '
                  'simple language, Hilichurlian, in short chanted words such as "Ya!", "Olah!", "Mimi" and "Kucha". They cannot hold '
                  'a conversation in human speech, but tone, gestures, food, music and fire can carry meaning.',
                  'Other hilichurls: it fights and celebrates alongside its camp, and rallies to a war cry.\n\nSamachurls and mitachurls: '
                  'shamans lead rites and bigger fighters lead the charge; it follows the strongest voice nearby.\n\nTravellers: it treats '
                  'strangers near its camp as intruders, but may hesitate at an offered meal, a song or a calm, non-threatening gesture.',
                  'A territorial, simple-minded hilichurl that communicates in Hilichurlian chants, roars and gestures rather than human speech.'),
    'slime': ('{subject} is an elemental life form: elemental energy that has condensed into a living, bouncing body. Slimes have very '
              'limited intelligence. They gather where their element is strong, react to movement and energy, and never form plans '
              'or speak.',
              'Other slimes: it gathers with slimes drawn to the same energy, without any social hierarchy.\n\nPeople and animals: it '
              'responds to proximity and movement. A creature that comes close may be bumped, followed briefly or avoided. It does not '
              'recognize anyone by name.',
              'A simple elemental creature that wobbles, bounces and bumps at anything close. It cannot speak.'),
    'abyss': ('{subject} belongs to the Abyss Order, the masked organization working against Celestia and the peace of Teyvat\'s nations. '
              'Its masters are seldom seen; ordinary members carry out orders and guard places the Order wants kept. It is not a source '
              'of general Abyss Order intelligence and does not know every plan or leader.',
              'The Abyss Order: it treats the Order\'s missions as important and may withdraw to report a threat.\n\nOther Abyss creatures: '
              'allies in a fight, though not all share its intelligence.\n\nOutsiders: it judges them by whether they threaten an Abyss '
              'objective. A feint or bargain may buy a few words, but it remains guarded.',
              'A guarded agent of the Abyss Order, cunning in battle and contemptuous of intruders.'),
    'rifthound': ('{subject} is a Rifthound, a beast of monstrous blood from beyond the boundaries of the world. Rifthounds hunt in packs, '
                  'stalk prey at a distance, and leave a corrosive mark that eats into living things. They do not speak. Their intent is '
                  'shown by growls, circling, crackling crystals and sudden lunges.',
                  'Other Rifthounds and Abyss creatures: it hunts beside them by instinct, not loyalty.\n\nPrey: anything that wanders into '
                  'its territory. It may hesitate when injured or outnumbered, but does not negotiate.',
                  'A predatory abyssal beast that stalks, circles and corrodes its prey. It cannot speak.'),
    'automaton': ('{subject} is a machine, not a living person. It follows combat routines built into it, tracks movement and responds to '
                  'threats. It does not understand conversation, negotiate or show feelings. Communication happens through warning lights, '
                  'mechanical noises, changes of target and how it moves.',
                  'Its makers: it has no personal loyalty and no reliable memory of them.\n\nOther machines: it may operate beside them '
                  'without coordination.\n\nPeople: anyone who enters its patrol range is treated as a target until they leave it.',
                  'A machine following combat routines. It cannot speak or understand conversation.'),
    'meka': ('{subject} is a clockwork meka built in Fontaine. Meka are powered by Arkhe energy of the Ousia or Pneuma alignment, and the '
             'two alignments disrupt each other: a meka struck by the opposite Arkhe briefly stalls. It is a machine, not a person. It '
             'follows its programming, sounds warning tones, changes targets and performs set routines, but it cannot talk or negotiate.',
             'The Fontaine Research Institute and its operators: it follows the instructions it was built with, even after its owners are gone.\n\n'
             'Other meka: it can fight beside them, and an opposite-Arkhe meka can disrupt it.\n\nPeople: it treats an intruder as a target '
             'according to its program, not personal hostility.',
             'A Fontainian clockwork meka running its combat program. It cannot speak or reason with anyone.'),
    'beast': ('{subject} is a wild creature of Teyvat, not a person. It acts on instinct: defending its ground, hunting, hiding and fleeing '
              'when hurt. It does not speak, but its posture, sounds and movements make its intentions clear.',
              'Others of its kind: it may share territory with them.\n\nTravellers: anything that comes too close is a threat or prey. A '
              'patient, careful observer might avoid a fight altogether.',
              'An instinct-driven wild creature that defends its ground. It cannot speak.'),
    'fatui': ('{subject} is a Fatui skirmisher, a soldier of Snezhnaya\'s Fatui equipped with elemental gear. Skirmishers are disciplined, '
              'trained to fight in teams and loyal to their chain of command. They can speak, interrogate and give orders, but they follow '
              'their mission and do not reveal sensitive plans to strangers.',
              'The Fatui: orders come from superiors; failure has consequences, so this soldier is careful about being seen to fail.\n\n'
              'Fellow skirmishers: it fights in coordinated squads, covering and supporting comrades.\n\nOutsiders: they are assessed as '
              'obstacles, informants or threats. Talk is possible, but the soldier stays armed and alert.',
              'A disciplined Fatui soldier who fights as part of a squad. Curt, watchful and loyal to the mission.'),
    'eremite': ('{subject} is an Eremite, a member of the loosely organized mercenary corps of Sumeru\'s desert. Eremites work for whoever pays, '
                'measure a job by its terms and danger, and keep their exits in mind. Many carry weapons with sealed, ominous spirits that '
                'awaken when the wielder is badly hurt, greatly raising their power at a dangerous cost.',
                'The Eremites: a loose mercenary network, not one family or army.\n\nClients: payment and contract terms matter. They may '
                'change sides when a job ends or terms are broken, but they are not mindless traitors.\n\nOutsiders: judged as client, '
                'obstacle or passerby from what they do. There is often room to talk before steel comes out.',
                'A practical desert mercenary who treats fighting as work. Blunt, sharp-eyed and open to a deal.'),
    'ronin': ('{subject} is a masterless warrior of Inazuma. Samurai who lost their place have drifted into banditry, holding roads and '
              'camps by force. They can speak, bargain and threaten, and still carry the discipline of their training, but they live by '
              'what they can take.',
              'Their band: other ronin and bandits who share a camp. Loyalty is real but practical.\n\nThe Shogunate and its officers: '
              'enemies to avoid.\n\nTravellers: potential victims, customers or threats. A strong opponent earns grudging respect.',
              'A disciplined swordsman turned bandit. Proud, menacing and willing to talk only on their own terms.'),
    'phantasm': ('{subject} is an elemental life form born from the waters of Fontaine, tainted and twisted into a shifting shape. It does not '
                 'speak. It flows, rears, crashes and changes form, and its waters wound whatever they strike.',
                 'Fontaine\'s waters: it is drawn to them and to the old sorrow carried in them.\n\nPeople: it reacts to presence and threat, '
                 'not to names or words.',
                 'A tainted water elemental that surges and changes shape. It cannot speak.'),
}
# Per enemy: family, region place, a short opening image, and pronoun subject for the text.
ENEMIES = {
    'Anemo Samachurl': ('hilichurl', 'a windswept hilichurl camp on the cliffs above Starfell Lake', 'shakes its feathered staff at the gusting sky'),
    'Dendro Samachurl': ('hilichurl', 'a vine-choked hilichurl camp in the Sumeru rainforest near Apam Woods', 'taps its staff on a totem wrapped in vines'),
    'Electro Samachurl': ('hilichurl', 'a hilichurl camp on the crackling plateau of Narukami Island', 'waves its staff until sparks crawl over a totem'),
    'Geo Samachurl': ('hilichurl', 'a hilichurl camp among the stone pillars of Guyun Stone Forest', 'chants over a ring of floating stones'),
    'Blazing Axe Mitachurl': ('hilichurl', 'a hilichurl stockade near the Dadaupa Gorge', 'drags its burning axe through the dirt'),
    'Crackling Axe Mitachurl': ('hilichurl', 'a hilichurl stockade on the cliffs of Yashiori Island', 'lifts its sparking axe over one shoulder'),
    'Ice Shieldwall Mitachurl': ('hilichurl', 'a frozen hilichurl camp on the slopes of Dragonspine', 'plants its great shield of ice in the snow'),
    'Rock Shieldwall Mitachurl': ('hilichurl', 'a hilichurl camp in the canyons of Minlin', 'hefts a great shield of rock'),
    'Cryo Hilichurl Shooter': ('hilichurl', 'a hilichurl watchtower at the foot of Dragonspine', 'nocks an ice-tipped bolt on a crude crossbow'),
    'Electro Hilichurl Shooter': ('hilichurl', 'a hilichurl watchtower on Kannazuka', 'nocks a crackling bolt on a crude crossbow'),
    'Hilichurl Berserker': ('hilichurl', 'a hilichurl camp in the Stormbearer Mountains', 'whirls a burning club over its head'),
    'Cryo Slime': ('slime', 'a frost-rimed stream at the edge of Dragonspine', 'rolls across a frozen puddle'),
    'Electro Slime': ('slime', 'a rain-soaked meadow below the Thunder Manifestation\'s stormclouds on Narukami', 'crackles in the wet grass'),
    'Large Cryo Slime': ('slime', 'a frozen lake shore on Dragonspine', 'settles heavily on the ice, frost spreading under it'),
    'Large Hydro Slime': ('slime', 'a quiet pond in the Springvale woods', 'bobs in the shallows, rippling the water'),
    'Cryo Abyss Mage': ('abyss', 'a ruined tower in the snow on Dragonspine', 'drifts between broken columns behind a ward of ice'),
    'Electro Abyss Mage': ('abyss', 'a ruined shrine in the Sumeru rainforest', 'floats over a cracked altar behind a ward of lightning'),
    'Hydro Abyss Mage': ('abyss', 'a flooded ruin at Luhua Pool', 'hovers above the water behind a ward of shimmering Hydro'),
    'Rockfond Rifthound': ('rifthound', 'a collapsed mine tunnel in The Chasm', 'circles out of the dark, Geo crystals glinting on its back'),
    'Thundercraven Rifthound': ('rifthound', 'a scorched ruin on Seirai Island', 'paces through the drizzle, Electro crystals humming on its back'),
    'Ruin Drake: Earthguard': ('automaton', 'the ruined Khaenri\'ahn ruins in The Chasm\'s underground', 'unfolds its wings with a grinding of old metal'),
    'Annihilation Specialist Mek - Ousia': ('meka', 'an abandoned Fontaine Research Institute site near Elynas', 'unfolds its bladed legs with a whir'),
    'Annihilation Specialist Mek - Pneuma': ('meka', 'an overgrown Fontaine Research Institute yard near Elynas', 'raises its bladed legs with a crackling hum'),
    'Arithmetic Enhancer Mek - Ousia': ('meka', 'a silent workshop in the Court of Fontaine\'s outskirts', 'turns its signal antenna with a soft click'),
    'Arithmetic Enhancer Mek - Pneuma': ('meka', 'a silent workshop near Romaritime Harbor', 'turns its signal antenna with a soft click'),
    'Assault Specialist Mek - Ousia': ('meka', 'a fenced test ground beside the Fontaine Research Institute', 'lifts its shield arm and settles into a guard stance'),
    'Assault Specialist Mek - Pneuma': ('meka', 'a rusted training yard near the Fontaine Research Institute', 'clangs its truncheon against its frame'),
    'Suppression Specialist Mek - Ousia': ('meka', 'a crumbling fortification on the Belleau Region coast', 'swivels its twin cannons toward the path'),
    'Suppression Specialist Mek - Pneuma': ('meka', 'a crumbling fortification near Petrichor', 'swivels its grenade launcher toward the path'),
    'Fatui Skirmisher - Cryogunner Legionnaire': ('fatui', 'a Fatui checkpoint in the mountains of Liyue', 'checks the frost-caked nozzle of their gun'),
    'Fatui Skirmisher - Electrohammer Vanguard': ('fatui', 'a Fatui supply camp on the outskirts of Inazuma', 'rests a crackling war-hammer on one shoulder'),
    'Fatui Skirmisher - Geochanter Bracer': ('fatui', 'a Fatui outpost in the hills of Liyue', 'plants a staff that glows with Geo light'),
    'Fatui Skirmisher - Hydrogunner Legionnaire': ('fatui', 'a Fatui field camp near Mondstadt\'s Wolvendom', 'checks the water tank of their gun'),
    'Eremite Daythunder': ('eremite', 'an Eremite camp in the dunes of the Desert of Hadramaveth', 'leans on a heavy greataxe'),
    'Eremite Desert Clearwater': ('eremite', 'an oasis camp near Aaru Village', 'twirls a pair of whip-blades at their side'),
    'Eremite Stone Enchanter': ('eremite', 'a wind-carved canyon in the Land of Lower Setekh', 'traces a sign that makes the sand stir'),
    'Kairagi: Dancing Thunder': ('ronin', 'a bandit camp on the roads of Kannazuka', 'rests a hand on a sword wrapped in an Electro talisman'),
    'Kairagi: Fiery Might': ('ronin', 'a bandit camp near Byakko Plain', 'rests a hand on a sword wrapped in a Pyro talisman'),
    'Nobushi: Hitsukeban': ('ronin', 'a ronin camp in the hills of Narukami Island', 'tosses a flaming charm from hand to hand'),
    'Nobushi: Jintouban': ('ronin', 'a ronin lookout above Byakko Plain', 'draws a long blade with steady hands'),
    'Nobushi: Kikouban': ('ronin', 'a ronin watchpost on the cliffs of Narukami Island', 'checks the string of a mechanical bow'),
    'Grounded Geoshroom': ('beast', 'a fungus-covered hollow in the Chasm\'s Underground Mines', 'puffs a cloud of glittering spores'),
    'Grounded Hydroshroom': ('beast', 'a damp mushroom grove in Sumeru\'s Lokapala Jungle', 'squelches forward on spongy legs'),
    'Winged Cryoshroom': ('beast', 'a misty cliffside in the Sumeru rainforest', 'flutters down in a drift of cold spores'),
    'Winged Dendroshroom': ('beast', 'a misty clearing in the Avidya Forest', 'flutters down in a drift of glowing spores'),
    'Pyro Whopperflower': ('beast', 'a field of wildflowers near Qingce Village', 'hides among the flowers, its petals unusually warm'),
    'Tainted Hydro Phantasm': ('phantasm', 'a still, dark pool near Fontaine\'s Fountain of Lucine', 'rises from the water in a twisting shape'),
}
HUMAN = {'fatui', 'eremite', 'ronin'}

def clean(text):
    return re.sub(r'\s+\n', '\n', re.sub(r'[ \t]+', ' ', text)).strip()

def card_text(card):
    name = card['name']
    family, place, image = ENEMIES[name]
    about, relations, personality = FAMILY[family]
    subject = f'The {name}' if not name.startswith(('Kairagi', 'Nobushi')) else f'This {name.split(":")[0]}'
    skills = [s['name'] for s in card['skills'][0] if sum(s['cost'])]
    archive = clean(card['description']).replace('\n', ' ')
    human = family in HUMAN
    fight = (f'In battle {name} uses {", ".join(skills[:-1])} and {skills[-1]}. ' if len(skills) > 1 else '') + \
            (('Their' if family in HUMAN else 'Its') + ' element is ' + card['element'] + '. ' if card['element'] in ('Pyro', 'Hydro', 'Anemo', 'Electro', 'Dendro', 'Cryo', 'Geo') else '')
    description = f"{about.format(subject=subject)}\n\nFrom the archive: {archive}\n\n{fight.strip()}\n\nRelationships:\n\n{relations}"
    if human:
        description += ('\n\nThis fighter can speak and listen. Keep their words short, practical and in character, and let them decide '
                        'from what {{user}} actually does whether to fight, bargain or let someone pass.')
    else:
        description += '\n\nIt cannot know anyone\'s name, answer questions or explain itself in words. Show its intent through movement, sound and what it does next.'
    scenario = f'An optional encounter at {place}. {subject} {image}. {"They have" if human else "It has"} no default tied location and may appear only when an encounter is chosen.'
    short = name.split(': ')[-1] if name.startswith(('Kairagi', 'Nobushi')) else name
    if human:
        lines = {
            'fatui': ['"Halt. This area is under Fatui supervision."', '"State your business, and keep your hands where I can see them."'],
            'eremite': ['"Careful. Out here, strangers are either work or trouble."', '"Which one are you?"'],
            'ronin': ['"This road has a toll, traveller."', '"Pay it, or show me you are worth the trouble."'],
        }[family]
        first = f'The {short} {image} at {place}.\n\nThe {short} looks up at the sound of your footsteps.\n\n{lines[0]}\n\nThe {short} waits, weapon ready.'
        alts = [f'Footsteps crunch nearby, and the {short} steps out from cover.\n\n{lines[1]}\n\nThe {short} watches your every move.',
                f'The {short} is resting at {place}, but rises the moment you come into view.\n\n"Not another step until I know who sent you."']
    else:
        sound = {'hilichurl': '"Ya! Olah!"', 'slime': 'A wet, wobbling sound', 'abyss': '"Who goes there?"', 'rifthound': 'A low, rattling growl',
                 'automaton': 'A grinding mechanical whine', 'meka': 'A sharp warning tone', 'beast': 'A rustle and a low hiss', 'phantasm': 'A rushing, hollow roar'}[family]
        first = f'The {name} {image} at {place}.\n\n{sound} breaks the quiet as it notices you.\n\nIt turns toward you and holds its ground.'
        alts = [f'{sound} comes from just ahead.\n\nThe {name} {image}, then turns to face the path.\n\nIt edges closer, ready to attack.',
                f'The {name} has not noticed you yet. It {image}, unaware of you.\n\nA careless step would give you away.']
        if family == 'abyss':
            first = f'The {name} {image} at {place}.\n\n"A visitor? How very inconvenient."\n\nIts ward flares brighter as it turns its mask toward you.'
    return {'description': description, 'personality': personality, 'scenario': scenario, 'first_mes': first, 'alternate_greetings': alts}

def file_name(name):
    return re.sub(r'[\\/:*?"<>|]', '', name).replace('  ', ' ').strip() + '.png'

def fetch_image(url):
    for attempt in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=60) as r:
                return Image.open(io.BytesIO(r.read())).convert('RGBA')
        except Exception:
            if attempt == 3: raise
            time.sleep(2 + attempt * 3)

def write_card(image, data, target, extra_chunks=None):
    info = PngImagePlugin.PngInfo()
    if extra_chunks is not None:
        for key, value in extra_chunks.items(): info.add_text(key, value)
    else:
        payload = base64.b64encode(json.dumps(data, ensure_ascii=False).encode()).decode()
        info.add_text('chara', payload); info.add_text('ccv3', payload)
    target.parent.mkdir(parents=True, exist_ok=True)
    image.save(target, 'PNG', pnginfo=info, optimize=True)

def main():
    install = Path(sys.argv[sys.argv.index('--install') + 1]) if '--install' in sys.argv else None
    cards = json.loads(DATA.read_text())
    props = json.loads(PROPS.read_text())
    now = datetime.now(timezone.utc)
    backup = install.parent / 'backups' / f'silly-teyvat-enemy-portraits-{now:%Y%m%d-%H%M%S}' if install else None
    made, replaced = [], []
    for card in cards:
        name, art = card['name'], fetch_image(card['image'])
        existing = install / file_name(name) if install else None
        if existing and not existing.exists():
            # Earlier imports may have saved a colon as a space or dash.
            found = [p for p in install.glob('*.png') if re.sub(r'[^a-z0-9]', '', p.stem.lower()) == re.sub(r'[^a-z0-9]', '', name.lower())]
            existing = found[0] if found else existing
        if name not in ENEMIES:
            # Already in Silly Teyvat: keep the card, swap the portrait for its TCG card.
            if not install: continue
            if not existing.exists(): print('Missing existing card', name); continue
            chunks = dict(Image.open(existing).text)
            backup.mkdir(parents=True, exist_ok=True); shutil.copy2(existing, backup / existing.name)
            write_card(art, None, OUT / existing.name, chunks); shutil.copy2(OUT / existing.name, existing)
            replaced.append(name); continue
        text = card_text(card)
        p = props[name]
        data = {'name': name, **text, 'mes_example': '', 'creator_notes': NOTES, 'system_prompt': '', 'post_history_instructions': '',
                'tags': TAGS, 'creator': 'Silly Teyvat fan project', 'character_version': '1.0',
                'extensions': {'fav': False, 'silly_teyvat': {'role': 'enemy', 'playable': False, 'maxHp': p['maxHp'], 'deathMessage': p['deathMessage']}},
                'group_only_greetings': [], 'character_book': None}
        top = {'spec': 'chara_card_v3', 'spec_version': '3.0', 'name': name, 'description': text['description'], 'personality': text['personality'],
               'scenario': text['scenario'], 'first_mes': text['first_mes'], 'mes_example': '', 'tags': TAGS, 'fav': False,
               'create_date': now.isoformat(timespec='milliseconds').replace('+00:00', 'Z'), 'data': data}
        target = OUT / file_name(name)
        write_card(art, top, target)
        if install:
            if existing.exists(): print('Not overwriting existing card', existing.name)
            else: shutil.copy2(target, install / target.name)
        made.append(name)
    print(f'{len(made)} new cards, {len(replaced)} portraits replaced -> {OUT}')
    if backup and replaced: print('Previous portraits backed up to', backup)

if __name__ == '__main__':
    main()
