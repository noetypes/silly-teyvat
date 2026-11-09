// Character Customization → Moveset: edit a character's or enemy's three moves and
// their effects. Saved per card (or per persona) and used from the next battle round.
import {WEAPONS,ROLES,EFFECT_TYPES,BUFF_STATS,DEBUFF_STATS,TARGETS,KIND_LABEL,describeMove,describeEffect,escapeHtml,saveKitOverride,resetKitOverride} from './combat-kits.js';
import {kitForCard} from './battle-state.js';
import {characterProperties} from './character-properties.js';
import {linkedCard} from './persona-link.js';
import {ELEMENTS} from './battle-engine.js';

const opt=(value,label=value)=>`<option value="${value}">${label}</option>`;
const esc=escapeHtml;
const STAT_NAMES={atk:'Damage dealt ↑',guard:'Damage taken ↓',crit:'Crit chance ↑',dodge:'Dodge ↑',regen:'Regeneration',infuse:'Elemental infusion',vuln:'Damage taken ↑',weaken:'Damage dealt ↓',stun:'Petrify (skip turn)'};
const TYPE_NAMES={damage:'Damage',heal:'Heal',shield:'Shield',buff:'Buff',debuff:'Debuff',summon:'Summon',energy:'Energy',cleanse:'Cleanse',hpcost:'HP cost (%)'};
const num=(value,min,max,fallback)=>{const n=Math.round(Number(value));return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;};

