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
 * A work chosen in the overview of works also takes you to its project page, with the player open on
 * it, so closing the player leaves you on the page of the work you chose (not the one you came from):
 *
 *   const listen = useListen();
 *   listen(project);
 *   listen(project, { toProjectPage: true });   // the overview of works
 */

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAudio } from '@/player/AudioContext';
import { settingsFor } from '@/player/interfaces/registry';
import { setOverlay } from '@/hooks/setOverlay';

export function useListen() {
    const { play, setTrack } = useAudio();
    const router = useRouter();
    return useCallback((project, { toProjectPage = false } = {}) => {
        const settings = settingsFor(project);
        if (settings.silent) setTrack(project); else play(project);
        const page = `/${project.slug}`;
        if (toProjectPage && window.location.pathname !== page) {
            // Another page: a real navigation through Next.js (the page has to be loaded), and a new
            // entry in the history, like a project on the map; back is the page you came from
            router.push(`${page}?lyt`, { scroll: false });
        } else if (toProjectPage || settings.opens) {
            setOverlay('?lyt');
        }
    }, [play, setTrack, router]);
}
