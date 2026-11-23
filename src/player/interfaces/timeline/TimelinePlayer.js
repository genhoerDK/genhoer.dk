'use client';

/**
 * Timeline interface in the listening room, with the playing chapter's photo (with depth) behind it.
 */

import { useSyncExternalStore } from 'react';
import { useAudio } from '@/player/AudioContext';
import PlayerShell from '@/player/frame/PlayerShell';
import Timeline from '@/player/interfaces/timeline/Timeline';

// Portrait or landscape: the same choice as the covers' <picture> (components/Layout/BackgroundImage.js). The photo is
// a texture in the 3D backdrop, not an <img>, so the media query picks the file here
const PORTRAIT = '(max-width: 768px)';
const watch = (onChange) => {
    const query = matchMedia(PORTRAIT);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
};

export default function TimelinePlayer() {
    const { currentTrack, currentTime } = useAudio();
    const portrait = useSyncExternalStore(watch, () => matchMedia(PORTRAIT).matches, () => false);
    const segments = currentTrack.segments ?? [];
    const chapter = segments.reduce((found, s, i) => (s.start <= currentTime ? i : found), 0);
    // The chapter's photo in the screen's orientation; a chapter without one shows the cover (PlayerShell)
    const image = (portrait ? segments[chapter]?.imagePortrait : segments[chapter]?.imageLandscape) ?? undefined;

    return (
        <PlayerShell track={currentTrack} image={image} smoke={0.3}>
            <Timeline track={currentTrack} />
        </PlayerShell>
    );
}
