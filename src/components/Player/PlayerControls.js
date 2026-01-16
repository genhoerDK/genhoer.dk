'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useIsPortrait } from "@/hooks/useIsPortrait";
import { useAudio } from '@/context/AudioContext';
import { PauseCircleIcon, ChevronUpIcon, ChevronDownIcon, PlayCircleIcon} from "@heroicons/react/20/solid";
import LabelLarge from "@/components/LabelLarge"; 
import ListenButton from '@/components/Player/ListenButton';
import MiniPlayerProgress from '@/components/Player/MiniPlayerProgress'

export default function PlayerControls() {
    const { play, pause, isPlaying, currentTrack } = useAudio();
    const [showMiniPlayer, setShowMiniPlayer] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const isPlayerOpen = searchParams.has('lyt');
    const isPortrait = useIsPortrait();
    const ResponsiveChevrons = isPlayerOpen ? isPortrait ? ChevronDownIcon : ChevronUpIcon : isPortrait ? ChevronUpIcon : ChevronDownIcon;

    const togglePlayback = () => {
        isPlaying ? pause() : play();
    }

    const togglePlayer = () => {
        isPlayerOpen ? router.replace('?') : router.replace('?lyt');
    }

    useEffect(() => {
        if (isPlayerOpen || isPlaying) setShowMiniPlayer(true);
    }, [isPlayerOpen, isPlaying]);

    if (!showMiniPlayer) {
        return <ListenButton />;
    }

    return (
        <div className="relative flex flex-col justify-center">
            {isPlayerOpen && <div className='absolute inset-0 flex w-full h-0.5 bg-zinc-800'></div>}
            <div className='flex items-center'>
                <button onClick={togglePlayback} className='flex z-10 items-center h-10 pl-2.5 pr-1 text-zinc-800 md:hover:text-zinc-400 cursor-pointer'>
                    {isPlaying ? <PauseCircleIcon className="size-6 bg-zinc-50 rounded-full" /> : <PlayCircleIcon className="size-6 bg-zinc-50 rounded-full" />}
                </button>
                <button onClick={togglePlayer} className="flex items-center h-10 cursor-pointer text-zinc-950 group">
                    <div className="relative flex gap-0.5 items-center pl-3 pr-1 py-0.75 -ml-3 rounded-r-full bg-zinc-200 overflow-hidden md:group-hover:bg-zinc-300 md:group-hover:text-zinc-600">
                        <LabelLarge>{currentTrack.title}</LabelLarge>
                        <ResponsiveChevrons className="size-4" />
                        <MiniPlayerProgress />
                    </div>
                </button>
            </div>
        </div>
    );
}