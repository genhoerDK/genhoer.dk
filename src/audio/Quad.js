/**
 * Engine for a work made for four speakers around the listener (Kanon i G3): each channel goes
 * through its own HRTF panner, so with headphones the sound stands where the speaker stood, and
 * the listener can turn (setYaw). A little synthesised room echo can be mixed in on top.
 *
 * No React in here; AudioContext.js owns one instance, the interface turns it and reads levels.
 *
 * Making the directions felt: the panners alone leave the sound a little dull and close, so
 *   - each speaker gets a little more presence when you face it and a little less when it is
 *     behind you (a gentle high shelf, ±3 dB), on top of what the HRTF does — front and back are
 *     the hardest to tell apart
 *   - the binaural mix is widened (mid/side), so left and right stand further apart
 *   - an EQ evens out what the HRTF does to the tone (less boom, a little more air), so the work
 *     sounds as bright as the files themselves
 *   - the room's echo is fed from the dry sound, after 25 ms, and kept low, so the direct sound
 *     comes first and the ear can place it, while the echo puts it outside the head
 * The context runs at the files' own sample rate (44.1 kHz), so they are not resampled on the way
 * in; the browser converts the finished mix to whatever the sound card runs at.
 *
 * In step: all the files are decoded before any plays, then every channel is started at the same
 * moment on the audio clock (AudioBufferSourceNode.start(at)), so they run sample for sample
 * together, and pausing suspends the whole context, so they stay so. Should the files differ in
 * length by a few samples, they all loop at the shortest, so they don't drift apart loop by loop.
 * The files are fetched all at once but decoded one at a time, to keep down the memory a phone
 * needs at once (a decoded minute of mono is about 10 MB).
 *
 *   config.speakers  [{ label, angle, file, channel? }]  angle: degrees clockwise from straight
 *                    ahead; channel: 0 | 1 picks one side of a stereo file
 *   config.reverb    0–1, how much of the room's echo (0 = none)
 *   config.loop      false = play once (default true)
 */

import { fetchSound, decodeSound, createContext, channelOf } from './load';

const DISTANCE = 2;      // metres from the listener to each speaker
const SAMPLE_RATE = 44100;
const WIDTH = 1.35;      // how much the binaural mix is widened (1 = as the HRTF makes it)

/** A short decaying noise burst, different in each ear: a concrete room's echo, 25 ms after the sound */
function impulseResponse(ctx, seconds = 1.2, predelay = 0.025) {
    const n = Math.floor(seconds * ctx.sampleRate), d = Math.floor(predelay * ctx.sampleRate);
    const buffer = ctx.createBuffer(2, n + d, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
        const data = buffer.getChannelData(c);
        let low = 0;
        for (let i = 0; i < n; i++) {
            const white = Math.random() * 2 - 1;
            low += (0.35 - 0.25 * (i / n)) * (white - low);   // the echo loses its highs as it goes
            data[d + i] = (white * 0.5 + low * 0.5) * Math.pow(1 - i / n, 3.5);
        }
    }
    return buffer;
}

/** Widen a stereo signal: input → returned node; L' = M + w·S, R' = M − w·S */
function widener(ctx, width) {
    const split = ctx.createChannelSplitter(2), merge = ctx.createChannelMerger(2);
    const g = (v) => { const n = ctx.createGain(); n.gain.value = v; return n; };
    const same = (1 + width) / 2, cross = (1 - width) / 2;
    split.connect(g(same), 0).connect(merge, 0, 0);
    split.connect(g(cross), 1).connect(merge, 0, 0);
    split.connect(g(same), 1).connect(merge, 0, 1);
    split.connect(g(cross), 0).connect(merge, 0, 1);
    return { input: split, output: merge };
}

export default class Quad {
    constructor(config) {
        this.config = config;
        this.ctx = createContext({ sampleRate: SAMPLE_RATE });
        this.master = this.ctx.createGain();
        this.master.connect(this.ctx.destination);

        // The binaural mix: widened, its tone evened out
        const ctx = this.ctx;
        const wide = widener(ctx, WIDTH);
        const lows = new BiquadFilterNode(ctx, { type: 'lowshelf', frequency: 180, gain: -2.5 });
        const air = new BiquadFilterNode(ctx, { type: 'highshelf', frequency: 6000, gain: 2.5 });
        this.direct = ctx.createGain();
        this.direct.connect(wide.input);
        wide.output.connect(lows).connect(air).connect(this.master);
        this.channels = null;
        this.startedAt = 0;
        this.yaw = 0;
        this.started = false;
        this.loaded = false;
        this.error = null;
        this.disposed = false;
        this.levelData = new Float32Array(256);

        const { listener } = this.ctx;
        if (listener.positionX) {
            listener.positionX.value = 0; listener.positionY.value = 0; listener.positionZ.value = 0;
            listener.upX.value = 0; listener.upY.value = 1; listener.upZ.value = 0;
        }
        this.setYaw(0);

        if (config.reverb) {
            this.reverb = this.ctx.createConvolver();
            this.reverb.buffer = impulseResponse(this.ctx);
            const level = this.ctx.createGain();
            level.gain.value = config.reverb;
            this.reverb.connect(level).connect(this.master);
        }

        this.ready = this.load();
    }

