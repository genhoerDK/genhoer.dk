/**
 * Plays an interactive work made of layers and push buttons, with Web Audio.
 *
 * config (the work's `player` object in projects.json):
 *   tracks: [{
 *     id, label,
 *     src,                  URL of the sound file
 *     loop     = true,
 *     start    = 'always' | 'press'   'press': starts on a button press and plays through once
 *     volume   = 1          level at rest (0 = hidden until a button raises it)
 *     active   = 1          level while a button that raises it is held
 *     attack   = 0.3        seconds to fade up
 *     release  = 2          seconds to fade back down after release
 *   }]
 *   buttons: [{
 *     label,
 *     tone,                 URL played for as long as the button is held (optional)
 *     raises: [trackId],    tracks faded up while held
 *     starts: [trackId],    'press' tracks started by this button (if not already playing)
 *   }]
 *
 * All looping tracks start together and stay in sync, hidden ones just silent.
 * A missing `src` gets a generated placeholder sound (`placeholder` names which kind),
 * so a work can be tried before its sound files are uploaded.
 */

/**
 * One AudioContext for the whole site. Browsers (Safari in particular) only let it
 * start inside a click or tap, so unlockAudio() is called from the play handlers.
 */
let shared = null;
export function sharedAudioContext() {
    if (!shared) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        shared = new Ctx();
    }
    return shared;
}
export function unlockAudio() {
    sharedAudioContext().resume();
}

export class LayeredEngine {
    constructor(config) {
        this.config = config;
        this.tracks = (config.tracks ?? []).map((t) => ({
            loop: true, start: 'always', volume: 1, active: 1, attack: 0.3, release: 2, ...t,
        }));
        this.buttons = (config.buttons ?? []).map((b) => ({ raises: [], starts: [], ...b }));
        this.pressed = this.buttons.map(() => false);
        this.listeners = new Set();
        this.ready = false;
        this.started = false;
        this.wantsPlay = false;

        this.ctx = sharedAudioContext();
        this.master = this.ctx.createGain();
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 512;
        this.master.connect(this.analyser).connect(this.ctx.destination);
        this.samples = new Float32Array(this.analyser.fftSize);

        for (const t of this.tracks) {
            t.gain = this.ctx.createGain();
            t.gain.gain.value = t.start === 'press' ? 1 : t.volume;
            t.gain.connect(this.master);
        }
        this.toneVoices = this.buttons.map(() => null);
        this.loading = this.load();
    }

    /* ---------- LOADING ---------- */

    async load() {
        const decode = async (src, placeholder) => {
            if (src) {
                try {
                    const res = await fetch(src, { mode: 'cors' });
                    if (!res.ok) throw new Error(res.status);
                    return await this.ctx.decodeAudioData(await res.arrayBuffer());
                } catch {
                    // fall through to a placeholder
                }
            }
            return placeholderBuffer(this.ctx, placeholder);
        };
        await Promise.all([
            ...this.tracks.map(async (t) => { t.buffer = await decode(t.src, t.placeholder ?? 'flade'); }),
            ...this.buttons.map(async (b, i) => { b.buffer = b.tone || b.placeholder ? await decode(b.tone, b.placeholder ?? `tone:${i}`) : null; }),
        ]);
        this.ready = true;
        if (this.wantsPlay) this.play();
        this.emit();
    }

    /* ---------- TRANSPORT ---------- */

    get duration() {
        const bed = this.tracks.find((t) => t.start === 'always' && t.loop);
        return bed?.buffer?.duration ?? 0;
    }

    get currentTime() {
        if (!this.started || !this.duration) return 0;
        return (this.ctx.currentTime - this.startedAt) % this.duration;
    }

    /** True from play() until pause(), also while the files are still loading */
    get isPlaying() {
        return this.wantsPlay;
    }

    /** Call from a user gesture (click/tap) — browsers only allow sound to start there */
    play() {
        this.ctx.resume();
        this.wantsPlay = true;
        if (!this.ready) { this.emit(); return; }
        if (!this.started) {
            const at = this.ctx.currentTime + 0.05;
            this.startedAt = at;
            for (const t of this.tracks) if (t.start === 'always') this.startSource(t, at);
            this.started = true;
        }
        this.emit();
    }

    pause() {
        this.wantsPlay = false;
        for (let i = 0; i < this.pressed.length; i++) if (this.pressed[i]) this.release(i);
        this.ctx.suspend();
        this.emit();
    }

    startSource(track, at = this.ctx.currentTime) {
        const source = this.ctx.createBufferSource();
        source.buffer = track.buffer;
        source.loop = track.loop;
        source.connect(track.gain);
        source.start(at);
        track.source = source;
        track.playing = true;
        source.onended = () => { if (track.source === source) { track.playing = false; this.emit(); } };
    }

    /* ---------- BUTTONS ---------- */

