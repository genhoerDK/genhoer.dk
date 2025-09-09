"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useFooter } from "@/context/FooterContext";
import { HandRaisedIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { projects } from "@/data/projects";

export default function Participate() {
  const [showMembership, setShowMembership] = useState(false);
  const { setButtons } = useFooter();

  // ControlBar button
  // useEffect(() => {
  // setButtons([{ label: "Bliv medlem", icon: !showMembership ? <HandRaisedIcon /> : <ChevronDownIcon />, onClick: () => setShowMembership((prev) => !prev), }, ]);
  // return () => setButtons([]);
  // }, [showMembership]);

  function formatLocations(list) {
  if (list.length === 0) return "";
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} og ${list[1]}`;
  return `${list.slice(0, -1).join(", ")} og ${list[list.length - 1]}`;
}

const workshops = formatLocations(
  projects
    .filter((project) => project.workshop)
    .map((project) => project.city)
);

  return (
    <motion.article initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.2 }}>

      <section className="flex flex-col justify-center px-2 md:px-4 py-14 min-h-screen">
        <div className="grid grid-cols-12 md:grid-cols-24 gap-4 py-8">
          <div className="col-span-full md:col-start-4 max-w-3xl">
            <h2 className="uppercase font-light md:text-xl mb-1">Deltag i workshops om lyd</h2>
            <p className="font-light pb-2 text-sm md:text-lg">I forbindelse med hvert udstillingsprojekt afholder Genhør et workshopforløb for lokale unge mellem 12-24 år. Her dykker vi ned i den stedbundne historie og udforsker hvordan vi med musik og lyddesign, kan skabe en lydinstallation der gør lokalhistorien levende for publikum.</p>
            <p className="font-light text-sm md:text-lg"></p>
            {workshops && ( <p className="font-light text-sm md:text-lg">Der bliver i fremtiden afholdt kreative workshops i {workshops}. Hvis du har lyst til at være med til at udvikle og udforme en udstilling, så ræk ud til os eller tag fat i en af vores lokale samarbejdspartnere!</p> )}
          </div>
        </div>
      </section>

      {/* Membership info */}
      <div className={`fixed bottom-0 left-0 w-full h-screen bg-zinc-200 transition-transform duration-500 ease-in-out ${showMembership ? 'translate-y-0' : 'translate-y-full'}`}>
        {/* membership */}
      </div>
    </motion.article>
  );
}