    async load() {
        try {
            const { speakers } = this.config;
            const fetching = speakers.map((s) => fetchSound(s.file));
            fetching.forEach((p) => p.catch(() => {}));   // a failure is reported when its turn comes
            this.channels = [];
            this.setYaw(this.yaw);
            for (const [i, speaker] of speakers.entries()) {
                const bytes = await fetching[i];
                if (this.disposed) return;
                const buffer = channelOf(this.ctx, await decodeSound(this.ctx, speaker.file, bytes), speaker.channel ?? 0);
                const a = (speaker.angle * Math.PI) / 180;
                const panner = new PannerNode(this.ctx, {
                    panningModel: 'HRTF',
                    distanceModel: 'inverse',
                    refDistance: 1.25,   // as loud as before the speakers moved out to 2 m
                    positionX: Math.sin(a) * DISTANCE,
                    positionY: 0,
                    positionZ: -Math.cos(a) * DISTANCE,   // forward is -z
                });
                // input → presence (towards you or away) → panner → the binaural mix; the level
                // and the echo are taken from the dry sound
                const input = this.ctx.createGain();
                const presence = new BiquadFilterNode(this.ctx, { type: 'highshelf', frequency: 4000, gain: 0 });
                const analyser = this.ctx.createAnalyser();
                analyser.fftSize = 256;
                input.connect(presence).connect(panner).connect(this.direct);
                input.connect(analyser);
                if (this.reverb) input.connect(this.reverb);
                this.channels.push({ ...speaker, buffer, input, presence, panner, analyser, source: null });
            }
            const lengths = this.channels.map((c) => c.buffer.length);
            this.length = Math.min(...lengths);
            if (Math.max(...lengths) !== this.length) console.warn('Quad: the files differ in length (samples):', lengths);
            this.setYaw(this.yaw);
            this.loaded = true;
        } catch (err) {
            this.error = err;
            console.error('Quad: could not load the sound files', err);
        }
    }

    /* ---------- TRANSPORT ---------- */

    /** Start (or resume) — call from a click so browsers allow sound */
    start() {
        this.ctx.resume();
        if (this.started) return;
        this.started = true;
        this.ready.then(() => {
            if (!this.loaded || this.disposed) return;
            const at = this.ctx.currentTime + 0.05;
            for (const channel of this.channels) {
                const source = this.ctx.createBufferSource();
                source.buffer = channel.buffer;
                source.loop = this.config.loop !== false;
                source.loopEnd = this.length / channel.buffer.sampleRate;
                source.connect(channel.input);
                source.start(at);
                channel.source = source;
            }
            this.startedAt = at;
        });
    }

    pause() {
        this.ctx.suspend();
    }

    dispose() {
        this.disposed = true;
        this.channels?.forEach((c) => { try { c.source?.stop(); } catch { /* not started */ } });
        this.ctx.close();
    }

    /* ---------- TURNING ---------- */

    /** Which way the listener faces, radians clockwise from straight ahead */
    setYaw(yaw) {
        this.yaw = yaw;
        const fx = Math.sin(yaw), fz = -Math.cos(yaw);
        const { listener } = this.ctx;
        if (listener.forwardX) {
            listener.forwardX.value = fx; listener.forwardY.value = 0; listener.forwardZ.value = fz;
        } else {
            listener.setOrientation(fx, 0, fz, 0, 1, 0);   // older Safari
        }
        // A speaker in front of you a little brighter, one behind you a little duller
        const now = this.ctx.currentTime;
        for (const c of this.channels ?? []) {
            const facing = Math.cos((c.angle * Math.PI) / 180 - yaw);   // 1 ahead, −1 behind
            c.presence.gain.setTargetAtTime(3 * facing, now, 0.05);
        }
    }

    /* ---------- STATE ---------- */

    get duration() { return this.loaded ? this.length / this.ctx.sampleRate : 0; }
    get position() {
        if (!this.channels?.[0]?.source || !this.duration) return 0;
        const t = Math.max(0, this.ctx.currentTime - this.startedAt);
        return this.config.loop === false ? Math.min(t, this.duration) : t % this.duration;
    }

    /** How loud each speaker is right now, 0–1 on a decibel scale (−54 dB and below = 0, −6 dB = 1), so quiet passages show too */
    levels() {
        if (!this.channels) return [];
        return this.channels.map(({ analyser }) => {
            analyser.getFloatTimeDomainData(this.levelData);
            let sum = 0;
            for (let i = 0; i < this.levelData.length; i++) sum += this.levelData[i] * this.levelData[i];
            const db = 10 * Math.log10(sum / this.levelData.length + 1e-12);
            return Math.min(1, Math.max(0, (db + 54) / 48));
        });
    }

    getState() {
        return {
            loaded: this.loaded,
            error: this.error,
            running: !!this.channels?.[0]?.source,
            yaw: this.yaw,
            levels: this.levels(),
            position: this.position,
            duration: this.duration,
        };
    }
}
