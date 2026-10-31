'use client';

import { useEffect, useState } from 'react';

/**
 * Loudness of the whole track over time, so the 3D scenes can draw the work
 * ahead of the listener and react to the sound.
 *
 * The file is fetched and decoded on its own — the <audio> element that plays
 * is never routed through Web Audio. That way a CDN without CORS headers can
 * only cost the visualisation, never the sound. When the file can't be read,
 * a calm synthetic envelope shaped by the chapters is used instead.
 *
 * Returns { values: Float32Array (0–1), rate: values per second, synthetic: boolean } or null while loading.
 */

const RATE = 20;          // values per second
const DECODE_RATE = 8000; // decode at a low sample rate to keep memory down on phones
const cache = new Map();

export function useAudioEnvelope(track) {
    const [envelope, setEnvelope] = useState(() => (track ? cache.get(track.audio) ?? null : null));

    useEffect(() => {
        if (!track?.audio) return;
        if (cache.has(track.audio)) {
            setEnvelope(cache.get(track.audio));
            return;
        }

        let cancelled = false;
        setEnvelope(null);

        analyse(track.audio)
            .catch(() => synthetic(track))
            .then((result) => {
                cache.set(track.audio, result);
                if (!cancelled) setEnvelope(result);
            });

        return () => { cancelled = true; };
    }, [track]);

    return envelope;
}

/** Sample an envelope at a time in seconds (linear interpolation) */
export function envelopeAt(envelope, seconds) {
    if (!envelope) return 0;
    const { values, rate } = envelope;
    const i = Math.max(0, seconds * rate);
    const i0 = Math.min(values.length - 1, Math.floor(i));
    const i1 = Math.min(values.length - 1, i0 + 1);
    const f = i - Math.floor(i);
    return values[i0] * (1 - f) + values[i1] * f;
}

/** Sample an envelope at a fraction (0–1) of the track */
export function envelopeAtFraction(envelope, fraction) {
    if (!envelope) return 0;
    return envelopeAt(envelope, fraction * (envelope.values.length - 1) / envelope.rate);
}

async function analyse(url) {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) throw new Error(`Audio fetch failed: ${response.status}`);
    const buffer = await response.arrayBuffer();

    const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const decoder = new OfflineCtx(1, 1, DECODE_RATE);
    const audio = await decoder.decodeAudioData(buffer);

    const channels = Array.from({ length: audio.numberOfChannels }, (_, c) => audio.getChannelData(c));
    const hop = Math.floor(audio.sampleRate / RATE);
    const count = Math.ceil(audio.length / hop);
    const values = new Float32Array(count);

    let max = 0;
    for (let i = 0; i < count; i++) {
        let sum = 0;
        const start = i * hop;
        const end = Math.min(audio.length, start + hop);
        for (let s = start; s < end; s++) {
            let v = 0;
            for (const ch of channels) v += ch[s];
            v /= channels.length;
            sum += v * v;
        }
        values[i] = Math.sqrt(sum / Math.max(1, end - start));
        if (values[i] > max) max = values[i];
    }

    // Normalise and lift quiet passages a bit so they remain visible
    for (let i = 0; i < count; i++) values[i] = Math.pow(values[i] / (max || 1), 0.6);

    return { values: smooth(values, 2), rate: RATE, synthetic: false };
}

function synthetic(track) {
    const segments = track.segments ?? [];
    const last = segments[segments.length - 1]?.start ?? 0;
    const duration = Math.max(60, last + 90);
    const count = Math.ceil(duration * RATE);
    const values = new Float32Array(count);

    // Seeded by the slug so each work gets its own shape
    let seed = 0;
    for (const char of track.slug) seed = (seed * 31 + char.charCodeAt(0)) % 9973;

    for (let i = 0; i < count; i++) {
        const t = i / RATE;
        const swell = 0.5 + 0.25 * Math.sin(t * 0.05 + seed) + 0.15 * Math.sin(t * 0.31 + seed * 2.1);
        const texture = 0.1 * Math.sin(t * 2.3 + seed) * Math.sin(t * 0.7);
        // Dip briefly at each chapter change
        const dip = segments.reduce((d, s) => d * (1 - 0.6 * Math.exp(-Math.pow((t - s.start) / 2, 2))), 1);
        values[i] = Math.min(1, Math.max(0.05, (swell + texture) * dip));
    }

    return { values, rate: RATE, synthetic: true };
}

function smooth(values, radius) {
    const out = new Float32Array(values.length);
    for (let i = 0; i < values.length; i++) {
        let sum = 0, n = 0;
        for (let k = -radius; k <= radius; k++) {
            const j = i + k;
            if (j >= 0 && j < values.length) { sum += values[j]; n++; }
        }
        out[i] = sum / n;
    }
    return out;
}
