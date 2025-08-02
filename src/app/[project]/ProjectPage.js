"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useFooter } from "@/context/FooterContext";
import { formatDates, formatPartners } from "@/utilities/formatters";
import { UserGroupIcon, StarIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import ProjectMedia from "@/components/ProjectMedia";
import ProjectJoin from "@/components/ProjectJoin";
import ProjectCredits from "@/components/ProjectCredits";

export default function ProjectPage({ project }) {
  const { title, slug, coverImage, startDate, endDate, location, area, partners, description } = project;
  const [showCredits, setShowCredits] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const { setButtons } = useFooter();

  // Footer button
  useEffect(() => {
    const buttons = [];

    // Credits button
    if (project.credits?.length) {
      buttons.push({
        label: "Tak til",
        icon: !showCredits ? <StarIcon /> : <ChevronDownIcon />,
        onClick: () => {
          setShowJoin(false);
          setShowCredits((prev) => !prev);
        },
      });
    }

    // Join button
    if (project.workshop) {
      buttons.push({
        label: "Vær med",
        icon: !showJoin ? <UserGroupIcon /> : <ChevronDownIcon />,
        onClick: () => {
          setShowCredits(false);
          setShowJoin((prev) => !prev);
        },
      });
    }

    setButtons(buttons);
    return () => setButtons([]);
  }, [showCredits, showJoin, project.credits]);

  const pageInfoRows = [
    { label: 'Udstilling', info: formatDates(startDate, endDate) },
    { label: 'Lokalitet', info: location + ', ' + area },
    { label: 'Partnere', info: formatPartners(partners) },
  ];

  return (
    <motion.article initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <section className='relative w-full h-svh overflow-hidden'>

        {/* Background image */}
        <figure className="absolute inset-0">
          <img src={coverImage} alt={title} className="size-full object-cover" loading="lazy" />
        </figure>

        {/* Background overlay */}
        <div className="absolute inset-0 bg-zinc-800 opacity-75" />

        {/* Project description and info */}
        <motion.div className="relative h-full flex flex-col justify-center text-zinc-50 pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.2 }}>
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
        </motion.div>
      </section>

      {/* Project media */}
      {project.mediaCount && <ProjectMedia project={project} /> }

      {/* Project join */}
      {project.workshop && <ProjectJoin slug={slug} show={showJoin} /> }

      {/* Project credits */}
      {project.credits && <ProjectCredits slug={slug} show={showCredits} /> }
    </motion.article>
  );
}