import Link from 'next/link';
import { projects } from '@/data/projects';

export function generateStaticParams() {
  return Object.keys(projects).map((project) => ({ project }));
}

export default function ProjectPage({ params }) {
  const project = projects[params.project];

  return (
    <div className="h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold mb-4 text-zinc-50">{project.title}</h1>
      <p className="mb-8 text-zinc-50">{project.description}</p>
      <Link
        href="/projekter"
        className="px-4 py-2 bg-white text-green-700 rounded shadow hover:bg-green-100 transition"
      >
        Close
      </Link>
    </div>
  );
}