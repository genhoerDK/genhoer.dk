// How under-overfladen is played: its interface and that interface's settings (see src/player/players.js).

import { placeholder } from '@/player/vaerker/files';

/* Under overfladen: a loop that runs under the surface. The button brings it up for a while
   (the Bela patch: up in 0.1 s, 10 s at the surface, back down over 5 s; presses while up are ignored) */
export const player = {
    interface: 'loop',
    layers: {
        below: placeholder('under-overfladen-under', 48, 7, '&kind=loop&lp=420'),   // the processed version (wet)
        above: placeholder('under-overfladen-over', 48, 7, '&kind=loop'),           // the clear version (dry)
    },
    surface: { up: 0.1, hold: 10, down: 5 },
};
