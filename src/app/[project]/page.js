import { projects } from "@/data/projects";
import { notFound } from "next/navigation";
import ProjectHeroSection from "@/components/ProjectPage/ProjectHeroSection";
import ProjectMediaSection from "@/components/ProjectPage/ProjectMediaSection";
import ProjectNavSection from "@/components/ProjectPage/ProjectNavSection";

export async function generateMetadata({ params }) {
    const { project: projectSlug } = await params;
    const project = projects.find((p) => p.slug === projectSlug);
    const description = project.description.at(-1).slice(0, 160);
    const url = `/${project.slug}`;

    return {
        title: project.title,
        description,
        alternates: { canonical: url },
    };
}

export default async function ProjectPage({ params }) {
    const { project: projectSlug } = await params;
    const project = projects.find((p) => p.slug === projectSlug);
    if (!project) notFound();

    return (
        <article className="w-full h-svh min-h-120">
            <ProjectHeroSection project={project} />
            <ProjectMediaSection slug={project.slug} media={project.media} />
            <ProjectNavSection currentProject={project} />
        </article>
    );
}

export function generateStaticParams() {
    return projects.map((project) => ({
        project: project.slug,
    }));
}