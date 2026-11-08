'use client';

// The 3D scenes built for one work, by the work's slug. A generic interface (quad, countdown) shows
// the scene its work has here; each scene lives in its work's folder. Loaded only when the work is
// opened, so three.js and the model stay out of the rest of the site.

import dynamic from 'next/dynamic';

export const scenes = {
    'kanon-i-g3': dynamic(() => import('@/player/vaerker/kanon-i-g3/QuadScene'), { ssr: false }),
    '53-sekunder-til-faelles': dynamic(() => import('@/player/vaerker/53-sekunder-til-faelles/ElevatorScene'), { ssr: false }),
};
