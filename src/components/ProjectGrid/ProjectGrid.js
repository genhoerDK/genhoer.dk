import ProjectCard from "@/components/ProjectGrid/ProjectCard";

export default function ProjectGrid({ projects }) {
    return (
        <section className="py-24 px-2 md:px-4">
            <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-y-24 gap-x-4">
                {projects.map(project => (
                    <ProjectCard project={project} key={project.slug} />
                ))}
            </ul>
        </section>
    );
}