'use client';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Navigation, Mousewheel, EffectFade } from 'swiper/modules';
import BackgroundImage from '../BackgroundImage';
import TitleLarge from '../TitleLarge';
import LabelLarge from '../LabelLarge';
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
                className='size-full'
            >
                {projects.map((project, i) => (
                    <SwiperSlide key={i} className="relative">
                        <BackgroundImage
                            portrait={project.coverImagePortrait}
                            landscape={project.coverImageLandscape}
                            dark={false}
                        />

                        {/* overlay container */}
                        <div className="absolute inset-0 flex py-24">

                            {/* gradient overlay (does NOT interfere with layout) */}
                            <div className="absolute inset-0 bg-gradient-to-b from-paper/100 via-paper/0 to-paper/100 pointer-events-none" />

                            {/* LEFT */}
                            <div className="w-1/2 h-full flex items-center justify-end">
                                <figure className="h-3/5 relative p-2">
                                    <ProjectStatus startDate={project.startDate} endDate={project.endDate} />
                                    <img src={project.coverImageLandscape} className="w-full h-full object-cover" />
                                </figure>
                            </div>

                            {/* RIGHT */}
                            <div className="w-1/2 h-full flex items-end">
                                <div className='bg-ink text-paper p-4 my-24 -ml-12 z-10'>
                                    <TitleLarge>{project.title}</TitleLarge>
                                </div>
                            </div>

                        </div>
                    </SwiperSlide>
                ))}

            </Swiper>
        </section >
    );
}