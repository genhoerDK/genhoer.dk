import { isPlaceholder, placeholderBuffer } from './placeholder';

/** A sound file as an AudioBuffer — a placeholder is synthesised instead of fetched */
export async function loadBuffer(ctx, url) {
    if (isPlaceholder(url)) return placeholderBuffer(ctx, url);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: ${res.status}`);
    return ctx.decodeAudioData(await res.arrayBuffer());
}

/** A new AudioContext that plays through iOS's silent switch, like an audio element does */
export function createContext() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* not iOS */ }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    return new Ctx();
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
