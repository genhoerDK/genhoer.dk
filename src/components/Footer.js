'use client';

import { useAudio } from '@/context/AudioContext'
import { useFooter } from "@/context/FooterContext";
import { PlayIcon, PauseIcon } from '@heroicons/react/24/outline';

export default function Footer() {
    const { buttons } = useFooter();
    const { isPlaying, togglePlay, title } = useAudio()

    return (
        <footer className="fixed bottom-0 flex flex-row-reverse items-center justify-between w-full p-2 md:px-4 bg-zinc-50 text-zinc-900">

            {/* Audio controls */}
            <div className="flex h-10 ml-2 overflow-hidden">
                <div className={`h-full transition-all duration-500 border border-r-0 border-zinc-900 -z-10 ${isPlaying ? "translate-x-0" : "translate-x-full"}`}>
                    <div className="flex flex-col justify-center p-2 pointer-events-none whitespace-nowrap">
                        <p className="text-[0.6rem] uppercase leading-none font-bold">Afspiller værket:</p>
                        <p className="text-xs uppercase leading-none">{title}</p>
                    </div>
                </div>

                <button onClick={togglePlay} className="flex justify-center items-center flex-shrink-0 size-10 border border-zinc-900 bg-zinc-50 cursor-pointer">
                    {isPlaying ? <PauseIcon className="size-5" /> : <PlayIcon className="size-5" />}
                </button>
            </div>

            {/* Page buttons */}
            <div className="flex gap-2">
                {buttons.map((btn) => (
                    <button key={`page-button-${btn.label}`} onClick={btn.onClick} className="flex justify-center items-center h-10 px-3 border border-zinc-900 bg-zinc-50 md:hover:bg-zinc-900 md:hover:text-zinc-50 cursor-pointer">
                        {btn.icon && <span className="size-5 mr-1">{btn.icon}</span>}
                        <p className="text-xs uppercase leading-none">{btn.label}</p>
                    </button>
                ))}
            </div>

        </footer>
    );
}