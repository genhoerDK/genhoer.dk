'use client';

import ToggleMapButton from "@/components/Map/ToggleMapButton";
import PlayerControls from "@/player/frame/PlayerControls";
import TracksOverviewButton from "@/player/frame/TracksOverviewButton";
import { useChrome } from "@/hooks/useChrome";
import { useIsPortrait } from "@/hooks/useIsPortrait";

// The toolbar follows the header's colours (useChrome). On wide screens it sits in the header,
// see-through like it; on phones it is a solid bar at the bottom, in the same colours
export default function Toolbar() {
    const isPortrait = useIsPortrait();
    const tone = useChrome();

    return (
        <div
            data-chrome={tone ?? undefined}
            className={`fixed bottom-0 inset-x-0 flex px-2 z-20 text-chrome transition-colors duration-300 md:inset-auto md:top-0 md:left-1/4 md:px-0 ${!tone ? 'bg-paper' : isPortrait ? 'bg-chrome-bg' : 'bg-transparent'}`}
        >
            <ToggleMapButton />
            <PlayerControls />
            <TracksOverviewButton />
        </div>
    );
}
