"use client";

import { useState } from "react";
import { useSearchParams } from 'next/navigation';
import { useIsPortrait } from "@/hooks/useIsPortrait"; 
import MapSection from "@/components/Map/MapSection";
import MapImage from "@/components/Map/MapImage";
import MapSmall from "@/components/Map/MapSmall";
import MapLarge from "@/components/Map/MapLarge";
import MapInfoContainer from "@/components/Map/MapInfoContainer";
import MapInfo from "@/components/Map/MapInfo";
import MapControls from "@/components/Map/MapControls";

export default function Map() {
    const searchParams = useSearchParams();
    const isOpen = searchParams.has('kort');
    const isPortrait = useIsPortrait();
    const [activeProject, setActiveProject] = useState(null);

    return (
        <article className={`fixed inset-0 w-screen h-dvh ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}>
            <MapSection isDark={!!activeProject}>
                <MapImage isVisible={!!activeProject} src={activeProject?.coverImageLandscape}/>
                {isPortrait ? <MapSmall activeProject={activeProject} setActiveProject={setActiveProject} /> : <MapLarge setActiveProject={setActiveProject} />}
                <MapInfoContainer isVisible={!!activeProject}>
                    {!!activeProject && <MapInfo project={activeProject} />}
                </MapInfoContainer>

                {isPortrait && <MapControls activeProject={activeProject} setActiveProject={setActiveProject} />}
            </MapSection>
        </article>
    );
}