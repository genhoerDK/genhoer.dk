import Link from 'next/link';
import { projects } from '@/data/projects';

export function generateStaticParams() {
  return Object.keys(projects).map((project) => ({ project }));
}

export default function ProjectPage({ params }) {
  const project = projects[params.project];

  return (
    <section className="h-screen flex items-center justify-center px-4 md:px-8">
      {/* Project Cover Image */}
      <div className="absolute inset-0 bg-cover bg-center opacity-25 -z-10" style={{ backgroundImage: `url(${project.coverImage})` }} />
      {/* Project Description */}
      <div className="absolute inset-0 size-full flex flex-col justify-center items-end px-4 md:px-8 pointer-events-none">
        <div className="w-1/2">
          <h1 className="font-rem text-2xl font-bold uppercase text-zinc-50">{project.title}</h1>
          <p className=" text-zinc-50">{project.description}</p>
        </div>
      </div>
      {/* Project Details */}
    </section>
  );
}