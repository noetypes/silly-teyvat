import { mainApiAdapter } from './choices-api.js';

export function mountChoices({ host, getContext, adapter = mainApiAdapter, announce }) {
    const panel = document.createElement('aside');
    panel.id = 'gi-choices';
    panel.hidden = true;
    panel.setAttribute('aria-label', 'Suggested replies');
    panel.innerHTML = '<div class="gi-choices-heading"><span class="gi-choice-status" role="status" aria-live="polite"></span><button type="button" class="gi-choice-refresh" title="Regenerate choices" aria-label="Regenerate choices"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 8a8 8 0 1 0 0 8M20 3v6h-6"/></svg></button></div><div class="gi-choice-list qr--buttons"></div>';
    host.append(panel);
    const refresh = panel.querySelector('.gi-choice-refresh');
    const list = panel.querySelector('.gi-choice-list');
    const status = panel.querySelector('.gi-choice-status');
    let key = '';
    let chatKey = '';
    let enabled = false;
    let eligible = false;
    let busy = false;
    let sending = false;
    let choices = [];
    let error = '';
    let timer;
    let controller;
    let revision = 0;
    let lastSync;
    let rendered = '';
    let suggested=true;
    const identity = ctx => JSON.stringify([ctx.getCurrentChatId?.() ?? ctx.chatId ?? '', ctx.characterId ?? null, ctx.groupId ?? null]);
    function render() {
        const signature = JSON.stringify([enabled, eligible, busy, sending, choices, error]);
        if (signature === rendered) return;
        rendered = signature;
        panel.hidden = !enabled || !eligible;
        panel.setAttribute('aria-busy', String(busy));
        refresh.hidden=!suggested;
        refresh.disabled = busy || sending || !eligible;
        status.textContent = error || (busy ? 'Finding replies…' : sending ? 'Sending…' : '');
        status.classList.toggle('gi-choice-error', Boolean(error));
        list.replaceChildren(...choices.map(text => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'gi-choice qr--button';
            button.textContent = text;
            button.setAttribute('aria-label', text);
            button.disabled = busy || sending;
            button.addEventListener('click', () => send(text));
            return button;
        }));
    }
    function cancel() {
        revision++;
        clearTimeout(timer);
        controller?.abort();
        controller = undefined;
        busy = false;
    }
    async function generate() {
        if (!enabled || !eligible || !suggested || busy || sending) return;
        clearTimeout(timer);
        const version = ++revision;
        const request = new AbortController();
        controller = request;
        const signal = request.signal;
        const timeout = setTimeout(() => request.abort(new Error('Choices timed out. Try refreshing.')), 45000);
        busy = true;
        error = '';
        render();
        try {
            const result = await adapter.generate(getContext(), signal);
            if (version !== revision || signal.aborted) return;
            choices = result;
            announce('Three suggested replies ready. Selecting one sends it.');
        } catch (cause) {
            if (version !== revision) return;
            error = signal.aborted ? 'Choices timed out. Try refreshing.' : cause.message || 'Could not generate choices. Try refreshing.';
        } finally {
            clearTimeout(timeout);
            if (version === revision) { busy = false; controller = undefined; render(); }
        }
    }
    async function send(text) {
        if (busy || sending || !enabled || !eligible) return;
        const origin = chatKey;
        const originKey = key;
        sending = true;
        error = '';
        render();
        try {
            await adapter.send(getContext(), text, () => enabled && identity(getContext()) === origin);
            if (identity(getContext()) === origin && key === originKey) { choices = []; eligible = false; }
        } catch (cause) {
            if (identity(getContext()) === origin) error = cause.message || 'Could not send this reply.';
        } finally {
            sending = false;
            if (lastSync) sync(lastSync);
            else render();
        }
    }
    function sync({ on, generating, suggested:showSuggestions=true }) {
        lastSync = { on, generating, suggested:showSuggestions };
        suggested=showSuggestions;
        const ctx = getContext();
        const latest = ctx.chat?.at(-1);
        const nextChatKey = identity(ctx);
        const nextKey = JSON.stringify([nextChatKey, ctx.chat?.length, latest?.name, latest?.mes, latest?.swipe_id]);
        const nextEligible = Boolean(on && !generating && latest && !latest.is_user && !latest.is_system && (suggested && latest.extra?.type!=='narrator' && latest.mes?.trim()));
        if (key !== nextKey || enabled !== on || eligible && !nextEligible) {
            cancel();
            choices = [];
            error = '';
            key = nextKey;
        }
        chatKey = nextChatKey;
        enabled = on;
        const becameEligible = !eligible && nextEligible;
        eligible = nextEligible;
        if (suggested && eligible && !busy && !sending && (becameEligible || !panel.dataset.attempted || panel.dataset.attempted !== key)) {
            panel.dataset.attempted = key;
            clearTimeout(timer);
            timer = setTimeout(generate, 450);
        }
        render();
    }
    refresh.addEventListener('click', generate);
    return {
        sync, regenerate: generate,
        reset() { cancel(); key = ''; eligible = false; choices = []; error = ''; delete panel.dataset.attempted; render(); },
        dispose() { cancel(); enabled = false; panel.remove(); },
    };
}
