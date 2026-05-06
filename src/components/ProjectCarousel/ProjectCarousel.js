'use client';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Navigation, Mousewheel, EffectFade } from 'swiper/modules';
import BackgroundImage from '../BackgroundImage';
import TitleLarge from '../TitleLarge';
import ProjectStatus from '../ProjectGrid/ProjectStatus';

import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import 'swiper/css/effect-fade';

export default function ProjectCarousel({ projects }) {

    return (
        <section className='h-svh'>
            <Swiper
                effect="fade"
                fadeEffect={{ crossFade: true }}
                modules={[Pagination, Navigation, Mousewheel, EffectFade]}
                loop={true}
                pagination={{ clickable: true }}
                navigation={true}
                slidesPerView={1}
                mousewheel={{
                    forceToAxis: true,
                    sensitivity: 0.20,
                    thresholdDelta: 20
                }}
                speed={600}
                className='size-full bg-ink'
            >
                {projects.map((project, i) => (
                    <SwiperSlide key={i} className="relative">
                        <BackgroundImage portrait={project.coverImagePortrait} landscape={project.coverImageLandscape} />

                        {/* overlay container */}
                        <div className="absolute inset-0 flex justify-center items-center py-24 text-paper">
                            <TitleLarge>{project.title}</TitleLarge>
                            
                        </div>
                    </SwiperSlide>
                ))}

            </Swiper>
        </section >
    );
}