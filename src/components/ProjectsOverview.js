import ProjectCard from '@/components/ProjectCard'
import { projects } from '@/data/projects';

export default function ProjectsOverview() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-16">
      {Object.entries(projects).map(([slug, project]) => (
        <ProjectCard
          key={slug}
          slug={slug}
          title={project.title}
          description={project.description}
          coverImage={project.coverImage}
        />
      ))}
    </div>
  );
}