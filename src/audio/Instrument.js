/**
 * Interactive sound work played with buttons — a Web Audio port of the Pure Data patch
 * that ran on the Bela Mini in Troldetoner (main.pd). No React in here; AudioContext.js
 * owns one instance and the player UI calls press()/release().
 *
 * Layers (same names as in the patch):
 *
 *  SAMPLES  One short file per button. Pressing plays the "body" from the start; letting go
 *           before the release point jumps to the release point and plays the "tail" to the end
 *           (5 ms fades, like the patch's cutoff). Holding plays straight through. Pressing a
 *           button lets go of every other button, unless the config says polyphonic: true —
 *           then several tones can sound together. Level 0.6.
 *
 *  MUSIC    A stereo loop that always runs: left channel = tonal music, right = rhythm.
 *           Any press fades the tonal music in over 10 s and (re)starts a 100 s countdown;
 *           when it runs out the music fades out over 10 s.
 *
 *  RHYTHM   The right channel. Only opens once the music has been on for 30 s without stopping.
 *           After that it fades in over 0.5 s while a button body plays and out over 5 s after.
 *           So it is there the more you play.
 *
 *  STORIES  A narrator file, played in turn (1, 2, 3 … then from the start again). The first
 *           press starts a 30 s countdown; when it runs out the next story plays — unless less
 *           than 30 s of music is left or a story is already playing. When a story ends a new
 *           30 s countdown starts. Once the music has faded below half, no new countdown starts
 *           (a playing story still finishes). Level 1.2.
 *
 * All timing runs on the AudioContext clock, so pausing (suspend) freezes the countdowns too,
 * and a throttled background tab does not slow them down.
 */

const TICK_MS = 50;
const SAMPLE_FADE = 0.005;

export default class Instrument {
    /**
     * @param {object} config  An entry from src/data/instruments.js
     */
    constructor(config) {
        this.config = config;
        const t = config.timing;

        // iOS: play through the silent switch, like an <audio> element does
        try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch {}

        const Ctx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new Ctx();

        /* ---------- MIX (the patch's OUTPUT section) ---------- */

        this.master = this.ctx.createGain();

        // Limiter on the sum, so many tones at once don't clip. Only acts near full level
        const limiter = this.ctx.createDynamicsCompressor();
        limiter.threshold.value = -3;
        limiter.knee.value = 0;
        limiter.ratio.value = 20;
        limiter.attack.value = 0.003;
        limiter.release.value = 0.25;
        this.master.connect(limiter).connect(this.ctx.destination);

        this.sampleBus = this.gain(config.levels.samples);
        this.musicGain = this.gain(0);
        this.rhythmGain = this.gain(0);
        this.storyGain = this.gain(config.levels.story);

        /** Linear ramps we started, so we always know a param's current value (Pd's [line]) */
        this.ramps = new Map();

        /* ---------- STATE ---------- */

        this.voices = config.samples.map(() => ({ state: 'idle', source: null, gain: null, bodyEndsAt: 0 }));
        this.buffers = [];
        this.musicBuffer = null;
        this.musicSource = null;
        this.musicStartedAt = 0;

        this.musicOn = false;          // last value sent to "music" (after [change])
        this.musicLeft = 0;            // countdown until the music fades out (s)
        this.musicOnFor = 0;           // r-count: how long the music countdown has been running (s)
        this.musicLow = true;          // music gain < 0.5

        this.rhythmOn = false;         // last value sent to "rhythm" (after [change])

        this.storyIndex = 0;
        this.storyPlaying = false;
        this.storyAllowed = false;     // gate that lets a finished story start the next countdown
        this.storyCounting = false;
        this.storyLeft = t.storyDelay;

        this.started = false;
        this.paused = false;
        this.loaded = false;
        this.error = null;

        /* ---------- STORIES stream from an <audio> element (they can be long) ---------- */

        this.storyEl = new Audio();
        this.storyEl.crossOrigin = 'anonymous';
        this.storyEl.preload = 'auto';
        this.storyEl.src = this.url(config.stories[0]);
        this.ctx.createMediaElementSource(this.storyEl).connect(this.storyGain);
        this.onStoryEnded = this.onStoryEnded.bind(this);
        this.storyEl.addEventListener('ended', this.onStoryEnded);

        this.ready = this.load();
    }

    /* ---------- SETUP ---------- */

    url(file) {
        return new URL(file, this.config.baseUrl).href;
    }

    gain(value) {
        const node = this.ctx.createGain();
        node.gain.value = value;
        node.connect(this.master);
        return node;
    }

