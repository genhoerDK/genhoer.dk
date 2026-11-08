// How kanon-i-g3 is played: its interface and that interface's settings (see src/player/players.js).

import { cdn } from '@/player/vaerker/files';

/* Kanon i G3: four speakers round the pit, clockwise from front left, with the listener floating
   over the middle. angle = where a speaker stands, degrees clockwise from straight ahead. Four
   mono files, started on the same sample. A stereo file's channel is picked with channel: 0 | 1.
   The emplacement is built in code (kanonstilling.js here); textured: true weathers its
   concrete (concrete.js here), false leaves it plain grey */
export const player = {
    interface: 'quad',
    image: cdn('bornholm-2026', 'image-03.webp'),
    textured: true,
    look: 'dark',   // 'dark' (Tværveje's dark design: greys on dark ground), 'blueprint' (white lines on dark), 'stylised' (pale, simple, indie-game) or 'realistic' (photo, textures, detailed trees)
    speakers: [
        { label: 'Forrest til venstre', angle: -45, file: cdn('bornholm-2026', 'kanon-i-g3-1.mp3') },
        { label: 'Forrest til højre', angle: 45, file: cdn('bornholm-2026', 'kanon-i-g3-2.mp3') },
        { label: 'Bagest til højre', angle: 135, file: cdn('bornholm-2026', 'kanon-i-g3-3.mp3') },
        { label: 'Bagest til venstre', angle: -135, file: cdn('bornholm-2026', 'kanon-i-g3-4.mp3') },
    ],
    reverb: 0.12,  // 0–1: a little of the bunker's echo on top (synthesised)
};
