import Link from 'next/link';
import { ClockIcon, MapPinIcon, ArrowLongRightIcon } from '@heroicons/react/24/solid';

const formatDatePartDanish = (dateString) => {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = new Intl.DateTimeFormat('da-DK', { month: 'short' })
    .format(date)
    .replace('.', '')
    .toUpperCase();
  return { day, month };
};

export default function ProjectCard({ slug, project }) {
  const { title, description, coverImage, startDate, endDate, area } = project;
  const start = formatDatePartDanish(startDate);
  const end = formatDatePartDanish(endDate);
  const year = new Date(startDate).getFullYear();

  return (
    <Link href={`/projekter/${slug}`} className="block text-zinc-50 group">
      <div className="relative mb-2 overflow-hidden">
        <img
          src={coverImage}
          alt={title}
          className="w-full h-72 object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute top-2 right-2 bg-zinc-900/80 text-white text-xs px-2 py-0.5 rounded-full font-rem font-medium shadow-md backdrop-blur-sm">
          {year}
        </div>
      </div>

      <div className="font-rem">
        <h3 className="text-2xl font-bold uppercase">{title}</h3>

        <div className="flex items-center text-sm font-light mb-1 flex-wrap gap-2 leading-none">
          <p className="flex items-center">
            <ClockIcon className="size-4 mr-1" />
            <span className="leading-none">
              {start.day}<strong>{start.month}</strong>
              <ArrowLongRightIcon className="size-4 mx-1 inline-block align-middle" />
              {end.day}<strong>{end.month}</strong>
            </span>
          </p>

          <p className="flex items-center">
            <MapPinIcon className="size-4 mr-1" />
            <span className="uppercase leading-none">{area}</span>
          </p>
        </div>

        <p className="text-sm line-clamp-3 font-lato">{description}</p>
      </div>
    </Link>
  );
}