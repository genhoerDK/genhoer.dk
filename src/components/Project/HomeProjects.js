'use client';

import { projects } from "@/data/projects";
import { useToday } from "@/hooks/useToday";
import { getProjectsByStatus } from "@/utilities/projectsByStatus";
import UpcomingMap from "@/components/Project/UpcomingMap";
import ProjectGrid from "@/components/Project/ProjectGrid";

// Front page: upcoming projects on the map, opened projects in the grid.
// Split by the visitor's date, so a project moves to the grid on its opening day without a new deploy.
export default function HomeProjects() {
    const today = useToday();
    const { upcoming, opened } = getProjectsByStatus(projects, today);

    return (
        <>
            {/* key: start over cleanly if the upcoming projects change after load (useToday switches date) */}
            {upcoming.length > 0 && <UpcomingMap key={upcoming.map((p) => p.slug).join()} projects={upcoming} />}
            <ProjectGrid projects={opened} />
        </>
    );
}
