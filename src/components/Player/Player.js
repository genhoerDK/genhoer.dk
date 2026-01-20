"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { XMarkIcon, MusicalNoteIcon } from '@heroicons/react/20/solid';
import TracksOverview from '@/components/Player/TracksOverview'
import CircularScrubber from '@/components/Player/CircularScrubber';
import LabelLarge from '@/components/LabelLarge';

export default function Player() {
    /** Read URL params to check if player should be open */
    const searchParams = useSearchParams();
    const isOpen = searchParams.has('lyt');

    /** Track if Tracks Overview panel is open */
    const [tracksOverviewOpen, setTracksOverviewOpen] = useState(false);

    /** Track if component has mounted to prevent hydration errors */
    const [mounted, setMounted] = useState(false);

    /** Set mounted to true after first render */
    useEffect(() => { setMounted(true); }, []);
    if (!mounted) return null;
    
    /** Toggle Tracks Overview panel open/closed */
    const toggleTracksOverview = () => { setTracksOverviewOpen(prev => !prev); }
    
    return (
        <article className={`fixed inset-0 w-screen h-dvh min-h-160 bg-zinc-50 ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}>
            <section className='relative flex items-center justify-center pt-20 sm:pt-16 lg:pt-0 size-full overflow-hidden'>

                {tracksOverviewOpen ? <TracksOverview toggleOverview={toggleTracksOverview} /> : <CircularScrubber />}

                <button onClick={toggleTracksOverview} className='absolute right-4 bottom-14 lg:inset-x-auto md:bottom-8 flex items-center gap-1 px-3 py-1.5 rounded-full cursor-pointer bg-zinc-200 text-zinc-800 md:hover:bg-zinc-600 md:hover:text-zinc-50'>
                    {tracksOverviewOpen ? <XMarkIcon className="size-5" /> : <MusicalNoteIcon className="size-5" /> }
                    <LabelLarge>Værker</LabelLarge>
                </button>
                
            </section>
        </article>
    );
}