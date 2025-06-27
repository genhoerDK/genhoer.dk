import { projects } from '@/data/projects';
import { formatDates, formatPartners } from '@/utilities/formatters';

// Generate static for static site generation with dynamic routes
export async function generateStaticParams() {
  return projects.map((project) => ({ project: project.slug }));
}

export default function ProjectPage({ params }) {
  const project = projects.find((p) => p.slug === params.project);

  const pageInfoRows = [
    { label: 'Udstilling', info: formatDates(project.startDate, project.endDate) },
    { label: 'Lokalitet', info: project.location },
    { label: 'Partnere', info: formatPartners(project.partners) },
  ];

  return (
    <article className="relative w-full h-screen overflow-hidden">
      <figure className="absolute inset-0">
        <img src={project.coverImage} alt={project.title} className="size-full object-cover" />
      </figure>

      <div className="absolute inset-0 bg-zinc-800 opacity-50" />

      <section className="relative h-full flex flex-col justify-center text-zinc-50">
        <div className="grid grid-cols-12 xl:grid-cols-16 gap-x-4 px-2 lg:px-4 pb-4">
          <div className="col-span-10 sm:col-span-8 sm:col-start-2 md:col-span-8 md:col-start-3 xl:col-span-6 xl:col-start-4">
            <h2 className="uppercase font-light text-lg md:text-xl leading-none pb-2">{project.title}</h2>
            {project.description.map((text, i) => (
              <p key={`${project.title}-paragraph-${i}`} className="text-xs md:text-sm pb-2 font-light">{text}</p>
            ))}
          </div>
        </div>

        {pageInfoRows.map(({ label, info }) => (
          <div className="grid grid-cols-12 xl:grid-cols-16 gap-x-4 pb-1 px-2 lg:px-4 pointer-events-none" key={`${project.title}-page-info-${label}`}>
            <p className="col-span-2 md:col-span-1 sm:col-start-2 md:col-start-3 xl:col-start-4 text-[0.5rem] uppercase leading-none mt-[4px]">{label}</p>
            <p className="col-span-8 sm:col-span-8 md:col-span-8 xl:col-span-7 font-light text-xs">{info}</p>
          </div>
        ))}
      </section>
    </article>
  );
}