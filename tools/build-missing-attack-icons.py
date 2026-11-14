#!/usr/bin/env python3
"""Author missing battle pictograms and register every bundled move's icon.

No network or image-generation service. Extends the existing white-pictogram icon
system with hand-drawn geometric motifs chosen from each move's name and effects.
Keeps official icons, creates both colored discs and transparent medallion glyphs,
and records provenance. Run build-skill-glyphs.py --missing afterward for older
official icons whose glyph was never installed, then migrate the new media.
Requires Pillow and Node. Never overwrites different existing media.
"""
import hashlib
import importlib.util
import io
import json
import math
import re
from pathlib import Path

from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parent.parent
ASSETS=ROOT/'extension/genshin-dialogue-ui/assets/battle'
RUN=ROOT/'art/battle-icons/2026-11-14-missing-attack-icons'
PALETTE={'Physical':(102,104,111),'None':(102,104,111),'Pyro':(167,66,48),
         'Hydro':(49,104,156),'Anemo':(53,131,123),'Electro':(107,75,148),
         'Dendro':(102,128,51),'Cryo':(83,137,153),'Geo':(158,121,49)}


class Pen:
    """100-unit drawing space, rendered at 4x for clean small silhouettes."""
    def __init__(self):
        self.image=Image.new('RGBA',(512,512))
        self.draw=ImageDraw.Draw(self.image)
        self.scale=5.12
    def pts(self,points):return [(round(x*self.scale),round(y*self.scale)) for x,y in points]
    def line(self,points,width=4,fill='white'):
        self.draw.line(self.pts(points),fill=fill,width=round(width*self.scale),joint='curve')
    def poly(self,points,fill='white'):self.draw.polygon(self.pts(points),fill=fill)
    def ellipse(self,box,fill='white',width=0):
        coords=[round(v*self.scale) for v in box]
        self.draw.ellipse(coords,fill=fill if not width else None,outline=fill if width else None,width=round(width*self.scale))
    def arc(self,box,start,end,width=3):
        self.draw.arc([round(v*self.scale) for v in box],start,end,fill='white',width=round(width*self.scale))
    def curve(self,points,width=4):
        a,b,c,d=points;out=[]
        for i in range(61):
            t=i/60;u=1-t
            out.append((u**3*a[0]+3*u*u*t*b[0]+3*u*t*t*c[0]+t**3*d[0],u**3*a[1]+3*u*u*t*b[1]+3*u*t*t*c[1]+t**3*d[1]))
        self.line(out,width)
    def star(self,x,y,r=7):self.poly([(x,y-r),(x+r*.28,y-r*.28),(x+r,y),(x+r*.28,y+r*.28),(x,y+r),(x-r*.28,y+r*.28),(x-r,y),(x-r*.28,y-r*.28)])


