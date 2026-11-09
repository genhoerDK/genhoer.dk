"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useScrollLock } from "@/hooks/useScrollLock";
import Overlay from '@/components/Layout/Overlay';
import TracksOverview from '@/player/frame/TracksOverview';
import { components } from '@/player/interfaces';
import { settingsFor, DEFAULT_INTERFACE } from '@/player/interfaces/registry';
import { useAudio } from '@/player/AudioContext';

/** The player overlay (?lyt): the current work in its interface, or the overview of works (?lyt=vaerker) */
export default function Player() {
    const searchParams = useSearchParams();
    const isOpen = searchParams.has('lyt');
    const { currentTrack } = useAudio();
    const Interface = components[currentTrack?.player?.interface ?? DEFAULT_INTERFACE];
    useScrollLock(isOpen);

    /** The overview of works is part of the address (?lyt=vaerker); its button is in the toolbar */
    const tracksOverviewOpen = searchParams.get('lyt') === 'vaerker';

    /** Dark for the overview, otherwise what the interface asks for */
    const tone = tracksOverviewOpen ? 'ink' : settingsFor(currentTrack).tone;

    /** Track if component has mounted to prevent hydration errors */
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);
    if (!mounted) return null;

    return (
        <Overlay active={isOpen} tone={tone}>
            {tracksOverviewOpen
                ? <TracksOverview />
                : currentTrack && <Interface key={currentTrack.slug} />}
        </Overlay>
    );
}
