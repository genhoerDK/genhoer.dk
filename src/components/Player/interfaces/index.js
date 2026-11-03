// A player is put together from modules:
//
//   playback    an audio file (AudioContext) or an instrument (src/audio/Instrument.js)
//   interface   how it's played: circular, timeline or buttons
//   background  e.g. a photo with depth (scene/DepthBackdrop.js)
//
// project.player (set in genhoer-data) chooses:
//
//   null / "circular"   circular player (2D) — the default
//   "timeline"          timeline, with each chapter's image (with depth) behind it
//   a key in src/data/instruments.js (e.g. "troldetoner")
//                       the instrument's buttons, with the cover image (with depth) behind them

import { isInstrument } from '@/context/AudioContext';

export const INTERFACES = ['circular', 'timeline', 'buttons'];

export function interfaceFor(track) {
    if (isInstrument(track)) return 'buttons';
    if (track?.player === 'timeline') return 'timeline';
    return 'circular';
}
