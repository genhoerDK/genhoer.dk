import { projects } from "@/data/projects";
import { notFound } from "next/navigation";
import ProjectHeroSection from "@/components/Project/ProjectHeroSection";
import ProjectMediaSection from "@/components/Project/ProjectMediaSection";

export async function generateMetadata({ params }) {
    const { project: projectSlug } = await params;
    const project = projects.find((p) => p.slug === projectSlug);
    if (!project) {
        const moved = projects.find((p) => p.previousSlugs?.includes(projectSlug));
        return moved ? { title: moved.title, alternates: { canonical: `/${moved.slug}` }, robots: { index: false } } : {};
    }

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
    if (!project) {
        // An old address (e.g. the town name before the work got its title) sends visitors on
        const moved = projects.find((p) => p.previousSlugs?.includes(projectSlug));
        if (!moved) notFound();
        return (
            <article className="w-full min-h-120 p-4 md:p-8">
                <meta httpEquiv="refresh" content={`0; url=/${moved.slug}`} />
                <p>Siden er flyttet til <a href={`/${moved.slug}`} className="underline">{moved.title}</a>.</p>
            </article>
        );
    }

    return (
        <article className="w-full min-h-120 pb-10 md:pb-0">
            <ProjectHeroSection project={project} />
            <ProjectMediaSection slug={project.slug} media={project.media} />
        </article>
    );
}

export function generateStaticParams() {
    return projects.flatMap((project) => [project.slug, ...(project.previousSlugs ?? [])])
        .map((slug) => ({ project: slug }));
}