    async decode(file) {
        const res = await fetch(this.url(file));
        if (!res.ok) throw new Error(`${file}: ${res.status}`);
        return this.ctx.decodeAudioData(await res.arrayBuffer());
    }

    async load() {
        try {
            const [music, ...samples] = await Promise.all([
                this.decode(this.config.music),
                ...this.config.samples.map(s => this.decode(s.file)),
            ]);
            this.musicBuffer = music;
            this.buffers = samples;
            this.loaded = true;
        } catch (err) {
            this.error = err;
            console.error('Instrument: could not load sound files', err);
        }
    }

    /* ---------- TRANSPORT ---------- */

    /** Start (or resume) — call from a click so browsers allow sound */
    start() {
        this.ctx.resume();
        if (this.paused) {
            this.paused = false;
            if (this.storyPlaying) this.storyEl.play();
        }
        if (this.started) return;
        this.started = true;

        this.ready.then(() => {
            if (!this.loaded || this.disposed) return;
            this.startMusic();
            this.lastTick = this.ctx.currentTime;
            this.interval = setInterval(() => this.tick(), TICK_MS);
        });
    }

    /** Pause everything, countdowns included */
    pause() {
        this.paused = true;
        this.storyEl.pause();
        this.ctx.suspend();
    }

    dispose() {
        this.disposed = true;
        clearInterval(this.interval);
        this.storyEl.removeEventListener('ended', this.onStoryEnded);
        this.storyEl.pause();
        this.storyEl.removeAttribute('src');
        this.ctx.close();
    }

    /** The music loop, silent until a button is pressed (MUSIC LOOP (CONSTANT)) */
    startMusic() {
        const source = this.ctx.createBufferSource();
        source.buffer = this.musicBuffer;
        source.loop = true;

        const splitter = this.ctx.createChannelSplitter(2);
        source.connect(splitter);
        splitter.connect(this.musicGain, 0);
        if (this.musicBuffer.numberOfChannels > 1) splitter.connect(this.rhythmGain, 1);
        else console.warn('Instrument: the music file is mono — the rhythm layer needs it in the right channel');

        source.start();
        this.musicSource = source;
        this.musicStartedAt = this.ctx.currentTime;
    }

    /* ---------- BUTTONS ---------- */

    press(i) {
        if (!this.loaded) return;
        this.ctx.resume();   // a press is a user gesture — unlocks audio on iOS

        // One tone at a time (like the Bela patch's "c-end 0; g-end 0; …"): let go of the others
        if (!this.config.polyphonic) {
            this.voices.forEach((voice, j) => { if (j !== i && voice.state === 'body') this.playTail(j); });
        }

        if (this.voices[i].state === 'body') return;
        this.playVoice(i, 0);
        const voice = this.voices[i];
        voice.state = 'body';
        voice.bodyEndsAt = this.ctx.currentTime + SAMPLE_FADE + this.config.samples[i].release;

        this.updateRhythm();
        this.triggerMusic();
        this.triggerStory();
    }

    release(i) {
        if (this.voices[i]?.state === 'body') this.playTail(i);
    }

    playTail(i) {
        this.playVoice(i, this.config.samples[i].release);
        this.voices[i].state = 'tail';
        this.updateRhythm();
    }

    /** Fade out what the button is playing (5 ms), then start the file at `offset` (5 ms fade in) */
    playVoice(i, offset) {
        const voice = this.voices[i];
        const t = this.ctx.currentTime;

        if (voice.source) {
            const g = voice.gain.gain;
            g.cancelScheduledValues(t);
            g.setValueAtTime(g.value, t);
            g.linearRampToValueAtTime(0, t + SAMPLE_FADE);
            voice.source.stop(t + SAMPLE_FADE + 0.001);
        }

        const source = this.ctx.createBufferSource();
        source.buffer = this.buffers[i];
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, t + SAMPLE_FADE);
        gain.gain.linearRampToValueAtTime(1, t + SAMPLE_FADE * 2);
        source.connect(gain).connect(this.sampleBus);
        source.start(t + SAMPLE_FADE, offset);
        source.onended = () => {
            if (voice.source !== source) return;
            voice.source = null;
            voice.state = 'idle';
        };

