"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from "framer-motion";
import { useControlBar } from "@/context/ControlBarContext";
import { MapIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import ProjectCard from '@/components/ProjectCard';
import MapSmall from "@/components/MapSmall";
import MapLarge from "@/components/MapLarge";
import { projects } from '@/data/projects';

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showMapUrl = searchParams.has("kort");
  const [showMap, setShowMap] = useState(false);
  const [isPortrait, setIsPortrait] = useState(true);
  const { setButtons } = useControlBar();

  useEffect(() => {
    setShowMap(showMapUrl);
  }, [showMapUrl]);

  useEffect(() => {
    const newUrl = showMap ? '/?kort' : '/';
    router.push(newUrl);
  }, [showMap]);

  // Check viewport size to render either small or large map
  useEffect(() => {
    const checkViewport = () => { setIsPortrait(window.innerWidth < 768); };
    checkViewport();
    window.addEventListener("resize", checkViewport);
    return () => window.removeEventListener("resize", checkViewport);
  }, []);

  // Map button in footer component
  useEffect(() => {
    setButtons([{ label: "Kort", icon: !showMap ? <MapIcon /> : <ChevronDownIcon />, onClick: () => setShowMap((prev) => !prev), },]);
    return () => setButtons([]);
  }, [showMap]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .2, delay: .3 }}>
      <section>
        <ul className="lg:grid grid-cols-3 gap-x-4 px-2 md:px-4 pt-28">
          {projects.map((project) => (
            <ProjectCard key={`${project.slug}-project-card`} project={project} />
          ))}
        </ul>
      </section>

      {/* Map */}
      <div className={`fixed inset-0 flex items-center w-full h-dvh transition-transform duration-500 ease-in-out ${showMap ? 'translate-y-0' : 'translate-y-full'}`}>
        {isPortrait ? <MapSmall projects={projects} /> : <MapLarge projects={projects} />}
      </div>
    </motion.div>
  );
}