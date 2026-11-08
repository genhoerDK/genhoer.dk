import { isPlaceholder, placeholderBuffer } from './placeholder';

/** A sound file's bytes (null for a placeholder, which is synthesised instead) */
export async function fetchSound(url) {
    if (isPlaceholder(url)) return null;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: ${res.status}`);
    return res.arrayBuffer();
}

/** Fetched bytes (see fetchSound) as an AudioBuffer */
export async function decodeSound(ctx, url, bytes) {
    return bytes ? ctx.decodeAudioData(bytes) : placeholderBuffer(ctx, url);
}

/** A sound file as an AudioBuffer — a placeholder is synthesised instead of fetched */
export async function loadBuffer(ctx, url) {
    return decodeSound(ctx, url, await fetchSound(url));
}

/** A new AudioContext that plays through iOS's silent switch, like an audio element does; options e.g. { sampleRate } */
export function createContext(options) {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* not iOS */ }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    try { return new Ctx(options); } catch { return new Ctx(); }   // an older browser may not take a sample rate
}

/** One channel of a buffer as a mono buffer (a stereo file's left or right) */
export function channelOf(ctx, buffer, channel = 0) {
    if (buffer.numberOfChannels === 1) return buffer;
    const mono = ctx.createBuffer(1, buffer.length, buffer.sampleRate);
    mono.copyToChannel(buffer.getChannelData(Math.min(channel, buffer.numberOfChannels - 1)), 0);
    return mono;
}

/** Move an AudioParam to a value over some seconds from a point in time (linear, like Pd's [line~]) */
export function ramp(param, value, at, seconds) {
    param.cancelScheduledValues(at);
    param.setValueAtTime(param.value, at);
    param.linearRampToValueAtTime(value, at + Math.max(seconds, 0.001));
}
