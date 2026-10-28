// Synthesised battle sounds: elemental impacts, reactions, heals, buffs, bursts and
// fanfares. Everything is generated with Web Audio; no recorded game audio is bundled.
export function createBattleSound() {
    let ctx, master, air, noise, volume = 0;
    function ready() {
        if (!volume) return false;
        const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!Audio) return false;
        try {
            ctx ??= new Audio();
            if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
            if (!master) {
                master = ctx.createDynamicsCompressor(); master.threshold.value = -14; master.ratio.value = 4; master.connect(ctx.destination);
                // A short feedback echo gives bursts and fanfares some space.
                air = ctx.createDelay(.5); air.delayTime.value = .13; const feedback = ctx.createGain(); feedback.gain.value = .32; const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 2600;
                air.connect(tone).connect(feedback).connect(air); tone.connect(master);
            }
            if (!noise) {
                noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 1.2), ctx.sampleRate);
                const data = noise.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
            }
            return ctx.state !== 'closed';
        } catch { return false; }
    }
    const now = () => ctx.currentTime + .004;
    function bus(gain, {pan = 0, wet = 0} = {}) {
        const g = ctx.createGain(); g.gain.value = gain * volume;
        const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        if (p) { p.pan.value = Math.max(-1, Math.min(1, pan)); g.connect(p).connect(master); } else g.connect(master);
        if (wet) { const send = ctx.createGain(); send.gain.value = wet; g.connect(send).connect(air); }
        return g;
    }
    function env(node, at, attack, peak, decay) {
        node.gain.setValueAtTime(.0001, at); node.gain.linearRampToValueAtTime(peak, at + attack); node.gain.exponentialRampToValueAtTime(.0001, at + attack + decay);
    }
    function hiss(at, {type = 'bandpass', freq = 1200, to, q = 1, gain = .5, attack = .005, decay = .2, out}) {
        const src = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), e = ctx.createGain();
        src.buffer = noise; filter.type = type; filter.Q.value = q; filter.frequency.setValueAtTime(freq, at);
        if (to) filter.frequency.exponentialRampToValueAtTime(to, at + attack + decay);
        env(e, at, attack, gain, decay); src.connect(filter).connect(e).connect(out);
        src.start(at, Math.random() * .5); src.stop(at + attack + decay + .05);
    }
    function tone(at, {type = 'sine', freq = 440, to, gain = .3, attack = .004, decay = .3, out}) {
        const osc = ctx.createOscillator(), e = ctx.createGain();
        osc.type = type; osc.frequency.setValueAtTime(freq, at); if (to) osc.frequency.exponentialRampToValueAtTime(to, at + attack + decay);
        env(e, at, attack, gain, decay); osc.connect(e).connect(out); osc.start(at); osc.stop(at + attack + decay + .05);
    }
    const thud = (at, out, s = 1) => { tone(at, {freq: 150, to: 45, gain: .7 * s, decay: .22, out}); hiss(at, {type: 'lowpass', freq: 900, gain: .4 * s, decay: .09, out}); };
    const IMPACT = {
        Pyro(at, out, s) { thud(at, out, .6 * s); hiss(at, {type: 'lowpass', freq: 500, to: 3200, gain: .55 * s, attack: .02, decay: .35, out}); },
        Hydro(at, out, s) { tone(at, {freq: 900, to: 260, gain: .35 * s, decay: .16, out}); hiss(at + .03, {freq: 2200, to: 900, q: 2, gain: .4 * s, attack: .01, decay: .28, out}); },
        Anemo(at, out, s) { hiss(at, {freq: 400, to: 2600, q: 3, gain: .6 * s, attack: .05, decay: .32, out}); tone(at, {type: 'triangle', freq: 660, to: 990, gain: .08 * s, decay: .3, out}); },
        Electro(at, out, s) { for (let i = 0; i < 5; i++) tone(at + i * .028, {type: 'square', freq: 300 + Math.random() * 1800, gain: .09 * s, decay: .03, out}); hiss(at, {type: 'highpass', freq: 3000, gain: .35 * s, decay: .12, out}); thud(at, out, .35 * s); },
        Dendro(at, out, s) { tone(at, {type: 'triangle', freq: 520, to: 780, gain: .22 * s, decay: .18, out}); hiss(at, {freq: 1600, q: 1.5, gain: .3 * s, decay: .14, out}); thud(at, out, .3 * s); },
        Cryo(at, out, s) { for (const [i, f] of [2637, 3520, 4186].entries()) tone(at + i * .03, {type: 'triangle', freq: f, gain: .09 * s, decay: .4, out}); hiss(at, {type: 'highpass', freq: 4500, gain: .35 * s, decay: .1, out}); thud(at, out, .35 * s); },
        Geo(at, out, s) { thud(at, out, s); hiss(at + .02, {type: 'lowpass', freq: 1400, q: .7, gain: .5 * s, decay: .18, out}); },
        Physical(at, out, s) { thud(at, out, .9 * s); hiss(at, {freq: 2400, q: .9, gain: .45 * s, decay: .06, out}); },
    };
    const REACTION = {
        Vaporize(at, out) { hiss(at, {type: 'highpass', freq: 1800, to: 6000, gain: .5, attack: .02, decay: .55, out}); },
        Melt(at, out) { hiss(at, {freq: 900, to: 300, q: 2, gain: .45, attack: .03, decay: .5, out}); tone(at, {freq: 600, to: 200, gain: .15, decay: .5, out}); },
        Overloaded(at, out) { tone(at, {freq: 90, to: 30, gain: .9, decay: .6, out}); hiss(at, {type: 'lowpass', freq: 3000, to: 200, gain: .8, decay: .55, out}); },
        Superconduct(at, out) { tone(at, {type: 'sawtooth', freq: 1800, to: 300, gain: .12, decay: .35, out}); hiss(at, {type: 'highpass', freq: 5000, gain: .3, decay: .25, out}); },
        'Electro-Charged'(at, out) { for (let i = 0; i < 8; i++) tone(at + i * .04, {type: 'square', freq: 800 + Math.random() * 2400, gain: .06, decay: .025, out}); },
        Frozen(at, out) { hiss(at, {type: 'highpass', freq: 6000, gain: .4, decay: .2, out}); for (const [i, f] of [1568, 2093, 3136].entries()) tone(at + i * .05, {type: 'triangle', freq: f, gain: .1, decay: .6, out}); },
        Shatter(at, out) { for (let i = 0; i < 6; i++) tone(at + i * .022, {type: 'triangle', freq: 2500 + Math.random() * 3000, gain: .1, decay: .25, out}); hiss(at, {type: 'highpass', freq: 3500, gain: .5, decay: .2, out}); },
        Swirl(at, out) { hiss(at, {freq: 300, to: 3200, q: 5, gain: .6, attack: .1, decay: .45, out}); },
        Crystallize(at, out) { for (const [i, f] of [1319, 1976, 2637].entries()) tone(at + i * .06, {freq: f, gain: .12, decay: .7, out}); },
        Bloom(at, out) { tone(at, {type: 'triangle', freq: 330, to: 660, gain: .2, decay: .3, out}); tone(at + .08, {type: 'triangle', freq: 495, to: 990, gain: .16, decay: .3, out}); },
        Burning(at, out) { hiss(at, {type: 'lowpass', freq: 700, to: 2400, gain: .5, attack: .08, decay: .5, out}); },
        Quicken(at, out) { tone(at, {type: 'square', freq: 660, to: 1320, gain: .07, decay: .15, out}); tone(at + .06, {type: 'triangle', freq: 990, gain: .12, decay: .2, out}); },
        Aggravate(at, out) { REACTION['Electro-Charged'](at, out); thud(at, out, .5); },
        Spread(at, out) { REACTION.Bloom(at, out); thud(at, out, .5); },
    };
    function chord(at, notes, {type = 'triangle', gain = .1, decay = .9, step = 0, out}) { notes.forEach((f, i) => tone(at + i * step, {type, freq: f, gain, decay, out})); }
    const api = {
        setVolume(value) { volume = Math.max(0, Math.min(1, Number(value) || 0)); },
        unlock() { if (ready() && ctx.state === 'suspended') void ctx.resume().catch(() => {}); },
        hit({element = 'Physical', amount = 4, crit = false, reaction = '', pan = 0, party = false} = {}) {
            if (!ready()) return; const at = now(), out = bus(.9, {pan, wet: crit ? .3 : .08}), s = Math.min(1.3, .6 + amount / 14);
            (IMPACT[element] || IMPACT.Physical)(at, out, s);
            if (party) { tone(at, {type: 'sawtooth', freq: 220, to: 110, gain: .08, decay: .2, out}); }
            if (crit) chord(at + .03, [1760, 2637], {gain: .07, decay: .3, out});
            for (const name of String(reaction).split(' + ').filter(Boolean)) REACTION[name]?.(at + .06, bus(.85, {pan, wet: .25}));
        },
        // A card slapped onto the table: a paper flick, a soft felt tap and a small chime.
        card() { if (!ready()) return; const at = now(), out = bus(.55, {wet: .2}); hiss(at, {freq: 3200, to: 1400, q: 1.4, gain: .35, attack: .006, decay: .07, out}); thud(at + .05, out, .25); tone(at + .07, {type: 'triangle', freq: 1568, gain: .07, decay: .25, out}); },
        // A reaction's combat status (Dendro Core, Catalyzing Field) settling beside the plate.
        field() { if (!ready()) return; const at = now(), out = bus(.5, {wet: .4}); chord(at, [659, 988, 1319], {gain: .08, step: .05, decay: .5, out}); },
        miss() { if (!ready()) return; const at = now(), out = bus(.5); hiss(at, {freq: 2000, to: 600, q: 2, gain: .4, attack: .02, decay: .18, out}); },
        heal() { if (!ready()) return; const at = now(), out = bus(.6, {wet: .4}); chord(at, [784, 988, 1175, 1568], {gain: .09, step: .07, decay: .7, out}); },
        shield() { if (!ready()) return; const at = now(), out = bus(.6, {wet: .3}); chord(at, [523, 1046, 1568], {type: 'sine', gain: .12, decay: .8, out}); hiss(at, {type: 'highpass', freq: 5000, gain: .15, decay: .3, out}); },
        buff() { if (!ready()) return; const at = now(), out = bus(.6, {wet: .3}); chord(at, [523, 659, 784, 1046], {gain: .1, step: .06, decay: .45, out}); },
        debuff() { if (!ready()) return; const at = now(), out = bus(.6, {wet: .2}); chord(at, [622, 523, 440, 370], {type: 'sawtooth', gain: .045, step: .07, decay: .4, out}); },
        summon() { if (!ready()) return; const at = now(), out = bus(.6, {wet: .4}); tone(at, {type: 'triangle', freq: 392, to: 1568, gain: .14, attack: .02, decay: .5, out}); hiss(at, {freq: 800, to: 4000, q: 2, gain: .2, attack: .1, decay: .4, out}); },
        select() { if (!ready()) return; const at = now(), out = bus(.4); tone(at, {type: 'triangle', freq: 1320, gain: .12, decay: .07, out}); },
        assign() { if (!ready()) return; const at = now(), out = bus(.45); tone(at, {type: 'triangle', freq: 880, gain: .12, decay: .08, out}); tone(at + .05, {type: 'triangle', freq: 1320, gain: .1, decay: .12, out}); },
        deny() { if (!ready()) return; const at = now(), out = bus(.4); tone(at, {type: 'square', freq: 196, gain: .06, decay: .12, out}); },
        phase() { if (!ready()) return; const at = now(), out = bus(.5, {wet: .5}); tone(at, {freq: 196, gain: .3, decay: 1.2, out}); tone(at, {type: 'triangle', freq: 392, gain: .08, decay: 1, out}); },
        act(kind = 'normal', element = 'Physical') {
            if (!ready()) return; const at = now(), out = bus(.5);
            if (kind === 'skill') { hiss(at, {freq: 500, to: 2500, q: 2, gain: .35, attack: .05, decay: .2, out}); tone(at, {type: 'triangle', freq: 660, to: 990, gain: .1, decay: .2, out}); }
            else hiss(at, {freq: 1500, to: 3000, q: 1.2, gain: .3, attack: .03, decay: .12, out});
            void element;
        },
        burst(element = 'Physical') {
            if (!ready()) return; const at = now(), out = bus(.9, {wet: .5});
            // Rising charge, an impact boom, then a bright elemental shimmer.
            hiss(at, {freq: 200, to: 5000, q: 1.4, gain: .5, attack: .55, decay: .15, out});
            tone(at, {type: 'sawtooth', freq: 110, to: 440, gain: .08, attack: .5, decay: .2, out});
            tone(at + .62, {freq: 70, to: 28, gain: 1, decay: .9, out}); hiss(at + .62, {type: 'lowpass', freq: 4000, to: 150, gain: .8, decay: .8, out});
            const shimmer = {Pyro: [523, 659, 784], Hydro: [587, 740, 880], Anemo: [659, 880, 1109], Electro: [554, 698, 831], Dendro: [523, 698, 880], Cryo: [784, 1046, 1318], Geo: [440, 554, 659]}[element] || [523, 659, 784];
            chord(at + .7, shimmer.map(f => f * 2), {gain: .09, step: .05, decay: 1.2, out});
        },
        enrage() { if (!ready()) return; const at = now(), out = bus(.7, {wet: .3}); tone(at, {type: 'sawtooth', freq: 70, to: 140, gain: .25, attack: .1, decay: .5, out}); hiss(at, {type: 'lowpass', freq: 300, to: 1200, gain: .4, attack: .1, decay: .5, out}); },
        defeat() { if (!ready()) return; const at = now(), out = bus(.8, {wet: .4}); tone(at, {freq: 120, to: 30, gain: .8, decay: 1, out}); hiss(at, {type: 'lowpass', freq: 2000, to: 100, gain: .5, decay: .9, out}); chord(at + .15, [392, 330, 262], {type: 'triangle', gain: .07, step: .12, decay: .6, out}); },
        downed() { if (!ready()) return; const at = now(), out = bus(.6, {wet: .3}); chord(at, [440, 349, 294, 220], {type: 'sine', gain: .12, step: .14, decay: .7, out}); },
        victory() { if (!ready()) return; const at = now(), out = bus(.7, {wet: .5}); [[523, 659, 784], [587, 740, 880], [784, 988, 1175, 1568]].forEach((notes, i) => chord(at + i * .2, notes, {type: 'triangle', gain: .1, decay: i === 2 ? 1.6 : .3, out})); },
        wipe() { if (!ready()) return; const at = now(), out = bus(.6, {wet: .5}); chord(at, [392, 311, 262, 196], {type: 'sine', gain: .14, step: .25, decay: 1.2, out}); },
        dispose() { void ctx?.close?.().catch(() => {}); ctx = master = air = noise = undefined; },
    };
    return api;
}
