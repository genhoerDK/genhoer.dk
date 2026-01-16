import { projects } from "@/data/projects";
import ProjectHeroSection from "@/components/ProjectPage/ProjectHeroSection";
import ProjectMediaSection from "@/components/ProjectPage/ProjectMediaSection";
import ProjectNavigation from "@/components/ProjectPage/ProjectNavigation";

export default async function ProjectPage({ params }) {
  const { project: projectSlug } = await params;
  const project = projects.find((p) => p.slug === projectSlug);

  return (
    <article className="w-full h-svh min-h-140">
      <ProjectHeroSection project={project} />
        {project.mediaCount && <ProjectMediaSection project={project} />}
      <ProjectNavigation currentProject={project} />
    </article>
  );
}

export function generateStaticParams() {
  return projects.map((project) => ({
    project: project.slug,
  }));
}