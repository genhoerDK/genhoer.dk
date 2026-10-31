/**
 * Interfaces for the immersive player.
 *
 * Each work can choose how it is presented with an optional `player` field in
 * projects.json (or players.json), e.g. { "type": "landskab" }. There are two kinds:
 *
 *   linear       a sound file with chapters (`audio` + `segments`) — default "kapitler"
 *   interactive  layers and push buttons played by src/audio/LayeredEngine.js
 *                (`player.tracks` + `player.buttons`) — default "knapper"
 *
 * New interfaces — including ones made for a single work — are added here as a factory:
 *
 *   ({ size, actions, options, getState }) => ({
 *     scene, camera,
 *     update(frame, pointer),   // every frame: { dt, elapsed, progress, currentTime, duration, isPlaying,
 *                               //   envelope, segments, chapterIndex, engine, engineState }
 *     resize(width, height),
 *     drag(dx, dy), click(pointer, actions), hovering(),   // optional input
 *     pointerDown(pointer) → true to hold the pointer (buttons), pointerUp(pointer),
 *     dispose(),
 *   })
 *
 * actions: { play, pause, seek(seconds), seekFraction(0–1), press(button), release(button) }
 * options: the work's `player` object, for per-work settings, plus `work` ({ title, location, description }).
 */
import kapitler from './kapitler';
import landskab from './landskab';
import knapper from './knapper';
import overflade from './overflade';
import pult from './pult';

export const interfaces = {
    kapitler: { label: 'Kapitler', kind: 'linear', factory: kapitler },
    landskab: { label: 'Landskab', kind: 'linear', factory: landskab },
    pult: { label: 'Pult', kind: 'interactive', factory: pult },
    knapper: { label: 'Knapper', kind: 'interactive', factory: knapper },
    overflade: { label: 'Overflade', kind: 'interactive', factory: overflade },
};

const DEFAULTS = { linear: 'kapitler', interactive: 'knapper' };

export const kindOf = (track) => (track?.player?.tracks?.length ? 'interactive' : 'linear');

/** The interface to use for a work; an override (test switch) only applies within the same kind */
export function interfaceFor(track, override) {
    const kind = kindOf(track);
    for (const type of [override, track?.player?.type]) {
        if (interfaces[type]?.kind === kind) return type;
    }
    return DEFAULTS[kind];
}

export const interfacesOfKind = (kind) => Object.entries(interfaces).filter(([, i]) => i.kind === kind);
