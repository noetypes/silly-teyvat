/* Uses the active main Chat Completion connection with request-local settings, or a saved Connection
   Manager profile chosen in Silly Teyvat settings (Teyvat Choices → Connection). */
import { promptText } from './prompt-templates.js';
import { stripTrustTags } from './trust-tags.js';

export function parseChoices(text) {
    const clean = String(text).replace(/<think>[\s\S]*?<\/think>/gi, '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    let choices;
    try { choices = JSON.parse(clean); }
    catch {
        // Models often introduce the list in a sentence; the array itself is still valid.
        const start = clean.indexOf('['), end = clean.lastIndexOf(']');
        try { choices = JSON.parse(clean.slice(start, end + 1)); } catch { throw new Error('The model did not return three choices. Try refreshing.'); }
    }
    if (!Array.isArray(choices) || choices.length !== 3 || choices.some(value => typeof value !== 'string' || !value.trim() || value.trim().length > 200)) {
        throw new Error('The model did not return three short choices. Try refreshing.');
    }
    choices = choices.map(value => value.trim());
    if (new Set(choices.map(value => value.toLowerCase())).size !== 3) throw new Error('The model repeated a choice. Try refreshing.');
    return choices;
}

export function choicePrompt(ctx) {
    const character = ctx.characters?.[ctx.characterId];
    const recent = ctx.chat.filter(message => !message.is_system && typeof message.mes === 'string').slice(-10)
        .map(message => ({ speaker: message.name, text: stripTrustTags(message.mes).slice(-1800) }));
    const system = promptText(ctx, 'choices');
    return [
        { role: 'system', content: ctx.substituteParams ? ctx.substituteParams(system) : system },
        { role: 'user', content: JSON.stringify({ player: ctx.name1, character: ctx.name2, personality: String(character?.data?.personality || character?.personality || '').slice(0, 1200), conversation: recent }) },
    ];
}

// ST's Custom backend forwards extra provider parameters through YAML. JSON is
// valid YAML too. Preserve connection fields but prevent preset extras from
// overriding the small, non-streaming choice request or re-enabling thinking.
export function finalizeChoiceRequest(data, yaml) {
    data.stream = false;
    data.n = 1;
    data.max_tokens = 240;
    data.include_reasoning = false;
    data.reasoning_effort = 'none';
    data.enable_web_search = false;
    data.tools = [];
    delete data.tool_choice;
    data.stop = [];
    if (data.chat_completion_source === 'custom') {
        const parsed = data.custom_include_body ? yaml.parse(data.custom_include_body) : {};
        const extra = parsed && !Array.isArray(parsed) && typeof parsed === 'object' ? { ...parsed } : {};
        for (const key of ['messages', 'prompt', 'model', 'stream', 'n', 'max_tokens', 'max_completion_tokens', 'tools', 'tool_choice', 'stop', 'thinking', 'reasoning', 'reasoning_effort', 'include_reasoning', 'enable_thinking']) delete extra[key];
        if (/deepseek/i.test(data.model)) extra.thinking = { type: 'disabled' };
        else { extra.reasoning_effort = 'none'; extra.enable_thinking = false; }
        // OpenRouter-compatible custom gateways also honor this switch.
        extra.reasoning = { enabled: false, exclude: true };
        data.custom_include_body = JSON.stringify(extra);
        const excluded = data.custom_exclude_body ? yaml.parse(data.custom_exclude_body) : [];
        const keys = Array.isArray(excluded) ? excluded : typeof excluded === 'string' ? [excluded] : Object.keys(excluded || {});
        const required = new Set(['messages', 'model', 'stream', 'max_tokens', 'thinking', 'reasoning', 'reasoning_effort', 'enable_thinking']);
        data.custom_exclude_body = JSON.stringify(keys.filter(key => !required.has(key)));
        if (/deepseek/i.test(data.model)) delete data.reasoning_effort;
    }
    return data;
}

// With reasoning allowed, the player's reasoning preferences stay as they are; only the request
// itself is kept small and non-streaming, including Custom backend YAML extras.
export function finalizeReasoningRequest(data, yaml, maxTokens) {
    Object.assign(data, { stream: false, n: 1, max_tokens: maxTokens, tools: [], enable_web_search: false }); delete data.tool_choice;
    if (data.chat_completion_source === 'custom') {
        const parsed = data.custom_include_body ? yaml.parse(data.custom_include_body) : {};
        const extra = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? { ...parsed } : {};
        for (const key of ['messages', 'prompt', 'model', 'stream', 'n', 'max_tokens', 'max_completion_tokens', 'tools', 'tool_choice', 'enable_web_search']) delete extra[key];
        data.custom_include_body = JSON.stringify(extra);
    }
    return data;
}
// Models that refused a request with reasoning off, remembered until the page reloads. The
// provider's reason does not reach the browser, so any failure with reasoning off is retried once
// with it on, and the model is remembered only when that retry succeeds.
export const reasoningRequired = new Set();
export async function preferReasoningOff(model, prefer, ask, signal) {
    const off = prefer && !reasoningRequired.has(model);
    const first = await ask(off);
    if (!first?.error || !off) return first;
    signal?.throwIfAborted();
    const retry = await ask(false);
    if (!retry?.error) reasoningRequired.add(model);
    return retry;
}

// A saved profile keeps Choices off the roleplay connection. Reasoning models spend part of the
// budget thinking, so this allows more tokens than the main path; the reply is still three lines.
export async function generateWithProfile(ctx, profileId, signal, { service } = {}) {
    service ??= (await import('../../shared.js')).ConnectionManagerRequestService;
    const profile = ctx.extensionSettings.connectionManager?.profiles?.find(p => p.id === profileId);
    if (!profile) throw new Error('The Teyvat Choices connection profile no longer exists. Choose another in Silly Teyvat settings.');
    const prompt = service.constructPrompt(choicePrompt(ctx), profileId);
    signal.throwIfAborted();
    let result;
    try { result = await service.sendRequest(profileId, prompt, 600, { stream: false, signal, includePreset: true }); }
    catch (cause) { if (signal.aborted) throw cause; throw new Error(`Choices could not be generated with ${profile.name || 'the selected profile'}. ${cause?.message || ''}`.trim()); }
    signal.throwIfAborted();
    return parseChoices(typeof result === 'string' ? result : result?.content);
}

export const mainApiAdapter = {
    async generate(ctx, signal) {
        const profileId = ctx.extensionSettings?.genshin_dialogue_ui?.choicesProfile;
        if (profileId) return generateWithProfile(ctx, profileId, signal);
        if (ctx.mainApi !== 'openai') throw new Error('Teyvat Choices needs a Chat Completion main API, or a Choices connection profile in Silly Teyvat settings.');
        const [{ oai_settings, getChatCompletionModel, createGenerationParameters }, { yaml }] = await Promise.all([
            import('../../../openai.js'), import('../../../../lib.js'),
        ]);
        const prompt = choicePrompt(ctx), model = getChatCompletionModel(oai_settings);
        // Reasoning off is cheaper and faster; a model that refuses it is asked again with it on,
        // with room for the thinking it then does.
        const ask = async off => {
            const settings = structuredClone(oai_settings);
            Object.assign(settings, { stream_openai: false, openai_max_tokens: off ? 240 : 600, n: 1, function_calling: false, enable_web_search: false });
            if (off) Object.assign(settings, { show_thoughts: false, reasoning_effort: 'none' });
            const { generate_data } = await createGenerationParameters(settings, getChatCompletionModel(settings), 'quiet', prompt);
            const body = off ? finalizeChoiceRequest(generate_data, yaml) : finalizeReasoningRequest(generate_data, yaml, 600);
            signal.throwIfAborted();
            const response = await fetch('/api/backends/chat-completions/generate', {
                method: 'POST', headers: ctx.getRequestHeaders(), body: JSON.stringify(body), signal,
            });
            if (!response.ok) throw new Error(`Choices could not be generated (HTTP ${response.status}). Check your main API connection and refresh.`);
            return response.json();
        };
        const data = await preferReasoningOff(model, ctx.extensionSettings?.genshin_dialogue_ui?.choicesBypassReasoning !== false, ask, signal);
        if (data.error) throw new Error('The main API could not generate choices. Check its connection and refresh.');
        const content = ctx.extractMessageFromData(data, 'openai');
        return parseChoices(content);
    },
    async send(ctx, text, isCurrent) {
        const { sendMessageAsUser } = await import('../../../../script.js');
        if (!isCurrent()) return;
        // Pass model text as data, never interpolate it into a slash command.
        const sent=await sendMessageAsUser(text, '');
        if (!isCurrent()) return;
        const input = document.querySelector('#send_textarea');
        if (input) { input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); }
        if(!shouldGenerateAfterSend(sent))return;
        await ctx.generate('normal', { automatic_trigger: true });
    },
};

export function shouldGenerateAfterSend(message){const attack=message?.extra?.silly_teyvat_send_attack;return !attack || attack.status==='declined' || attack.status==='resolved'&&!attack.defeated;}
