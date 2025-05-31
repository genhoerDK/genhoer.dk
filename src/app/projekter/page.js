import ProjectsOverview from '@/components/ProjectsOverview';

export default function ProjectsPage() {
  return (
    <section className="flex flex-col justify-center items-center py-16 px-4 md:px-8 bg-zinc-50">
      <p className="mb-8 font-bold text-2xl">PROJEKTER</p>
      <ProjectsOverview />
    </section>
  );
}