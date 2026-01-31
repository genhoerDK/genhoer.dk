"use client";

import { useState, useEffect } from 'react';
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

    useEffect(() => {
        setTracksOverviewOpen(false);
    }, [isOpen]);

    /** Toggle Tracks Overview panel open/closed */
    const toggleTracksOverview = () => { setTracksOverviewOpen(prev => !prev); }

    /** Track if component has mounted to prevent hydration errors */
    const [mounted, setMounted] = useState(false);

    /** Set mounted to true after first render */
    useEffect(() => { setMounted(true); }, []);
    if (!mounted) return null;

    return (
        <Overlay active={isOpen}>

                {tracksOverviewOpen ? <TracksOverview toggleOverview={toggleTracksOverview} /> : <CircularScrubber />}

                <button onClick={toggleTracksOverview} className='absolute right-4 bottom-14 md:right-1/2 md:translate-x-1/2 md:bottom-8 flex items-center gap-1 px-3 py-1.5 rounded-full cursor-pointer bg-ink text-paper md:hover:bg-muted md:hover:text-ink'>
                    {tracksOverviewOpen ? <XMarkIcon className="size-5" /> : <MusicalNoteIcon className="size-5" />}
                    <LabelLarge>Værker</LabelLarge>
                </button>

        </Overlay>
    );
}
    