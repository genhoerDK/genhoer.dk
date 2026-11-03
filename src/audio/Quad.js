/**
 * Engine for a work made for four speakers around the listener (Kanon i G3): each channel goes
 * through its own HRTF panner, so with headphones the sound stands where the speaker stood, and
 * the listener can turn (setYaw). A little synthesised room echo can be mixed in on top.
 *
 * No React in here; AudioContext.js owns one instance, the interface turns it and reads levels.
 *
 *   config.speakers  [{ label, angle, file, channel? }]  angle: degrees clockwise from straight
 *                    ahead; channel: 0 | 1 picks one side of a stereo file
 *   config.reverb    0–1, how much of the room's echo (0 = none)
 *   config.loop      false = play once (default true)
 */

import { loadBuffer, createContext, channelOf } from './load';

const DISTANCE = 1.6;   // metres from the listener to each speaker

/** A short decaying noise burst: a concrete room's echo */
function impulseResponse(ctx, seconds = 1.6) {
    const n = Math.floor(seconds * ctx.sampleRate);
    const buffer = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
        const data = buffer.getChannelData(c);
        let low = 0;
        for (let i = 0; i < n; i++) {
            const white = Math.random() * 2 - 1;
            low += 0.12 * (white - low);   // the echo loses its highs as it goes
            data[i] = (white * 0.4 + low * 0.6) * Math.pow(1 - i / n, 3.2);
        }
    }
    return buffer;
}

export default class Quad {
    constructor(config) {
        this.config = config;
        this.ctx = createContext();
        this.master = this.ctx.createGain();
        this.master.connect(this.ctx.destination);
        this.channels = null;
        this.startedAt = 0;
        this.yaw = 0;
        this.started = false;
        this.loaded = false;
        this.error = null;
        this.disposed = false;
        this.levelData = new Uint8Array(256);

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
            this.channels = await Promise.all(this.config.speakers.map(async (speaker) => {
                const buffer = channelOf(this.ctx, await loadBuffer(this.ctx, speaker.file), speaker.channel ?? 0);
                const a = (speaker.angle * Math.PI) / 180;
                const panner = new PannerNode(this.ctx, {
                    panningModel: 'HRTF',
                    distanceModel: 'inverse',
                    refDistance: 1,
                    positionX: Math.sin(a) * DISTANCE,
                    positionY: 0,
                    positionZ: -Math.cos(a) * DISTANCE,   // forward is -z
                });
                const analyser = this.ctx.createAnalyser();
                analyser.fftSize = 256;
                panner.connect(this.master);
                panner.connect(analyser);
                if (this.reverb) panner.connect(this.reverb);
                return { ...speaker, buffer, panner, analyser, source: null };
            }));
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
                source.connect(channel.panner);
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
    }

    /* ---------- STATE ---------- */

    get duration() { return this.channels?.[0]?.buffer.duration ?? 0; }
    get position() {
        if (!this.channels?.[0]?.source || !this.duration) return 0;
        const t = Math.max(0, this.ctx.currentTime - this.startedAt);
        return this.config.loop === false ? Math.min(t, this.duration) : t % this.duration;
    }

    /** How loud each speaker is right now, 0–1 */
    levels() {
        if (!this.channels) return [];
        return this.channels.map(({ analyser }) => {
            analyser.getByteTimeDomainData(this.levelData);
            let sum = 0;
            for (let i = 0; i < this.levelData.length; i++) { const v = (this.levelData[i] - 128) / 128; sum += v * v; }
            return Math.min(1, Math.sqrt(sum / this.levelData.length) * 4);
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
