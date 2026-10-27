// Synthesised dice audio, driven by the physics impacts: a felt-muffled knock
// for table bounces, a bright resin "clack" when dice hit each other or the
// rim, a soft toss whoosh, and a crystalline chime as matching dice light up.
// Everything is generated with Web Audio; no recorded game audio is bundled.
export function createDiceSound() {
    let ctx, master, noise;
    function ready(volume) {
        if (!volume) return false;
        const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!Audio) return false;
        try {
            ctx ??= new Audio();
            if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
            if (!master) { master = ctx.createGain(); master.connect(ctx.destination); }
            master.gain.value = Math.max(0, Math.min(1, volume)) * .7;
            if (!noise) {
                noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * .5), ctx.sampleRate);
                const data = noise.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
            }
            return ctx.state !== 'closed';
        } catch { return false; }
    }
    function out(pan) {
        const node = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
        if (node.pan) node.pan.value = Math.max(-1, Math.min(1, pan * .7));
        node.connect(master); return node;
    }
    function burst(at, {freq, q, gain, decay, pan}) {
        const src = ctx.createBufferSource(), band = ctx.createBiquadFilter(), env = ctx.createGain();
        src.buffer = noise; band.type = 'bandpass'; band.frequency.value = freq; band.Q.value = q;
        env.gain.setValueAtTime(gain, at); env.gain.exponentialRampToValueAtTime(.0001, at + decay);
        src.connect(band).connect(env).connect(out(pan)); src.start(at, Math.random() * .3); src.stop(at + decay + .02);
    }
    function ping(at, {freq, gain, decay, pan, type = 'sine'}) {
        const osc = ctx.createOscillator(), env = ctx.createGain();
        osc.type = type; osc.frequency.setValueAtTime(freq, at); osc.frequency.exponentialRampToValueAtTime(freq * .97, at + decay);
        env.gain.setValueAtTime(.0001, at); env.gain.linearRampToValueAtTime(gain, at + .003); env.gain.exponentialRampToValueAtTime(.0001, at + decay);
        osc.connect(env).connect(out(pan)); osc.start(at); osc.stop(at + decay + .02);
    }
    function hit({kind, strength = .5, pan = 0}) {
        const at = ctx.currentTime + .005, s = Math.max(.05, Math.min(1, strength)), jitter = 1 + (Math.random() - .5) * .12;
        if (kind === 'table') {
            burst(at, {freq: 700 * jitter, q: 1.4, gain: .55 * s, decay: .09, pan});
            ping(at, {freq: 190 * jitter, gain: .35 * s, decay: .11, pan});
        } else if (kind === 'match') {
            for (const [i, f] of [1568, 2349, 3136].entries()) ping(at + i * .045, {freq: f * jitter, gain: .09, decay: .55, pan, type: 'triangle'});
        } else {
            // Die on die / die on rim: hard, bright and short.
            burst(at, {freq: (kind === 'die' ? 3400 : 2600) * jitter, q: 3.5, gain: .65 * s, decay: .045, pan});
            ping(at, {freq: (kind === 'die' ? 2150 : 1650) * jitter, gain: .22 * s, decay: .07, pan, type: 'triangle'});
        }
    }
    return {
        toss(volume) {
            if (!ready(volume)) return;
            const at = ctx.currentTime, src = ctx.createBufferSource(), band = ctx.createBiquadFilter(), env = ctx.createGain();
            src.buffer = noise; band.type = 'bandpass'; band.Q.value = .8; band.frequency.setValueAtTime(500, at); band.frequency.exponentialRampToValueAtTime(2400, at + .22);
            env.gain.setValueAtTime(.0001, at); env.gain.linearRampToValueAtTime(.18, at + .08); env.gain.exponentialRampToValueAtTime(.0001, at + .28);
            src.connect(band).connect(env).connect(out(0)); src.start(at); src.stop(at + .3);
        },
        play(events, volume) {
            if (!events?.length || !ready(volume)) return;
            // A burst of simultaneous contacts reads as one rattle, not a wall of noise.
            for (const event of events.slice(0, 6)) hit(event);
        },
        dispose() { void ctx?.close?.().catch(() => {}); ctx = master = noise = undefined; },
    };
}
