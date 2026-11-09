// The interfaces a work can be played with, and what each needs. No React in here, so the audio
// layer (src/player/AudioContext.js) can read it too. The components are in index.js.
//
//   engine   file         the audio element in AudioContext (one file at a time; several in turn for
//                         countdown and walk)
//            instrument   src/player/audio/Instrument.js — buttons that play samples over a music loop
//            loop         src/player/audio/Loop.js — two layers of a loop, crossfaded by a button
//            quad         src/player/audio/Quad.js — four speakers around the listener (HRTF)
//   tone     ink (dark, the photo behind) or paper (light) — the overlay's background
//   opens    true: playing it from outside (its project page, the overview, Lyt) opens the player,
//            because it needs its interface
//   silent   true: only its own buttons start it (53 sekunder's elevator button, Tværveje's stories).
//            From outside it is only opened — nothing sounds until you press in it (frame/useListen.js) —
//            and it is not on the mini player's bar: no progress there, and its play button opens
//            the work unless a ride or a story stands paused half way
//   loop     file engines: the file starts over when it ends (false: it stops, and the interface decides)

export const INTERFACES = {
    timeline:  { engine: 'file', tone: 'ink', opens: false, loop: true },
    buttons:   { engine: 'instrument', tone: 'ink', opens: true },
    loop:      { engine: 'loop', tone: 'ink', opens: true },
    countdown: { engine: 'file', tone: 'ink', opens: true, silent: true, loop: false },
    walk:      { engine: 'file', tone: 'ink', opens: true, silent: true, loop: false },
    quad:      { engine: 'quad', tone: 'ink', opens: true },
    street:    { engine: 'file', tone: 'ink', opens: true, loop: true },
};

export const DEFAULT_INTERFACE = 'timeline';

/** The interface's settings for a track (the default for one without a player) */
export function settingsFor(track) {
    return INTERFACES[track?.player?.interface] ?? INTERFACES[DEFAULT_INTERFACE];
}
