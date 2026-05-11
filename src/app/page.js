import ProjectCarousel from "@/components/ProjectCarousel/ProjectCarousel";
import ProjectGrid from "@/components/ProjectGrid/ProjectGrid";
import { projects } from "@/data/projects";

export default function Home() {
    const now = new Date();

    const upcomingProjects = projects.filter(
        (project) => new Date(project.startDate) > now
    );

    upcomingProjects.sort(
        (a, b) => new Date(a.startDate) - new Date(b.startDate)
    );

    const finishedProjects = projects.filter(
        (project) => new Date(project.startDate) <= now
    );

    return (
        <article>
            {// <ProjectCarousel projects={upcomingProjects} /> }
            <ProjectGrid projects={finishedProjects} />
        </article>
    );
}