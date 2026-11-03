'use client';

/**
 * Timeline interface with the playing chapter's image (with depth) behind it.
 * three.js is only loaded when this player is opened.
 */

import dynamic from 'next/dynamic';
import { useAudio } from '@/context/AudioContext';
import Timeline from '@/components/Player/interfaces/Timeline';
import { depthMapFor } from '@/components/Player/scene/depth';

const DepthBackdrop = dynamic(() => import('@/components/Player/scene/DepthBackdrop'), { ssr: false });

export default function TimelinePlayer() {
    const { currentTrack, currentTime } = useAudio();
    const segments = currentTrack?.segments ?? [];
    const chapter = segments.reduce((found, s, i) => (s.start <= currentTime ? i : found), 0);
    // A landscape version of the chapter's image if there is one — the square one is cropped hard on wide screens
    const image = segments[chapter]?.imageLandscape ?? segments[chapter]?.image ?? currentTrack?.coverImageLandscape;

    return (
        <div className='relative w-full h-svh'>
            <DepthBackdrop image={image} depth={depthMapFor(image)} />
            {/* Paper fades behind the text and the timeline, so they read on any photo */}
            <div className='absolute inset-x-0 top-0 h-56 bg-linear-to-b from-paper/90 via-paper/50 to-transparent pointer-events-none' />
            <div className='absolute inset-x-0 bottom-0 h-56 bg-linear-to-t from-paper via-paper/70 to-transparent pointer-events-none' />
            {segments.length > 0 && <Timeline track={currentTrack} />}
        </div>
    );
}
