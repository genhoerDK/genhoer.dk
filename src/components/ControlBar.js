'use client';

import { useState } from 'react';
import { useControlBar } from "@/context/ControlBarContext";
import { PlayIcon, PauseIcon } from '@heroicons/react/24/solid';

export default function ControlBar() {
    const { buttons } = useControlBar();
    const [isPlaying, setIsPlaying] = useState(false);

    const togglePlay = () => {
        setIsPlaying((prev) => !prev);
    };

    return (
        <footer className="fixed bottom-0 w-full bg-zinc-50 p-2 md:px-4 flex flex-row-reverse items-center justify-between text-zinc-800">

            {/* Audio buttons */}
            <button onClick={togglePlay} className="size-10 flex justify-center items-center border border-zinc-800 cursor-pointer" aria-label={isPlaying ? 'Pause' : 'Afspil'}>
                {isPlaying ? (<PauseIcon className="size-5" />) : (<PlayIcon className="size-5" />)}
            </button>

            {/* Page buttons */}
            {buttons.map((btn) => (
                <button key={`page-button-${btn.label}`} onClick={btn.onClick} className="h-10 px-3 flex justify-center items-center border border-zinc-800 cursor-pointer">
                    {btn.icon && <span className="size-5 mr-1">{btn.icon}</span>}
                    <p className="text-xs uppercase leading-none">{btn.label}</p>
                </button>
            ))}

        </footer>
    );
}