export function mountMovesetEditor({panel,getContext,getCharacter,status=()=>{}}){
    const abort=new AbortController();let kit=null,card=null;
    panel.classList.add('gi-moveset');
    const saveKey=()=>card?.isPersona?(linkedCard(getContext(),card.personaAvatar)?.avatar || card.avatar):card?.avatar;
    function effectRow(effect,moveIndex,effectIndex){
        // Genius Invokation mechanics the form cannot edit (Nightsoul, Techniques, created cards…) are shown as text and kept as they are.
        if(!EFFECT_TYPES.includes(effect.type))return `<div class="gi-effect gi-effect-fixed" data-move="${moveIndex}" data-effect="${effectIndex}" data-fixed="true"><p>${esc(describeEffect(effect,kit?.element) || effect.type)}</p><button type="button" data-remove-effect aria-label="Remove effect">×</button></div>`;
        const t=effect.type,valueKey={damage:'power',heal:'amount',shield:'amount',buff:'amount',debuff:'amount',summon:'power',energy:'amount',hpcost:'amount'}[t];
        const stat=t==='buff'?BUFF_STATS:t==='debuff'?DEBUFF_STATS:null;
        return `<div class="gi-effect" data-move="${moveIndex}" data-effect="${effectIndex}">
            <label>Effect<select data-f="type">${EFFECT_TYPES.map(x=>opt(x,TYPE_NAMES[x])).join('')}</select></label>
            ${stat?`<label>Stat<select data-f="stat">${stat.map(x=>opt(x,STAT_NAMES[x])).join('')}</select></label>`:t==='summon'?`<label>Name<input data-f="name" maxlength="60" value="${esc(effect.name)}"></label>`:'<label hidden></label>'}
            ${valueKey?`<label>${t==='damage'||t==='summon'?'Power':t==='hpcost'?'Percent':'Amount'}<input data-f="${valueKey}" type="number" min="0" max="${t==='hpcost'||t==='buff'||t==='debuff'?100:99}" value="${esc(effect[valueKey] ?? 0)}"></label>`:'<label hidden></label>'}
            <label>Target<select data-f="target">${Object.entries(TARGETS).map(([k,v])=>opt(k,v)).join('')}</select></label>
            ${t==='buff'||t==='debuff'||t==='summon'?`<label>Rounds<input data-f="rounds" type="number" min="1" max="9" value="${esc(effect.rounds ?? 2)}"></label>`:t==='damage'?`<label>Hits<input data-f="hits" type="number" min="1" max="8" value="${esc(effect.hits ?? 1)}"></label>`:'<label hidden></label>'}
            ${t==='summon'?`<label>Heal<input data-f="heal" type="number" min="0" max="99" value="${esc(effect.heal ?? 0)}"></label>`:''}
            <button type="button" data-remove-effect aria-label="Remove effect">×</button></div>`;
    }
    function render(){
        card=getCharacter();panel.hidden=!card;if(!card)return;
        const ctx=getContext(),props=characterProperties(ctx,card),enemy=props.role==='enemy';
        kit=structuredClone(kitForCard(ctx,card));
        const element=enemy?kit.element:props.element;
        panel.innerHTML=`<h3 class="gi-cs-heading">Stats</h3>
            <div class="gi-moveset-head">
                <label>Role<select data-k="role">${[...ROLES,'Enemy'].map(x=>opt(x)).join('')}</select></label>
                ${enemy?`<label>Element<select data-k="element">${['Physical',...ELEMENTS].map(x=>opt(x)).join('')}</select></label>
                <label>Shield<input data-k="shield" type="number" min="0" max="99" value="${esc(kit.shield || 0)}"></label>
                <label>Shield weakness<select data-k="weakTo">${opt('','None')}${ELEMENTS.map(x=>opt(x)).join('')}</select></label>
                <label>Armor (% less damage)<input data-k="armor" type="number" min="0" max="90" value="${esc(kit.armor || 0)}"></label>
                <label>Armor broken by<select data-k="armorBreak">${opt('','Nothing')}${ELEMENTS.map(x=>opt(x)).join('')}</select></label>
                <label>Evasion (%)<input data-k="evasion" type="number" min="0" max="80" value="${esc(kit.evasion || 0)}"></label>
                <label class="gi-check" title="Physical attacks deal this unit's element instead, from the start of every fight, like an infused Normal Attack in Genius Invokation"><input type="checkbox" data-k="infusion">Elemental infusion</label>`
                :`<label>Weapon<select data-k="weapon">${WEAPONS.map(x=>opt(x,x==='none'?'None (unarmed)':x[0].toUpperCase()+x.slice(1))).join('')}</select></label>
                <label>Burst Energy<input data-k="energy" type="number" min="1" max="5" value="${esc(kit.energy || 2)}"></label>
                <label>Dodge (%)<input data-k="evasion" type="number" min="0" max="90" value="${esc(kit.evasion || 0)}"></label>
                <label class="gi-check" title="Normal Attacks deal this character's element instead of Physical damage, from the start of every fight"><input type="checkbox" data-k="infusion">Elemental infusion</label>`}
            </div>
            <h3 class="gi-cs-heading">Attacks</h3>
            ${kit.moves.map((move,i)=>`<section class="gi-move-edit" data-move="${i}">
                <div class="gi-move-head"><small>${KIND_LABEL[move.kind]}</small><input data-m="name" maxlength="80" value="${esc(move.name)}" aria-label="${KIND_LABEL[move.kind]} name"></div>
                <div class="gi-move-row">
                    ${move.kind==='normal'||move.kind==='skill'||move.kind==='burst'?`<label>Dice cost<input data-m="cost" type="number" min="0" max="8" value="${esc(move.cost ?? 3)}"></label>`:''}
                    ${move.kind==='special'?`<label>Cooldown (rounds)<input data-m="cooldown" type="number" min="1" max="9" value="${esc(move.cooldown ?? 3)}"></label>`:''}
                    <label>Element<select data-m="element">${opt('',`Default (${esc(move.kind==='normal'&&!enemy?(kit.weapon==='catalyst'?element:'Physical'):element)})`)}${['Physical',...ELEMENTS].map(x=>opt(x)).join('')}</select></label>
                </div>
                <div class="gi-effects">${(move.effects || []).map((e,j)=>effectRow(e,i,j)).join('')}</div>
                <button type="button" data-add-effect="${i}">+ Add effect</button>
                <p class="gi-move-desc"></p>
            </section>`).join('')}
            <div class="gi-wardrobe-row"><button type="button" data-save-kit>Save moveset</button><button type="button" data-reset-kit${kit.custom?'':' disabled title="This moveset has not been edited."'}>Reset to default</button></div>`;
        const set=(selector,value)=>{const node=panel.querySelector(selector);if(node)node.value=value ?? '';};
        set('[data-k="role"]',kit.role);set('[data-k="weapon"]',kit.weapon);set('[data-k="element"]',kit.element);set('[data-k="weakTo"]',kit.weakTo || '');set('[data-k="armorBreak"]',kit.armorBreak || '');{const box=panel.querySelector('[data-k="infusion"]');if(box)box.checked=kit.infusion===true;}
        kit.moves.forEach((move,i)=>{
            const section=panel.querySelector(`.gi-move-edit[data-move="${i}"]`);
            const normalDefault=move.kind==='normal'&&!enemy&&move.element===(kit.weapon==='catalyst'?element:'Physical');
            section.querySelector('[data-m="element"]').value=normalDefault?'':move.element || '';
            (move.effects || []).forEach((e,j)=>{const row=section.querySelector(`[data-effect="${j}"]`);if(row.dataset.fixed)return;row.querySelector('[data-f="type"]').value=e.type;if(row.querySelector('[data-f="stat"]'))row.querySelector('[data-f="stat"]').value=e.stat;row.querySelector('[data-f="target"]').value=e.target;});
        });
        describe();
    }
    function read(){
        const ctx=getContext(),props=characterProperties(ctx,card),enemy=props.role==='enemy';
        const value=selector=>panel.querySelector(selector)?.value;
        const next={...kit,role:value('[data-k="role"]') || kit.role};
        next.infusion=Boolean(panel.querySelector('[data-k="infusion"]')?.checked);
        if(enemy){next.element=value('[data-k="element"]') || kit.element;next.shield=num(value('[data-k="shield"]'),0,99,0);next.weakTo=value('[data-k="weakTo"]') || '';next.armor=num(value('[data-k="armor"]'),0,90,0);next.armorBreak=value('[data-k="armorBreak"]') || '';next.evasion=num(value('[data-k="evasion"]'),0,80,0);}
        else{next.weapon=value('[data-k="weapon"]') || kit.weapon;next.energy=num(value('[data-k="energy"]'),1,5,2);next.evasion=num(value('[data-k="evasion"]'),0,90,0);}
        const element=enemy?next.element:props.element;
        next.moves=kit.moves.map((move,i)=>{
            const section=panel.querySelector(`.gi-move-edit[data-move="${i}"]`),field=name=>section.querySelector(`[data-m="${name}"]`)?.value;
            const out={...move,name:String(field('name') || move.name).trim().slice(0,80) || move.name};
            if(move.kind==='normal'||move.kind==='skill'||move.kind==='burst')out.cost=num(field('cost'),0,8,move.cost ?? 3);
            if(move.kind==='special')out.cooldown=num(field('cooldown'),1,9,3);
            const chosen=field('element');out.element=chosen || (move.kind==='normal'&&!enemy?(next.weapon==='catalyst'?element:'Physical'):undefined);if(!out.element)delete out.element;
            out.effects=[...section.querySelectorAll('.gi-effect')].map(row=>{
                if(row.dataset.fixed)return structuredClone(move.effects?.[Number(row.dataset.effect)]);
                // Options the form has no field for (a decoy, or an element of its own) stay with their effect.
                const f=name=>row.querySelector(`[data-f="${name}"]`),type=f('type').value,original=move.effects?.[Number(row.dataset.effect)];
                const e={...(original?.type===type?original:{}),type,target:f('target').value};
                if(f('stat'))e.stat=f('stat').value;if(f('name'))e.name=String(f('name').value || 'Summon').slice(0,60);
                for(const key of ['power','amount','rounds','hits','heal'])if(f(key))e[key]=num(f(key).value,key==='rounds'||key==='hits'?1:0,key==='amount'&&['buff','debuff','hpcost'].includes(type)?100:99,0);
                return e;
            });
            return out;
        });
        return next;
    }
    function describe(){
        if(!kit)return;let next;try{next=read();}catch{return;}
        const props=characterProperties(getContext(),card),element=props.role==='enemy'?next.element:props.element;
        next.moves.forEach((move,i)=>{const p=panel.querySelector(`.gi-move-edit[data-move="${i}"] .gi-move-desc`);if(p)p.textContent=describeMove(move,element==='None'?'Physical':element) || 'No effects.';});
    }
    // Changing an effect's type rebuilds its row with the right fields.
    panel.addEventListener('change',event=>{
        const row=event.target.closest('.gi-effect');
        if(row&&event.target.dataset.f==='type'){
            kit=read();const i=Number(row.dataset.move),j=Number(row.dataset.effect),type=event.target.value;
            const defaults={damage:{power:3,target:'one'},heal:{amount:4,target:'lowest'},shield:{amount:5,target:'self'},buff:{stat:'atk',amount:20,rounds:2,target:'self'},debuff:{stat:'vuln',amount:20,rounds:2,target:'one'},summon:{name:'Summon',power:2,rounds:2,target:'one'},energy:{amount:1,target:'others'},cleanse:{target:'ally'},hpcost:{amount:10,target:'self'}};
            kit.moves[i].effects[j]={type,...defaults[type]};
            row.outerHTML=effectRow(kit.moves[i].effects[j],i,j);
            const fresh=panel.querySelector(`.gi-move-edit[data-move="${i}"] [data-effect="${j}"]`);fresh.querySelector('[data-f="type"]').value=type;if(fresh.querySelector('[data-f="stat"]'))fresh.querySelector('[data-f="stat"]').value=kit.moves[i].effects[j].stat;fresh.querySelector('[data-f="target"]').value=kit.moves[i].effects[j].target;
        }
        describe();
    },{signal:abort.signal});
    panel.addEventListener('input',describe,{signal:abort.signal});
    panel.addEventListener('click',event=>{
        const add=event.target.closest('[data-add-effect]'),remove=event.target.closest('[data-remove-effect]');
        if(add){event.stopPropagation();kit=read();const i=Number(add.dataset.addEffect);if(kit.moves[i].effects.length>=6){status('A move can have up to six effects.');return;}kit.moves[i].effects.push({type:'damage',power:3,target:'one'});rebuild();return;}
        if(remove){event.stopPropagation();kit=read();const row=remove.closest('.gi-effect');kit.moves[Number(row.dataset.move)].effects.splice(Number(row.dataset.effect),1);rebuild();return;}
        if(event.target.closest('[data-save-kit]')){event.stopPropagation();try{const next=read();delete next.custom;saveKitOverride(getContext(),saveKey(),{...next,moves:next.moves});render();status(`${card.name}'s moveset saved. It applies from the next round.`);}catch(error){status(error.message);}return;}
        if(event.target.closest('[data-reset-kit]')){event.stopPropagation();resetKitOverride(getContext(),saveKey());render();status(`${card.name}'s moveset is back to its default.`);}
    },{signal:abort.signal});
    // Re-render from the working copy (keeps unsaved edits).
    function rebuild(){
        const working=kit;
        render();kit=working;
        // Restore working values into the fresh form.
        const head=panel.querySelector('.gi-moveset-head');for(const [k,v] of Object.entries(working)){const node=head.querySelector(`[data-k="${k}"]`);if(node)node.value=v ?? '';}
        working.moves.forEach((move,i)=>{
            const section=panel.querySelector(`.gi-move-edit[data-move="${i}"]`);
            section.querySelector('[data-m="name"]').value=move.name;for(const k of ['miss','cost','cooldown']){const n=section.querySelector(`[data-m="${k}"]`);if(n)n.value=move[k] ?? '';}
            const props=characterProperties(getContext(),card),enemy=props.role==='enemy',fallback=move.kind==='normal'&&!enemy?(working.weapon==='catalyst'?props.element:'Physical'):undefined;
            section.querySelector('[data-m="element"]').value=!move.element||move.element===fallback?'':move.element;
            section.querySelector('.gi-effects').innerHTML=move.effects.map((e,j)=>effectRow(e,i,j)).join('');
            move.effects.forEach((e,j)=>{const row=section.querySelector(`[data-effect="${j}"]`);row.querySelector('[data-f="type"]').value=e.type;if(row.querySelector('[data-f="stat"]'))row.querySelector('[data-f="stat"]').value=e.stat;row.querySelector('[data-f="target"]').value=e.target;});
        });
        describe();
    }
    return {refresh:render,dispose(){abort.abort();}};
}
