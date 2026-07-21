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
            <BackgroundImage portrait={project.coverImagePortrait} landscape={project.coverImageLandscape} />

            {/* ── Info ── */}
            <div className="absolute bottom-20 left-4 md:bottom-8 md:left-4 text-paper">

              {/* Lille billede */}
              <div className="relative w-2/3 md:w-1/3 opacity-90 aspect-video overflow-hidden mb-4">
                <img src={project.coverImageSmall} alt={project.title} className="object-cover size-full" />
              </div>

              {/* Title */}
              <h2 className="font-black uppercase leading-none" style={{ fontSize: 'clamp(1rem, 5vw, 2rem)' }}>{project.title}</h2>

              {/* Date */}
              <p className="text-xs mt-1">{formatDates(project.startDate, project.endDate)}</p>
            </div>
          </SwiperSlide>
        ))}

        {/* ── Pagination dots ── */}
        <div className="swiper-pagination-custom absolute z-10 flex gap-2" />
      </Swiper>

    </section>
  );
}