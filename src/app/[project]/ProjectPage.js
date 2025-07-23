"use client";

import { useEffect, useState } from "react";
import { useControlBar } from "@/context/ControlBarContext";
import { formatDates, formatPartners } from "@/utilities/formatters";
import { UserGroupIcon, ChevronDownIcon } from "@heroicons/react/24/outline";

export default function ProjectPage({ project }) {
  const { title, slug, coverImage, startDate, endDate, location, partners, description, pageMedia } = project;
  const [showCredits, setShowCredits] = useState(false);
  const { setButtons } = useControlBar();

  // ControlBar button
  useEffect(() => {
    setButtons([{ label: "Kreditering", icon: !showCredits ? <UserGroupIcon /> : <ChevronDownIcon />, onClick: () => setShowCredits((prev) => !prev), }, ]);
    return () => setButtons([]);
  }, [showCredits]);

  const pageInfoRows = [
    { label: 'Udstilling', info: formatDates(startDate, endDate) },
    { label: 'Lokalitet', info: location },
    { label: 'Partnere', info: formatPartners(partners) },
  ];

  return (
    <article>
      <section className='relative w-full h-svh overflow-hidden'>

        {/* Background image */}
        <figure className="absolute inset-0">
          <img src={coverImage} alt={title} className="size-full object-cover" loading="lazy" />
        </figure>

        {/* Background overlay */}
        <div className="absolute inset-0 bg-zinc-800 opacity-75" />

        {/* Project description and info */}
        <div className="relative h-full flex flex-col justify-center text-zinc-50 pointer-events-none">
          <div className="grid grid-cols-12 xl:grid-cols-16 gap-x-4 px-2 lg:px-4 pb-4">
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
              <p className="col-span-8 sm:col-span-8 md:col-span-8 xl:col-span-7 font-light text-xs truncate">{info}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Project media */}
      {pageMedia &&
        <section className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 md:gap-4 p-2 md:p-4 mb-12 md:mb-10'>
          {pageMedia.map(({ type, src }, i) => (
            <figure key={`${slug}-media-${i}`} className="relative aspect-square overflow-hidden">
              {type === 'img'
                ? (<img src={src} alt={`${title} image ${i}`} className="object-cover w-full h-full" loading="lazy" />)
                : (<video src={src} playsInline muted loop autoPlay className="object-cover w-full h-full" />)}
            </figure>
          ))}
        </section>
      }

      {/* Project credits */}
      <div className={`fixed bottom-0 left-0 w-full h-screen bg-zinc-200 transition-transform duration-500 ease-in-out ${showCredits ? 'translate-y-0' : 'translate-y-full'}`}>
        {/* credits */}
      </div>
    </article>
  );
}