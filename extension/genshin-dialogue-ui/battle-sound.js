// Synthesised battle sounds: elemental impacts, reactions, heals, buffs, bursts and
// fanfares. Everything is generated with Web Audio; no recorded game audio is bundled.
// clips: false keeps every sound synthesised (the audition page compares both).
export function createBattleSound({clips = true} = {}) {
    let ctx, master, air, hall, noise, volume = 0;
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
                // A generated hall (decaying stereo noise) gives Bursts a big room to ring in.
                hall = ctx.createConvolver(); const len = Math.floor(ctx.sampleRate * 2.2), ir = ctx.createBuffer(2, len, ctx.sampleRate);
                for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
                hall.buffer = ir; const hallGain = ctx.createGain(); hallGain.gain.value = .55; hall.connect(hallGain).connect(master);
            }
            if (!noise) {
                noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 1.2), ctx.sampleRate);
                const data = noise.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
            }
            return ctx.state !== 'closed';
        } catch { return false; }
    }
    const now = () => ctx.currentTime + .004;
    function bus(gain, {pan = 0, wet = 0, room = 0} = {}) {
        const g = ctx.createGain(); g.gain.value = gain * volume;
        const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        if (p) { p.pan.value = Math.max(-1, Math.min(1, pan)); g.connect(p).connect(master); } else g.connect(master);
        if (wet) { const send = ctx.createGain(); send.gain.value = wet; g.connect(send).connect(air); }
        if (room && hall) { const send = ctx.createGain(); send.gain.value = room; g.connect(send).connect(hall); }
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
    // Noise through a resonant filter whose pitch an LFO sweeps: wind, rushing water.
    function wind(at, {freq = 800, q = 6, gain = .4, attack = .1, decay = .8, rate = 3, depth = 400, to, out}) {
        const src = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), e = ctx.createGain(), lfo = ctx.createOscillator(), amount = ctx.createGain();
        src.buffer = noise; src.loop = true; filter.type = 'bandpass'; filter.Q.value = q; filter.frequency.setValueAtTime(freq, at); if (to) filter.frequency.exponentialRampToValueAtTime(to, at + attack + decay);
        lfo.frequency.value = rate; amount.gain.value = depth; lfo.connect(amount).connect(filter.frequency);
        env(e, at, attack, gain, decay); src.connect(filter).connect(e).connect(out);
        src.start(at); lfo.start(at); src.stop(at + attack + decay + .05); lfo.stop(at + attack + decay + .05);
    }
    // Short random pops of noise: fire crackle, static.
    function crackle(at, {count = 14, span = .6, freq = 2500, gain = .25, out}) {
        for (let i = 0; i < count; i++) hiss(at + Math.random() * span, {type: 'highpass', freq: freq * (.7 + Math.random() * .8), gain: gain * (.4 + Math.random() * .6), attack: .001, decay: .015 + Math.random() * .03, out});
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
    const SHIMMER = {Pyro: [523, 659, 784], Hydro: [587, 740, 880], Anemo: [659, 880, 1109], Electro: [554, 698, 831], Dendro: [523, 698, 880], Cryo: [784, 1046, 1318], Geo: [440, 554, 659], Physical: [523, 659, 784]};
    // An Elemental Skill's cast flourish.
    const CAST = {
        Pyro(at, out) { hiss(at, {type: 'lowpass', freq: 400, to: 2800, gain: .4, attack: .04, decay: .3, out}); crackle(at, {count: 6, span: .25, gain: .18, out}); },
        Hydro(at, out) { for (let i = 0; i < 4; i++) tone(at + i * .045, {freq: 500 + i * 180, to: 1100 + i * 260, gain: .1, decay: .07, out}); hiss(at, {freq: 1800, to: 700, q: 2, gain: .25, attack: .02, decay: .25, out}); },
        Anemo(at, out) { wind(at, {freq: 700, to: 2200, q: 8, gain: .45, attack: .06, decay: .35, rate: 9, depth: 300, out}); },
        Electro(at, out) { for (let i = 0; i < 6; i++) tone(at + i * .03, {type: 'square', freq: 600 + Math.random() * 2200, gain: .06, decay: .025, out}); hiss(at, {type: 'highpass', freq: 3500, gain: .25, decay: .1, out}); },
        Dendro(at, out) { chord(at, [659, 880, 1175], {gain: .07, step: .04, decay: .35, out}); hiss(at, {freq: 2400, q: 3, gain: .15, attack: .02, decay: .2, out}); },
        Cryo(at, out) { chord(at, [2093, 2637, 3136], {type: 'sine', gain: .06, step: .035, decay: .45, out}); hiss(at, {type: 'highpass', freq: 6000, gain: .2, decay: .15, out}); },
        Geo(at, out) { thud(at, out, .7); hiss(at, {type: 'lowpass', freq: 900, gain: .35, decay: .2, out}); tone(at, {type: 'triangle', freq: 220, to: 330, gain: .1, decay: .25, out}); },
        Physical(at, out) { hiss(at, {freq: 2200, to: 900, q: 1.5, gain: .3, attack: .02, decay: .15, out}); },
    };
    // A Burst's signature as it lands.
    const BURST = {
        Pyro(at, out) { hiss(at, {type: 'lowpass', freq: 300, to: 3600, gain: .8, attack: .03, decay: .9, out}); crackle(at + .05, {count: 40, span: 1.1, freq: 1800, gain: .3, out}); tone(at, {type: 'sawtooth', freq: 110, to: 55, gain: .12, decay: .8, out}); },
        Hydro(at, out) { wind(at, {freq: 1400, to: 400, q: 2.5, gain: .7, attack: .08, decay: .9, rate: 5, depth: 300, out}); for (let i = 0; i < 12; i++) tone(at + .25 + Math.random() * .6, {freq: 400 + Math.random() * 500, to: 1200 + Math.random() * 900, gain: .07, decay: .05, out}); },
        Anemo(at, out) { wind(at, {freq: 500, to: 2600, q: 9, gain: .7, attack: .2, decay: 1.1, rate: 6, depth: 600, out}); wind(at + .1, {freq: 1200, to: 600, q: 12, gain: .4, attack: .25, decay: .9, rate: 8, depth: 400, out}); tone(at, {type: 'triangle', freq: 880, to: 1760, gain: .07, attack: .3, decay: .7, out}); },
        Electro(at, out) { for (const t of [0, .14, .3, .46]) { hiss(at + t, {type: 'highpass', freq: 2500, gain: .7, attack: .002, decay: .09, out}); thud(at + t, out, .6); } hiss(at + .05, {type: 'lowpass', freq: 500, to: 60, gain: .8, attack: .05, decay: 1.4, out}); crackle(at, {count: 24, span: .7, freq: 4000, gain: .25, out}); },
        Dendro(at, out) { chord(at, [392, 523, 659, 784, 1046], {gain: .1, step: .06, decay: 1.1, out}); wind(at, {freq: 2600, q: 4, gain: .3, attack: .1, decay: .8, rate: 14, depth: 900, out}); tone(at, {type: 'triangle', freq: 196, to: 392, gain: .15, attack: .1, decay: .8, out}); },
        Cryo(at, out) { for (let i = 0; i < 14; i++) tone(at + .3 + Math.random() * .3, {type: 'triangle', freq: 2200 + Math.random() * 3600, gain: .07, decay: .3, out}); hiss(at + .32, {type: 'highpass', freq: 3500, gain: .7, attack: .002, decay: .35, out}); hiss(at, {freq: 4500, to: 1500, q: 2, gain: .3, attack: .25, decay: .1, out}); },
        Geo(at, out) { hiss(at, {freq: 900, to: 300, q: 1, gain: .4, attack: .3, decay: .05, out}); thud(at + .34, out, 1.6); tone(at + .34, {freq: 45, to: 22, gain: 1, decay: 1.2, out}); hiss(at + .34, {type: 'lowpass', freq: 1800, to: 120, gain: .9, decay: 1, out}); for (let i = 0; i < 8; i++) thud(at + .45 + Math.random() * .5, out, .25); },
        Physical(at, out) { for (let i = 0; i < 3; i++) { hiss(at + i * .1, {freq: 3000, to: 1200, q: 1.4, gain: .5, attack: .01, decay: .1, out}); thud(at + i * .1 + .04, out, .7); } },
    };
    function chord(at, notes, {type = 'triangle', gain = .1, decay = .9, step = 0, out}) { notes.forEach((f, i) => tone(at + i * step, {type, freq: f, gain, decay, out})); }
    const api = {
        setVolume(value) { volume = Math.max(0, Math.min(1, Number(value) || 0)); },
        lead() { return 0; },
        unlock() { if (ready() && ctx.state === 'suspended') void ctx.resume().catch(() => {}); },
        hit({element = 'Physical', amount = 4, crit = false, reaction = '', pan = 0, party = false, big = false} = {}) {
            if (!ready()) return; const at = now(), out = bus(.9, {pan, wet: crit ? .3 : .08, room: big ? .45 : crit ? .2 : 0}), s = Math.min(big ? 1.6 : 1.3, .6 + amount / 14 + (big ? .3 : 0));
            (IMPACT[element] || IMPACT.Physical)(at, out, s);
            if (big) { tone(at, {freq: 90, to: 32, gain: .6, decay: .5, out}); hiss(at + .01, {type: 'lowpass', freq: 2400, to: 200, gain: .35, decay: .4, out}); }
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
        // The End Phase: a fuller gong than the other phase banners.
        phaseEnd() { if (!ready()) return; const at = now(), out = bus(.55, {wet: .55}); tone(at, {freq: 147, gain: .32, decay: 1.6, out}); tone(at, {freq: 196, gain: .2, decay: 1.3, out}); tone(at, {type: 'triangle', freq: 392, gain: .08, decay: 1.1, out}); },
        // A move starting: a swing for a Normal Attack, an elemental cast for a Skill.
        act(kind = 'normal', element = 'Physical') {
            if (!ready()) return; const at = now(), out = bus(.5, {wet: .2});
            if (kind === 'skill') { hiss(at, {freq: 500, to: 2500, q: 2, gain: .35, attack: .05, decay: .2, out}); (CAST[element] || CAST.Physical)(at, out); }
            else hiss(at, {freq: 1500, to: 3000, q: 1.2, gain: .3, attack: .03, decay: .12, out});
        },
        // Energy gathering before a Burst: a rising roar that tightens into the element's colour.
        charge(element = 'Physical') {
            if (!ready()) return;
            const at = now(), out = bus(.75, {wet: .3, room: .4});
            hiss(at, {freq: 180, to: 4200, q: 2.2, gain: .5, attack: .5, decay: .08, out});
            tone(at, {type: 'sawtooth', freq: 80, to: 320, gain: .1, attack: .48, decay: .1, out});
            tone(at, {freq: 160, to: 640, gain: .14, attack: .48, decay: .1, out});
            (CAST[element] || CAST.Physical)(at + .3, out);
        },
        // The splash art arriving: a whoosh, a boom and the element's chord.
        burst(element = 'Physical') {
            if (!ready()) return; const at = now(), out = bus(.9, {wet: .4, room: .6});
            hiss(at, {freq: 300, to: 5000, q: 1.4, gain: .45, attack: .3, decay: .12, out});
            tone(at + .32, {freq: 70, to: 28, gain: 1, decay: 1, out}); hiss(at + .32, {type: 'lowpass', freq: 4000, to: 150, gain: .7, decay: .8, out});
            chord(at + .36, (SHIMMER[element] || SHIMMER.Physical).map(f => f * 2), {gain: .09, step: .05, decay: 1.4, out});
        },
        // The Burst landing on the board: each element has its own signature over a sub-bass hit.
        burstImpact(element = 'Physical') {
            if (!ready()) return;
            const at = now(), out = bus(1, {wet: .3, room: .7});
            tone(at, {freq: 58, to: 24, gain: 1.1, decay: 1.2, out}); thud(at, out, 1.2);
            (BURST[element] || BURST.Physical)(at, out);
            chord(at + .12, (SHIMMER[element] || SHIMMER.Physical), {gain: .08, step: .07, decay: 1.6, out});
        },
        enrage() { if (!ready()) return; const at = now(), out = bus(.7, {wet: .3}); tone(at, {type: 'sawtooth', freq: 70, to: 140, gain: .25, attack: .1, decay: .5, out}); hiss(at, {type: 'lowpass', freq: 300, to: 1200, gain: .4, attack: .1, decay: .5, out}); },
        defeat() { if (!ready()) return; const at = now(), out = bus(.8, {wet: .4}); tone(at, {freq: 120, to: 30, gain: .8, decay: 1, out}); hiss(at, {type: 'lowpass', freq: 2000, to: 100, gain: .5, decay: .9, out}); chord(at + .15, [392, 330, 262], {type: 'triangle', gain: .07, step: .12, decay: .6, out}); },
        downed() { if (!ready()) return; const at = now(), out = bus(.6, {wet: .3}); chord(at, [440, 349, 294, 220], {type: 'sine', gain: .12, step: .14, decay: .7, out}); },
        victory() { if (!ready()) return; const at = now(), out = bus(.7, {wet: .5}); [[523, 659, 784], [587, 740, 880], [784, 988, 1175, 1568]].forEach((notes, i) => chord(at + i * .2, notes, {type: 'triangle', gain: .1, decay: i === 2 ? 1.6 : .3, out})); },
        wipe() { if (!ready()) return; const at = now(), out = bus(.6, {wet: .5}); chord(at, [392, 311, 262, 196], {type: 'sine', gain: .14, step: .25, decay: 1.2, out}); },
        // Genius Invokation's table sounds (1.61): the coin, dealt cards, turn chimes, switching and the round's end.
        // The coin spinning; coinLand() is the moment it settles (the board times it to the coin's landing).
        coin() { if (!ready()) return; const at = now(), out = bus(.6, {wet: .35, room: .25}); for (let i = 0; i < 9; i++) tone(at + i * .2 * (1 - i * .05), {type: 'triangle', freq: 2637 + (i % 2) * 400, gain: .05, decay: .06, out}); },
        coinLand() { if (!ready()) return; const at = now(), out = bus(.6, {wet: .35, room: .25}); chord(at, [1568, 2093, 3136], {type: 'sine', gain: .09, decay: 1.2, out}); hiss(at, {type: 'highpass', freq: 5000, gain: .12, decay: .5, out}); },
        deal(count = 1) { if (!ready()) return; const at = now(), out = bus(.5, {wet: .15}); for (let i = 0; i < Math.min(8, count); i++) { hiss(at + i * .11, {freq: 2600, to: 1200, q: 1.2, gain: .28, attack: .01, decay: .09, out}); thud(at + i * .11 + .06, out, .12); } },
        slash() { if (!ready()) return; const at = now(), out = bus(.4); hiss(at, {freq: 4200, to: 1800, q: 1.2, gain: .3, attack: .004, decay: .08, out}); },
        // Cards drawn at the End Phase (dealing a hand is deal()).
        draw(count = 2) { api.deal(count); },
        // A bow: the string drawn (longer for an aimed shot) and the twang of its release.
        bowDraw(charged = false) { if (!ready()) return; const at = now(), out = bus(.4, {wet: .15}); tone(at, {type: 'triangle', freq: 180, to: charged ? 260 : 220, gain: .06, attack: charged ? .45 : .2, decay: .05, out}); hiss(at, {freq: 900, to: 1500, q: 6, gain: .12, attack: charged ? .45 : .2, decay: .04, out}); },
        bowRelease(charged = false) { if (!ready()) return; const at = now(), out = bus(.5, {wet: .2}); tone(at, {type: 'triangle', freq: 330, to: 240, gain: .16, decay: .22, out}); tone(at, {freq: 165, to: 120, gain: .1, decay: .18, out}); hiss(at + .01, {freq: 3200, to: 1400, q: 1.6, gain: charged ? .35 : .22, attack: .004, decay: charged ? .2 : .12, out}); },
        whoosh() { if (!ready()) return; const at = now(), out = bus(.45, {wet: .1}); hiss(at, {freq: 700, to: 2400, q: 1.6, gain: .35, attack: .08, decay: .14, out}); },
        swap() { if (!ready()) return; const at = now(), out = bus(.5, {wet: .3}); hiss(at, {freq: 600, to: 3200, q: 2.5, gain: .32, attack: .1, decay: .2, out}); chord(at + .14, [880, 1319], {type: 'triangle', gain: .07, step: .05, decay: .35, out}); },
        // Your turn: a bright two-note bell. The opponent's: the same bell, lower and darker.
        turn(side = 'party') { if (!ready()) return; const at = now(), out = bus(.55, {wet: .5, room: .3}), k = side === 'party' ? 1 : .75; chord(at, [784 * k, 1175 * k], {type: 'sine', gain: .12, step: .12, decay: 1.1, out}); tone(at, {type: 'triangle', freq: 392 * k, gain: .06, decay: .9, out}); },
        endRound() { if (!ready()) return; const at = now(), out = bus(.5, {wet: .5}); chord(at, [659, 523, 392], {type: 'sine', gain: .1, step: .1, decay: .8, out}); },
        tune(element = 'Omni') { if (!ready()) return; const at = now(), out = bus(.55, {wet: .4}); hiss(at, {freq: 900, to: 5000, q: 3, gain: .25, attack: .2, decay: .1, out}); chord(at + .25, (SHIMMER[element] || SHIMMER.Physical).map(f => f * 2), {gain: .07, step: .04, decay: .6, out}); },
        cardFlash() { if (!ready()) return; const at = now(), out = bus(.6, {wet: .4, room: .3}); hiss(at, {type: 'highpass', freq: 3000, to: 9000, gain: .3, attack: .02, decay: .3, out}); chord(at, [1047, 1568, 2093], {type: 'sine', gain: .08, step: .03, decay: .7, out}); },
        finale() { if (!ready()) return; const at = now(), out = bus(.8, {wet: .4, room: .7}); tone(at, {freq: 55, to: 30, gain: .9, decay: 1.4, out}); hiss(at, {type: 'lowpass', freq: 5000, to: 200, gain: .45, attack: .02, decay: 1.2, out}); chord(at + .2, [523, 784, 1047], {type: 'sine', gain: .06, step: .1, decay: 1.4, out}); },
        dispose() { void ctx?.close?.().catch(() => {}); ctx = master = air = hall = noise = undefined; },
    };
    return clips ? withClips(api, () => (ready() ? {ctx, out: bus(1, {wet: .1})} : null)) : api;
}
// Recorded clips stand in for synthesised sounds: assets/battle-sound/index.json maps a sound to its file,
// as {"coin": "coin.mp3", ...} (turn-party / turn-enemy for the two turn chimes). An entry can also be
// {"file": "deal.mp3", "step": 0.11, "tail": 0.4}: a clip of evenly spaced events (one card flip each),
// of which deal(count) plays the first count; {"file": "draw.mp3", "repeat": 0.11}: one event played
// count times, that far apart; {"file": "hit.mp3", "lead": 0.28}: the clip's transient comes that many
// seconds in, so the board starts it early (lead(name)) to land the hit on the visual. A sound without a clip, or a clip that fails to load,
// stays synthesised. Layered sounds keep their synthesised version under the clip.
const clipBase = new URL('./assets/battle-sound/', import.meta.url);
let clipIndex = null;
const clipIndexReady = () => clipIndex ??= fetch(new URL('index.json', clipBase)).then(r => r.ok ? r.json() : {}).catch(() => ({}));
const LAYERED = new Set(['card']);
const clipKey = (name, args) => name === 'turn' ? `turn-${args[0] === 'enemy' ? 'enemy' : 'party'}` : name;
const FILE = /^[\w-]+\.(mp3|ogg|wav)$/;
function withClips(api, output) {
    const buffers = new Map(), map = {};
    let preloaded = false;
    void clipIndexReady().then(index => {
        for (const [key, entry] of Object.entries(index || {})) {
            const num = (v, max = 2) => Math.max(0, Math.min(max, Number(v) || 0));
            const spec = typeof entry === 'string' ? {file: entry} : entry && typeof entry === 'object' ? {file: entry.file, step: num(entry.step), tail: num(entry.tail), repeat: num(entry.repeat), lead: num(entry.lead)} : null;
            if (spec && typeof spec.file === 'string' && FILE.test(spec.file)) map[key] = spec;
        }
    });
    const load = (c, key) => {
        if (!buffers.has(key)) buffers.set(key, fetch(new URL(map[key].file, clipBase)).then(r => r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status))).then(b => c.decodeAudioData(b)).catch(() => null));
        return buffers.get(key);
    };
    // Decode every clip once sound is on, so the first play is not late.
    const preload = () => { if (preloaded) return; const o = output(); if (!o) return; preloaded = true; void clipIndexReady().then(() => { for (const key of Object.keys(map)) void load(o.ctx, key); }); };
    const wrapped = {...api, unlock() { api.unlock(); preload(); }, setVolume(value) { api.setVolume(value); if (Number(value) > 0) preload(); },
        // Seconds between starting a sound and its transient (0 when synthesised).
        lead(name) { return map[name]?.lead || 0; }};
    for (const [name, fn] of Object.entries(api)) {
        if (['setVolume', 'unlock', 'dispose', 'lead'].includes(name)) continue;
        wrapped[name] = (...args) => {
            const key = clipKey(name, args), spec = map[key];
            if (!spec) return fn(...args);
            const o = output(); if (!o) return;
            preload();
            if (LAYERED.has(name)) fn(...args);
            void load(o.ctx, key).then(buffer => {
                if (!buffer) { delete map[key]; if (!LAYERED.has(name)) fn(...args); return; }
                const src = o.ctx.createBufferSource(), at = o.ctx.currentTime + .004; src.buffer = buffer;
                if (spec.step) {
                    // Only the first `count` events: stop after the last one's tail, with a short fade.
                    const count = Math.max(1, Math.round(Number(args[0]) || 1)), length = Math.min(buffer.duration, (count - 1) * spec.step + (spec.tail || .4));
                    const g = o.ctx.createGain(); g.gain.setValueAtTime(1, at + Math.max(0, length - .06)); g.gain.linearRampToValueAtTime(0, at + length);
                    src.connect(g).connect(o.out); src.start(at); src.stop(at + length + .02);
                } else if (spec.repeat) {
                    const count = Math.max(1, Math.min(10, Math.round(Number(args[0]) || 1)));
                    src.connect(o.out); src.start(at);
                    for (let i = 1; i < count; i++) { const more = o.ctx.createBufferSource(); more.buffer = buffer; more.connect(o.out); more.start(at + i * spec.repeat); }
                } else { src.connect(o.out); src.start(at); }
            });
        };
    }
    return wrapped;
}
