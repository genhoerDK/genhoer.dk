"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from 'next/navigation';
import { useIsPortrait } from "@/hooks/useIsPortrait";
import { useScrollLock } from "@/hooks/useScrollLock";
import Overlay from '@/components/Overlay';
import BackgroundImage from "@/components/BackgroundImage";
import MapSmall from "@/components/Map/MapSmall";
import MapLarge from "@/components/Map/MapLarge";
import MapInfo from "@/components/Map/MapInfo";
import MapControls from "@/components/Map/MapControls";

export default function Map() {
    const searchParams = useSearchParams();
    const isOpen = searchParams.has('kort');
    const isPortrait = useIsPortrait();
    const [activeProject, setActiveProject] = useState(null);
    const [focusedProject, setFocusedProject] = useState(null);

    useScrollLock(isOpen);

    useEffect(() => {
        if (activeProject) setFocusedProject(activeProject);
    }, [activeProject]);

    useEffect(() => {
        setActiveProject(null);
    }, [isOpen]);

    return (
        <Overlay active={isOpen}>
            <BackgroundImage visible={!!activeProject} portrait={focusedProject?.coverImagePortrait} landscape={focusedProject?.coverImageLandscape} />
            {isPortrait ? <MapSmall activeProject={activeProject} setActiveProject={setActiveProject} /> : <MapLarge setActiveProject={setActiveProject} />}
            <MapInfo project={activeProject} />
            {isPortrait && <MapControls activeProject={activeProject} setActiveProject={setActiveProject} />}
        </Overlay>
    );
}