// How 53-sekunder-til-faelles is played: its interface and that interface's settings (see src/player/players.js).

import { placeholder } from '@/player/vaerker/files';

/* 53 sekunder til fælles: the elevator's button and display. Each press is a ride: the next of
   twelve variations plays, the display shows 53 and after 6 s counts down — one count per
   second, apart from variation 5 (slower) and 8 (faster); variation 7 breaks down at 25.
   model: the lift itself in 3D behind (hoejbane.js here), the cabin riding with the count.
   For testing until the real files are in: variation 1 breaks down halfway (the picture then
   fades and the cabin is back at its station), variation 2 rides in a storm (rain and fog) */
export const player = {
    interface: 'countdown',
    model: true,
    look: 'dark',   // 'dark' (greys on the dark, as Tværveje) or 'pale' (under a sky, as Kanon i G3)
    from: 53,
    delay: 6,
    tracks: Array.from({ length: 12 }, (_, i) => ({
        title: `Variation ${i + 1}`,
        file: placeholder(`53-sekunder-${i + 1}`, 64, 53 + i, i % 3 === 1 ? '&kind=pulse' : ''),
        tempo: { 5: 1.2, 8: 0.68 }[i + 1] ?? 1,   // seconds per count
        stopAt: { 1: 27, 7: 25 }[i + 1] ?? 0,
        weather: i + 1 === 2 ? 'storm' : null,
    })),
};
