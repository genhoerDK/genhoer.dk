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
                        <div className="absolute inset-0 flex flex-col justify-center items-center md:px-12 lg:px-24 xl:px-30 text-paper">

                            {/* Fælles wrapper */}
                            <div className="w-full max-w-sm lg:max-w-none lg:flex lg:flex-row lg:w-full">

                                {/* Billede-kolonne */}
                                <div className="w-full lg:w-1/2 flex justify-center lg:justify-end lg:p-4">
                                    <img
                                        src={project.coverImageLandscape}
                                        loading="lazy"
                                        className="w-full lg:max-w-none aspect-video object-cover"
                                    />
                                </div>

                                {/* Tekst-kolonne */}
                                <div className="w-full lg:w-1/3 flex flex-col pt-4 lg:p-4 gap-2 lg:justify-center">
                                    <TitleLarge>{project.title}</TitleLarge>
                                    {project.description.map((t, i) => (
                                        <p key={i} className="font-light text-xs lg:text-sm pb-2">{t}</p>
                                    ))}
                                </div>

                            </div>
                        </div>
                    </SwiperSlide>
                ))}

            </Swiper>
        </section >
    );
}