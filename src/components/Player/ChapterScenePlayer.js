'use client';

/**
 * Player for sound works shown in 3D (project.player === "scene"): the title and the playing
 * chapter's name on top of ChapterScene. three.js is only loaded when this player is opened.
 */

import dynamic from 'next/dynamic';
import { useAudio } from '@/context/AudioContext';
import TrackSegmentInfo from '@/components/Player/TrackSegmentInfo';

const ChapterScene = dynamic(() => import('@/components/Player/ChapterScene'), { ssr: false });

export default function ChapterScenePlayer() {
    const { currentTrack, isPlaying, currentTime, duration, play, pause, seek } = useAudio();

    return (
        <div className='relative w-full h-svh'>
            <ChapterScene track={currentTrack} audio={{ isPlaying, currentTime, duration, play, pause, seek }} />
            <h2 className='absolute z-10 left-gutter top-12 leading-none font-extralight text-lg md:text-xl'>{currentTrack?.title}</h2>
            {currentTrack?.segments && <TrackSegmentInfo segments={currentTrack.segments} showImage={false} />}
        </div>
    );
}
