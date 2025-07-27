"use client";

import { useEffect, useState } from "react";
import { useControlBar } from "@/context/ControlBarContext";
import { MapIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import ProjectCard from '@/components/ProjectCard';
import MapSmall from "@/components/MapSmall";
import MapLarge from "@/components/MapLarge";
import { projects } from '@/data/projects';

export default function Home() {
  const [showMap, setShowMap] = useState(false);
  const [isPortrait, setIsPortrait] = useState(true);
  const { setButtons } = useControlBar();

  // Check viewport size to render either small or large map
  useEffect(() => {
    const checkViewport = () => { setIsPortrait(window.innerWidth < 768); };
    checkViewport();
    window.addEventListener("resize", checkViewport);
    return () => window.removeEventListener("resize", checkViewport);
  }, []);

  // ControlBar button
  useEffect(() => {
    setButtons([{ label: "Kort", icon: !showMap ? <MapIcon /> : <ChevronDownIcon />, onClick: () => setShowMap((prev) => !prev), },]);
    return () => setButtons([]);
  }, [showMap]);

  return (
    <>
      <section>
        <ul className="lg:grid grid-cols-3 gap-x-4 px-2 md:px-4 pt-28">
          {projects.map((project) => (
            <ProjectCard key={`${project.slug}-project-card`} project={project} />
          ))}
        </ul>
      </section>

      {/* Map */}
      <div className={`fixed inset-0 w-full h-svh bg-zinc-200 transition-transform duration-500 ease-in-out ${showMap ? 'translate-y-0' : 'translate-y-full'}`}>
        {isPortrait ? <MapSmall /> : <MapLarge projects={projects}/>}
      </div>
    </>
  );
}