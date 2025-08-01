"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useFooter } from "@/context/FooterContext";
import { HandRaisedIcon, ChevronDownIcon } from "@heroicons/react/24/outline";

export default function Participate() {
  const [showMembership, setShowMembership] = useState(false);
  const { setButtons } = useFooter();

  // ControlBar button
  useEffect(() => {
    setButtons([{ label: "Bliv medlem", icon: !showMembership ? <HandRaisedIcon /> : <ChevronDownIcon />, onClick: () => setShowMembership((prev) => !prev), }, ]);
    return () => setButtons([]);
  }, [showMembership]);

  return (
    <motion.article initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {/* Membership info */}
      <div className={`fixed bottom-0 left-0 w-full h-screen bg-zinc-200 transition-transform duration-500 ease-in-out ${showMembership ? 'translate-y-0' : 'translate-y-full'}`}>
        {/* membership */}
      </div>
    </motion.article>
  );
}