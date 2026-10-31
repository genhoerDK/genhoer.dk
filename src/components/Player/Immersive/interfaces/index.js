/**
 * Interfaces for the immersive player.
 *
 * Each work can choose how it is presented with an optional `player` field in
 * projects.json, e.g. { "player": { "type": "landskab" } }. Works without it get
 * the default. New interfaces — including fully interactive ones made for a
 * single work — are added here as a factory:
 *
 *   ({ size, actions, options, getState }) => ({
 *     scene, camera,
 *     update(frame, pointer),   // every frame: { dt, elapsed, progress, currentTime, duration,
 *                               //   isPlaying, envelope, segments, chapterIndex }
 *     resize(width, height),
 *     drag(dx, dy), click(pointer, actions), hovering(),   // optional input
 *     dispose(),
 *   })
 *
 * actions: { play, pause, seek(seconds), seekFraction(0–1) }
 * options: the rest of the work's `player` object, for per-work settings.
 */
import kapitler from './kapitler';
import landskab from './landskab';

export const interfaces = {
    kapitler: { label: 'Kapitler', factory: kapitler },
    landskab: { label: 'Landskab', factory: landskab },
};

export const DEFAULT_INTERFACE = 'kapitler';

export function interfaceFor(track, override) {
    const type = override ?? track?.player?.type;
    return interfaces[type] ? type : DEFAULT_INTERFACE;
}
