// The interfaces a work can be played with, and what each needs. No React in here, so the audio
// layer (src/context/AudioContext.js) can read it too. The components are in index.js.
//
//   engine   file         the audio element in AudioContext (one file at a time; several in turn for
//                         countdown and walk)
//            instrument   src/audio/Instrument.js — buttons that play samples over a music loop
//            loop         src/audio/Loop.js — two layers of a loop, crossfaded by a button
//            quad         src/audio/Quad.js — four speakers around the listener (HRTF)
//   tone     ink (dark, the photo behind) or paper (light) — the overlay's background
//   opens    true: playing it from the project page opens the player, because it needs its interface
//   silent   true: opening it from the project page starts nothing — its own button does (the elevator)
//   loop     file engines: the file starts over when it ends (false: it stops, and the interface decides)

export const INTERFACES = {
    timeline:  { engine: 'file', tone: 'ink', opens: false, loop: true },
    circular:  { engine: 'file', tone: 'paper', opens: false, loop: true },
    buttons:   { engine: 'instrument', tone: 'ink', opens: true },
    loop:      { engine: 'loop', tone: 'ink', opens: true },
    countdown: { engine: 'file', tone: 'ink', opens: true, silent: true, loop: false },
    walk:      { engine: 'file', tone: 'ink', opens: true, loop: false },
    quad:      { engine: 'quad', tone: 'ink', opens: true },
};

export const DEFAULT_INTERFACE = 'timeline';

/** The interface's settings for a track (the default for one without a player) */
export function settingsFor(track) {
    return INTERFACES[track?.player?.interface] ?? INTERFACES[DEFAULT_INTERFACE];
}
