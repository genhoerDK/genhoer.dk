'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAudio } from '@/player/AudioContext';
import { settingsFor } from '@/player/interfaces/registry';
import { PauseCircleIcon, PlayCircleIcon, ChevronUpIcon, XMarkIcon } from "@heroicons/react/20/solid";
import Label from "@/components/UI/Label";
import ListenButton from '@/player/frame/ListenButton';
import MiniPlayerProgress from '@/player/frame/MiniPlayerProgress';

export default function PlayerControls() {
    const { play, pause, isPlaying, currentTrack, currentTime } = useAudio();
    const [showMiniPlayer, setShowMiniPlayer] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const isPlayerOpen = searchParams.has('lyt');

    // A work that only its own buttons start (the elevator, the walk) is not run from here: the
    // button pauses it, resumes a ride or a story that stands paused half way, and otherwise opens it
    const silent = settingsFor(currentTrack).silent;
    const togglePlayback = () => {
        if (isPlaying) return pause();
        if (silent && !(currentTime > 0)) return router.replace('?lyt', { scroll: false });
        play();
    }

    const togglePlayer = () => {
        isPlayerOpen
            ? router.replace('?', { scroll: false })
            : router.replace('?lyt', { scroll: false });
    }

    useEffect(() => {
        if (isPlayerOpen || isPlaying) setShowMiniPlayer(true);
    }, [isPlayerOpen, isPlaying]);

    if (!showMiniPlayer) {
        return <ListenButton />;
    }

    // min-w-0 all the way down lets a long title shrink and truncate instead of wrapping on narrow screens
    return (
        <div className="relative flex flex-col justify-center min-w-0">
            {isPlayerOpen && <div className='absolute inset-0 flex w-full h-0.5 bg-chrome'></div>}
            <div className='flex items-center min-w-0'>
                <button onClick={togglePlayback} className='flex z-10 items-center h-10 pl-2.5 pr-1 md:hover:opacity-75 cursor-pointer'>
                    {isPlaying ? <PauseCircleIcon className="size-6 bg-chrome-soft rounded-full" /> : <PlayCircleIcon className="size-6 bg-chrome-soft rounded-full" />}
                </button>
                <button onClick={togglePlayer} className="flex items-center min-w-0 h-10 cursor-pointer group">
                    <div className="relative flex gap-0.5 items-center min-w-0 pl-4 pr-1.25 py-1 -ml-4 rounded-r-full bg-chrome-soft overflow-hidden md:group-hover:opacity-80">
                        <Label size="lg" className="truncate">{currentTrack.title}</Label>
                        {isPlayerOpen ? <XMarkIcon className="size-4 shrink-0" /> : <ChevronUpIcon className="size-4 shrink-0" />}
                        {!silent && <MiniPlayerProgress />}
                    </div>
                </button>
            </div>
        </div>
    );
}