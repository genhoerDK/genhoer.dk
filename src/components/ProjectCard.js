'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';

// Format dates to string-like presentation
const formatDates = (startStr, endStr) => {
  const options = { day: 'numeric', month: 'long' };
  const formatter = new Intl.DateTimeFormat('da-DK', options);
  const start = new Date(startStr);
  const end = new Date(endStr);
  const sameYear = start.getFullYear() === end.getFullYear();
  const startText = formatter.format(start);
  const endText = formatter.format(end);

  return sameYear ? `${startText} - ${endText} ${end.getFullYear()}` : `${startText} ${start.getFullYear()} - ${endText} ${end.getFullYear()}`;
};

// Format partners with commas and 'og' between last two
const formatPartners = (partners = []) =>
  partners.length ? new Intl.ListFormat('da', { style: 'long', type: 'conjunction', }).format(partners) : '';

export default function ProjectCard({ project }) {
  const { title, slug, coverImage, coverVideo, startDate, endDate, location, partners } = project;

  const infoRows = [
    { label: 'Udstilling', info: formatDates(startDate, endDate) },
    { label: 'Lokalitet', info: location },
    { label: 'Partnere', info: formatPartners(partners) },
  ];

  // Play video on hover (if there is one)
  const videoRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = () => {
    coverVideo && setIsHovered(true);
    videoRef.current && videoRef.current.play();
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    videoRef.current && videoRef.current.pause();
  };

  return (
    <li className="pb-24">
      <h2 className="font-light uppercase text-md leading-none">{title}</h2>

      <Link href={`/${slug}`} className="relative block aspect-video overflow-hidden my-3 group" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <figure className={`absolute inset-0 transition duration-200 ${isHovered ? 'opacity-0' : 'opacity-100' }`}>
          <img src={coverImage} loading="lazy" alt={title} className="object-cover" />
        </figure>

        {coverVideo && (
          <figure className={`absolute inset-0 transition duration-300 ${isHovered ? 'opacity-100' : 'opacity-0' }`}>
            <video ref={videoRef} src={coverVideo} playsInline muted loop className="object-cover" />
          </figure>
        )}
      </Link>

      {infoRows.map(({ label, info }) => (
        <div key={label} className="grid grid-cols-6 gap-x-2 items-end pb-2 pointer-events-none">
          <p className="col-span-1 text-[0.5rem] uppercase leading-none mb-[2.5px]">{label}</p>
          <p className="col-start-2 col-span-full font-light text-xs truncate">{info}</p>
        </div>
      ))}
    </li>
  );
}