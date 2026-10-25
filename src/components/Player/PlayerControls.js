'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAudio } from '@/context/AudioContext';
import { PauseCircleIcon, PlayCircleIcon, ChevronUpIcon, XMarkIcon } from "@heroicons/react/20/solid";
import Label from "@/components/UI/Label";
import ListenButton from '@/components/Player/ListenButton';
import MiniPlayerProgress from '@/components/Player/MiniPlayerProgress';

export default function PlayerControls() {
    const { play, pause, isPlaying, currentTrack } = useAudio();
    const [showMiniPlayer, setShowMiniPlayer] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const isPlayerOpen = searchParams.has('lyt');

    const togglePlayback = () => {
        isPlaying ? pause() : play();
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
            {isPlayerOpen && <div className='absolute inset-0 flex w-full h-0.5 bg-ink'></div>}
            <div className='flex items-center min-w-0'>
                <button onClick={togglePlayback} className='flex z-10 items-center h-10 pl-2.5 pr-1 md:hover:text-hard/75 cursor-pointer'>
                    {isPlaying ? <PauseCircleIcon className="size-6 bg-soft rounded-full" /> : <PlayCircleIcon className="size-6 bg-soft rounded-full" />}
                </button>
                <button onClick={togglePlayer} className="flex items-center min-w-0 h-10 cursor-pointer group">
                    <div className="relative flex gap-0.5 items-center min-w-0 pl-4 pr-1.25 py-1 -ml-4 rounded-r-full bg-soft overflow-hidden md:group-hover:bg-muted/25">
                        <Label size="lg" className="truncate">{currentTrack.title}</Label>
                        {isPlayerOpen ? <XMarkIcon className="size-4 shrink-0" /> : <ChevronUpIcon className="size-4 shrink-0" />}
                        <MiniPlayerProgress />
                    </div>
                </button>
            </div>
        </div>
    );
}