def symbol(p,name):
    if name=='blade':
        p.poly([(34,70),(66,27),(75,23),(74,34),(43,75)])
        p.line([(29,65),(48,81)],5);p.line([(37,74),(28,86)],6)
        p.curve([(24,54),(30,28),(53,17),(70,17)],2)
    elif name=='daggers':
        p.poly([(29,35),(34,24),(65,64),(59,69)]);p.line([(52,66),(68,54)],4);p.line([(60,65),(69,77)],5)
        p.poly([(73,32),(70,21),(37,64),(43,69)]);p.line([(33,56),(48,68)],4);p.line([(40,65),(31,78)],5)
    elif name=='bow':
        p.curve([(26,22),(85,24),(84,75),(26,78)],5);p.line([(26,22),(43,50),(26,78)],2)
        p.line([(33,50),(80,50)],4);p.poly([(74,42),(86,50),(74,58)])
    elif name=='club':
        p.poly([(30,74),(37,79),(63,48),(56,41)]);p.poly([(49,39),(57,25),(66,22),(78,32),(77,42),(65,57),(57,54)])
        p.line([(31,83),(42,70)],3)
    elif name=='staff':
        p.line([(36,79),(57,32)],6);p.curve([(56,35),(35,25),(58,12),(68,27)],5)
        p.ellipse((60,23,70,33));p.star(29,46,6)
    elif name=='axe':
        p.line([(31,80),(67,26)],6);p.poly([(48,28),(64,24),(78,32),(80,49),(69,55),(63,40),(50,41)])
    elif name=='fist':
        p.poly([(31,44),(31,30),(39,26),(45,28),(51,23),(58,26),(65,25),(71,32),(72,53),(60,72),(37,68),(27,53),(27,43)])
        p.line([(38,35),(38,45)],2,fill=(0,0,0,0));p.line([(50,32),(50,43)],2,fill=(0,0,0,0));p.line([(62,34),(62,44)],2,fill=(0,0,0,0));p.poly([(35,72),(61,76),(60,83),(34,80)])
    elif name=='paw':
        for box in [(24,30,37,49),(40,21,53,42),(57,25,70,46),(70,39,81,55)]:p.ellipse(box)
        p.poly([(32,65),(39,50),(51,45),(62,52),(72,67),(67,78),(55,77),(46,73),(35,76)])
    elif name=='insect':
        p.poly([(46,48),(30,25),(20,27),(23,48),(41,56),(28,62),(32,78),(46,66)])
        p.poly([(54,48),(70,25),(80,27),(77,48),(59,56),(72,62),(68,78),(54,66)])
        p.ellipse((46,39,54,72));p.ellipse((44,29,56,41));p.line([(47,31),(39,20)],2);p.line([(53,31),(61,20)],2)
    elif name=='claws':
        for x,y in [(30,27),(48,22),(66,27)]:
            p.poly([(x,y),(x+12,y+10),(x+2,68),(x-7,80),(x-1,50)])
    elif name=='shield':
        p.poly([(24,29),(50,20),(76,29),(71,60),(62,73),(50,82),(38,73),(29,60)])
        p.poly([(50,28),(50,72),(63,59),(68,35)],fill=(0,0,0,0))
    elif name=='heart':
        p.ellipse((26,28,52,55));p.ellipse((48,28,74,55));p.poly([(26,43),(50,77),(74,43)])
        p.line([(40,48),(60,48)],4,fill=(0,0,0,0));p.line([(50,38),(50,58)],4,fill=(0,0,0,0))
    elif name=='medicine':
        p.poly([(42,24),(58,24),(58,42),(76,42),(76,58),(58,58),(58,76),(42,76),(42,58),(24,58),(24,42),(42,42)])
    elif name=='leaf':
        p.curve([(28,75),(12,36),(55,17),(77,24)],4);p.curve([(77,24),(83,60),(60,83),(28,75)],4)
        p.line([(25,82),(67,34)],4);p.line([(43,62),(43,45)],3);p.line([(51,52),(68,51)],3)
    elif name=='flower':
        for a in range(0,360,72):
            x,y=50+20*math.cos(math.radians(a)),47+20*math.sin(math.radians(a));p.ellipse((x-11,y-11,x+11,y+11))
        p.ellipse((41,38,59,56),fill=(0,0,0,0));p.ellipse((46,43,54,51));p.line([(50,70),(50,83)],4)
    elif name=='tree':
        p.poly([(47,63),(53,63),(55,82),(44,82)]);p.line([(50,70),(30,50),(50,58),(68,40)],4)
        for box in [(24,26,49,53),(39,16,66,47),(56,30,79,56),(33,39,65,65)]:p.ellipse(box)
    elif name=='fire':
        p.poly([(51,17),(58,36),(72,29),(68,49),(79,57),(71,76),(52,84),(32,76),(22,60),(27,44),(38,50),(40,30)])
        p.poly([(50,48),(45,66),(52,77),(62,64)],fill=(0,0,0,0))
    elif name=='ice':
        for a in [0,60,120]:
            dx,dy=30*math.cos(math.radians(a)),30*math.sin(math.radians(a));p.line([(50-dx,50-dy),(50+dx,50+dy)],4)
            for sign in [-1,1]:
                x,y=50+sign*dx*.7,50+sign*dy*.7
                for da in [-48,48]:
                    theta=math.radians(a+(180 if sign<0 else 0)+180+da);p.line([(x,y),(x+10*math.cos(theta),y+10*math.sin(theta))],3)
    elif name=='lightning':p.poly([(53,16),(28,56),(47,56),(40,84),(75,39),(55,39),(64,16)])
    elif name=='water':
        p.poly([(50,18),(30,47),(25,61),(31,76),(50,83),(69,76),(75,61),(70,47)])
        p.curve([(34,60),(34,72),(42,74),(49,74)],3)
    elif name=='wind':
        p.curve([(20,44),(82,56),(83,17),(54,24)],5);p.curve([(25,57),(85,46),(80,86),(52,76)],5);p.line([(31,31),(45,31)],3)
    elif name=='stone':
        p.poly([(24,62),(36,31),(64,24),(79,58),(61,80),(37,76)])
        p.line([(36,31),(49,55),(64,24)],3,fill=(0,0,0,0));p.line([(49,55),(61,80)],3,fill=(0,0,0,0))
    elif name=='potion':
        p.line([(40,23),(60,23)],5);p.line([(42,25),(42,41),(27,68),(30,78),(70,78),(73,68),(58,41),(58,25)],4)
        p.poly([(36,57),(65,57),(70,71),(66,74),(34,74),(31,71)]);p.ellipse((47,46,53,52))
    elif name=='fruit':
        p.poly([(48,31),(51,20),(57,20),(54,34)]);p.ellipse((25,34,76,81));p.poly([(52,29),(61,20),(73,22),(64,31)])
        p.poly([(44,48),(49,58),(59,54),(55,64),(63,71),(52,69),(47,78),(44,67),(34,65),(42,59)],fill=(0,0,0,0))
    elif name=='gear':
        for a in range(0,360,45):
            x,y=50+26*math.cos(math.radians(a)),50+26*math.sin(math.radians(a));p.ellipse((x-7,y-7,x+7,y+7))
        p.ellipse((25,25,75,75));p.ellipse((38,38,62,62),fill=(0,0,0,0));p.ellipse((46,46,54,54))
    elif name=='scroll':
        p.poly([(28,28),(68,23),(72,69),(34,77)]);p.arc((21,22,39,41),90,310,4);p.arc((59,63,80,82),-45,160,4)
        for y in [40,50,60]:p.line([(39,y),(61,y-3)],3,fill=(0,0,0,0))
    elif name=='book':
        p.line([(24,29),(37,26),(50,32),(63,26),(76,29),(76,72),(62,69),(50,76),(38,69),(24,72),(24,29)],4);p.line([(50,33),(50,75)],3)
        p.star(37,48,7);p.line([(58,43),(69,40)],2);p.line([(58,53),(69,50)],2)
    elif name=='music':
        p.poly([(41,26),(73,18),(73,64),(67,64),(67,34),(47,39),(47,72),(41,72)])
        p.ellipse((24,65,47,80));p.ellipse((51,58,74,73));p.line([(21,35),(30,35)],3);p.line([(25,30),(25,40)],3)
    elif name=='dance':
        p.ellipse((44,20,56,32));p.line([(50,35),(46,51),(34,66)],5);p.line([(29,33),(48,40),(72,30)],4)
        p.poly([(46,47),(27,63),(50,70),(68,58)]);p.line([(49,66),(60,78),(76,77)],4);p.line([(40,66),(32,82)],4)
    elif name=='compass':
        p.ellipse((23,23,77,77),width=3);p.poly([(61,30),(58,56),(37,72),(42,44)])
        p.line([(42,44),(58,56)],3,fill=(0,0,0,0));p.line([(50,16),(50,23)],3);p.line([(50,77),(50,84)],3)
    elif name=='flag':
        p.line([(32,22),(32,83)],5);p.poly([(35,25),(56,21),(75,30),(64,41),(74,54),(54,48),(35,51)])
    elif name=='house':
        p.line([(22,46),(50,22),(78,46)],5);p.poly([(29,46),(71,46),(71,78),(29,78)])
        p.poly([(44,57),(56,57),(56,78),(44,78)],fill=(0,0,0,0));p.star(76,28,7)
    elif name=='cup':
        p.poly([(28,29),(63,29),(61,61),(52,69),(38,69),(30,60)]);p.arc((54,34,78,59),-90,90,4)
        p.line([(26,76),(68,76)],4);p.curve([(41,23),(32,12),(50,16),(45,8)],2)
    elif name=='cannon':
        p.poly([(27,48),(65,31),(78,51),(39,68)]);p.poly([(63,29),(70,26),(82,49),(76,53)])
        p.ellipse((31,64,51,84),width=5);p.line([(50,65),(62,79)],5);p.star(25,24,7)
    elif name=='eye':
        p.curve([(20,50),(36,23),(66,23),(80,50)],4);p.curve([(20,50),(37,77),(66,77),(80,50)],4)
        p.ellipse((38,38,62,62));p.ellipse((46,43,54,57),fill=(0,0,0,0))
    elif name=='bird':
        p.poly([(49,43),(30,26),(17,28),(34,51),(21,57),(42,61),(50,76),(57,61),(77,50),(62,48),(60,32),(53,35)])
    elif name=='burst':
        for a in range(0,360,45):
            x,y=50+26*math.cos(math.radians(a)),50+26*math.sin(math.radians(a));p.line([(50,50),(x,y)],5)
        p.star(50,50,19)
    else:p.star(50,50,27)


