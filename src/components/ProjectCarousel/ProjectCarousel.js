'use client';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Navigation, Mousewheel, EffectFade } from 'swiper/modules';
import BackgroundImage from '../BackgroundImage';
import { formatDates } from '@/utilities/formatDates';

import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import 'swiper/css/effect-fade';

export default function ProjectCarousel({ projects }) {

  return (
    <section className="relative h-svh md:pt-12 md:pb-4 md:mx-4 overflow-hidden">
      <Swiper
        effect="fade"
        fadeEffect={{ crossFade: true }}
        modules={[Pagination, Navigation, Mousewheel, EffectFade]}
        loop={true}
        pagination={{ clickable: true, el: '.swiper-pagination-custom' }}
        navigation={{
          prevEl: '.swiper-btn-prev',
          nextEl: '.swiper-btn-next',
        }}
        slidesPerView={1}
        mousewheel={{
          forceToAxis: true,
          sensitivity: 0.2,
          thresholdDelta: 20,
        }}
        speed={600}
        className="size-full bg-ink"
      >
        {projects.map((project, i) => (
          <SwiperSlide key={i} className="relative overflow-hidden">
            {/* ── Full-bleed background ── */}
            <BackgroundImage
              portrait={project.coverImagePortrait}
              landscape={project.coverImageLandscape}
            />

            {/* ── Bottom-left content ── */}
            <div className="absolute bottom-14 left-5 md:bottom-8 md:left-8 pr-24">

              {/* Big title */}
              <h2
                className="text-paper font-black uppercase leading-none"
                style={{ fontSize: 'clamp(1.5rem, 5vw, 3rem)' }}
              >
                {project.title}
              </h2>

              {/* Date & location */}
              <div className="mt-3 flex flex-col gap-0.5">
                <p className="text-paper/80 text-[11px] tracking-widest">
                  {formatDates(project.startDate, project.endDate)}
                </p>
                {project.location && (
                  <p className="text-paper/40 text-[10px] tracking-wider">
                    {project.location}
                  </p>
                )}
              </div>
            </div>
          </SwiperSlide>
        ))}

        {/* ── Pagination dots ── */}
        <div className="swiper-pagination-custom absolute bottom-4 z-10 flex gap-2 items-center justify-center w-full" />
      </Swiper>

      {/* ── Thin arrow navigation ── */}
      <button
        className="swiper-btn-prev absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 group"
        aria-label="Forrige projekt"
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 28 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-paper/30 group-hover:text-paper/80 transition-colors duration-300"
        >
          <line x1="22" y1="14" x2="6" y2="14" stroke="currentColor" strokeWidth="1" />
          <polyline points="13,7 6,14 13,21" stroke="currentColor" strokeWidth="1" fill="none" strokeLinejoin="miter" />
        </svg>
      </button>

      <button
        className="swiper-btn-next absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 group"
        aria-label="Næste projekt"
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 28 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-paper/30 group-hover:text-paper/80 transition-colors duration-300"
        >
          <line x1="6" y1="14" x2="22" y2="14" stroke="currentColor" strokeWidth="1" />
          <polyline points="15,7 22,14 15,21" stroke="currentColor" strokeWidth="1" fill="none" strokeLinejoin="miter" />
        </svg>
      </button>

      <style jsx global>{`
        .swiper-pagination-custom .swiper-pagination-bullet {
          width: 18px;
          height: 1px;
          border-radius: 0;
          background: rgba(255,255,255,0.25);
          opacity: 1;
          transition: background 0.3s, width 0.3s;
        }
        .swiper-pagination-custom .swiper-pagination-bullet-active {
          background: rgba(255,255,255,0.8);
          width: 32px;
        }
      `}</style>
    </section>
  );
}