import ProjectGrid from "@/components/ProjectGrid/ProjectGrid";
import { projects } from "@/data/projects";

export default function Home() {
  return (
    <ProjectGrid projects={projects} />
  );
}