RULES=[
    ('insect',r'cicin|swarm'),
    ('paw',r'paw|cat |canine|dog|bark|hound|komore|priestess'),
    ('medicine',r'doctor|physician|medicine|treatment'),
    ('fruit',r'flamegranate|canopy throw|mountain king|flying fruit'),
    ('music',r'song|rhythm|riff|chirping|dance of|finale termini'),
    ('dance',r'waltz|dance|footwork|blad(ed|e) waltz'),
    ('compass',r'ad astra|course|rudder|helmsman|chief mate|harbor inspection'),
    ('cup',r'tasting|vintage|vintner|bartender|counter service|house special'),
    ('house',r'lodging|hospitality|warm welcome|welcome home'),
    ('tree',r'tree|dreaming branch|dreaming roots'),
    ('flower',r'flower|petal|nursery|moonflower|frostmoon prayer'),
    ('leaf',r'leaf|forest|vines|wildgrass|spore|nectar|leaves'),
    ('gear',r'reset|prototype|gadget|inventor|device|mechanical|ordo experiment|world formula|theory|cyclops|station game'),
    ('cannon',r'cannon|rocket|mortar|launch|grand cannon'),
    ('potion',r'flask|reagent|incendiary|mixture|grenade'),
    ('scroll',r'contract|bargain|supplies|wisdom|council|accord|strategy|command|inspection|orders|law of|resolve|readiness|experience'),
    ('book',r'scholar|inquiry|case closed|prayer|blessing|memory|promise|watch|vigil|supply'),
    ('claws',r'claw|fang|bite|stinging|scorpion|devour'),
    ('bird',r'wing|feather|flight|flying|divebomb|swoop'),
    ('shield',r'shield|guard|aegis|harden|stance|counter|joinery|carpenter|craftsmanship'),
    ('bow',r'bow|shot|bolt|arrow|volley|draw a bead|aim|hunter'),
    ('axe',r'axe|glaive|shovel|du plama|oto tiga'),
    ('daggers',r'knife|knives|stab|scythe|up-close'),
    ('blade',r'slash|blade|sword|ichimonji|iai|slingshot|thrust'),
    ('staff',r'staff|walking stick|elder|spiritherb'),
    ('club',r'club|tap|strike|nudge|ram|stomp|slam|headbutt|bounce|push'),
    ('fist',r'jab|punch|uppercut|melee|pumm|smash|multi-smash|training|workout|puff-up'),
    ('ice',r'ice|icy|frost|frigid|frozen|chill|snow|cryo'),
    ('lightning',r'thunder|electro|lightning|charged|energy|pulse'),
    ('water',r'water|rain|hydro|tide|tidal|torrent|bubble|ripple|wave|splash|oceanid|surge|surging|overflow|droplet'),
    ('fire',r'flame|fire|blaz|ignit|sear|scorch|pyro|burn|carmine|chrysalis'),
    ('wind',r'wind|gale|anemo|whirl|tempest|vortex|squall|cleansing'),
    ('stone',r'rock|stone|geo|earth|crystal|gravity|crush'),
    ('burst',r'blast|barrage|flurry|conflagration|detonat|storm|fury|impact|up(a|a shato)|action|toss|throw|charge'),
]


