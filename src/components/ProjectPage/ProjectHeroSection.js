"use client";

import { useEffect } from 'react';
import { useAudio } from '@/context/AudioContext';
import { formatDates } from "@/utilities/formatters";
import { PauseCircleIcon, PlayCircleIcon } from "@heroicons/react/20/solid";
import ProjectSponsors from '@/components/ProjectPage/ProjectSponsors';

export default function ProjectHeroSection({ project }) {
  const { initialized, setTrack, currentTrack, play, pause, isPlaying } = useAudio();
  const { title, slug, coverImage, startDate, endDate, location, partners, description, audio } = project;

  const projectHasAudio = !!audio;
  const isProjectPlaying = isPlaying && currentTrack?.slug === project.slug;
  
  useEffect(() => {
    if (!isPlaying && !initialized && projectHasAudio) setTrack(project);
  }, [project, setTrack, isPlaying, initialized, projectHasAudio]);

  const togglePlayback = () => {
    if (!projectHasAudio) return;
    isProjectPlaying ? pause() : play(project);
  };

  const pageInfoRows = [
    { label: 'Udstilling', info: formatDates(startDate, endDate) },
    { label: 'Lokalitet', info: location },
    { label: 'Partnere', info: partners },
  ];

  return (
      <section className='relative size-full overflow-hidden'>

        {/* Background image */}
        <figure className="absolute inset-0">
          <img src={coverImage} alt={title} className="size-full object-cover" loading="lazy" />
        </figure>

        {/* Background overlay */}
        <div className="absolute inset-0 bg-zinc-800 opacity-90" />

        {/* Project description and info */}
        <div className="relative h-full flex flex-col justify-center text-zinc-50 pointer-events-none">
          <div className="grid grid-cols-12 xl:grid-cols-16 gap-x-2 px-2 lg:px-4 pb-4">
            {/* Project play button */}
            {projectHasAudio &&
              <div className="hidden sm:flex sm:col-start-1 md:col-start-2 xl:col-start-3 justify-end">
                <button onClick={togglePlayback} className="size-8 -mt-2 md:-mt-1.5 cursor-pointer pointer-events-auto">
                  {isProjectPlaying ? <PauseCircleIcon className="size-8" /> : <PlayCircleIcon className="size-8" />}
                </button>
              </div>
            }
            <div className="col-span-10 sm:col-span-8 sm:col-start-2 md:col-span-8 md:col-start-3 xl:col-span-6 xl:col-start-4">
              <h2 className="uppercase font-light text-lg md:text-xl leading-none pb-2">{title}</h2>
              {description.map((text, i) => (
                <p key={`${slug}-paragraph-${i}`} className="text-xs md:text-sm pb-2 font-light">{text}</p>
              ))}
            </div>
          </div>
          {pageInfoRows.map(({ label, info }) => (
            <div className="grid grid-cols-12 xl:grid-cols-16 gap-x-4 pb-2 px-2 lg:px-4" key={`${title}-page-info-${label}`}>
              <p className="col-span-2 md:col-span-1 sm:col-start-2 md:col-start-3 xl:col-start-4 text-[0.5rem] uppercase leading-none mt-[5px]">{label}</p>
              <p className="col-span-8 sm:col-span-6 md:col-span-8 xl:col-span-5 font-light text-xs">{info}</p>
            </div>
          ))}
        </div>
        <ProjectSponsors sponsorLogos={project.sponsorLogos} />
      </section>
  );
}