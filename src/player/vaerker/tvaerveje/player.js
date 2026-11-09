// How tvaerveje is played: its interface and that interface's settings (see src/player/players.js).

import { cdn } from '@/player/vaerker/files';

/* Tværveje: three places in Nakskov, and at each the three characters' stories (nine mono files).
   map = the streets (nakskov.js here, by name in ../maps.js), at = where the place sits on it (in the map's units),
   label = where its name stands (left, right, above, below the marker). The walk goes through
   the places in this order.

   The sound: cdn.genhoer.dk/media/nakskov-2026/audio/<place>-<n>.mp3, numbered the same at every
   place: 1 is Aksel (1931), 2 Knud (1808), 3 Kirstine (1620) */
const FILE_NUMBER = { aksel: 1, knud: 2, kirstine: 3 };

export const player = {
    interface: 'walk',
    map: 'nakskov',
    characters: [
        { id: 'aksel', name: 'Aksel', year: 1931 },
        { id: 'knud', name: 'Knud', year: 1808 },
        { id: 'kirstine', name: 'Kirstine', year: 1620 },
    ],
    places: [
        { name: 'Det Gamle Færgeleje', slug: 'det-gamle-faergeleje', at: [244, 183], label: 'left' },   // at the quay's edge by the old ferry berth, on land
        { name: 'Axeltorv', slug: 'axeltorv', at: [590, 320], label: 'right' },
        { name: 'Dronningens Pakhus', slug: 'dronningens-pakhus', at: [750, 512], label: 'right' },   // the stand on the corner of Havnegade, across Dronningensstræde from the warehouse
    ].map(({ slug, ...place }) => ({
        ...place,
        stories: ['aksel', 'knud', 'kirstine'].map((character) => ({   // in this order at every place, as the files are numbered
            character,
            file: cdn('nakskov-2026', `audio/${slug}-${FILE_NUMBER[character]}.mp3`),
        })),
    })),
};
