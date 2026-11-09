// Where a street work's speakers hang, and what its sound engine needs to know — in one place, for
// the interface (Street.js) and the engine (src/player/audio/Street.js, made in audio/engines.js).
// No React in here.
//
//   player.pairs     The stereo files, one per pair of speakers, in the order of the pairs along the street
//                    (not `files`: players.js fills that with the project's one file)
//   player.stretch   [from, to] metres along the street where the speakers hang (default: the whole walk)
//   player.hear      Metres along the street at which a speaker has gone silent (default: 1.5 pairs apart,
//                    so you hear your own pair and the neighbouring ones)

import { streets } from '@/player/vaerker/streets';

/**
 * The speakers in pairs, one on either side of the street facing the other, the pairs spread evenly
 * over the stretch: [{ s, side, pair }] — s metres along the street, side −1 left / 1 right walking
 * on, pair 1, 2 … from where the walk begins. A pair's left speaker comes first (its file's left channel).
 */
export function speakersOf(player) {
    const pairs = player.pairs?.length ?? Math.ceil((player.speakers ?? 8) / 2);
    const [a, b] = player.stretch ?? streets[player.street]?.walk ?? [0, 100];
    return Array.from({ length: pairs * 2 }, (_, i) => ({
        s: a + ((Math.floor(i / 2) + 0.5) / pairs) * (b - a),
        side: i % 2 ? 1 : -1,
        pair: Math.floor(i / 2) + 1,
    }));
}

/** Where a pair stands along the street, in metres */
export const pairAt = (speakers, pair) => speakers.find((sp) => sp.pair === pair)?.s;

/** The sound engine's settings for a street work */
export function streetConfig(player) {
    return {
        files: player.pairs ?? [],
        speakers: speakersOf(player),
        hear: player.hear,
        loop: player.loop,
    };
}
