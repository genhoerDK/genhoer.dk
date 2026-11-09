// How 53-sekunder-til-faelles is played: its interface and that interface's settings (see src/player/players.js).

import { cdn } from '@/player/vaerker/files';

/* 53 sekunder til fælles: the elevator's button and display, as the installation's Bela patch
   (main.pd). Each press is a ride: the next of twelve variations plays (1 to 12, then 1 again),
   the display shows 53 and after 6 s counts down, one count per second — apart from variation 5,
   where a second lasts 1.2 s, and 8, where it lasts 0.68 s; variation 7 is the technical fault and
   stops at 25, halfway. Variation 3 rides in a storm. The first ride goes from the hospital to the
   hotel and then they go back and forth: odd variations from the hospital, even from the hotel —
   after 7 has broken down, 8 sets off from the hotel.
   The lift itself stands behind in 3D (hoejbane.js here), the cabin riding with the count */
// The variations' titles, in their order (1–12)
const TITLES = [
    'Lykkerus', 'Januarnat', 'Stormen Egon', 'Højdeskræk', 'Træthed', 'Angst for et styrt',
    'Teknisk fejl', 'Begejstrede børn', 'Nostalgisk tur 1', 'Nostalgisk tur 2', 'Nervøsitet', 'Standard',
];

export const player = {
    interface: 'countdown',
    from: 53,
    delay: 6,
    tracks: Array.from({ length: 12 }, (_, i) => ({
        title: TITLES[i],
        file: cdn('viborg-2026', `audio/${i + 1}.mp3`),
        tempo: { 5: 1.2, 8: 0.68 }[i + 1] ?? 1,   // seconds per count
        stopAt: { 7: 25 }[i + 1] ?? 0,             // where the count stops: the breakdown
        weather: { 3: 'storm' }[i + 1] ?? null,
    })),
};
