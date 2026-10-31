"use client";

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { useScrollLock } from "@/hooks/useScrollLock";
import { XMarkIcon, MusicalNoteIcon } from '@heroicons/react/20/solid';
import Overlay from '@/components/Layout/Overlay';
import Button from '@/components/UI/Button';
import Label from '@/components/UI/Label';
import TracksOverview from '@/components/Player/TracksOverview';
import CircularScrubber from '@/components/Player/CircularScrubber';

// three.js is only downloaded when the player is opened
const ImmersivePlayer = dynamic(() => import('@/components/Player/Immersive/ImmersivePlayer'), { ssr: false });

export default function Player() {
    /** Read URL params to check if player should be open */
    const searchParams = useSearchParams();
    const isOpen = searchParams.has('lyt');
    useScrollLock(isOpen);

    /** Keep the 3D scene alive while the overlay slides away, then free the GPU */
    const [sceneMounted, setSceneMounted] = useState(false);
    useEffect(() => {
        if (isOpen) { setSceneMounted(true); return; }
        const id = setTimeout(() => setSceneMounted(false), 400);
        return () => clearTimeout(id);
    }, [isOpen]);

    /** Track if component has mounted to prevent hydration errors */
    const [mounted, setMounted] = useState(false);
    const [webgl, setWebgl] = useState(true);

    useEffect(() => {
        setMounted(true);
        setWebgl(supportsWebGL());
    }, []);
    if (!mounted) return null;

    return (
        <Overlay active={isOpen}>
            {webgl
                ? sceneMounted && <ImmersivePlayer />
                : <ClassicPlayer isOpen={isOpen} />}
        </Overlay>
    );
}

/** The circular scrubber, kept for browsers without WebGL */
function ClassicPlayer({ isOpen }) {
    const [tracksOverviewOpen, setTracksOverviewOpen] = useState(false);
    useEffect(() => { setTracksOverviewOpen(false); }, [isOpen]);
    const toggleTracksOverview = () => setTracksOverviewOpen(prev => !prev);

    return (
        <>
            {tracksOverviewOpen ? <TracksOverview toggleOverview={toggleTracksOverview} /> : <CircularScrubber />}
            <Button variant="pill" onClick={toggleTracksOverview} className='absolute right-4 bottom-14 md:right-1/2 md:translate-x-1/2 md:bottom-8 gap-2 py-2 px-3'>
                {tracksOverviewOpen ? <XMarkIcon className="size-5" /> : <MusicalNoteIcon className="size-5" />}
                <Label size="lg">Værker</Label>
            </Button>
        </>
    );
}

function supportsWebGL() {
    try {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    } catch {
        return false;
    }
}
