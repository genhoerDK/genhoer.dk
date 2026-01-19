"use client";

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { XMarkIcon, MusicalNoteIcon, PlayCircleIcon } from '@heroicons/react/20/solid';
import TracksOverview from '@/components/Player/TracksOverview'
import CircularScrubber from '@/components/Player/CircularScrubber';
import LabelLarge from '@/components/LabelLarge';

export default function Player() {
    const searchParams = useSearchParams();
    const isOpen = searchParams.has('lyt');

    const [tracksOverviewOpen, setTracksOverviewOpen] = useState(false);

    const toggleTracksOverview = () => {
        setTracksOverviewOpen(prev => !prev);
    }
    
    return (
        <article className={`fixed inset-0 w-screen h-dvh min-h-160 bg-zinc-50 ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}>
            <section className='relative flex items-center justify-center size-full overflow-hidden'>
                {tracksOverviewOpen ? <TracksOverview toggleOverview={toggleTracksOverview} /> : <CircularScrubber />}

                <button onClick={toggleTracksOverview} className='absolute right-4 bottom-14 md:right-auto md:bottom-10 flex items-center gap-1 px-2.5 py-1.5 rounded-full cursor-pointer bg-zinc-200 text-zinc-800 md:hover:bg-zinc-800 md:hover:text-zinc-50'>
                    {tracksOverviewOpen ? <XMarkIcon className="size-5" /> : <MusicalNoteIcon className="size-5" /> }
                    <LabelLarge>Værker</LabelLarge>
                </button>
                
            </section>
        </article>
    );
}