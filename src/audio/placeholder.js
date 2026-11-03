/**
 * Placeholder sound, until a work's real files are on the CDN.
 *
 * A file written as
 *
 *   placeholder:<name>?s=<seconds>&seed=<n>&kind=<drone|loop|pulse>&lp=<hz>
 *
 * is synthesised here: a soft drone of a few partials that breathe slowly, with a little air
 * around it. The seed sets the pitch and the movement, so each placeholder sounds different, and
 * the same string always gives the same sound.
 *
 *   kind   drone (default) fades in and out · loop has no fades, for a seamless loop ·
 *          pulse beats slowly, handy for hearing where a speaker stands
 *   lp     low-pass cutoff in Hz, e.g. the muffled version of a loop
 *
 * Two ways in: an AudioBuffer for the Web Audio engines, or a WAV object URL for the audio element.
 * Swap the string for the file's URL and nothing else changes.
 */

export const isPlaceholder = (url) => typeof url === 'string' && url.startsWith('placeholder:');

function parse(url) {
    const [name, query = ''] = url.slice('placeholder:'.length).split('?');
    const q = new URLSearchParams(query);
    return {
        name,
        seconds: Math.max(1, Number(q.get('s')) || 30),
        seed: Number(q.get('seed')) || 1,
        kind: q.get('kind') || 'drone',
        lp: Number(q.get('lp')) || 0,
    };
}

/** Deterministic random numbers (mulberry32) */
function random(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** The samples (mono, -1…1) */
export function synthesize({ seconds, seed, kind, lp }, sampleRate) {
    const rand = random(seed);
    const n = Math.floor(seconds * sampleRate);
    const out = new Float32Array(n);

    // A note from a pentatonic scale over two octaves, and four partials that each breathe at their own pace
    const note = [0, 2, 4, 7, 9, 12, 14, 16][Math.floor(rand() * 8)];
    const base = 82.4 * Math.pow(2, note / 12);
    const partials = [1, 2, 3, 5].map((ratio, i) => ({
        f: base * ratio * (1 + (rand() - 0.5) * 0.006),
        a: [0.5, 0.22, 0.12, 0.05][i] * (0.6 + rand() * 0.8),
        lfo: 0.04 + rand() * 0.12,
        phase: rand() * Math.PI * 2,
    }));
    const pulse = kind === 'pulse' ? 0.4 + rand() * 1.2 : 0;   // beats per second
    const fade = kind === 'loop' ? 0.05 : 1.5;                  // seconds
    const k = lp ? 1 - Math.exp((-2 * Math.PI * lp) / sampleRate) : 0;

    let air = 0, filtered = 0;
    for (let i = 0; i < n; i++) {
        const t = i / sampleRate;
        let s = 0;
        for (const p of partials) s += p.a * Math.sin(2 * Math.PI * p.f * t) * (0.65 + 0.35 * Math.sin(2 * Math.PI * p.lfo * t + p.phase));
        air = air * 0.985 + (rand() * 2 - 1) * 0.015;
        s += air * 0.5;
        if (pulse) s *= 0.25 + 0.75 * Math.pow(0.5 + 0.5 * Math.sin(2 * Math.PI * pulse * t), 3);
        s *= Math.min(1, t / fade, (seconds - t) / fade) * 0.4;
        if (lp) { filtered += k * (s - filtered); s = filtered; }
        out[i] = s;
    }
    return out;
}

/** An AudioBuffer for the Web Audio engines */
export function placeholderBuffer(ctx, url) {
    const spec = parse(url);
    const samples = synthesize(spec, ctx.sampleRate);
    const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
    buffer.copyToChannel(samples, 0);
    return buffer;
}

const WAV_RATE = 22050;
const wavUrls = new Map();

/** A WAV (mono, 16 bit) as an object URL, for the audio element. Made once per placeholder */
export function placeholderUrl(url) {
    if (wavUrls.has(url)) return wavUrls.get(url);
    const samples = synthesize(parse(url), WAV_RATE);
    const data = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(data);
    const text = (at, s) => [...s].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
    text(0, 'RIFF'); view.setUint32(4, 36 + samples.length * 2, true); text(8, 'WAVE');
    text(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, WAV_RATE, true); view.setUint32(28, WAV_RATE * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    text(36, 'data'); view.setUint32(40, samples.length * 2, true);
    for (let i = 0; i < samples.length; i++) view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 32767, true);
    const objectUrl = URL.createObjectURL(new Blob([data], { type: 'audio/wav' }));
    wavUrls.set(url, objectUrl);
    return objectUrl;
}

/** What goes in the audio element's src for a file: the file's full URL, or a placeholder's WAV */
export function resolveUrl(url) {
    return isPlaceholder(url) ? placeholderUrl(url) : new URL(url, window.location.href).href;
}
