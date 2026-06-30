'use client';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Mousewheel, EffectFade } from 'swiper/modules';
import BackgroundImage from '../BackgroundImage';
import { formatDates } from '@/utilities/formatDates';

import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

export default function ProjectCarousel({ projects }) {

  return (
    <section className="relative h-svh md:pt-24 md:pb-4 md:mx-4 overflow-hidden">
      <Swiper
        effect="fade"
        fadeEffect={{ crossFade: true }}
        modules={[Pagination, Mousewheel, EffectFade]}
        loop={true}
        pagination={{ clickable: true, el: '.swiper-pagination-custom' }}
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
            <BackgroundImage portrait={project.coverImagePortrait} landscape={project.coverImageLandscape} />

            {/* ── Bottom-left content ── */}
            <div className="absolute bottom-20 left-8 md:bottom-8 md:left-8">

              {/* Big title */}
              <h2
                className="text-paper font-black uppercase leading-none"
                style={{ fontSize: 'clamp(1rem, 5vw, 2rem)' }}
              >
                {project.title}
              </h2>

              {/* Date & location */}
              <div className="mt-1 flex flex-col gap-0.5">
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

    </section>
  );
}