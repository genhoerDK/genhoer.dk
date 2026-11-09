'use client';

import ToggleMapButton from "@/components/Map/ToggleMapButton";
import PlayerControls from "@/player/frame/PlayerControls";
import TracksOverviewButton from "@/player/frame/TracksOverviewButton";
import { useChrome } from "@/hooks/useChrome";

// On phones the toolbar is a solid white bar at the bottom, whatever the header does at the top. On
// wide screens it sits in the header and follows its colours (useChrome), with no background of its
// own: the header's shows through, so the two fade as one (two half-faded backgrounds on top of each
// other would make the toolbar's box stand out in the middle of a fade)
export default function Toolbar() {
    const tone = useChrome();

    return (
        <div
            data-chrome-wide={tone ?? undefined}
            className='fixed bottom-0 inset-x-0 flex px-2 z-20 text-chrome bg-chrome-bg transition-chrome md:inset-auto md:top-0 md:left-1/4 md:px-0 md:bg-transparent'
        >
            <ToggleMapButton />
            <PlayerControls />
            <TracksOverviewButton />
        </div>
    );
}
