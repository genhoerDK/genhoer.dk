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
                        <div className="absolute inset-0 flex flex-col justify-center items-center p-4 md:p-8 pt-14 text-paper">

                            {/* Fælles wrapper — begrænser bredden på mobil, går i row på desktop */}
                            <div className="w-full max-w-sm md:max-w-none md:flex md:flex-row md:w-full">

                                {/* Billede-kolonne */}
                                <div className="w-full md:w-1/2 flex justify-center md:justify-end md:p-8">
                                    <img
                                        src={project.coverImageLandscape}
                                        loading="lazy"
                                        className="w-full md:max-w-none aspect-square md:aspect-video object-cover"
                                    />
                                </div>

                                {/* Tekst-kolonne */}
                                <div className="w-full md:w-1/2 flex flex-col pt-3 md:p-8 gap-2 md:justify-center">
                                    <TitleLarge>{project.title}</TitleLarge>
                                    {project.description.map((t, i) => (
                                        <p key={i} className="font-light text-xs md:text-sm pb-2">{t}</p>
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