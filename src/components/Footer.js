'use client';

import { useState } from 'react';
import { useFooter } from "@/context/FooterContext";
import { PlayIcon, PauseIcon } from '@heroicons/react/24/solid';

export default function Footer() {
    const { buttons } = useFooter();
    const [isPlaying, setIsPlaying] = useState(false);

    const togglePlay = () => {
        setIsPlaying((prev) => !prev);
    };

    return (
        <footer className="fixed bottom-0 flex flex-row-reverse items-center justify-between w-full p-2 md:px-4 bg-zinc-50 text-zinc-900">

            {/* Audio buttons (hidden) */}
            <button onClick={togglePlay} className="flex justify-center items-center size-10 border border-zinc-900 cursor-pointer opacity-0" aria-label={isPlaying ? 'Pause' : 'Afspil'}>
                {isPlaying ? (<PauseIcon className="size-5" />) : (<PlayIcon className="size-5" />)}
            </button>

            {/* Page buttons */}
            <div className='flex gap-2'>
                {buttons.map((btn) => (
                    <button key={`page-button-${btn.label}`} onClick={btn.onClick} className="flex justify-center items-center h-10 px-3 border border-zinc-900 cursor-pointer">
                        {btn.icon && <span className="size-5 mr-1">{btn.icon}</span>}
                        <p className="text-xs uppercase leading-none">{btn.label}</p>
                    </button>
                ))}
            </div>

        </footer>
    );
}