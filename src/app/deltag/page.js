"use client";

import { useEffect, useState } from "react";
import { useControlBar } from "@/context/ControlBarContext";
import { HandRaisedIcon, ChevronDownIcon } from "@heroicons/react/24/outline";

export default function Participate() {
  const [showMembership, setShowMembership] = useState(false);
  const { setButtons } = useControlBar();

  // ControlBar button
  useEffect(() => {
    setButtons([{ label: "Bliv medlem", icon: !showMembership ? <HandRaisedIcon /> : <ChevronDownIcon />, onClick: () => setShowMembership((prev) => !prev), }, ]);
    return () => setButtons([]);
  }, [showMembership]);

  return (
    <>
      {/* Contact info */}
      <div className={`fixed bottom-0 left-0 w-full h-screen bg-zinc-200 transition-transform duration-500 ease-in-out ${showMembership ? 'translate-y-0' : 'translate-y-full'}`}>
        {/* contact */}
      </div>
    </>
  );
}