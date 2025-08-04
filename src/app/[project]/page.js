import { projects } from "@/data/projects";
import ProjectPage from "./ProjectPage";

// Server-only: generate routes for SSG
export async function generateStaticParams() {
  return projects.map((project) => ({ project: project.slug }));
}

export default async function ServerSideProjectPage({ params }) {
  const project = projects.find((p) => p.slug === params.project);
  return <ProjectPage project={project} />;
}