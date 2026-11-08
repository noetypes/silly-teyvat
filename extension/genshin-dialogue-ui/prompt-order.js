// Silly Teyvat prompts in SillyTavern's prompt order (AI Config → Prompts).
// With Chat Completion, each prompt meant for the roleplay model is a prompt-manager entry, so
// users can drag it, toggle it and edit it there; the extension writes the text instead of
// injecting hidden extension prompts. Writing style, Characterization and Game systems are
// two-way: an edit in AI Config becomes the Silly Teyvat setting and the other way round.
// World scale, Combat state, Trust and Twin roles are rewritten every turn; only their place and toggle are the user's.
// Text Completion has no prompt order, so it keeps the extension-prompt injections.
export const ORDERED = [
    {key:'silly_teyvat_rp_character',name:'Silly Teyvat: Characterization',editable:'character',after:'main'},
    {key:'silly_teyvat_rp_systems',name:'Silly Teyvat: Game systems',editable:'systems',after:'silly_teyvat_rp_character'},
    {key:'silly_teyvat_trust',name:'Silly Teyvat: Trust (updates each turn)',after:'silly_teyvat_rp_systems'},
    {key:'silly_teyvat_twins',name:'Silly Teyvat: Twin roles (updates each turn)',after:'silly_teyvat_trust'},
    {key:'silly_teyvat_enemy_persona',name:'Silly Teyvat: Enemy persona (updates each turn)',after:'silly_teyvat_twins'},
    {key:'silly_teyvat_rp_style',name:'Silly Teyvat: Writing style',editable:'style',after:'chatHistory'},
    {key:'silly_teyvat_world_scale',name:'Silly Teyvat: World scale (updates each turn)',after:'silly_teyvat_rp_style'},
    {key:'silly_teyvat_combat',name:'Silly Teyvat: Combat state (updates each turn)',after:'silly_teyvat_world_scale'},
];
const GLOBAL_ORDER_ID = 100001;
const written = new Map();

const settingsOf = ctx => ctx?.chatCompletionSettings;
// The prompt order is in use only for Chat Completion with a prompt list.
export const usesPromptOrder = ctx => ctx?.mainApi === 'openai' && Array.isArray(settingsOf(ctx)?.prompts) && Array.isArray(settingsOf(ctx)?.prompt_order);

function orderList(settings) {
    let list = settings.prompt_order.find(entry => String(entry.character_id) === String(GLOBAL_ORDER_ID));
    if (!list) { list = {character_id: GLOBAL_ORDER_ID, order: []}; settings.prompt_order.push(list); }
    return list.order;
}
// Adds missing entries once, next to their anchor; never moves or re-enables what the user arranged.
function ensureEntries(settings) {
    let changed = false;
    const order = orderList(settings);
    for (const item of ORDERED) {
        if (!settings.prompts.some(p => p.identifier === item.key)) {
            settings.prompts.push({identifier:item.key,name:item.name,role:'system',content:'',system_prompt:false,marker:false,injection_position:0,injection_depth:4,forbid_overrides:false});
            changed = true;
        }
        if (!order.some(entry => entry.identifier === item.key)) {
            const anchor = order.findIndex(entry => entry.identifier === item.after);
            order.splice(anchor < 0 ? order.length : anchor + 1, 0, {identifier:item.key,enabled:true});
            changed = true;
        }
    }
    return changed;
}
const promptOf = (settings, key) => settings.prompts.find(p => p.identifier === key);

/**
 * Brings the prompt order up to date. `values` maps keys to the text Silly Teyvat wants there;
 * `editable` reads and writes the editable prompts ({read(id), write(id, text)}).
 * Returns true when the prompt order is in use (callers then blank their extension prompts).
 */
export function syncPromptOrder(ctx, values = {}, editable = null) {
    if (!usesPromptOrder(ctx)) return false;
    const settings = settingsOf(ctx);
    let changed = ensureEntries(settings);
    for (const item of ORDERED) {
        const prompt = promptOf(settings, item.key);
        if (!prompt) continue;
        if (item.editable && editable) {
            const mine = editable.read(item.editable), theirs = typeof prompt.content === 'string' ? prompt.content : '';
            const last = written.get(item.key);
            // Edited in AI Config since we last wrote it (or a preset brought its own text): adopt it.
            if (theirs !== mine && (last === undefined ? theirs !== '' : theirs !== last)) { editable.write(item.editable, theirs); written.set(item.key, theirs); continue; }
            if (theirs !== mine) { prompt.content = mine; changed = true; }
            written.set(item.key, mine);
        } else if (item.key in values && prompt.content !== values[item.key]) {
            prompt.content = values[item.key]; changed = true;
        }
    }
    if (changed) ctx.saveSettingsDebounced?.();
    return true;
}

// Removes Silly Teyvat prompt text from a finished Chat Completion prompt when it should not be sent
// (quiet summaries, Silly Teyvat off). Handles squashed system messages too.
export function stripPrompts(chat, texts) {
    const drop = texts.map(t => String(t || '').trim()).filter(Boolean);
    if (!drop.length || !Array.isArray(chat)) return;
    for (let i = chat.length - 1; i >= 0; i--) {
        const message = chat[i];
        if (typeof message?.content !== 'string') continue;
        let content = message.content;
        for (const text of drop) content = content.split(text).join('');
        if (content === message.content) continue;
        if (content.trim()) message.content = content.replace(/\n{3,}/g, '\n\n').trim(); else chat.splice(i, 1);
    }
}

// On unload, blank the entries so a disabled extension sends nothing; the next load writes them again.
export function clearPromptOrder(ctx) {
    if (!usesPromptOrder(ctx)) return;
    let changed = false;
    for (const item of ORDERED) {
        const prompt = promptOf(settingsOf(ctx), item.key);
        if (prompt && prompt.content) { prompt.content = ''; changed = true; }
        written.set(item.key, '');
    }
    if (changed) ctx.saveSettingsDebounced?.();
}
