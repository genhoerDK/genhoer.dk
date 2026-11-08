// How tvaerveje is played: its interface and that interface's settings (see src/player/players.js).

import { placeholder } from '@/player/vaerker/files';

/* Tværveje: three places in Nakskov, and at each the three characters' stories (nine mono files).
   map = the streets (nakskov.js here, by name in ../maps.js), at = where the place sits on it (in the map's units),
   label = where its name stands (left, right, above, below the marker). The walk goes through
   the places in this order */
export const player = {
    interface: 'walk',
    map: 'nakskov',
    characters: [
        { id: 'kirstine', name: 'Kirstine', year: 1620 },
        { id: 'knud', name: 'Knud', year: 1808 },
        { id: 'aksel', name: 'Aksel', year: 1931 },
    ],
    places: [
        { name: 'Det Gamle Færgeleje', at: [256, 171], label: 'left' },   // on the quay by the old ferry berth, not out on the water
        { name: 'Axeltorv', at: [590, 320], label: 'right' },
        { name: 'Dronningens Pakhus', at: [753, 485], label: 'right' },
    ].map((place, p) => ({
        ...place,
        stories: ['kirstine', 'knud', 'aksel'].map((character, c) => ({
            character,
            file: placeholder(`tvaerveje-${p + 1}-${character}`, 24, 200 + p * 3 + c),
        })),
    })),
};
