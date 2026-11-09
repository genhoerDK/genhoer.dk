// How kirkestraede is played: its interface and that interface's settings (see src/player/players.js).

import { cdn } from '@/player/vaerker/files';

/* Kirkestræde: the street in Køge in 3D, seen from above, from Torvet to Sankt Nicolai Kirke,
   walked by scrolling. street = the town round it (koege.js here, from OpenStreetMap); ends = the
   names at either end. Four pairs of speakers, facing each other across the street, hang on the
   stretch where the work stood (metres along the street); each pair plays one stereo file
   (gks-1 the pair nearest Torvet … gks-4), its left channel from the speaker on the left walking
   towards the church. You hear all of them, the ones you stand by much louder (see
   interfaces/street/speakers.js). The timeline shows the events in the street, each at a pair. */
export const player = {
    interface: 'street',
    street: 'kirkestraede',
    ends: ['Torvet', 'Sankt Nicolai Kirke'],
    pairs: [1, 2, 3, 4].map((n) => cdn('koege-2025', `audio/gks-${n}.mp3`)),   // a stereo file per pair
    stretch: [12.5, 95.5],   // the stretch the speakers hang on, from the screenshot
    reach: 9,                // metres over which a speaker falls towards its quietest
    quietest: 0.08,          // how loud the speakers furthest away still are (about −22 dB)
    // PROVISIONAL, until the real list comes: where each pair is loudest in the files
    events: [
        { title: 'Par 1', start: 0, pair: 1 },
        { title: 'Par 4', start: 40, pair: 4 },
        { title: 'Par 2', start: 70, pair: 2 },
        { title: 'Par 1', start: 90, pair: 1 },
        { title: 'Par 1', start: 190, pair: 1 },
        { title: 'Par 3', start: 210, pair: 3 },
        { title: 'Par 4', start: 220, pair: 4 },
        { title: 'Par 3', start: 340, pair: 3 },
    ],
};
