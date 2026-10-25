'use client';

import { projects } from "@/data/projects";
import { useToday } from "@/hooks/useToday";
import { getProjectsByStatus } from "@/utilities/projectsByStatus";
import ProjectCarousel from "@/components/Project/ProjectCarousel";
import ProjectGrid from "@/components/Project/ProjectGrid";

// Front page: upcoming projects in the carousel, opened projects in the grid.
// Split by the visitor's date, so a project moves to the grid on its opening day without a new deploy.
export default function HomeProjects() {
    const today = useToday();
    const { upcoming, opened } = getProjectsByStatus(projects, today);

    return (
        <>
            {/* key: rebuild the carousel cleanly if its slides change after load */}
            {upcoming.length > 0 && <ProjectCarousel key={upcoming.map((p) => p.slug).join()} projects={upcoming} />}
            <ProjectGrid projects={opened} />
        </>
    );
}
