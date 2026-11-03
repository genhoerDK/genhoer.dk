'use client';

import ToggleMapButton from "@/components/Map/ToggleMapButton";
import PlayerControls from "@/components/Player/PlayerControls";
import TracksOverviewButton from "@/components/Player/TracksOverviewButton";
import { useChrome } from "@/hooks/useChrome";
import { useIsPortrait } from "@/hooks/useIsPortrait";

// On wide screens the toolbar sits in the header and follows its colours (useChrome);
// on phones it is a solid bar at the bottom
export default function Toolbar() {
    const isPortrait = useIsPortrait();
    const chrome = useChrome();
    const tone = isPortrait ? null : chrome;

    return (
        <div
            data-chrome={tone ?? undefined}
            className={`fixed bottom-0 inset-x-0 flex px-2 z-20 text-chrome transition-colors duration-300 md:inset-auto md:top-0 md:left-1/4 md:px-0 ${tone ? 'bg-transparent' : 'bg-paper'}`}
        >
            <ToggleMapButton />
            <PlayerControls />
            <TracksOverviewButton />
        </div>
    );
}
