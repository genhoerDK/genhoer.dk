'use client';

/**
 * Timeline interface in the listening room, with the playing chapter's photo (with depth) behind it.
 */

import { useAudio } from '@/context/AudioContext';
import PlayerShell from '@/components/Player/PlayerShell';
import Timeline from '@/components/Player/interfaces/Timeline';

export default function TimelinePlayer() {
    const { currentTrack, currentTime } = useAudio();
    const segments = currentTrack.segments ?? [];
    const chapter = segments.reduce((found, s, i) => (s.start <= currentTime ? i : found), 0);
    // A landscape version of the chapter's photo if there is one — the square one is cropped hard on wide screens
    const image = segments[chapter]?.imageLandscape ?? segments[chapter]?.image;

    return (
        <PlayerShell track={currentTrack} image={image} smoke={0.3}>
            <Timeline track={currentTrack} />
        </PlayerShell>
    );
}
