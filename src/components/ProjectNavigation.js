"use client";

import Link from "next/link";
import { projects } from "@/data/projects";

export default function ProjectNavigation({ currentProject }) {
  const index = projects.findIndex((p) => p.slug === currentProject.slug);

  const previousProject = index < projects.length - 1 ? projects[index + 1] : null;
  const nextProject = index > 0 ? projects[index - 1] : null;

  return (
    <section className="flex justify-center py-12 px-2 md:px-4" aria-label="Projekt navigation">
      <div className="flex flex-col gap-12 md:gap-6 lg:gap-0 w-full md:w-3/4">
        {nextProject && (
          <div className="flex justify-end">
            <Link href={`/${nextProject.slug}`} className="flex items-center gap-2 md:gap-4 w-fit md:p-4 md:hover:bg-zinc-800 md:hover:text-zinc-50">
              <div className="md:p-2">
                <p className="text-[0.5rem] md:text-[0.6rem] font-light uppercase text-end">Næste projekt</p>
                <p className="uppercase font-extralight md:text-xl leading-none whitespace-nowrap">{nextProject.title}</p>
              </div>
              <figure className="w-32 md:w-64 lg:w-80 aspect-video">
                <img src={nextProject.coverImage} loading="lazy" className="object-cover size-full" />
              </figure>
            </Link>
          </div>
        )}

        {previousProject && (
          <div className="">
            <Link href={`/${previousProject.slug}`} className="flex items-center gap-2 md:gap-4 w-fit md:p-4 md:hover:bg-zinc-800 md:hover:text-zinc-50">
              <figure className="w-32 md:w-64 lg:w-80 aspect-video">
                <img src={previousProject.coverImage} loading="lazy" className="object-cover size-full" />
              </figure>
              <div className="md:p-2">
                <p className="text-[0.5rem] md:text-[0.6rem] font-light uppercase">Forrige projekt</p>
                <p className="uppercase font-extralight md:text-xl leading-none whitespace-nowrap">{previousProject.title}</p>
              </div>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}