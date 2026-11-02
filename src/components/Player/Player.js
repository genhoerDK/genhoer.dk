"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useScrollLock } from "@/hooks/useScrollLock";
import { XMarkIcon, MusicalNoteIcon } from '@heroicons/react/20/solid';
import Overlay from '@/components/Layout/Overlay';
import Button from '@/components/UI/Button';
import Label from '@/components/UI/Label';
import TracksOverview from '@/components/Player/TracksOverview';
import CircularScrubber from '@/components/Player/CircularScrubber';
import InstrumentPlayer from '@/components/Player/InstrumentPlayer';
import { useAudio, isInstrument } from '@/context/AudioContext';

export default function Player() {
    /** Read URL params to check if player should be open */
    const searchParams = useSearchParams();
    const isOpen = searchParams.has('lyt');
    const { currentTrack } = useAudio();
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
            {tracksOverviewOpen ? <TracksOverview toggleOverview={toggleTracksOverview} />
                : isInstrument(currentTrack) ? <InstrumentPlayer />
                : <CircularScrubber />}

            <Button variant="pill" onClick={toggleTracksOverview} className='absolute z-20 right-gutter top-10 gap-2 py-1.5 px-3'>
                {tracksOverviewOpen ? <XMarkIcon className="size-5" /> : <MusicalNoteIcon className="size-5" />}
                <Label size="lg">Værker</Label>
            </Button>
        </Overlay>
    );
}
