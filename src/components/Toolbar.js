"use client";

import ToggleMapButton from "@/components/Map/ToggleMapButton";
import PlayerControls from "@/components/Player/PlayerControls";

export default function Toolbar() {
    return (
        <div className="fixed bottom-0 inset-x-0 flex px-2 bg-zinc-50 z-10 md:inset-auto md:top-0 md:left-1/4 md:px-0">
            <ToggleMapButton />
            <PlayerControls />
        </div>
    );
}