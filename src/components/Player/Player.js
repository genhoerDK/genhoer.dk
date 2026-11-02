"use client";

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useScrollLock } from "@/hooks/useScrollLock";
import { XMarkIcon, MusicalNoteIcon } from '@heroicons/react/20/solid';
import Overlay from '@/components/Layout/Overlay';
import Button from '@/components/UI/Button';
import Label from '@/components/UI/Label';
import TracksOverview from '@/components/Player/TracksOverview';
import CircularScrubber from '@/components/Player/CircularScrubber';

/** Experimental three.js player — only loaded (with three.js) when ?lyt&3d is in the URL */
const CircularScrubber3D = dynamic(() => import('@/components/Player/CircularScrubber3D'), { ssr: false });

export default function Player() {
    /** Read URL params to check if player should be open */
    const searchParams = useSearchParams();
    const isOpen = searchParams.has('lyt');
    const is3D = searchParams.has('3d');
    const router = useRouter();

    /** Switch between the 2D and the experimental 3D player */
    const toggle3D = () => router.replace(is3D ? '?lyt' : '?lyt&3d', { scroll: false });
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
            {tracksOverviewOpen ? <TracksOverview toggleOverview={toggleTracksOverview} /> : is3D ? <CircularScrubber3D /> : <CircularScrubber />}

            {!tracksOverviewOpen && (
                <Button variant="pill" onClick={toggle3D} className='absolute right-gutter top-11 py-1.5 px-3 z-20'>
                    <Label size="lg">{is3D ? '2D' : '3D'}</Label>
                </Button>
            )}

            <Button variant="pill" onClick={toggleTracksOverview} className='absolute right-4 bottom-14 md:right-1/2 md:translate-x-1/2 md:bottom-8 gap-2 py-2 px-3'>
                {tracksOverviewOpen ? <XMarkIcon className="size-5" /> : <MusicalNoteIcon className="size-5" />}
                <Label size="lg">Værker</Label>
            </Button>
        </Overlay>
    );
}
