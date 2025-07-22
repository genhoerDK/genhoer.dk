"use client";

import { useEffect } from "react";
import { useControlBar } from "@/context/ControlBarContext";
import { useRouter } from "next/navigation";
import { MapIcon } from "@heroicons/react/24/outline";
import ProjectCard from '@/components/ProjectCard';
import { projects } from '@/data/projects';

export default function Home() {
  const { setButtons } = useControlBar();
  const router = useRouter();

  // Set ControlBar button(s)
  useEffect(() => {
    setButtons([{ label: "Kort", icon: <MapIcon />, onClick: () => router.push("/kort"), }, ]);
    return () => setButtons([]);
  }, []);

  return (
    <section>
      <ul className="lg:grid grid-cols-3 gap-x-4 px-2 md:px-4 pt-28">
        {projects.map((project) => (
          <ProjectCard key={`${project.slug}-project-card`} project={project} />
        ))}
      </ul>
    </section>
  );
}