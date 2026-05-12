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
  const total = projects.length;

  return (
    <section className="h-svh">
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
            <div className="absolute bottom-24 left-2 md:bottom-8 md:left-8">

              {/* Counter */}
              <div className="mb-3">
                <span className="text-paper text-xs tracking-widest">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-paper/25 text-xs tracking-widest">
                  /{String(total).padStart(2, '0')}
                </span>
              </div>

              {/* Section label */}
              <p className="text-paper/50 text-[10px] uppercase tracking-[0.25em] mb-2">
                Kommende projekter
              </p>

              {/* Big title */}
              <h2
                className="text-paper font-black uppercase leading-none"
                style={{ fontSize: 'clamp(1rem, 6vw, 4rem)' }}
              >
                {project.title}
              </h2>

              {/* Date & location */}
              <div className="mt-2">
                <p className="text-paper text-xs tracking-widest">
                  {formatDates(project.startDate, project.endDate)}
                </p>
                {project.location && (
                  <p className="text-paper/50 text-[11px] mt-1 tracking-wider">
                    {project.location}
                  </p>
                )}
              </div>
            </div>
          </SwiperSlide>
        ))}

        {/* ── Custom pagination dots ── */}
        <div className="swiper-pagination-custom absolute z-10 flex gap-2 items-center justify-center" />
      </Swiper>

      {/* ── Invisible nav hit areas ── */}
      <button
        className="swiper-btn-prev absolute left-0 top-0 h-full w-1/5 z-10 cursor-w-resize group"
        aria-label="Forrige projekt"
      >
        <span
          className="absolute left-5 top-1/2 -translate-y-1/2 text-paper/0 group-hover:text-paper/35 text-[10px] tracking-[0.3em] uppercase transition-all duration-200"
          style={{ writingMode: 'vertical-rl', transform: 'translateY(-50%) rotate(180deg)' }}
        >
          Forrige
        </span>
      </button>
      <button
        className="swiper-btn-next absolute right-0 top-0 h-full w-1/5 z-10 cursor-e-resize group"
        aria-label="Næste projekt"
      >
        <span
          className="absolute right-5 top-1/2 -translate-y-1/2 text-paper/0 group-hover:text-paper/35 text-[10px] tracking-[0.3em] uppercase transition-all duration-200"
          style={{ writingMode: 'vertical-rl', transform: 'translateY(-50%)' }}
        >
          Næste
        </span>
      </button>
    </section>
  );
}