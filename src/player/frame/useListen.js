'use client';

/**
 * Listening to a work from outside it — the play button on its project page, a cover in the overview
 * of works, the toolbar's Lyt — in one place, so every way in does the same:
 *
 *  - most works start playing, and those played with their interface (Troldetoner, Kanon i G3 …)
 *    open the player too;
 *  - a work that only its own buttons start (`silent` in interfaces/registry.js: 53 sekunder's
 *    elevator button, Tværveje's stories) is only opened: you are taken to it, and nothing sounds
 *    until you press in it.
 *
 *   const listen = useListen();
 *   listen(project);
 */

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAudio } from '@/player/AudioContext';
import { settingsFor } from '@/player/interfaces/registry';

export function useListen() {
    const { play, setTrack } = useAudio();
    const router = useRouter();
    return useCallback((project) => {
        const settings = settingsFor(project);
        if (settings.silent) setTrack(project); else play(project);
        if (settings.opens) router.replace('?lyt', { scroll: false });
    }, [play, setTrack, router]);
}