        voice.source = source;
        voice.gain = gain;
    }

    /* ---------- LAYERS ---------- */

    /** "music 1": fade in and reset the countdown (MUSIC COUNTDOWN) */
    triggerMusic() {
        const t = this.config.timing;
        this.musicLeft = t.musicHold;
        if (!this.musicOn) {
            this.musicOn = true;
            this.rampTo(this.musicGain.gain, 1, t.musicFade);
        }
    }

    /** "rhythm 0/1" — only passes once the music has been on long enough (RHYTHM) */
    updateRhythm() {
        const on = this.voices.some(v => v.state === 'body');
        if (on === this.rhythmOn) return;
        this.rhythmOn = on;
        if (this.musicOnFor <= this.config.timing.rhythmAfter) return;
        const t = this.config.timing;
        this.rampTo(this.rhythmGain.gain, on ? 1 : 0, on ? t.rhythmFadeIn : t.rhythmFadeOut);
    }

    /** "story 1": start the story countdown if it isn't running (STORIES) */
    triggerStory() {
        this.storyAllowed = true;
        this.storyCounting = true;
    }

    playStory() {
        this.storyPlaying = true;
        this.storyEl.currentTime = 0;
        this.storyEl.play().catch(err => {
            console.error('Instrument: could not play story', err);
            this.storyPlaying = false;
        });
    }

    onStoryEnded() {
        this.storyPlaying = false;
        this.storyIndex = (this.storyIndex + 1) % this.config.stories.length;
        this.storyEl.src = this.url(this.config.stories[this.storyIndex]);
        this.storyEl.load();
        // The patch waits 100 ms ("load delay") before it allows the next countdown
        setTimeout(() => { if (this.storyAllowed && !this.disposed) this.triggerStory(); }, 100);
    }

    /* ---------- CLOCK ---------- */

    tick() {
        const now = this.ctx.currentTime;
        const dt = now - this.lastTick;
        this.lastTick = now;
        if (dt <= 0) return;   // suspended
        const t = this.config.timing;

        // A held button reaching its release point carries on into the tail by itself
        this.voices.forEach((voice) => {
            if (voice.state === 'body' && now >= voice.bodyEndsAt) {
                voice.state = 'tail';
                this.updateRhythm();
            }
        });

        // Music countdown
        if (this.musicLeft > 0) {
            this.musicOnFor += dt;
            this.musicLeft -= dt;
            if (this.musicLeft <= 0) {
                this.musicLeft = 0;
                this.musicOn = false;
                this.rampTo(this.musicGain.gain, 0, t.musicFade);
            }
        }

        // Music faded below half: reset the rhythm count, stop new stories
        const low = this.valueOf(this.musicGain.gain) < 0.5;
        if (low && !this.musicLow) {
            this.musicOnFor = 0;
            this.storyAllowed = false;
            this.storyCounting = false;
            this.storyLeft = t.storyDelay;
        }
        this.musicLow = low;

        // Story countdown
        if (this.storyCounting) {
            this.storyLeft -= dt;
            if (this.storyLeft <= 0) {
                this.storyCounting = false;
                this.storyLeft = t.storyDelay;
                if (this.musicLeft > t.storyMinMusicLeft && !this.storyPlaying) this.playStory();
            }
        }
    }

    /* ---------- RAMPS ---------- */

    rampTo(param, target, seconds) {
        const t = this.ctx.currentTime;
        const from = this.valueOf(param);
        param.cancelScheduledValues(t);
        param.setValueAtTime(from, t);
        param.linearRampToValueAtTime(target, t + seconds);
        this.ramps.set(param, { from, to: target, t0: t, t1: t + seconds });
    }

    valueOf(param) {
        const r = this.ramps.get(param);
        if (!r) return param.value;
        const t = this.ctx.currentTime;
        if (t >= r.t1) return r.to;
        return r.from + (r.to - r.from) * ((t - r.t0) / (r.t1 - r.t0));
    }

    /* ---------- FOR THE UI ---------- */

    get loopDuration() {
        return this.musicBuffer?.duration ?? 0;
    }

    get loopPosition() {
        if (!this.musicSource) return 0;
        return (this.ctx.currentTime - this.musicStartedAt) % this.loopDuration;
    }

    /** Snapshot of everything, for drawing the buttons and the test readout */
    getState() {
        return {
            loaded: this.loaded,
            error: this.error,
            voices: this.voices.map(v => v.state),
            music: this.valueOf(this.musicGain.gain),
            musicLeft: this.musicLeft,
            rhythm: this.valueOf(this.rhythmGain.gain),
            rhythmOpen: this.musicOnFor > this.config.timing.rhythmAfter,
            musicOnFor: this.musicOnFor,
            storyCounting: this.storyCounting,
            storyLeft: this.storyLeft,
            storyPlaying: this.storyPlaying,
            storyIndex: this.storyIndex,
        };
    }
}
