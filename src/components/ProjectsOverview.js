import ProjectCard from '@/components/ProjectCard';
import { projects } from '@/data/projects';

export default function ProjectsOverview() {
  return (
    <section>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-16 py-16 px-8">
        {Object.entries(projects).map(([slug, project], i) => (
          <ProjectCard key={`project-card-${i}`} slug={slug} project={project} />
        ))}
      </div>
    </section>
  );
}