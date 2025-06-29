'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { formatDates, formatPartners } from '@/utilities/formatters';

export default function ProjectCard({ project }) {
  const { title, slug, coverImage, coverVideo, startDate, endDate, location, partners } = project;

  const cardInfoRows = [
    { label: 'Udstilling', info: formatDates(startDate, endDate) },
    { label: 'Lokalitet', info: location },
    { label: 'Partnere', info: formatPartners(partners) },
  ];

  // Play video on hover (if there is one and the screen is large)
  const videoRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = () => {
    if (window.innerWidth >= 1024 && coverVideo) {
      setIsHovered(true);
      videoRef.current?.play();
    }
  };

  const handleMouseLeave = () => {
    if (window.innerWidth >= 1024) {
      setIsHovered(false);
      videoRef.current?.pause();
    }
  };

  return (
    <li className="pb-24">
      <h2 className="font-light uppercase text-md leading-none">{title}</h2>

      <Link href={`/${slug}`} className="relative block aspect-video overflow-hidden my-3 group" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <figure className={`absolute inset-0 transition duration-200 ${isHovered ? 'lg:opacity-0' : 'opacity-100'}`}>
          <img src={coverImage} loading="lazy" alt={title} className="object-cover transition duration-300 lg:group-hover:scale-105" />
        </figure>

        {coverVideo && (
          <figure className={`hidden lg:block absolute inset-0 transition duration-300 ${isHovered ? 'lg:opacity-100' : 'opacity-0'}`}>
            <video ref={videoRef} src={coverVideo} playsInline muted loop className="object-cover" />
          </figure>
        )}
      </Link>

      {cardInfoRows.map(({ label, info }) => (
        <div key={`${project.title}-card-info-${label}`} className="grid grid-cols-6 gap-x-2 pb-2 pointer-events-none">
          <p className="col-span-1 text-[0.5rem] uppercase leading-none mt-[5px]">{label}</p>
          <p className="col-start-2 col-span-full font-light text-xs truncate">{info}</p>
        </div>
      ))}
    </li>
  );
}