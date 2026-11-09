/**
 * Engine for a work that played from speakers along a street (Kirkestræde): stereo files, one per
 * pair of speakers facing each other across the street — the left channel from the speaker on the
 * left walking on, the right from the one on the right. You hear all of them all the time, but the
 * ones you stand by much louder than the rest, and each from its side: with headphones, from where
 * it hangs (HRTF).
 *
 * The files stream through audio elements (a decoded six minutes of stereo would be some 100 MB a
 * file, too much for a phone), each split into its two channels, each channel through its own level
 * and panner. They are started together and kept together: now and then the others are set to the
 * first's position if they have drifted more than a few hundredths of a second.
 *
 * Where you are (setPlace): metres along the street. The listener stands in the middle of the
 * street, facing on along it; each speaker is placed ahead or behind, left or right of you, and its
 * level falls with its distance along the street: full by it, and gone by `hear` metres off — so
 * you hear your own pair and the neighbouring ones, never the far end.
 *
 * Farther off, in a street: the direct sound is thinned (less low end, the top rolled off, a few
 * milliseconds late), and all eight channels feed one street echo (a synthesised impulse response:
 * early reflections off the facades, then a decaying tail). The echo is fed by every channel at the
 * same level wherever you stand, so it is heard all along the street.
 *
 * No React in here; AudioContext.js owns one instance (createEngine in engines.js).
 *
 *   config.files     The stereo files, one per pair, in the order of the pairs along the street
 *   config.speakers  [{ s, side }] metres along the street, −1 left / 1 right walking on — two per
 *                    file, in the same order (file 1's left, file 1's right, file 2's left …)
 *   config.wall      Metres from the middle of the street to the speakers (default 3.6)
 *   config.hear      Metres along the street at which a speaker has gone silent (default: 1.5 pairs apart)
 *   config.reverb    0–1: how much of the street's echo (default 0.35)
 *   config.loop      false = play once (default true)
 */

import { createContext } from './load';

const DRIFT = 0.06;      // seconds the files may drift apart before they are put together again

/** A street's echo, different in each ear: early reflections off the facades on either side, then a tail */
function streetEcho(ctx, seconds = 1.6) {
    const rate = ctx.sampleRate, n = Math.floor(seconds * rate);
    const buffer = ctx.createBuffer(2, n, rate);
    for (let c = 0; c < 2; c++) {
        const data = buffer.getChannelData(c);
        // facade to facade: a handful of early slaps, alternating sides, getting fainter
        for (let k = 0; k < 9; k++) {
            const at = Math.floor((0.008 + k * 0.011 + (c ? 0.004 : 0) + Math.random() * 0.004) * rate);
            data[at] += (k % 2 === c ? 0.7 : 0.45) * Math.pow(0.78, k) * (Math.random() < 0.5 ? -1 : 1);
        }
        // the tail: noise that loses its highs as it dies away
        let low = 0;
        const start = Math.floor(0.03 * rate);
        for (let i = start; i < n; i++) {
            const f = (i - start) / (n - start);
            low += (0.3 - 0.22 * f) * ((Math.random() * 2 - 1) - low);
            data[i] += low * 0.55 * Math.pow(1 - f, 2.6);
        }
    }
    return buffer;
}

