"use client";

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useScrollLock } from "@/hooks/useScrollLock";
import Overlay from '@/components/Layout/Overlay';
import TracksOverview from '@/components/Player/TracksOverview';
import { components } from '@/components/Player/interfaces';
import { settingsFor, DEFAULT_INTERFACE } from '@/components/Player/interfaces/registry';
import { useAudio } from '@/context/AudioContext';

/** The player overlay (?lyt): the current work in its interface, or the overview of works (?lyt=vaerker) */
export default function Player() {
    const searchParams = useSearchParams();
    const isOpen = searchParams.has('lyt');
    const { currentTrack } = useAudio();
    const Interface = components[currentTrack?.player?.interface ?? DEFAULT_INTERFACE];
    useScrollLock(isOpen);

    /** The overview of works is part of the address (?lyt=vaerker); its button is in the toolbar */
    const router = useRouter();
    const tracksOverviewOpen = searchParams.get('lyt') === 'vaerker';
    const closeTracksOverview = () => router.replace('?lyt', { scroll: false });

    /** Light for the overview, otherwise what the interface asks for */
    const tone = tracksOverviewOpen ? 'paper' : settingsFor(currentTrack).tone;

    /** Track if component has mounted to prevent hydration errors */
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);
    if (!mounted) return null;

    return (
        <Overlay active={isOpen} tone={tone}>
            {tracksOverviewOpen
                ? <TracksOverview toggleOverview={closeTracksOverview} />
                : currentTrack && <Interface key={currentTrack.slug} />}
        </Overlay>
    );
}
