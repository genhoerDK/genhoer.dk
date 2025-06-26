import { projects } from '@/data/projects';

export async function generateStaticParams() {
  return projects.map((project) => ({ project: project.slug }));
}

export default function ProjectPage({ params }) {
  const project = projects.find((p) => p.slug === params.project);

  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* Baggrundsbillede */}
      <div
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{ backgroundImage: `url(${project.coverImage})` }}
      />

      {/* Sort overlay */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Tekst indhold */}
      <div className="relative flex flex-col justify-center items-center h-full text-white px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">{project.title}</h1>
        <p className="max-w-2xl text-lg md:text-xl">{project.description}</p>
      </div>
    </section>
  );
}