export default class Street {
    constructor(config) {
        this.config = config;
        const { files, speakers } = config;
        this.wall = config.wall ?? 3.6;
        // gone by 1.5 pairs off: your own pair and the neighbours, not the next ones
        const along = [...new Set(speakers.map((sp) => sp.s))].sort((a, b) => a - b);
        const gap = along.length > 1 ? (along.at(-1) - along[0]) / (along.length - 1) : 30;
        this.hear = config.hear ?? gap * 1.5;
        this.place = speakers[0]?.s ?? 0;
        this.started = false;
        this.loaded = false;
        this.error = null;
        this.disposed = false;
        this.pending = null;   // a position asked for before the files could take it

        const ctx = this.ctx = createContext();
        this.master = ctx.createGain();
        this.master.gain.value = 1.6;
        // The sum of eight can get loud where two pairs overlap: a limiter catches the peaks
        const limiter = new DynamicsCompressorNode(ctx, { threshold: -6, knee: 6, ratio: 12, attack: 0.003, release: 0.2 });
        this.master.connect(limiter).connect(ctx.destination);
        // Farther off: the direct sound thinned and a little late …
        this.direct = ctx.createGain();
        const late = new DelayNode(ctx, { delayTime: 0.012 });
        const lows = new BiquadFilterNode(ctx, { type: 'highpass', frequency: 140, Q: 0.6 });
        const body = new BiquadFilterNode(ctx, { type: 'lowshelf', frequency: 300, gain: -3 });
        const top = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 5500, Q: 0.5 });
        const air = new BiquadFilterNode(ctx, { type: 'highshelf', frequency: 2500, gain: -4 });
        this.direct.connect(late).connect(lows).connect(body).connect(top).connect(air).connect(this.master);
        // … and the street's echo, fed by every channel the same wherever you are
        this.echo = ctx.createGain();
        const convolver = new ConvolverNode(ctx, { buffer: streetEcho(ctx) });
        const echoLevel = ctx.createGain();
        echoLevel.gain.value = config.reverb ?? 0.35;
        const echoTone = new BiquadFilterNode(ctx, { type: 'highpass', frequency: 220 });
        this.echo.connect(echoTone).connect(convolver).connect(echoLevel).connect(this.master);
        const { listener } = ctx;
        if (listener.forwardX) {
            listener.forwardX.value = 0; listener.forwardY.value = 0; listener.forwardZ.value = -1;
            listener.upX.value = 0; listener.upY.value = 1; listener.upZ.value = 0;
        } else listener.setOrientation(0, 0, -1, 0, 1, 0);   // older Safari

        // Each file: an audio element → its two channels → a level and a panner each
        this.elements = files.map((url) => {
            const el = new Audio();
            el.crossOrigin = 'anonymous';
            el.preload = 'auto';
            el.loop = config.loop !== false;
            el.src = url;
            return el;
        });
        this.channels = [];
        this.elements.forEach((el, f) => {
            const split = ctx.createChannelSplitter(2);
            ctx.createMediaElementSource(el).connect(split);
            for (const ch of [0, 1]) {
                const speaker = speakers[f * 2 + ch];
                if (!speaker) continue;
                const level = ctx.createGain();
                const panner = new PannerNode(ctx, { panningModel: 'HRTF', distanceModel: 'linear', rolloffFactor: 0 });   // the level is ours
                split.connect(level, ch).connect(panner).connect(this.direct);
                // every channel into the echo, at the same level wherever you stand
                const send = ctx.createGain();
                send.gain.value = 0.5;
                split.connect(send, ch).connect(this.echo);
                this.channels.push({ ...speaker, level, panner });
            }
        });
        this.setPlace(this.place, true);

        // Ready when every file can play
        this.ready = Promise.all(this.elements.map((el) => new Promise((resolve, reject) => {
            if (el.readyState >= 3) return resolve();
            el.addEventListener('canplay', resolve, { once: true });
            el.addEventListener('error', () => reject(new Error(`${el.src}: could not be loaded`)), { once: true });
        }))).then(() => {
            this.loaded = true;
            if (this.pending != null) { this.seek(this.pending); this.pending = null; }
        }).catch((err) => {
            this.error = err;
            console.error('Street: could not load the sound files', err);
        });

        // Keep them together
        this.keeper = setInterval(() => this.keepTogether(), 500);
    }

    /* ---------- TRANSPORT ---------- */

    /** Start (or resume) — call from a click so browsers allow sound */
    start() {
        this.ctx.resume();
        this.started = true;
        const lead = this.elements[0];
        for (const el of this.elements) {
            if (el !== lead && Math.abs(el.currentTime - lead.currentTime) > 0.01) el.currentTime = lead.currentTime;
            el.play().catch(() => { /* the browser said no; the interface stays as it was */ });
        }
    }

    pause() {
        this.started = false;
        for (const el of this.elements) el.pause();
    }

    /** Go to a time, in seconds, in all the files at once */
    seek(time) {
        if (!this.loaded) { this.pending = time; return; }
        const t = Math.max(0, Math.min(time, (this.duration || time) - 0.05));
        for (const el of this.elements) el.currentTime = t;
    }

    keepTogether() {
        if (!this.started || this.disposed) return;
        const lead = this.elements[0];
        if (lead.paused || lead.seeking) return;
        for (const el of this.elements.slice(1)) {
            if (!el.seeking && Math.abs(el.currentTime - lead.currentTime) > DRIFT) el.currentTime = lead.currentTime;
            if (el.paused) el.play().catch(() => {});
        }
    }

    dispose() {
        this.disposed = true;
        clearInterval(this.keeper);
        for (const el of this.elements) { el.pause(); el.removeAttribute('src'); el.load(); }
        this.ctx.close();
    }

    /* ---------- WHERE YOU ARE ---------- */

    /** You stand `s` metres along the street, in its middle, facing on: each speaker ahead or behind, left or right of you, as loud as it is near */
    setPlace(s, now = false) {
        this.place = s;
        const at = this.ctx.currentTime;
        for (const c of this.channels) {
            const ahead = c.s - s, across = c.side * this.wall;
            // full by it, gone `hear` metres along the street: a smooth fall (a raised cosine)
            const f = Math.min(1, Math.abs(ahead) / this.hear);
            const level = 0.5 + 0.5 * Math.cos(Math.PI * f);
            // the audio's axes: x to the right, y up, −z ahead
            if (now) {
                c.panner.positionX.value = across; c.panner.positionY.value = 0; c.panner.positionZ.value = -ahead;
                c.level.gain.value = level;
            } else {
                c.panner.positionX.setTargetAtTime(across, at, 0.05);
                c.panner.positionZ.setTargetAtTime(-ahead, at, 0.05);
                c.level.gain.setTargetAtTime(level, at, 0.08);
            }
        }
    }

    /* ---------- STATE ---------- */

    get duration() { const d = this.elements[0]?.duration; return Number.isFinite(d) ? d : 0; }
    get position() { return this.elements[0]?.currentTime ?? 0; }

    getState() {
        return {
            loaded: this.loaded,
            error: this.error,
            running: this.started && !this.elements[0]?.paused,
            position: this.position,
            duration: this.duration,
        };
    }
}
