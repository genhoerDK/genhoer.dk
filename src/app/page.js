"use client";

import { useEffect, useState } from "react";
import { useFooter } from "@/context/FooterContext";
import { MapIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import ProjectCard from "@/components/ProjectCard";
import MapSmall from "@/components/MapSmall";
import MapLarge from "@/components/MapLarge";
import { projects } from "@/data/projects";

export default function Home() {
  const [showMap, setShowMap] = useState(false);
  const [isPortrait, setIsPortrait] = useState(true);
  const { setButtons } = useFooter();

  // Check for '#kort' on load and on hash change
  useEffect(() => {
    const updateFromHash = () => { setShowMap(window.location.hash === "#kort"); };
    updateFromHash();
    window.addEventListener("hashchange", updateFromHash);
    return () => window.removeEventListener("hashchange", updateFromHash);
  }, []);

  // Check viewport size to render either small or large map
  useEffect(() => {
    const checkViewport = () => setIsPortrait(window.innerWidth < 768);
    checkViewport();
    window.addEventListener("resize", checkViewport);
    return () => window.removeEventListener("resize", checkViewport);
  }, []);

  // Setup map button in footer component
  useEffect(() => {
    setButtons([
      {
        label: "Kort",
        icon: !showMap ? <MapIcon /> : <ChevronDownIcon />,
        onClick: () => {
          setShowMap((prev) => {
            if (prev) {
              // was open → now closing → remove hash
              history.replaceState(null, "", window.location.pathname + window.location.search);
            } else {
              // was closed → now opening → add hash
              history.replaceState(null, "", "#kort");
            }
            return !prev;
          });
        },
      },
    ]);
    return () => setButtons([]);
  }, [showMap]);

  return (
    <div>

      {/* Projects grid section */}
      <section>
        <ul className="lg:grid grid-cols-3 gap-x-4 px-2 md:px-4 pt-28">
          {projects.map((project, i) => (
            <ProjectCard key={`${project.slug}-project-card`} project={project} index={i} />
          ))}
        </ul>
      </section>
      
      {/* Projects map section */}
      <section className={`fixed inset-0 flex items-center w-full h-dvh transition-transform duration-500 ${showMap ? "translate-y-0" : "translate-y-full"}`}>
        {isPortrait ? <MapSmall projects={projects} /> : <MapLarge projects={projects} />}
      </section>

    </div>
  );
}