def motif(move):
    for shape,pattern in RULES:
        if re.search(pattern,move['name'],re.I):return shape
    effects={e['type'] for e in move.get('effects',[])}
    if 'heal' in effects:return 'heart'
    if 'shield' in effects:return 'shield'
    if 'summon' in effects:return 'star'
    return {'sword':'blade','claymore':'blade','bow':'bow','polearm':'staff','catalyst':'star'}.get(move.get('weapon'),'burst')


def render(move,shape):
    pen=Pen();symbol(pen,shape)
    if move['kind'] in ('burst','special'):
        for x,y in [(16,26),(84,26),(16,74),(84,74)]:pen.star(x,y,4)
    elif move['kind']=='skill':
        pen.arc((13,13,87,87),210,280,2);pen.arc((13,13,87,87),30,100,2)
    glyph=pen.image.resize((96,96),Image.Resampling.LANCZOS)
    disc=Image.new('RGBA',(512,512));d=ImageDraw.Draw(disc)
    base=PALETTE.get(move['element'],PALETTE['Physical'])
    for r in range(246,0,-1):
        t=r/246;color=tuple(round(c*(1.13-.22*t)) for c in base)+(255,)
        d.ellipse((256-r,256-r,256+r,256+r),fill=color)
    d.ellipse((12,12,500,500),outline=tuple(min(255,c+38) for c in base)+(255,),width=4)
    disc.alpha_composite(pen.image)
    return disc.resize((128,128),Image.Resampling.LANCZOS),glyph


