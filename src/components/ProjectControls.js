'use client';

import { useState } from 'react';
import { PlayIcon, PauseIcon } from '@heroicons/react/24/solid';

export default function ProjectControls() {
    const [isPlaying, setIsPlaying] = useState(false);

    const togglePlay = () => {
        setIsPlaying((prev) => !prev);
    };

    return (
        <div className="fixed bottom-0 w-full bg-zinc-50 p-2 md:px-4 flex items-center justify-between">

            <button className="h-10 px-3 bg-zinc-50 hover:bg-zinc-100 border border-zinc-800 cursor-pointer">
                <p className="text-xs uppercase leading-none">Kreditering</p>
            </button>
            
            <button onClick={togglePlay} className="size-10 flex justify-center items-center bg-zinc-50 hover:bg-zinc-100 border border-zinc-800 cursor-pointer" aria-label={isPlaying ? 'Pause' : 'Afspil'}>
                {isPlaying ? (<PauseIcon className="size-5 text-zinc-800" />) : (<PlayIcon className="size-5 text-zinc-800" />)}
            </button>
        </div>
    );
}