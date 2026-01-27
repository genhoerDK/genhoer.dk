"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from 'next/navigation';
import { useIsPortrait } from "@/hooks/useIsPortrait";
import { useScrollLock } from "@/hooks/useScrollLock";
import Overlay from '@/components/Overlay';
import MapSection from "@/components/Map/MapSection";
import MapImage from "@/components/Map/MapImage";
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
        !!activeProject && setFocusedProject(activeProject);
    }, [activeProject]);

    useEffect(() => {
        setActiveProject(null);
    }, [isOpen]);

    return (
        <Suspense fallback={null}>
            <Overlay active={isOpen}>
                <MapSection isDark={!!activeProject}>
                    <MapImage isVisible={!!activeProject} src={focusedProject?.coverImageLandscape} />
                    {isPortrait ? <MapSmall activeProject={activeProject} setActiveProject={setActiveProject} /> : <MapLarge setActiveProject={setActiveProject} />}
                    <MapInfo project={focusedProject} isVisible={!!activeProject} />
                    {isPortrait && <MapControls activeProject={activeProject} setActiveProject={setActiveProject} />}
                </MapSection>
            </Overlay>
        </Suspense>
    );
}