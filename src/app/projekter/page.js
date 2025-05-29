import Link from 'next/link';
import { projects } from '@/data/projects';

export default function ProjectsPage() {
  return (
    <div className="flex flex-col justify-center items-center p-16 bg-zinc-50 ">
      <p className="mb-4 font-bold text-xl">PROJEKTER</p>
      <div className="flex flex-col gap-2">
        {Object.entries(projects).map(([slug, project]) => (
          <Link
            key={`project-link-${slug}`}
            href={`/projekter/${slug}`}
            className="px-4 py-2 bg-white text-black rounded shadow hover:bg-gray-100 transition"
          >
            {project.title}
          </Link>
        ))}
      </div>
    </div>
  );
}