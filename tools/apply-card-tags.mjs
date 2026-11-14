#!/usr/bin/env node
// Give the game's character cards the tags in content/character-cards/card-tags.json, in a local SillyTavern.
// It opens SillyTavern in headless Chrome and uses SillyTavern's own tag list and addTagsToEntity, so the
// result is the same as adding each tag by hand: existing tags (matched by name, ignoring case) are reused,
// new ones are created, and nothing is removed. Running it again changes nothing. Element, rarity and
// status tags get colours. Close other SillyTavern tabs first, or reload them afterwards: a tab that saves
// its settings later would write its old tag list back.
//
//   NODE_PATH=<folder containing playwright> node tools/apply-card-tags.mjs [--server http://localhost:8000] [--dry-run]
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {parseArgs} from 'node:util';

const {values}=parseArgs({options:{server:{type:'string',default:'http://localhost:8000'},'dry-run':{type:'boolean',default:false}}});
const server=new URL(values.server);
if(!['localhost','127.0.0.1'].includes(server.hostname))throw new Error('Use a local SillyTavern server.');
const wanted=JSON.parse(fs.readFileSync(new URL('../content/character-cards/card-tags.json',import.meta.url),'utf8'));
const COLORS={
    Pyro:'#b5452f',Hydro:'#2f74b5',Anemo:'#2f9e8a',Electro:'#7d4fb0',Dendro:'#4f9a2f',Cryo:'#5aa3c4',Geo:'#b8902a',
    '5-Star':'#b8862f','4-Star':'#7a5aa8',Playable:'#3d6e4f',NPC:'#5a6470',Enemy:'#8a3a3a',Boss:'#5e1f1f',
};
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const timer=setTimeout(()=>{console.error('Timed out.');process.exit(1);},300000);
try{
    const page=await browser.newPage();
    await page.goto(server.href);
    await page.waitForFunction(()=>globalThis.SillyTavern?.getContext?.().characters?.length>0,null,{timeout:120000});
    const result=await page.evaluate(async({wanted,colors,dryRun})=>{
        const tagsModule=await import('/scripts/tags.js'),{saveSettings}=await import('/script.js');
        const {tags,tag_map,addTagsToEntity,TAG_FOLDER_DEFAULT_TYPE}=tagsModule,ctx=SillyTavern.getContext();
        const byName=new Map(tags.map(tag=>[tag.name.toLowerCase(),tag])),template=byName.get('genshin') || {};
        const avatars=new Map(ctx.characters.map(card=>[card.name,card.avatar]));
        const missing=Object.keys(wanted).filter(name=>!avatars.has(name));
        let created=0,added=0;
        for(const [name,list] of Object.entries(wanted)){
            const avatar=avatars.get(name);
            if(!avatar)continue;
            const objects=list.map(tagName=>{
                let tag=byName.get(tagName.toLowerCase());
                if(!tag){
                    tag={id:crypto.randomUUID(),name:tagName,folder_type:TAG_FOLDER_DEFAULT_TYPE,filter_state:template.filter_state,
                        sort_order:Math.max(0,...tags.map(item=>item.sort_order || 0))+1,is_hidden_on_character_card:false,
                        color:colors[tagName] || '',color2:colors[tagName]?'#ffffff':'',create_date:Date.now()};
                    if(!dryRun)tags.push(tag);
                    byName.set(tagName.toLowerCase(),tag);created++;
                }
                return tag;
            });
            const fresh=objects.filter(tag=>!(tag_map[avatar] || []).includes(tag.id));
            added+=fresh.length;
            if(!dryRun&&fresh.length)addTagsToEntity(fresh,avatar);
        }
        if(!dryRun)await saveSettings();
        return {cards:Object.keys(wanted).length-missing.length,missing,created,added};
    },{wanted,colors:COLORS,dryRun:values['dry-run']});
    console.log(`${values['dry-run']?'Would give':'Gave'} ${result.cards} cards ${result.added} tags (${result.created} new tag names).`);
    if(result.missing.length)console.log(`Not in this SillyTavern: ${result.missing.join(', ')}`);
}finally{clearTimeout(timer);await browser.close();}