def encoded(image):
    out=io.BytesIO();image.save(out,'WEBP',lossless=True,method=6);return out.getvalue()


def write_new(path,data):
    if path.exists():
        if path.read_bytes()!=data:raise ValueError(f'Archive the previous output before replacing {path}')
        return
    path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)


def main():
    spec=importlib.util.spec_from_file_location('battle_builder',ROOT/'tools/build-battle-icons.py')
    builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder)
    data=builder.kits();index_path=ASSETS/'index.json';index=json.loads(index_path.read_text())
    grouped={}
    for move in data['moves']:grouped.setdefault(move['name'],[]).append(move)
    entries=[]
    for name,uses in sorted(grouped.items()):
        if name in index['skills']:continue
        base=name.removesuffix(': Unleashed')
        if base!=name and base in index['skills']:
            index['skills'][name]={**index['skills'][base],'aliasOf':base};continue
        stem=builder.slug(name)
        # Traveler discs already exist; they use the shared white sword glyph.
        if (ASSETS/'skills'/f'{stem}.webp').is_file():
            index['skills'][name]={'file':f'{stem}.webp','kind':'talent',**({'glyph':'foreign-ironwind.webp'} if name.startswith('Foreign ') else {})};continue
        move=uses[0];shape=motif(move);file=f'authored-{stem}.webp'
        colored,white=render(move,shape);color_bytes,white_bytes=encoded(colored),encoded(white)
        write_new(ASSETS/'skills'/file,color_bytes);write_new(ASSETS/'glyphs'/file,white_bytes)
        index['skills'][name]={'file':file,'kind':'authored'}
        entries.append({'move':name,'characters':sorted(set(u['character'] for u in uses)),
                        'kind':move['kind'],'element':move['element'],'motif':shape,'file':file,
                        'skillSHA256':hashlib.sha256(color_bytes).hexdigest(),'glyphSHA256':hashlib.sha256(white_bytes).hexdigest()})
    # An alias can sort before its base; make its registration independent of sort order.
    for name in grouped:
        if name.endswith(': Unleashed'):
            base=name.removesuffix(': Unleashed')
            if base in index['skills']:index['skills'][name]={**index['skills'][base],'aliasOf':base}
    index_path.write_text(json.dumps(index,indent=1,ensure_ascii=False)+'\n')
    RUN.mkdir(parents=True,exist_ok=True)
    record=RUN/'manifest.json'
    previous=json.loads(record.read_text()).get('icons',[]) if record.exists() else []
    all_entries={e['move']:e for e in [*previous,*entries]}
    record.write_text(json.dumps({'date':'2026-11-14','tool':'tools/build-missing-attack-icons.py',
        'method':'Hand-drawn geometric pictograms; no AI generation. Motifs follow move names and gameplay effects. Existing official art is preserved.',
        'skillsFolder':'extension/genshin-dialogue-ui/assets/battle/skills',
        'glyphsFolder':'extension/genshin-dialogue-ui/assets/battle/glyphs',
        'icons':list(all_entries.values())},indent=2,ensure_ascii=False)+'\n')
    print(f'Created {len(entries)} colored icons and {len(entries)} matching white glyphs; registered {len(grouped)} distinct move names.')


if __name__=='__main__':main()
