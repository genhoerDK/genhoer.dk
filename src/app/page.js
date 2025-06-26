import ProjectCard from '@/components/ProjectCard';
import { projects } from '@/data/projects';

export default function Home() {
  return (
    <ul className="lg:grid grid-cols-3 gap-x-4 px-4 pt-28">
      {projects.map((project) => (
        <ProjectCard key={`${project.slug}-project-card`} project={project} />
      ))}
    </ul>
  );
}