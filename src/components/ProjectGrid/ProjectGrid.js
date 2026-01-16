import ProjectCard from "@/components/ProjectGrid/ProjectCard";

export default function ProjectGrid({ projects }) {
    return (
        <article className="py-24">
            <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-y-24 gap-x-4 p-2 md:p-4">
                {projects.map((project) => (
                    <ProjectCard 
                        key={`ProjectCard-${project.title}`}
                        project={project} 
                    />
                ))}
            </ul>
        </article>
    );
}