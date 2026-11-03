/**
 * Engine for a work that runs as a loop under the surface, with a button that brings it up for
 * a while — a Web Audio port of the Pure Data patch behind Under overfladen.
 *
 * Two layers of the same loop play in step: `below`, the processed version you hear at rest, and
 * `above`, the clear one. Pressing the button (down) crosses to `above` in `up` seconds and keeps
 * it there while the button is held; letting go (up) starts the countdown: `hold` seconds at the
 * surface, then sinking back over `down` seconds. Every press starts over, also on the way down.
 * All timing runs on the AudioContext clock, so pausing freezes it.
 *
 * No React in here; AudioContext.js owns one instance and the interface calls down() and up().
 *
 *   config.layers   { below, above }  file URLs (or placeholders)
 *   config.surface  { up, hold, down } seconds
 */

import { loadBuffer, createContext, ramp } from './load';

export default class Loop {
    constructor(config) {
        this.config = config;
        this.ctx = createContext();
        this.master = this.ctx.createGain();
        this.master.connect(this.ctx.destination);
        this.gains = {
            below: this.gain(1),
            above: this.gain(0),
        };
        this.buffers = null;
        this.sources = null;
        this.startedAt = 0;
        this.held = false;
        this.releasedAt = -Infinity;
        this.started = false;
        this.loaded = false;
        this.error = null;
        this.disposed = false;
        this.ready = this.load();
    }

    gain(value) {
        const node = this.ctx.createGain();
        node.gain.value = value;
        node.connect(this.master);
        return node;
    }

    async load() {
        try {
            const [below, above] = await Promise.all([
                loadBuffer(this.ctx, this.config.layers.below),
                loadBuffer(this.ctx, this.config.layers.above),
            ]);
            this.buffers = { below, above };
            this.loaded = true;
        } catch (err) {
            this.error = err;
            console.error('Loop: could not load the sound files', err);
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
            this.sources = Object.fromEntries(['below', 'above'].map((layer) => {
                const source = this.ctx.createBufferSource();
                source.buffer = this.buffers[layer];
                source.loop = true;
                source.connect(this.gains[layer]);
                source.start(at);
                return [layer, source];
            }));
            this.startedAt = at;
        });
    }

    pause() {
        this.ctx.suspend();
    }

    dispose() {
        this.disposed = true;
        Object.values(this.sources ?? {}).forEach((s) => { try { s.stop(); } catch { /* not started */ } });
        this.ctx.close();
    }

    /* ---------- THE BUTTON ---------- */

    /** Pressed: up to the surface (or stay there). Returns false when not running */
    down() {
        if (!this.sources) return false;
        const now = this.ctx.currentTime;
        this.held = true;
        ramp(this.gains.above.gain, 1, now, this.config.surface.up);
        ramp(this.gains.below.gain, 0, now, this.config.surface.up);
        return true;
    }

    /** Let go: the time at the surface starts now, and then the sinking — scheduled, so it happens even if the tab is throttled */
    up() {
        if (!this.held) return;
        const { up, hold, down } = this.config.surface;
        const now = this.ctx.currentTime;
        this.held = false;
        this.releasedAt = now;
        const at = now + Math.max(hold, up);
        this.gains.above.gain.setValueAtTime(1, at);
        this.gains.above.gain.linearRampToValueAtTime(0, at + down);
        this.gains.below.gain.setValueAtTime(0, at);
        this.gains.below.gain.linearRampToValueAtTime(1, at + down);
    }

    /** below · above · sinking */
    get phase() {
        if (this.held) return 'above';
        const since = this.ctx.currentTime - this.releasedAt;
        const { hold, down } = this.config.surface;
        return since < hold ? 'above' : since < hold + down ? 'sinking' : 'below';
    }

    /* ---------- STATE ---------- */

    get duration() { return this.buffers?.below.duration ?? 0; }
    get position() { return this.sources && this.duration ? Math.max(0, this.ctx.currentTime - this.startedAt) % this.duration : 0; }

    getState() {
        const { hold, down } = this.config.surface;
        const since = this.ctx.currentTime - this.releasedAt;
        const phase = this.phase;
        return {
            loaded: this.loaded,
            error: this.error,
            running: !!this.sources,
            phase,
            held: this.held,
            // How far through the time at the surface (1 → 0) or the sinking (1 → 0); full while held
            left: this.held ? 1 : phase === 'above' ? 1 - since / hold : phase === 'sinking' ? 1 - (since - hold) / down : 0,
            secondsLeft: this.held ? hold : phase === 'above' ? Math.ceil(hold - since) : 0,
            position: this.position,
            duration: this.duration,
        };
    }
}