    press(index) {
        const button = this.buttons[index];
        if (!button || this.pressed[index]) return;
        if (!this.wantsPlay || this.ctx.state !== 'running') this.play();
        if (!this.ready) return;
        this.pressed[index] = true;
        const now = this.ctx.currentTime;

        if (button.buffer) {
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(1, now + 0.02);
            gain.connect(this.master);
            const source = this.ctx.createBufferSource();
            source.buffer = button.buffer;
            source.loop = !!button.loopTone;
            source.connect(gain);
            source.start(now);
            this.toneVoices[index] = { source, gain };
        }

        for (const id of button.raises) {
            const t = this.track(id);
            if (t) t.gain.gain.setTargetAtTime(t.active, now, t.attack / 3);
        }
        for (const id of button.starts) {
            const t = this.track(id);
            if (t && !t.playing) this.startSource(t, now);
        }
        this.emit();
    }

    release(index) {
        if (!this.pressed[index]) return;
        this.pressed[index] = false;
        const now = this.ctx.currentTime;

        const voice = this.toneVoices[index];
        if (voice) {
            voice.gain.gain.cancelScheduledValues(now);
            voice.gain.gain.setTargetAtTime(0, now, 0.04);
            voice.source.stop(now + 0.3);
            this.toneVoices[index] = null;
        }

        // Fade a raised track down only when no other held button keeps it up
        for (const id of this.buttons[index].raises) {
            const stillHeld = this.buttons.some((b, i) => this.pressed[i] && b.raises.includes(id));
            const t = this.track(id);
            if (t && !stillHeld) t.gain.gain.setTargetAtTime(t.volume, now, t.release / 3);
        }
        this.emit();
    }

    track(id) {
        return this.tracks.find((t) => t.id === id);
    }

    /* ---------- STATE FOR VISUALS ---------- */

    /** Read every animation frame: gains per track, pressed buttons and the overall level */
    snapshot() {
        this.analyser.getFloatTimeDomainData(this.samples);
        let sum = 0;
        for (const s of this.samples) sum += s * s;
        return {
            level: Math.min(1, Math.sqrt(sum / this.samples.length) * 4),
            pressed: this.pressed,
            tracks: this.tracks.map((t) => ({
                id: t.id,
                label: t.label ?? t.id,
                gain: t.start === 'press' ? (t.playing ? 1 : 0) : t.gain.gain.value,
                rest: t.volume,
            })),
        };
    }

    subscribe(fn) {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }

    emit() {
        for (const fn of this.listeners) fn();
    }

    dispose() {
        this.listeners.clear();
        for (const t of this.tracks) try { t.source?.stop(); } catch { /* not started */ }
        for (const v of this.toneVoices) try { v?.source.stop(); } catch { /* already stopped */ }
        this.master.disconnect();
    }
}

/* ---------- PLACEHOLDER SOUNDS ---------- */

const PENTATONIC = [220, 247.5, 277.2, 330, 370.8, 440, 495];

function placeholderBuffer(ctx, kind = 'flade') {
    const rate = ctx.sampleRate;
    const make = (seconds, fn) => {
        const buffer = ctx.createBuffer(1, Math.floor(seconds * rate), rate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = fn(i / rate, seconds);
        return buffer;
    };
    const sin = (f, t) => Math.sin(2 * Math.PI * f * t);
    const fade = (t, len) => Math.min(1, t / 0.05, (len - t) / 0.05);

    if (kind.startsWith('tone')) {
        const f = PENTATONIC[Number(kind.split(':')[1] ?? 0) % PENTATONIC.length] * 2;
        return make(6, (t, len) => 0.22 * fade(t, len) * Math.exp(-t * 0.25) * (sin(f, t) + 0.3 * sin(f * 2, t) + 0.1 * sin(f * 3, t)));
    }
    if (kind === 'trommer') {
        const beat = 60 / 96;
        return make(beat * 16, (t) => {
            const p = t % beat;
            const kick = 0.6 * Math.exp(-p * 18) * sin(55 + 90 * Math.exp(-p * 30), p);
            const off = (t + beat / 2) % beat;
            const hat = 0.12 * Math.exp(-off * 60) * (Math.random() * 2 - 1);
            return kick + hat;
        });
    }
    if (kind === 'stemme') {
        // Murmur in syllables — stands in for the narrator
        let lp = 0;
        return make(14, (t, len) => {
            const syllable = Math.max(0, sin(3.1, t)) * Math.max(0, sin(0.37, t) + 0.3);
            const n = (Math.random() * 2 - 1);
            lp += (n - lp) * 0.08;
            return 0.5 * fade(t, len) * syllable * (lp * 2 + 0.15 * sin(140 + 30 * sin(2, t), t));
        });
    }
    if (kind === 'skjult') {
        const notes = [PENTATONIC[5], PENTATONIC[3], PENTATONIC[6], PENTATONIC[4]];
        return make(16, (t) => {
            const step = 0.25;
            const n = notes[Math.floor(t / step) % notes.length] * 2;
            const p = t % step;
            return 0.18 * Math.exp(-p * 6) * (sin(n, t) + 0.4 * sin(n * 1.5, t));
        });
    }
    // flade: a slow, breathing chord
    return make(16, (t, len) => {
        const swell = 0.6 + 0.4 * sin(1 / len, t);
        return 0.09 * swell * (sin(110, t) + sin(165, t) * 0.8 + sin(220.5, t) * 0.6 + sin(277, t) * 0.4 * (0.5 + 0.5 * sin(0.25, t)));
    });
}
