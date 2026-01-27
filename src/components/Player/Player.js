"use client";

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useScrollLock } from "@/hooks/useScrollLock";
import { XMarkIcon, MusicalNoteIcon } from '@heroicons/react/20/solid';
import Overlay from '@/components/Overlay';
import TracksOverview from '@/components/Player/TracksOverview'
import CircularScrubber from '@/components/Player/CircularScrubber';
import LabelLarge from '@/components/LabelLarge';

export default function Player() {
    /** Read URL params to check if player should be open */
    const searchParams = useSearchParams();
    const isOpen = searchParams.has('lyt');
    useScrollLock(isOpen);

    /** Track if Tracks Overview panel is open */
    const [tracksOverviewOpen, setTracksOverviewOpen] = useState(false);

    /** Toggle Tracks Overview panel open/closed */
    const toggleTracksOverview = () => { setTracksOverviewOpen(prev => !prev); }

    return (
        <Overlay active={isOpen}>
            <section className='relative flex items-center justify-center size-full bg-zinc-50 min-h-160'>

                {tracksOverviewOpen ? <TracksOverview toggleOverview={toggleTracksOverview} /> : <CircularScrubber />}

                <button onClick={toggleTracksOverview} className='absolute right-4 bottom-14 lg:inset-x-auto md:bottom-8 flex items-center gap-1 px-3 py-1.5 rounded-full cursor-pointer bg-zinc-200 text-zinc-800 md:hover:bg-zinc-600 md:hover:text-zinc-50'>
                    {tracksOverviewOpen ? <XMarkIcon className="size-5" /> : <MusicalNoteIcon className="size-5" />}
                    <LabelLarge>Værker</LabelLarge>
                </button>

            </section>
        </Overlay>
    );
}