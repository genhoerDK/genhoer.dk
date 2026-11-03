"use client";

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useScrollLock } from "@/hooks/useScrollLock";
import Overlay from '@/components/Layout/Overlay';
import TracksOverview from '@/components/Player/TracksOverview';
import CircularScrubber from '@/components/Player/CircularScrubber';
import InstrumentPlayer from '@/components/Player/InstrumentPlayer';
import TimelinePlayer from '@/components/Player/TimelinePlayer';
import { interfaceFor } from '@/components/Player/interfaces';
import { useAudio } from '@/context/AudioContext';

/** The interface module for each kind of player — see interfaces/index.js */
const interfaces = {
    circular: CircularScrubber,
    timeline: TimelinePlayer,
    buttons: InstrumentPlayer,
};

export default function Player() {
    /** Read URL params to check if player should be open */
    const searchParams = useSearchParams();
    const isOpen = searchParams.has('lyt');
    const { currentTrack } = useAudio();
    const Interface = interfaces[interfaceFor(currentTrack)];
    useScrollLock(isOpen);

    /** The overview of works is part of the address (?lyt=vaerker); its button is in the toolbar */
    const router = useRouter();
    const tracksOverviewOpen = searchParams.get('lyt') === 'vaerker';
    const closeTracksOverview = () => router.replace('?lyt', { scroll: false });

    /** Track if component has mounted to prevent hydration errors */
    const [mounted, setMounted] = useState(false);

    /** Set mounted to true after first render */
    useEffect(() => { setMounted(true); }, []);
    if (!mounted) return null;

    return (
        <Overlay active={isOpen}>
            {tracksOverviewOpen ? <TracksOverview toggleOverview={closeTracksOverview} /> : <Interface />}
        </Overlay>
    );
}
