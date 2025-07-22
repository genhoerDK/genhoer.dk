"use client";

import { useEffect, useState } from "react";
import { useControlBar } from "@/context/ControlBarContext";
import { EnvelopeIcon, ChevronDownIcon } from "@heroicons/react/24/outline";

export default function Info() {
  const [showContactInfo, setShowContactInfo] = useState(false);
  const { setButtons } = useControlBar();

  // ControlBar button
  useEffect(() => {
    setButtons([{ label: "Kontakt", icon: !showContactInfo ? <EnvelopeIcon /> : <ChevronDownIcon />, onClick: () => setShowContactInfo((prev) => !prev), }, ]);
    return () => setButtons([]);
  }, [showContactInfo]);

  return (
    <>
      {/* Contact info */}
      <div className={`fixed bottom-0 left-0 w-full h-screen bg-zinc-200 transition-transform duration-500 ease-in-out ${showContactInfo ? 'translate-y-0' : 'translate-y-full'}`}>
        {/* contact */}
      </div>
    </>
  );
}